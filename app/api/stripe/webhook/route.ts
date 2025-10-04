import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Env vars needed in Vercel:
// - STRIPE_SECRET_KEY
// - STRIPE_WEBHOOK_SECRET  (from your Stripe dashboard → Developers → Webhooks)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  const sig = headers().get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing Stripe-Signature header", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET env var");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // IMPORTANT: use the raw text body for signature verification
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err?.message);
    return new NextResponse(`Webhook Error: ${err?.message ?? "invalid signature"}`, {
      status: 400,
    });
  }

  try {
    // Handle the events you care about
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // TODO: fulfill the order, mark payment complete, etc.
        console.log("✅ checkout.session.completed:", session.id, session.metadata);
        break;
      }
      case "invoice.paid":
        console.log("✅ invoice.paid");
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        console.log(`ℹ️ ${event.type}`);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Respond quickly — Stripe only needs a 2xx to consider it delivered
    return new NextResponse("ok", { status: 200 });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
