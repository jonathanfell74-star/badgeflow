'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type MatchedCard = { file: string; name: string; url: string };
type MissingRow = { file: string; name: string; row: Record<string, string> };
type OrphanCard = { file: string; url: string };

type UploadResult = {
  ok: boolean;
  batch_id: string;
  photos_uploaded: number;
  roster_rows: number;
  matched: number;
  missing: string[];

  matchedCards: MatchedCard[];
  missingRows: MissingRow[];
  orphanCards: OrphanCard[];

  // Optional (future): if API returns a signed logo URL we’ll show it
  logoUrl?: string | null;
};

export default function UploadClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const batchId = useMemo(() => sp.get('batch_id') || '', [sp]);

  async function startNewBatch() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/batches/new', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not create batch');
      router.replace(`/upload?batch_id=${json.batch_id}`);
    } catch (e: any) {
      setError(e?.message || 'Could not create batch');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!batchId) {
      setError('Please start a new upload first.');
      return;
    }
    setError(null);
    setBusy(true);
    setResult(null);

    const fd = new FormData(e.currentTarget);
    fd.set('batch_id', batchId);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      setResult(json as UploadResult);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Minimal header */}
      <div className="mb-2 flex items-center gap-4">
        <a href="/" className="font-bold underline">BadgeFlow</a>
        <nav className="ml-auto flex items-center gap-4 text-slate-600">
          <a href="/pricing">Pricing</a>
          <a href="/order">Start an order</a>
          <a href="/upload" className="font-semibold underline">Upload</a>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </div>

      <h1 className="mb-4 text-4xl font-extrabold">Upload order files</h1>

      {!batchId ? (
        <div className="mb-6 space-y-3">
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-indigo-900">
            Click <b>Start new upload</b> to create a batch, then attach your logo, roster and photos.
          </div>
          <button
            onClick={startNewBatch}
            disabled={busy}
            className="w-56 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Start new upload'}
          </button>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
          Batch ID: <code>{batchId}</code>
        </div>
      )}

      <form onSubmit={onSubmit} encType="multipart/form-data" className="grid gap-4">
        <input type="hidden" name="batch_id" value={batchId} />

        <div>
          <label className="block text-lg font-semibold">
            Company logo (PNG/SVG/JPG)
          </label>
          <input
            type="file"
            name="logo"
            accept=".png,.jpg,.jpeg,.svg"
            className="mt-2"
            disabled={!batchId}
          />
        </div>

        <div>
          <label className="block text-lg font-semibold">
            Staff roster (CSV/XLSX) — must include a column named <code>photo_filename</code>
          </label>
          <input
            type="file"
            name="roster"
            accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="mt-2"
            disabled={!batchId}
          />
          <p className="mt-1 text-sm text-slate-500">
            Tip: <code>photo_filename</code> must exactly match the image file names (e.g. <code>E1234.jpg</code>).
          </p>
        </div>

        <div>
          <label className="block text-lg font-semibold">
            Staff photos (JPG/PNG) — you can select multiple
          </label>
          <input
            type="file"
            name="photos"
            accept="image/*"
            multiple
            className="mt-2"
            disabled={!batchId}
          />
        </div>

        <div>
          <label className="block text-lg font-semibold">Notes (optional)</label>
          <textarea
            name="notes"
            placeholder="Anything we should know about this batch?"
            className="mt-2 w-full rounded-md border p-3"
            rows={4}
            disabled={!batchId}
          />
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!batchId || busy}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Upload files'}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-8 rounded-lg border p-4">
          <h2 className="mb-2 text-xl font-semibold">Upload summary</h2>
          <div className="text-sm">
            <div>Photos uploaded: <b>{result.photos_uploaded}</b></div>
            <div>Roster rows: <b>{result.roster_rows}</b></div>
            <div>Matched: <b>{result.matched}</b></div>
            <div>Missing: <b>{result.missing.length}</b></div>
          </div>

          {/* Matched */}
          {result.matchedCards.length > 0 && (
            <>
              <h3 className="mt-6 text-lg font-semibold">
                Matched cards ({result.matchedCards.length})
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.matchedCards.map((c) => (
                  <IDCard
                    key={`m-${c.file}`}
                    name={c.name}
                    subline={c.file}
                    imgUrl={c.url}
                    badge={{ text: 'Matched', color: 'emerald' }}
                    logoUrl={result.logoUrl ?? null}
                  />
                ))}
              </div>
            </>
          )}

          {/* Missing photo */}
          {result.missingRows.length > 0 && (
            <>
              <h3 className="mt-6 text-lg font-semibold">
                Missing photo for roster rows ({result.missingRows.length})
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.missingRows.map((m) => (
                  <IDCard
                    key={`x-${m.file}`}
                    name={m.name || '(no name)'}
                    subline={m.file}
                    imgUrl={null}
                    badge={{ text: 'Missing photo', color: 'red' }}
                    logoUrl={result.logoUrl ?? null}
                  />
                ))}
              </div>
            </>
          )}

          {/* Orphan photos */}
          {result.orphanCards.length > 0 && (
            <>
              <h3 className="mt-6 text-lg font-semibold">
                Photos without a matching roster row ({result.orphanCards.length})
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.orphanCards.map((o) => (
                  <IDCard
                    key={`o-${o.file}`}
                    name="(no roster match)"
                    subline={o.file}
                    imgUrl={o.url}
                    badge={{ text: 'No roster row', color: 'yellow' }}
                    logoUrl={result.logoUrl ?? null}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** CR80 ID card preview (85.6 × 54 mm) with robust image fallback */
function IDCard({
  name,
  subline,
  imgUrl,
  badge,
  logoUrl,
}: {
  name: string;
  subline?: string;
  imgUrl: string | null;
  logoUrl?: string | null;
  badge?: { text: string; color: 'emerald' | 'red' | 'yellow' };
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const badgeClass =
    badge?.color === 'emerald'
      ? 'bg-emerald-100 text-emerald-800'
      : badge?.color === 'red'
      ? 'bg-rose-100 text-rose-800'
      : 'bg-amber-100 text-amber-800';

  const showPlaceholder = !imgUrl || imgFailed;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      style={{ aspectRatio: '86 / 54' }}
    >
      {/* Top brand bar */}
      <div className="relative h-6 w-full bg-gradient-to-r from-sky-600 to-indigo-600">
        {/* lanyard slot */}
        <div className="absolute left-1/2 top-1.5 h-2 w-12 -translate-x-1/2 rounded-sm bg-white/80 shadow-sm" />
      </div>

      {/* Badge */}
      {badge && (
        <span className={`absolute right-2 top-2 rounded px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
          {badge.text}
        </span>
      )}

      {/* Body */}
      <div className="grid h-[calc(100%-1.5rem)] grid-cols-[1fr,110px] gap-3 p-3">
        {/* Left: identity text + tiny logo */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-4 w-4 rounded-sm object-contain ring-1 ring-white/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-4 w-4 rounded-sm bg-sky-600" />
            )}
            <div className="truncate text-[10px] uppercase tracking-wide text-slate-500">
              Company
            </div>
          </div>

          <div className="mt-1 truncate text-lg font-semibold text-slate-900">
            {name || '—'}
          </div>
          {subline && (
            <div className="truncate text-[12px] text-slate-500">{subline}</div>
          )}
        </div>

        {/* Right: photo (or placeholder) */}
        <div className="overflow-hidden rounded-md ring-1 ring-slate-200">
          {showPlaceholder ? (
            <div className="flex h-full w-full items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center text-slate-400">
                <div className="mb-1 h-10 w-10 rounded-full border-2 border-dashed border-slate-300" />
                <div className="text-[11px]">no image</div>
              </div>
            </div>
          ) : (
            <img
              src={imgUrl!}
              alt=""               // avoid alt text showing if image fails
              className="h-full w-full object-cover"
              loading="lazy"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
          )}
        </div>
      </div>

      {/* Tiny debug link so you can test the actual signed URL */}
      {!showPlaceholder && imgUrl && (
        <a
          href={imgUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-2 right-2 text-[10px] text-slate-500 underline"
        >
          Open photo
        </a>
      )}
    </div>
  );
}
