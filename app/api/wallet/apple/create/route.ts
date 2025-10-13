// app/api/wallet/apple/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { issueApplePkpass } from "@/lib/wallet/apple";

export async function POST(req: NextRequest) {
  const { cardId } = await req.json();
  if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

  const { data: card, error } = await supabaseAdmin
    .from("manual_cards")
    .select("id, full_name, role, department, company_id, photo_url, wallet_serial, valid_until")
    .eq("id", cardId)
    .single();

  if (error || !card)
    return NextResponse.json({ error: "manual_cards row not found" }, { status: 404 });

  const baseUrl = process.env.BADGEFLOW_BASE_URL!;
  const { pkpassBuffer, serial } = await issueApplePkpass(card, baseUrl);

  return new NextResponse(pkpassBuffer, {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${(card.full_name || "card").replace(/\s+/g, "_")}.pkpass"`,
      "X-Serial-Number": serial
    }
  });
}
