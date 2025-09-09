'use client';

import { useEffect, useMemo, useState } from 'react';

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
      file: string;
      first_name?: string;
      last_name?: string;
      display_name?: string;
      title?: string;
      department?: string;
    };

type Summary = {
  ok: boolean;
  batch_id: string;
  photos_uploaded: number;
  roster_rows: number;
  matched: number;
  missing: string[];
  cards: Card[];
};

export default function UploadPage() {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sum, setSum] = useState<Summary | null>(null);

  // auto-create a batch if none in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const existing = params.get('batch_id');
    if (existing) {
      setBatchId(existing);
      return;
    }
    (async () => {
      try {
        const r = await fetch('/api/batches', { method: 'POST' });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Failed to start batch');
        params.set('batch_id', j.id);
        window.history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
        setBatchId(j.id);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!batchId) return;
    setBusy(true);
    setErr(null);
    setSum(null);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set('batch_id', batchId);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Upload failed');
      setSum(j);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function CardPreview(props: { card: Card }) {
    const c = props.card;
    const base =
      'relative flex items-center rounded-xl border bg-white p-4 shadow-sm';
    const classes =
      c.status === 'matched'
        ? base + ' border-emerald-500'
        : c.status === 'no_roster'
        ? base + ' border-amber-400'
        : base + ' border-rose-500';

    const name =
      'display_name' in c && c.display_name
        ? c.display_name
        : ('first_name' in c ? [c.first_name, c.last_name].filter(Boolean).join(' ') : '');

    return (
      <div className={classes} style={{ aspectRatio: '86/54' }}>
        {/* left side text */}
        <div className="flex-1 pr-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">BadgeFlow</div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            {name || (c.status === 'no_roster' ? 'Not in roster' : 'Unknown')}
          </div>
          {'title' in c && c.title ? (
            <div className="text-sm text-gray-600">{c.title}</div>
          ) : null}
          {'department' in c && c.department ? (
            <div className="text-sm text-gray-500">{c.department}</div>
          ) : null}
          <div className="mt-2 text-xs text-gray-500">{c.file}</div>

          {/* status pill */}
          <div className="mt-3 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              background:
                c.status === 'matched'
                  ? '#ecfdf5'
                  : c.status === 'no_roster'
                  ? '#fffbeb'
                  : '#fef2f2',
              color:
                c.status === 'matched'
                  ? '#065f46'
                  : c.status === 'no_roster'
                  ? '#92400e'
                  : '#991b1b',
            }}>
            {c.status === 'matched' && 'Matched'}
            {c.status === 'no_roster' && 'Photo only (no roster)'}
            {c.status === 'missing_photo' && 'Missing photo'}
          </div>
        </div>

        {/* right photo or placeholder */}
        {('url' in c) ? (
          <img src={c.url} alt={c.file} className="h-full w-28 rounded-md object-cover" />
        ) : (
          <div className="flex h-full w-28 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
            No photo
          </div>
        )}
      </div>
    );
  }

  const cardGrid = useMemo(() => {
    if (!sum?.cards?.length) return null;
    return (
      <>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {sum.cards.map((c, i) => (
            <CardPreview key={`${c.status}-${c.file}-${i}`} card={c} />
          ))}
        </div>

        {/* legend */}
        <div className="mt-6 text-xs text-gray-500">
          <div className="mb-1"><b>Legend:</b> green = matched, amber = photo only, red = roster row missing photo.</div>
        </div>
      </>
    );
  }, [sum]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold">Upload order files</h1>

      {!batchId && <p className="text-gray-500">Preparing your upload…</p>}
      {err && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-6" encType="multipart/form-data">
        <div>
          <label className="block font-medium">Company logo (PNG/SVG/JPG)</label>
          <input name="logo" type="file" accept=".png,.jpg,.jpeg,.svg" className="mt-2" />
        </div>

        <div>
          <label className="block font-medium">
            Staff roster (CSV/XLSX) — must include a column named <code>photo_filename</code>
          </label>
          <input
            name="roster"
            type="file"
            accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="mt-2"
          />
        </div>

        <p className="text-sm text-gray-500">
          Tip: values in <code>photo_filename</code> must exactly match the image file names (e.g. <code>E1234.jpg</code>).
        </p>

        <div>
          <label className="block font-medium">
            Staff photos (JPG/PNG) — you can select multiple
          </label>
          <input name="photos" type="file" multiple accept=".jpg,.jpeg,.png" className="mt-2" />
        </div>

        <div>
          <label className="block font-medium">Notes (optional)</label>
          <textarea
            name="notes"
            rows={4}
            className="mt-2 w-full rounded-md border p-2"
            placeholder="Anything we should know about this batch?"
          />
        </div>

        <button
          type="submit"
          disabled={!batchId || busy}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Upload files'}
        </button>
      </form>

      {sum && (
        <div className="mt-8 rounded-lg border p-4">
          <h2 className="mb-2 text-xl font-semibold">Upload summary</h2>
          <div className="text-sm">
            <div>Photos uploaded: <b>{sum.photos_uploaded}</b></div>
            <div>Roster rows: <b>{sum.roster_rows}</b></div>
            <div>Matched: <b>{sum.matched}</b></div>
            <div>Missing: <b>{sum.missing.length}</b></div>
            {sum.missing.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sky-700">Show missing filenames</summary>
                <ul className="mt-1 list-disc pl-6 text-gray-700">
                  {sum.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {cardGrid}
        </div>
      )}
    </div>
  );
}
