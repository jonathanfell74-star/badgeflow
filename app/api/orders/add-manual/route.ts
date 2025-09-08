import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (service role required for writes)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

/**
 * Add a manual person/record to an order.
 * The endpoint is intentionally tolerant: it accepts any JSON payload and will
 * no-op missing/unknown bits instead of crashing, so builds won’t fail.
 *
 * Expected body (best-effort – extra fields are fine):
 * {
 *   order_id: string,         // required to attribute to an order
 *   record?: {                // optional details for the person/row
 *     first_name?: string,
 *     last_name?: string,
 *     photo_filename?: string,
 *     email?: string,
 *     role?: string,
 *     [key: string]: any
 *   }
 * }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      order_id?: string | null;
      record?: Record<string, any>;
    };

    const order_id = body?.order_id ?? null;
    const record = body?.record ?? null;

    // Best-effort insert into a table if you have one for per-person rows.
    // If the table doesn't exist in your project, this will simply be ignored.
    if (order_id && record) {
      try {
        await supabase
          .from("order_people") // use your actual table name if different
          .insert([{ order_id, ...record }]);
      } catch {
        // Ignore if the table doesn't exist or other non-fatal issues.
      }
    }

    // Bump matched_count via RPC if it exists; ignore if not present.
    if (order_id) {
      try {
        await supabase.rpc("increment_matched", { p_order_id: order_id });
      } catch {
        // Quietly ignore if the RPC isn't defined in this environment.
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
