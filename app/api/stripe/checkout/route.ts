// app/api/stripe/checkout/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { priceForQuantity } from "@/lib/pricing";

// Use the API version supported by your installed Stripe SDK.
// (Your build log shows it expects "2023-10-16".)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE as string
);

export async function POST(req: Request) {
  try {
    const { order_id, walletAddon } = (await req.json()) as {
      order_id?: string;
      walletAddon?: boolean;
    };

    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    // Read how many usable records we have (matched_count)
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, matched_count")
      .eq("id", order_id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const quantity = Number(order.matched_count ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Nothing to charge" }, { status: 400 });
    }

    // Get unit pricing (in pence) for this quantity
    const { card_unit_pence, wallet_unit_pence } = priceForQuantity(quantity);
    const addWallet = !!walletAddon && Number(wallet_unit_pence) > 0;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order?success=1&order_id=${order_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/start`,
      line_items: [
        {
          quantity,
          price_data: {
            currency: "gbp",
            unit_amount: card_unit_pence,
            product_data: { name: "Printed ID card (CR80)" },
          },
        },
        ...(addWallet
          ? [
              {
                quantity,
                price_data: {
                  currency: "gbp",
                  unit_amount: wallet_unit_pence,
                  product_data: { name: "Mobile Wallet Pass add-on" },
                },
              } as const,
            ]
          : []),
      ],
      metadata: { order_id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Checkout error" },
      { status: 500 }
    );
  }
}
