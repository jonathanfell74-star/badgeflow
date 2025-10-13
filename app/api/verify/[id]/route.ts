// app/api/verify/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const serial = params.id;

  const { data, error } = await supabaseAdmin
    .from("manual_cards")
    .select("id, full_name, role, department, company_id, valid_until, wallet_revoked")
    .or(`wallet_serial.eq.${serial},id.eq.${serial}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ valid: false }, { status: 404 });

  const now = new Date();
  const expired = data.valid_until ? new Date(data.valid_until) < now : false;

  return NextResponse.json({
    valid: !data.wallet_revoked && !expired,
    id: data.id,
    name: data.full_name,
    role: data.role,
    department: data.department,
    company_id: data.company_id,
    valid_until: data.valid_until,
    revoked: data.wallet_revoked,
    checked_at: now.toISOString()
  });
}
