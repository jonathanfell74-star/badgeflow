'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type MatchedCard = { file: string; name: string; url: string };
type MissingRow = { file: string; name: string; row: Record<string, string> };
type UploadResult = {
  ok: boolean;
  batch_id: string;
  photos_uploaded: number;
  roster_rows: number;
  matched: number;
  missing: string[];
  matchedCards: MatchedCard[];
  missingRows: MissingRow[];
  orphanCards: { file: string; url: string }[];
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
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
        <a href="/" style={{ fontWeight: 700, textDecoration: 'underline' }}>BadgeFlow</a>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <a href="/pricing">Pricing</a>
          <a href="/order">Start an order</a>
          <a href="/upload" style={{ fontWeight: 700, textDecoration: 'underline' }}>Upload</a>
          <a href="/dashboard">Dashboard</a>
        </div>
      </div>

      <h1 style={{ fontSize: 40, fontWeight: 800, margin: '12px 0 16px' }}>Upload order files</h1>

      {!batchId ? (
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              background: '#eef2ff',
              border: '1px solid #c7d2fe',
              color: '#3730a3',
              padding: '12px 14px',
              borderRadius: 8,
            }}
          >
            Click “Start new upload” to create a batch, then you can attach your logo, roster and photos.
          </div>
          <button
            onClick={startNewBatch}
            disabled={busy}
            style={{
              width: 240,
              background: '#4f46e5',
              color: 'white',
              fontWeight: 700,
              padding: '12px 14px',
              borderRadius: 10,
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Creating…' : 'Start new upload'}
          </button>
        </div>
      ) : (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '10px 12px',
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          Batch ID: <code>{batchId}</code>
        </div>
      )}

      <form onSubmit={onSubmit} encType="multipart/form-data" style={{ display: 'grid', gap: 16 }}>
        <input type="hidden" name="batch_id" value={batchId} />

        <label style={{ fontSize: 20, fontWeight: 700 }}>
          Company logo (PNG/SVG/JPG)
          <div style={{ marginTop: 8 }}>
            <input type="file" name="logo" accept=".png,.jpg,.jpeg,.svg" disabled={!batchId} />
          </div>
        </label>

        <label style={{ fontSize: 20, fontWeight: 700 }}>
          Staff roster (CSV/XLSX) — must include a column named <code>photo_filename</code>
          <div style={{ marginTop: 8 }}>
            <input
              type="file"
              name="roster"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              disabled={!batchId}
            />
          </div>
        </label>

        <p style={{ color: '#667085', marginTop: -4 }}>
          Tip: values in <code>photo_filename</code> must exactly match the image file names (e.g.
          <code> E1234.jpg</code>).
        </p>

        <label style={{ fontSize: 20, fontWeight: 700 }}>
          Staff photos (JPG/PNG) — you can select multiple
          <div style={{ marginTop: 8 }}>
            <input type="file" name="photos" accept="image/*" multiple disabled={!batchId} />
          </div>
        </label>

        <label style={{ fontSize: 20, fontWeight: 700 }}>
          Notes (optional)
          <textarea
            name="notes"
            placeholder="Anything we should know about this batch?"
            disabled={!batchId}
            style={{
              display: 'block',
              marginTop: 8,
              width: '100%',
              minHeight: 120,
              padding: 12,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
            }}
          />
        </label>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#7f1d1d',
              border: '1px solid #fecaca',
              padding: '10px 12px',
              borderRadius: 8,
            }}
          >
            {JSON.stringify({ error })}
          </div>
        )}

        <button
          type="submit"
          disabled={!batchId || busy}
          style={{
            background: '#0f766e',
            color: 'white',
            fontWeight: 700,
            padding: '14px 16px',
            borderRadius: 10,
            border: 'none',
            cursor: !batchId || busy ? 'not-allowed' : 'pointer',
            opacity: !batchId || busy ? 0.7 : 1,
          }}
        >
          {busy ? 'Uploading…' : 'Upload files'}
        </button>
      </form>

      {/* Your existing summary & previews render here unchanged (result state) */}
      {result && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Upload summary</h2>
          <div style={{ lineHeight: 1.9 }}>
            <div>Photos uploaded: <strong>{result.photos_uploaded}</strong></div>
            <div>Roster rows: <strong>{result.roster_rows}</strong></div>
            <div>Matched: <strong>{result.matched}</strong></div>
            <div>Missing: <strong>{result.missing.length}</strong></div>
          </div>

          {/* Matched */}
          <section style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              Matched cards ({result.matchedCards.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {result.matchedCards.map((c) => (
                <CardPreview key={`m-${c.file}`} name={c.name} file={c.file} url={c.url} />
              ))}
            </div>
          </section>

          {/* Missing rows */}
          {result.missingRows.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                Missing photo for roster rows ({result.missingRows.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {result.missingRows.map((m) => (
                  <CardPreview key={`x-${m.file}`} name={m.name || '(no name)'} file={m.file} url={null} />
                ))}
              </div>
            </section>
          )}

          {/* Orphans */}
          {result.orphanCards.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                Photos without a matching roster row ({result.orphanCards.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {result.orphanCards.map((o) => (
                  <CardPreview key={`o-${o.file}`} name="(no roster match)" file={o.file} url={o.url} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function CardPreview({ name, file, url }: { name: string; file: string; url: string | null }) {
  return (
    <div
      style={{
        height: 180,
        borderRadius: 14,
        boxShadow: '0 1px 2px rgba(0,0,0,.07), 0 4px 12px rgba(0,0,0,.06)',
        background: '#fff',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '1fr 150px',
      }}
    >
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2, marginBottom: 6, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {name || '(no name)'}
        </div>
        <div style={{ color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {file}
        </div>
      </div>
      <div style={{ position: 'relative', background: '#f8fafc' }}>
        {url ? (
          <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '2px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: 12,
            }}
          >
            no image
          </div>
        )}
      </div>
    </div>
  );
}
