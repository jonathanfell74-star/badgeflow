import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // Stripe SDK requires Node
export const dynamic = "force-dynamic";

// Make sure STRIPE_SECRET_KEY is set in your Vercel project env vars
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

type CreateCheckoutPayload = {
  // Optional client-provided items; if omitted we’ll use a simple test item
  line_items?: Array<{
    price?: string;            // A Stripe Price ID (preferred)
    quantity?: number;
    // or use ad-hoc pricing:
    name?: string;
    amount?: number;           // in the smallest currency unit, e.g. 1999 = £19.99
    currency?: string;         // e.g. "gbp"
  }>;
  mode?: "payment" | "subscription";
  success_url?: string;
  cancel_url?: string;
  customer_email?: string;
  metadata?: Record<string, string>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateCheckoutPayload;

    const mode = body.mode ?? "payment";
    const success_url =
      body.success_url ??
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/checkout/success`;
    const cancel_url =
      body.cancel_url ??
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/checkout/cancel`;

    // If caller passed Stripe Price IDs, use them; otherwise create ad-hoc line items for testing
    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] | undefined;

    if (body.line_items?.length) {
      line_items = body.line_items.map((li) => {
        if (li.price) {
          return {
            price: li.price,
            quantity: li.quantity ?? 1,
          };
        }
        return {
          quantity: li.quantity ?? 1,
          price_data: {
            currency: li.currency ?? "gbp",
            unit_amount: li.amount ?? 1999,
            product_data: { name: li.name ?? "BadgeFlow Test Item" },
          },
        };
      });
    } else {
      // Simple default item so you can test immediately
      line_items = [
        {
          price_data: {
            currency: "gbp",
            unit_amount: 1999,
            product_data: { name: "BadgeFlow Test Item" },
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items,
      success_url,
      cancel_url,
      customer_email: body.customer_email,
      metadata: body.metadata,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ id: session.id, url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Stripe error" },
      { status: err?.statusCode ?? 500 }
    );
  }
}
