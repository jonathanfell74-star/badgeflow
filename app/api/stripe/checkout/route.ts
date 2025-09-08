import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { priceForQuantity } from '@/lib/pricing'; // your existing helper

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);

export async function POST(req: Request) {
  const { order_id, walletAddon } = await req.json();
  if (!order_id) return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });

  // read counts
  const { data: order, error } = await supabase.from('orders')
    .select('id, matched_count')
    .eq('id', order_id)
    .single();

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  const quantity = order.matched_count || 0;
  if (quantity <= 0) return NextResponse.json({ error: 'Nothing to charge' }, { status: 400 });

  const cardPence = priceForQuantity(quantity).card_unit_pence;
  const walletPence = walletAddon ? priceForQuantity(quantity).wallet_unit_pence : 0;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order?success=1&order_id=${order_id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/start`,
    line_items: [
      {
        quantity,
        price_data: {
          currency: 'gbp',
          unit_amount: cardPence,
          product_data: { name: 'Printed ID card (CR80)' },
        },
      },
      ...(walletPence > 0 ? [{
        quantity,
        price_data: {
          currency: 'gbp',
          unit_amount: walletPence,
          product_data: { name: 'Mobile Wallet Pass add-on' },
        },
      }] : []),
    ],
    metadata: { order_id },
  });

  // you can also update the order to track stripe_session_id here if you wish
  return NextResponse.json({ url: session.url });
}
