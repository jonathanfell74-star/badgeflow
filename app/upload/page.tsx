'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type MatchedCard = {
  file: string;
  name: string;
  url: string; // signed URL from API
};

type MissingRow = {
  file: string; // expected photo filename
  name: string; // human name derived from CSV
  row: Record<string, string>;
};

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

export default function UploadPage() {
  const sp = useSearchParams();
  const batchIdFromUrl = sp.get('batch_id') || '';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  // Keep batch_id in a hidden input + a banner if it’s missing
  const batchId = useMemo(() => batchIdFromUrl, [batchIdFromUrl]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setResult(null);

    const fd = new FormData(e.currentTarget);
    // Ensure batch_id is present
    if (batchId) fd.set('batch_id', batchId);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Upload failed');
      }
      setResult(json as UploadResult);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px' }}>
      {/* Minimal header nav kept simple */}
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

      {!batchId && (
        <div
          style={{
            background: '#fff3cd',
            color: '#5c4700',
            border: '1px solid #ffe58f',
            padding: '12px 14px',
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <strong>Heads up:</strong> no <code>batch_id</code> in the URL. Use{' '}
          <code>/upload?batch_id=&lt;your-batch-id&gt;</code> so the files are linked correctly.
        </div>
      )}

      <form onSubmit={onSubmit} encType="multipart/form-data" style={{ display: 'grid', gap: 16 }}>
        <input type="hidden" name="batch_id" value={batchId} />

        {/* Logo */}
        <label style={{ fontSize: 20, fontWeight: 700 }}>
          Company logo (PNG/SVG/JPG)
          <div style={{ marginTop: 8 }}>
            <input type="file" name="logo" accept=".png,.jpg,.jpeg,.svg" />
          </div>
        </label>

        {/* Roster */}
        <label style={{ fontSize: 20, fontWeight: 700 }}>
          Staff roster (CSV/XLSX) — must include a column named <code>photo_filename</code>
          <div style={{ marginTop: 8 }}>
            <input type="file" name="roster" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
          </div>
        </label>

        <p style={{ color: '#667085', marginTop: -4 }}>
          Tip: values in <code>photo_filename</code> must exactly match the image file names (e.g.
          <code> E1234.jpg</code>).
        </p>

        {/* Photos */}
        <label style={{ fontSize: 20, fontWeight: 700 }}>
          Staff photos (JPG/PNG) — you can select multiple
          <div style={{ marginTop: 8 }}>
            <input type="file" name="photos" accept="image/*" multiple />
          </div>
        </label>

        {/* Notes */}
        <label style={{ fontSize: 20, fontWeight: 700 }}>
          Notes (optional)
          <textarea
            name="notes"
            placeholder="Anything we should know about this batch?"
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
          disabled={busy}
          style={{
            background: '#0f766e',
            color: 'white',
            fontWeight: 700,
            padding: '14px 16px',
            borderRadius: 10,
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'Uploading…' : 'Upload files'}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Upload summary</h2>
          <div style={{ lineHeight: 1.9 }}>
            <div>Photos uploaded: <strong>{result.photos_uploaded}</strong></div>
            <div>Roster rows: <strong>{result.roster_rows}</strong></div>
            <div>Matched: <strong>{result.matched}</strong></div>
            <div>Missing: <strong>{result.missing.length}</strong></div>
          </div>

          {/* Matched cards */}
          <section style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              Matched cards ({result.matchedCards.length})
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {result.matchedCards.map((c) => (
                <CardPreview key={`m-${c.file}`} name={c.name} file={c.file} url={c.url} />
              ))}
            </div>
          </section>

          {/* Missing photo cards */}
          {result.missingRows.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                Missing photo for roster rows ({result.missingRows.length})
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 16,
                }}
              >
                {result.missingRows.map((m) => (
                  <CardPreview key={`x-${m.file}`} name={m.name || '(no name)'} file={m.file} url={null} />
                ))}
              </div>
            </section>
          )}

          {/* Orphan photos */}
          {result.orphanCards.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                Photos without a matching roster row ({result.orphanCards.length})
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 16,
                }}
              >
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

/**
 * ID-card-shaped preview. If `url` is null, we show a dashed placeholder.
 */
function CardPreview({
  name,
  file,
  url,
}: {
  name: string;
  file: string;
  url: string | null;
}) {
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
      {/* Left: text */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2, marginBottom: 6, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {name || '(no name)'}
        </div>
        <div style={{ color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {file}
        </div>
      </div>

      {/* Right: photo or placeholder */}
      <div style={{ position: 'relative', background: '#f8fafc' }}>
        {url ? (
          // Use plain <img> to avoid next/image domain config
          <img
            src={url}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
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
