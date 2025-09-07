import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const BUCKET = "orders";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  // List all photos for this session
  const prefix = `${sessionId}/photos`;
  const { data: list, error: listErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(prefix, { limit: 200 });

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const files = list?.filter((f) => f.name) || [];
  const previews: { name: string; url: string }[] = [];

  // Create short-lived signed URLs
  for (const f of files) {
    const fullPath = `${prefix}/${f.name}`;
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(fullPath, 600); // 10 minutes
    if (!error && data?.signedUrl) {
      previews.push({ name: f.name, url: data.signedUrl });
    }
  }

  return NextResponse.json({ previews });
}
