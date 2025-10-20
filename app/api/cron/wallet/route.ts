export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { issueApplePkpass } from "@/lib/wallet/apple";
import { buildGoogleSaveUrl } from "@/lib/wallet/google";

const BATCH_SIZE = 10;

export async function GET(req: NextRequest) {
  // simple auth for cron
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) Fetch a small batch of pending jobs
  const { data: jobs, error: jobsErr } = await supabaseAdmin
    .from("wallet_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (jobsErr) {
    return NextResponse.json({ error: jobsErr.message }, { status: 500 });
  }
  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let processed = 0;
  for (const job of jobs) {
    try {
      // 2) Load the manual_cards row
      const { data: card, error: cardErr } = await supabaseAdmin
        .from("manual_cards")
        .select(
          "id, full_name, role, department, company_id, photo_url, wallet_serial, valid_until"
        )
        .eq("id", job.card_id)
        .single();

      if (cardErr || !card) {
        throw new Error(cardErr?.message || "manual_cards row not found");
      }

      const baseUrl = process.env.BADGEFLOW_BASE_URL!;
      const { pkpassBuffer, serial } = await issueApplePkpass(card, baseUrl);

      // 3) Upload Apple pkpass to Storage
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
        .createSignedUrl(storagePath, 60 * 60 * 24 * 30); // 30 days
      if (signErr) throw new Error(signErr.message);
      const appleUrl = signed?.signedUrl || null;

      // 4) Google Save URL
      const { saveUrl } = buildGoogleSaveUrl(
        { ...card, wallet_serial: serial },
        baseUrl
      );

      // 5) Update manual_cards row with links + serial
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

      // 6) Mark job done
      await supabaseAdmin
        .from("wallet_jobs")
        .update({ status: "done", attempts: job.attempts + 1, last_error: null })
        .eq("id", job.id);

      processed++;
    } catch (e: any) {
      // Mark job as error (up to 3 attempts, then stop retrying)
      const attempts = (job.attempts || 0) + 1;
      await supabaseAdmin
        .from("wallet_jobs")
        .update({
          status: attempts >= 3 ? "error" : "pending",
          attempts,
          last_error: e?.message?.slice(0, 500) || "unknown",
        })
        .eq("id", job.id);
    }
  }

  return NextResponse.json({ ok: true, processed });
}
