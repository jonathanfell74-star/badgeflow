import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

const BUCKET = 'uploads';

type RosterRow = Record<string, string>;
type Card =
  | {
      status: 'matched';
      file: string;
      url: string;
      first_name?: string;
      last_name?: string;
      display_name?: string;
      title?: string;
      department?: string;
    }
  | {
      status: 'no_roster';
      file: string;
      url: string;
    }
  | {
    status: 'missing_photo';
    file: string; // expected filename from roster
    first_name?: string;
    last_name?: string;
    display_name?: string;
    title?: string;
    department?: string;
  };

async function uploadFile(path: string, file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
    });
  if (error) throw new Error(error.message);
  return path;
}

function parseRoster(fileName: string, bytes: Uint8Array | string): RosterRow[] {
  if (fileName.toLowerCase().endsWith('.csv')) {
    const text =
      typeof bytes === 'string'
        ? bytes
        : new TextDecoder().decode(bytes as Uint8Array);
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cols = line.split(',');
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));
      return obj;
    });
  }

  const wb = XLSX.read(bytes, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return (XLSX.utils.sheet_to_json(ws) as RosterRow[]) ?? [];
}

function pickKey(obj: Record<string, any>, keys: string[]) {
  const found = keys.find((k) => k in obj);
  return found ? String(obj[found] ?? '').trim() : '';
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const batch_id = (form.get('batch_id') as string) || '';
    if (!batch_id) {
      return NextResponse.json({ error: 'Missing batch_id' }, { status: 400 });
    }

    // ensure batch exists
    const { data: batch } = await supabase
      .from('batches')
      .select('id, logo_path, roster_path, notes')
      .eq('id', batch_id)
      .single();

    if (!batch) {
      return NextResponse.json({ error: 'Invalid batch_id' }, { status: 400 });
    }

    const notes = (form.get('notes') as string) || null;

    // LOGO (optional)
    const logoFile = form.get('logo') as File | null;
    let logo_path: string | null = batch.logo_path ?? null;
    if (logoFile && typeof logoFile.name === 'string' && logoFile.size > 0) {
      logo_path = await uploadFile(
        `batches/${batch_id}/logo/${logoFile.name}`,
        logoFile
      );
    }

    // ROSTER (optional)
    const rosterFile = form.get('roster') as File | null;
    let roster_path: string | null = batch.roster_path ?? null;
    let rosterRows: RosterRow[] = [];

    if (rosterFile && typeof rosterFile.name === 'string' && rosterFile.size > 0) {
      const bin = new Uint8Array(await rosterFile.arrayBuffer());
      rosterRows = parseRoster(rosterFile.name, bin);
      roster_path = await uploadFile(
        `batches/${batch_id}/roster/${rosterFile.name}`,
        rosterFile
      );
    }

    // Build roster map: photo_filename (case-insensitive) -> display fields
    const rosterMap = new Map<
      string,
      {
        file: string;
        first_name?: string;
        last_name?: string;
        title?: string;
        department?: string;
        display_name?: string;
      }
    >();

    if (rosterRows.length) {
      for (const r of rosterRows) {
        // find keys flexibly
        const fileKey =
          pickKey(r, ['photo_filename']) ||
          pickKey(r, ['filename']) ||
          pickKey(r, ['photo']) ||
          pickKey(r, ['image']) ||
          pickKey(r, ['file']);

        if (!fileKey) continue;

        const first =
          pickKey(r, ['first_name']) ||
          pickKey(r, ['forename']) ||
          pickKey(r, ['given']) ||
          pickKey(r, ['firstname']) ||
          '';
        const last =
          pickKey(r, ['last_name']) ||
          pickKey(r, ['surname']) ||
          pickKey(r, ['family']) ||
          pickKey(r, ['lastname']) ||
          '';
        const title = pickKey(r, ['title', 'role', 'job_title']) || '';
        const department = pickKey(r, ['department', 'dept']) || '';

        const display_name = (first || last) ? `${first} ${last}`.trim() : (pickKey(r, ['name']) || '');

        rosterMap.set(fileKey.toLowerCase(), {
          file: fileKey,
          first_name: first || undefined,
          last_name: last || undefined,
          title: title || undefined,
          department: department || undefined,
          display_name: display_name || undefined,
        });
      }
    }

    // PHOTOS (multiple)
    const photoFiles = form.getAll('photos').filter(Boolean) as File[];

    // Keep exact storage paths + original filenames (case preserved)
    const uploaded: { path: string; file: string }[] = [];
    const uploadedSet = new Set<string>();

    for (const pf of photoFiles) {
      if (!pf || typeof pf.name !== 'string' || pf.size === 0) continue;
      const dest = `batches/${batch_id}/photos/${pf.name}`; // keep exact case
      await uploadFile(dest, pf);
      uploaded.push({ path: dest, file: pf.name });
      uploadedSet.add(pf.name.toLowerCase());
    }

    // Produce signed URLs only for uploaded items using their exact path
    let signedUrls: string[] = [];
    if (uploaded.length) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(uploaded.map((u) => u.path), 600);
      signedUrls = (signed ?? []).map((s) => s.signedUrl);
    }

    // Build per-card view
    const cards: Card[] = [];

    // For each uploaded photo, see if it matches a roster row
    uploaded.forEach((u, idx) => {
      const roster = rosterMap.get(u.file.toLowerCase());
      if (roster) {
        cards.push({
          status: 'matched',
          file: u.file,
          url: signedUrls[idx],
          first_name: roster.first_name,
          last_name: roster.last_name,
          display_name: roster.display_name,
          title: roster.title,
          department: roster.department,
        });
      } else {
        cards.push({
          status: 'no_roster',
          file: u.file,
          url: signedUrls[idx],
        });
      }
    });

    // For each roster entry not uploaded, create a "missing_photo" card
    for (const [lcFile, r] of rosterMap.entries()) {
      if (!uploadedSet.has(lcFile)) {
        cards.push({
          status: 'missing_photo',
          file: r.file,
          first_name: r.first_name,
          last_name: r.last_name,
          display_name: r.display_name,
          title: r.title,
          department: r.department,
        });
      }
    }

    const photos_uploaded = uploaded.length;
    const roster_rows = rosterMap.size;
    const matched = cards.filter((c) => c.status === 'matched').length;
    const missing = cards
      .filter((c) => c.status === 'missing_photo')
      .map((c) => c.file);

    // Update batch summary
    const { error: updErr } = await supabase
      .from('batches')
      .update({
        logo_path,
        roster_path,
        notes,
        photo_count: photos_uploaded,
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
      photos_uploaded,
      roster_rows,
      matched,
      missing,
      cards,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Upload failed' }, { status: 500 });
  }
}
