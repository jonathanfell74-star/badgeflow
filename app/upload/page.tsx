'use client';

import { useEffect, useMemo, useState } from 'react';

type MatchedCard = { file: string; name: string; url: string };
type MissingRow = { file: string; name: string; row: Record<string, any> };
type OrphanCard = { file: string; url: string };

type Summary = {
  ok: boolean;
  batch_id: string;
  photos_uploaded: number;
  roster_rows: number;
  matched: number;
  missing: string[];

  matchedCards: MatchedCard[];
  missingRows: MissingRow[];
  orphanCards: OrphanCard[];
};

export default function UploadPage() {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sum, setSum] = useState<Summary | null>(null);

  // Create a batch on first visit if none in URL
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

  // Card UI helper
  function Card({
    left,
    right,
    badge,
  }: {
    left: React.ReactNode;
    right: React.ReactNode;
    badge?: { text: string; color: 'red' | 'yellow' | 'emerald' };
  }) {
    const colorMap = {
      red: 'bg-red-100 text-red-700',
      yellow: 'bg-yellow-100 text-yellow-800',
      emerald: 'bg-emerald-100 text-emerald-800',
    } as const;
    return (
      <div
        className="relative flex items-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        style={{ aspectRatio: '86/54' }}
      >
        {badge && (
          <span
            className={`absolute left-3 top-3 rounded px-2 py-0.5 text-xs font-medium ${colorMap[badge.color]}`}
          >
            {badge.text}
          </span>
        )}
        <div className="flex-1 pr-4">{left}</div>
        <div className="h-full w-28 overflow-hidden rounded-md">{right}</div>
      </div>
    );
  }

  const matchedGrid = useMemo(() => {
    if (!sum?.matchedCards?.length) return null;
    return (
      <>
        <h3 className="mt-8 text-lg font-semibold">Matched cards ({sum.matchedCards.length})</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {sum.matchedCards.map((m) => (
            <Card
              key={m.file}
              badge={{ text: 'Matched', color: 'emerald' }}
              left={
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="mt-1 font-semibold">{m.name || '—'}</div>
                  <div className="mt-2 text-xs text-gray-500">{m.file}</div>
                </div>
              }
              right={<img src={m.url} alt={m.file} className="h-full w-full object-cover" />}
            />
          ))}
        </div>
      </>
    );
  }, [sum]);

  const missingGrid = useMemo(() => {
    if (!sum?.missingRows?.length) return null;
    return (
      <>
        <h3 className="mt-8 text-lg font-semibold">
          Missing photo for roster rows ({sum.missingRows.length})
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {sum.missingRows.map((m) => (
            <Card
              key={m.file}
              badge={{ text: 'Missing photo', color: 'red' }}
              left={
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="mt-1 font-semibold">{m.name || '—'}</div>
                  <div className="mt-2 text-xs text-gray-500">{m.file}</div>
                </div>
              }
              right={
                <div className="flex h-full w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-xs text-gray-400">
                  no image
                </div>
              }
            />
          ))}
        </div>
      </>
    );
  }, [sum]);

  const orphanGrid = useMemo(() => {
    if (!sum?.orphanCards?.length) return null;
    return (
      <>
        <h3 className="mt-8 text-lg font-semibold">
          Photos with no roster row ({sum.orphanCards.length})
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {sum.orphanCards.map((o) => (
            <Card
              key={o.file}
              badge={{ text: 'No roster row', color: 'yellow' }}
              left={
                <div>
                  <div className="text-sm text-gray-500">Filename</div>
                  <div className="mt-1 font-semibold">{o.file}</div>
                </div>
              }
              right={<img src={o.url} alt={o.file} className="h-full w-full object-cover" />}
            />
          ))}
        </div>
      </>
    );
  }, [sum]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold">Upload order files</h1>

      {!batchId && <p className="text-gray-500">Preparing your upload…</p>}
      {err && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <form onSubmit={onSubmit} className="space-y-6" encType="multipart/form-data">
        <div>
          <label className="block font-medium">Company logo (PNG/SVG/JPG)</label>
          <input name="logo" type="file" accept=".png,.jpg,.jpeg,.svg" className="mt-2" />
        </div>

        <div>
          <label className="block font-medium">
            Staff roster (CSV/XLSX) — must include a column named{' '}
            <code>photo_filename</code>
          </label>
          <input
            name="roster"
            type="file"
            accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="mt-2"
          />
        </div>

        <p className="text-sm text-gray-500">
          Tip: values in <code>photo_filename</code> must exactly match the image file names
          (e.g. <code>E1234.jpg</code>).
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
            <div>
              Photos uploaded: <b>{sum.photos_uploaded}</b>
            </div>
            <div>
              Roster rows: <b>{sum.roster_rows}</b>
            </div>
            <div>
              Matched: <b>{sum.matched}</b>
            </div>
            <div>
              Missing: <b>{sum.missing.length}</b>
            </div>
          </div>

          {matchedGrid}
          {missingGrid}
          {orphanGrid}
        </div>
      )}
    </div>
  );
}
