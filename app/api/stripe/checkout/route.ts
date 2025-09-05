import { NextResponse } from "next/server";
import Stripe from "stripe";
import { priceForQuantity } from "../../../lib/pricing";
import { computeCutoff } from "../../../lib/cutoff";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { quantity, wallet } = body as { quantity: number; wallet: boolean };

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }
    const stripe = new Stripe(secret, { apiVersion: "2024-06-20" as any });

    const prices = priceForQuantity(quantity);
    const { result, dispatchTarget } = computeCutoff();

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(prices.cardUnit * 100),
          product_data: { name: "Printed ID card (CR80)" }
        }
      }
    ];
    if (wallet) {
      line_items.push({
        quantity,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(prices.walletUnit * 100),
          product_data: { name: "Mobile Wallet Pass add-on" }
        }
      });
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://example.com";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      success_url: `${base}/order?success=1`,
      cancel_url: `${base}/order?canceled=1`,
      metadata: {
        quantity: String(quantity),
        wallet: String(wallet),
        cutoff_result: result,
        dispatch_target: dispatchTarget
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Checkout error" }, { status: 500 });
  }
}
