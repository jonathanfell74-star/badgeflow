import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // use Node, not Edge

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  const sk = process.env.STRIPE_SECRET_KEY;

  if (!sig || !whsec || !sk) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = new Stripe(sk, { apiVersion: "2024-06-20" as any });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whsec);
  } catch (err: any) {
    return NextResponse.json({ error: `Signature verify failed: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const md = (s.metadata || {}) as Record<string,string>;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE! // server-only key
    );

    const { error } = await supabase.from("orders").insert({
      stripe_session_id: s.id,
      quantity: parseInt(md.quantity || "0", 10),
      wallet_addon: md.wallet === "true",
      amount_total_cents: s.amount_total || 0,
      cutoff_result: md.cutoff_result || null,
      dispatch_target: md.dispatch_target || null,
      status: "paid"
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
