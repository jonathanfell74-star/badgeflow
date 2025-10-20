export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { issueApplePkpass } from "@/lib/wallet/apple";
import { buildGoogleSaveUrl } from "@/lib/wallet/google";

const BATCH_SIZE = 10;

/** Read secret from either:
 *   - x-cron-secret: <secret>
 *   - authorization: Bearer <secret>
 */
function getIncomingSecret(req: NextRequest) {
  const h1 = req.headers.get("x-cron-secret")?.trim();
  const h2 = req.headers.get("authorization")?.trim();
  if (h1) return h1;
  if (h2?.toLowerCase().startsWith("bearer ")) return h2.slice(7).trim();
  return null;
}

export async function GET(req: NextRequest) {
  const incoming = getIncomingSecret(req);
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    // Helpful error if env var wasn't loaded into this deployment
    return NextResponse.json(
      { error: "CRON_SECRET env var is not set in this deployment." },
      { status: 500 }
    );
  }
  if (!incoming) {
    return NextResponse.json(
      {
        error:
          "Missing secret. Send header 'x-cron-secret: <value>' or 'Authorization: Bearer <value>'.",
      },
      { status: 401 }
    );
  }
  if (incoming !== expected) {
    return NextResponse.json(
      { error: "Unauthorized (secret mismatch)." },
      { status: 401 }
    );
  }

  // -------- processor --------
  const { data: jobs, error: jobsErr } = await supabaseAdmin
    .from("wallet_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (jobsErr) {
    return NextResponse.json({ error: jobsErr.message }, { status: 500 });
  }
  if (!jobs?.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let processed = 0;
  for (const job of jobs) {
    try {
      const { data: card, error: cardErr } = await supabaseAdmin
        .from("manual_cards")
        .select(
          "id, full_name, role, department, company_id, photo_url, wallet_serial, valid_until"
        )
        .eq("id", job.card_id)
        .single();

      if (cardErr || !card) throw new Error(cardErr?.message || "Row not found");

      const baseUrl = process.env.BADGEFLOW_BASE_URL!;
      const { pkpassBuffer, serial } = await issueApplePkpass(card, baseUrl);

      const storagePath = `wallet/${card.id}.pkpass`;
      const upload = await supabaseAdmin.storage
        .from("public")
        .upload(storagePath, pkpassBuffer, {
          upsert: true,
          contentType: "application/vnd.apple.pkpass",
        });
      if (upload.error) throw new Error(upload.error.message);

      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from("public")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 30);
      if (signErr) throw new Error(signErr.message);

      const appleUrl = signed?.signedUrl ?? null;
      const { saveUrl } = buildGoogleSaveUrl(
        { ...card, wallet_serial: serial },
        baseUrl
      );

      const { error: upErr } = await supabaseAdmin
        .from("manual_cards")
        .update({
          wallet_serial: serial,
          apple_pass_url: appleUrl,
          google_wallet_link: saveUrl,
          wallet_updated_at: new Date().toISOString(),
        })
        .eq("id", card.id);
      if (upErr) throw new Error(upErr.message);

      await supabaseAdmin
        .from("wallet_jobs")
        .update({ status: "done", attempts: (job.attempts || 0) + 1, last_error: null })
        .eq("id", job.id);

      processed++;
    } catch (e: any) {
      const attempts = (job.attempts || 0) + 1;
      await supabaseAdmin
        .from("wallet_jobs")
        .update({
          status: attempts >= 3 ? "error" : "pending",
          attempts,
          last_error: (e?.message || "unknown").slice(0, 500),
        })
        .eq("id", job.id);
    }
  }

  return NextResponse.json({ ok: true, processed });
}
