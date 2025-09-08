'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();

  const logoRef = useRef<HTMLInputElement | null>(null);
  const rosterRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<HTMLInputElement | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData();

      // single company logo
      if (logoRef.current?.files?.[0]) {
        fd.append('logo', logoRef.current.files[0]);
      }

      // single roster (CSV/XLSX)
      if (rosterRef.current?.files?.[0]) {
        fd.append('roster', rosterRef.current.files[0]);
      }

      // multiple staff photos
      if (photosRef.current?.files && photosRef.current.files.length > 0) {
        Array.from(photosRef.current.files).forEach((f) =>
          fd.append('photos', f)
        );
      }

      if (notes.trim()) fd.append('notes', notes.trim());

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `Upload failed (${res.status})`);
      }

      const json = await res.json();
      // our API returns { ok, sessionId, ... }
      if (json?.sessionId) {
        router.push(`/review/${json.sessionId}`);
        return;
      }

      throw new Error('Unexpected response from server');
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Upload order files</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            Company logo (PNG/SVG/JPG)
          </label>
          <input
            ref={logoRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg"
            className="block w-full cursor-pointer rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Staff roster (CSV/XLSX) — must include a column named{' '}
            <code>photo_filename</code>
          </label>
          <input
            ref={rosterRef}
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="block w-full cursor-pointer rounded border p-2"
          />
          <p className="mt-2 text-xs text-gray-600">
            Tip: values in <code>photo_filename</code> must exactly match the
            image file names (e.g. <code>E1234.jpg</code>).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Staff photos (JPG/PNG) — you can select multiple
          </label>
          <input
            ref={photosRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png"
            className="block w-full cursor-pointer rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="block w-full rounded border p-2"
            placeholder="Anything we should know about this batch?"
          />
        </div>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {submitting ? 'Uploading…' : 'Upload files'}
        </button>
      </form>
    </div>
  );
}
