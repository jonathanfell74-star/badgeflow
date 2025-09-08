import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(req: Request) {
  const form = await req.formData();
  const order_id = String(form.get('order_id') || '');
  const forename = String(form.get('forename') || '');
  const surname = String(form.get('surname') || '');
  const title = String(form.get('title') || '');
  const department = String(form.get('department') || '');
  const photo = form.get('photo') as File | null;

  if (!order_id || !forename || !surname || !photo) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const key = `uploads/${order_id}/manual/${crypto.randomUUID()}-${photo.name}`;
  await supabase.storage.from('uploads')
    .upload(key, await photo.arrayBuffer(), { upsert: true, contentType: photo.type || 'image/jpeg' });

  const { error } = await supabase.from('manual_cards').insert({
    order_id, forename, surname, title, department, photo_path: key
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // bump matched_count for convenience (1 more usable record)
  await supabase.rpc('increment_matched', { p_order_id: order_id }).catch(()=>{ /* ignore if fn not present */ });

  return NextResponse.json({ ok: true });
}
