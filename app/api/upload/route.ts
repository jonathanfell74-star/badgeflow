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

function parseRoster(fileName: string, binOrText: Uint8Array | string) {
  // CSV
  if (fileName.toLowerCase().endsWith('.csv')) {
    const text =
      typeof binOrText === 'string'
        ? binOrText
        : new TextDecoder().decode(binOrText as Uint8Array);

    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map((h) => h.trim());

    return lines.slice(1).map((r) => {
      const cols = r.split(',');
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));
      return obj;
    });
  }

  // XLSX
  const wb = XLSX.read(binOrText, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws) as Record<string, string>[];
}

function pickPhotoKey(row: Record<string, any>) {
  const keys = Object.keys(row || {});
  const exact = keys.find((k) => k.toLowerCase() === 'photo_filename');
  if (exact) return exact;
  const fuzzy = keys.find((k) => /photo/i.test(k) && /(file|name)/i.test(k));
  return fuzzy ?? keys[0];
}

function displayName(row: Record<string, any>) {
  const f =
    row.first_name ?? row.forename ?? row.given_name ?? row.first ?? '';
  const l =
    row.last_name ?? row.surname ?? row.family_name ?? row.last ?? '';
  const combined = `${(f || '').toString().trim()} ${(l || '')
    .toString()
    .trim()}`.trim();
  return combined || (row.name ?? '').toString().trim();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const batch_id = (form.get('batch_id') as string) || '';
    if (!batch_id) {
      return NextResponse.json({ error: 'Missing batch_id' }, { status: 400 });
    }

    // Ensure batch exists
    const { data: batch, error: batchErr } = await supabase
      .from('batches')
      .select('id, logo_path, roster_path, notes')
      .eq('id', batch_id)
      .single();

    if (batchErr || !batch) {
      return NextResponse.json({ error: 'Invalid batch_id' }, { status: 400 });
    }

    const notes = (form.get('notes') as string) || null;

    // --- logo (optional)
    const logoFile = form.get('logo') as File | null;
    let logo_path: string | null = batch.logo_path ?? null;
    if (logoFile && typeof logoFile.name === 'string' && logoFile.size > 0) {
      logo_path = await uploadFile(`batches/${batch_id}/logo/${logoFile.name}`, logoFile);
    }

    // --- roster (optional)
    const rosterFile = form.get('roster') as File | null;
    let roster_path: string | null = batch.roster_path ?? null;
    let rosterRows: Record<string, string>[] = [];

    if (rosterFile && typeof rosterFile.name === 'string' && rosterFile.size > 0) {
      const bin = new Uint8Array(await rosterFile.arrayBuffer());
      rosterRows = parseRoster(rosterFile.name, bin);
      roster_path = await uploadFile(`batches/${batch_id}/roster/${rosterFile.name}`, rosterFile);
    }

    // --- photos (multi)
    const photos = form.getAll('photos').filter(Boolean) as File[];
    const photoMap = new Map<string, { path: string; file: string }>(); // key = lower(file)

    for (const pf of photos) {
      if (!pf || typeof pf.name !== 'string' || pf.size === 0) continue;
      const dest = `batches/${batch_id}/photos/${pf.name}`;
      await uploadFile(dest, pf);
      const file = pf.name; // keep original case
      photoMap.set(file.toLowerCase(), { path: dest, file });
    }

    // --- roster index by filename
    const rosterMap = new Map<string, Record<string, string>>();
    if (rosterRows.length) {
      const key = pickPhotoKey(rosterRows[0]);
      rosterRows.forEach((row) => {
        const fname = (row[key] ?? '').toString().trim();
        if (fname) rosterMap.set(fname.toLowerCase(), row);
      });
    }

    // --- match (use forEach instead of for..of to avoid downlevelIteration)
    const matchedKeys: string[] = [];
    const missingRows: { file: string; row: Record<string, string> }[] = [];
    const orphanPhotoKeys: string[] = [];

    rosterMap.forEach((row, k) => {
      if (photoMap.has(k)) matchedKeys.push(k);
      else missingRows.push({ file: k, row });
    });

    photoMap.forEach((_v, k) => {
      if (!rosterMap.has(k)) orphanPhotoKeys.push(k);
    });

    // --- sign URLs using the actual stored paths (case-safe)
    const pathsToSign: string[] = [];
    matchedKeys.forEach((k) => pathsToSign.push(photoMap.get(k)!.path));
    orphanPhotoKeys.forEach((k) => pathsToSign.push(photoMap.get(k)!.path));

    const { data: signed } = pathsToSign.length
      ? await supabase.storage.from(BUCKET).createSignedUrls(pathsToSign, 600)
      : { data: [] as any[] };

    const urlByPath = new Map<string, string>();
    (signed ?? []).forEach((s, i) => urlByPath.set(pathsToSign[i], s.signedUrl));

    // assemble previews
    const matchedCards = matchedKeys.map((k) => {
      const photo = photoMap.get(k)!;
      const row = rosterMap.get(k)!;
      return {
        file: photo.file,
        name: displayName(row),
        url: urlByPath.get(photo.path) || '',
      };
    });

    const orphanCards = orphanPhotoKeys.map((k) => {
      const photo = photoMap.get(k)!;
      return {
        file: photo.file,
        url: urlByPath.get(photo.path) || '',
      };
    });

    // persist batch summary
    const { error: updErr } = await supabase
      .from('batches')
      .update({
        logo_path,
        roster_path,
        notes,
        photo_count: photoMap.size,
        matched_count: matchedCards.length,
        status: 'uploaded',
      })
      .eq('id', batch_id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      batch_id,
      photos_uploaded: photoMap.size,
      roster_rows: rosterMap.size,
      matched: matchedCards.length,
      missing: missingRows.map((m) => m.file),
      matchedCards,
      missingRows: missingRows.map((m) => ({
        file: m.file,
        name: displayName(m.row),
        row: m.row,
      })),
      orphanCards,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Upload failed' }, { status: 500 });
  }
}
