import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

function readSheetToRows(buf: ArrayBuffer) {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { raw: false });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const order_id = String(form.get('order_id') || '');
  if (!order_id) return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });

  const logo = form.get('logo') as File | null;
  const roster = form.get('roster') as File | null;
  const photos = form.getAll('photos') as File[];
  const notes = String(form.get('notes') || '');

  // store logo
  if (logo) {
    await supabase.storage.from('uploads')
      .upload(`uploads/${order_id}/logo/${logo.name}`, await logo.arrayBuffer(), { upsert: true, contentType: logo.type || 'image/png' });
  }

  // store roster and parse
  let rows: Record<string,string>[] = [];
  if (roster) {
    const key = `uploads/${order_id}/roster/${roster.name}`;
    await supabase.storage.from('uploads')
      .upload(key, await roster.arrayBuffer(), { upsert: true, contentType: roster.type || 'text/csv' });

    if (roster.name.toLowerCase().endsWith('.csv')) {
      const txt = Buffer.from(await roster.arrayBuffer()).toString('utf-8');
      const [header, ...lines] = txt.split(/\r?\n/).filter(Boolean);
      const heads = header.split(',').map(h => h.trim());
      rows = lines.map(line => {
        const vals = line.split(',');
        const o: Record<string,string> = {};
        heads.forEach((h,i)=> o[h]= (vals[i]||'').trim());
        return o;
      });
    } else {
      rows = readSheetToRows(await roster.arrayBuffer()) as any;
    }
  }

  // store photos
  let uploadedPhotoNames: string[] = [];
  for (const f of photos) {
    const key = `uploads/${order_id}/photos/${f.name}`;
    await supabase.storage.from('uploads')
      .upload(key, await f.arrayBuffer(), { upsert: true, contentType: f.type || 'image/jpeg' });
    uploadedPhotoNames.push(f.name.toLowerCase());
  }

  // match
  const photoCol = 'photo_filename';
  const rosterRows = rows.length;
  const matched = rows.filter(r => r[photoCol]?.toString().toLowerCase() && uploadedPhotoNames.includes(r[photoCol]!.toString().toLowerCase())).length;
  const missing = rows
    .map(r => r[photoCol]?.toString() || '')
    .filter(n => n && !uploadedPhotoNames.includes(n.toLowerCase()));

  // update matched_count and notes on order
  await supabase.from('orders').update({
    matched_count: matched,
    notes: notes || null
  }).eq('id', order_id);

  // pick two thumbnails to preview (if present in storage)
  const previewPhotoKeys = uploadedPhotoNames.slice(0,2).map(n => `uploads/${order_id}/photos/${n}`);

  return NextResponse.json({
    photosUploaded: uploadedPhotoNames.length,
    rosterRows,
    matched,
    missing,
    previewPhotoKeys,
  });
}
