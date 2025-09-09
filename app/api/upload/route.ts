import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

const BUCKET = 'uploads';

async function uploadFile(path: string, file: File) {
  const arr = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arr, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
    });
  if (error) throw new Error(error.message);
  return path;
}

function parseRoster(fileName: string, textOrBinary: Uint8Array | string) {
  // Accept CSV and XLSX
  if (fileName.toLowerCase().endsWith('.csv')) {
    const text = typeof textOrBinary === 'string'
      ? textOrBinary
      : new TextDecoder().decode(textOrBinary as Uint8Array);
    // Simple CSV parse – first line headers
    const [head, ...rows] = text.split(/\r?\n/).filter(Boolean);
    const headers = head.split(',').map(h => h.trim());
    return rows.map(r => {
      const cols = r.split(',');
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));
      return obj;
    });
  } else {
    const wb = XLSX.read(textOrBinary, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws) as Record<string, string>[];
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const batch_id = (form.get('batch_id') as string) || '';
    if (!batch_id) {
      return NextResponse.json({ error: 'Missing batch_id' }, { status: 400 });
    }

    // Check batch exists
    const { data: batch } = await supabase
      .from('batches')
      .select('id, logo_path, roster_path, notes')
      .eq('id', batch_id)
      .single();

    if (!batch) {
      return NextResponse.json({ error: 'Invalid batch_id' }, { status: 400 });
    }

    const notes = (form.get('notes') as string) || null;

    // Optional logo
    const logoFile = form.get('logo') as File | null;
    let logo_path: string | null = batch.logo_path ?? null;
    if (logoFile && typeof logoFile.name === 'string' && logoFile.size > 0) {
      logo_path = await uploadFile(`batches/${batch_id}/logo/${logoFile.name}`, logoFile);
    }

    // Optional roster
    const rosterFile = form.get('roster') as File | null;
    let roster_path: string | null = batch.roster_path ?? null;
    let rosterRows: Record<string, string>[] = [];

    if (rosterFile && typeof rosterFile.name === 'string' && rosterFile.size > 0) {
      const bin = new Uint8Array(await rosterFile.arrayBuffer());
      rosterRows = parseRoster(rosterFile.name, bin);
      roster_path = await uploadFile(`batches/${batch_id}/roster/${rosterFile.name}`, rosterFile);
    } else if (batch.roster_path) {
      // If they didn't upload this time, we could optionally fetch and parse existing.
      // For now, just leave rosterRows empty; matches will use only current photos count.
      roster_path = batch.roster_path;
    }

    // Photos (multi)
    const photos = form.getAll('photos').filter(Boolean) as File[];
    const uploadedPhotoPaths: string[] = [];
    const photoFileNames = new Set<string>();

    for (const pf of photos) {
      if (!pf || typeof pf.name !== 'string' || pf.size === 0) continue;
      const dest = `batches/${batch_id}/photos/${pf.name}`;
      await uploadFile(dest, pf);
      uploadedPhotoPaths.push(dest);
      photoFileNames.add(pf.name.toLowerCase());
    }

    // Build roster filename set (look for a "photo_filename" column)
    const rosterFileNames = new Set<string>();
    if (rosterRows.length) {
      const guessedKey =
        Object.keys(rosterRows[0]).find(k => k.toLowerCase() === 'photo_filename') ??
        Object.keys(rosterRows[0])[0]; // last resort first col

      rosterRows.forEach((row) => {
        const val = (row[guessedKey] ?? '').toString().trim();
        if (val) rosterFileNames.add(val.toLowerCase());
      });
    }

    let matched = 0;
    const missing: string[] = [];

    Array.from(rosterFileNames).forEach((fname) => {
      if (photoFileNames.has(fname)) matched++;
      else missing.push(fname);
    });

    // Generate signed preview URLs for the uploaded/known photos
    const previewTargets = Array.from(photoFileNames).map(
      (f) => `batches/${batch_id}/photos/${f}`
    );

    let previews: { file: string; url: string }[] = [];
    if (previewTargets.length) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(previewTargets, 600);
      previews =
        (signed ?? []).map((s, i) => ({
          file: previewTargets[i].split('/').pop() || previewTargets[i],
          url: s.signedUrl,
        })) ?? [];
    }

    // Update batch record
    const { error: updErr } = await supabase
      .from('batches')
      .update({
        logo_path,
        roster_path,
        notes,
        photo_count: previews.length,
        matched_count: matched,
        status: 'uploaded',
      })
      .eq('id', batch_id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      batch_id,
      photos_uploaded: previews.length,
      roster_rows: rosterFileNames.size,
      matched,
      missing,
      previews,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Upload failed' }, { status: 500 });
  }
}
