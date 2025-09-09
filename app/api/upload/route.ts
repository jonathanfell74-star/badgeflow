import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// name of your Supabase Storage bucket
const BUCKET = 'orders';

async function uploadFile(path: string, file: File) {
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    });
  if (error) throw error;
  return path;
}

function parseRoster(buffer: ArrayBuffer) {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
  // we only need a few columns; photo_filename is the key
  return rows.map((r) => ({
    first_name: String(r.first_name || r.firstname || '').trim(),
    last_name: String(r.last_name || r.lastname || '').trim(),
    photo_filename: String(r.photo_filename || '').trim(),
  }));
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const existingOrderId = (form.get('order_id') as string) || null;
    const notes = (form.get('notes') as string) || '';

    const logo = (form.get('logo') as File) || null;
    const roster = (form.get('roster') as File) || null;
    const photos = (form.getAll('photos') as File[]) || [];

    // 1) Ensure we have an order (create a draft one if none was supplied)
    let order_id = existingOrderId;
    if (!order_id) {
      const { data, error } = await supabase
        .from('orders')
        .insert({ status: 'draft', notes })
        .select('id')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create draft order');
      }
      order_id = data.id;
    } else if (notes) {
      // if order existed, keep any new notes
      await supabase.from('orders').update({ notes }).eq('id', order_id);
    }

    // 2) Upload logo & roster if provided, keep paths on the order row
    let logo_path: string | null = null;
    if (logo) {
      const ext = logo.name.split('.').pop();
      logo_path = `${order_id}/logo.${ext}`;
      await uploadFile(logo_path, logo);
      await supabase.from('orders').update({ logo_path }).eq('id', order_id);
    }

    let roster_path: string | null = null;
    let rosterRows: { first_name: string; last_name: string; photo_filename: string }[] = [];
    if (roster) {
      roster_path = `${order_id}/${roster.name}`;
      await uploadFile(roster_path, roster);

      const parsed = parseRoster(await roster.arrayBuffer());
      rosterRows = parsed;
      await supabase.from('orders').update({ roster_path }).eq('id', order_id);
    } else {
      // if no new roster was uploaded, try to parse the last saved roster so matching still works
      const { data: order } = await supabase
        .from('orders')
        .select('roster_path')
        .eq('id', order_id)
        .single();

      if (order?.roster_path) {
        const { data: dl } = await supabase.storage
          .from(BUCKET)
          .download(order.roster_path);
        if (dl) {
          const buf = await dl.arrayBuffer();
          rosterRows = parseRoster(buf);
        }
      }
    }

    // 3) Upload any photos
    const photoPaths: string[] = [];
    for (const f of photos) {
      const filename = f.name;
      const path = `${order_id}/photos/${filename}`;
      await uploadFile(path, f);
      photoPaths.push(path);
    }

    // 4) If user didn’t upload photos this time, list existing photos so we can still compute a match
    if (photoPaths.length === 0) {
      const { data: listed } = await supabase.storage
        .from(BUCKET)
        .list(`${order_id}/photos`, { limit: 1000 });
      for (const item of listed || []) {
        photoPaths.push(`${order_id}/photos/${item.name}`);
      }
    }

    // 5) Build match/mismatch summary
    const rosterSet = new Set(
      rosterRows
        .map((r) => r.photo_filename.toLowerCase())
        .filter((s) => !!s)
    );

    const photoFileNames = photoPaths.map((p) =>
      p.split('/').pop()!.toLowerCase()
    );

    let matched = 0;
    let missing: string[] = [];
    for (const r of rosterSet) {
      if (photoFileNames.includes(r)) matched++;
      else missing.push(r);
    }

    // 6) Create signed URLs for preview grid
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(photoPaths, 60 * 10); // 10 min

    const previews =
      signed?.map((s) => ({
        name: s.path.split('/').pop()!,
        url: s.signedUrl!,
      })) || [];

    // sessionId used by /review/[sessionId] — we’ll use order_id as the session now
    return NextResponse.json({
      ok: true,
      sessionId: order_id,
      order_id,
      counts: {
        photosUploadedNow: photos.length,
        rosterRows: rosterRows.length,
        matched,
        missing: missing.length,
      },
      missing,
      previews,
      logo_path,
      roster_path,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Upload failed' },
      { status: 400 }
    );
  }
}
