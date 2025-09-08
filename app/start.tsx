'use client';

import React, {useEffect, useState} from 'react';
import Link from 'next/link';

type UploadSummary = {
  photosUploaded: number;
  rosterRows: number;
  matched: number;
  missing: string[];
  previewPhotoKeys: string[]; // storage keys for the two thumbnails we show
};

export default function StartPage() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [roster, setRoster] = useState<File | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [walletAddon, setWalletAddon] = useState<boolean>(false);
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create (or resume) a draft order
  useEffect(() => {
    const existing = window.localStorage.getItem('badgeflow_order_id');
    if (existing) {
      setOrderId(existing);
    } else {
      (async () => {
        const res = await fetch('/api/orders/draft', { method: 'POST' });
        const data = await res.json();
        setOrderId(data.order_id);
        window.localStorage.setItem('badgeflow_order_id', data.order_id);
      })();
    }
  }, []);

  async function handleUpload() {
    if (!orderId) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('order_id', orderId);
      if (logo) fd.append('logo', logo);
      if (roster) fd.append('roster', roster);
      if (photos) {
        Array.from(photos).forEach(f => fd.append('photos', f));
      }
      fd.append('notes', notes);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data: UploadSummary = await res.json();
      setSummary(data);
      setBusy(false);
    } catch (e:any) {
      setBusy(false);
      setError(e.message || 'Upload error');
    }
  }

  async function checkout() {
    if (!orderId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ order_id: orderId, walletAddon })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout error');
      window.location.href = data.url;
    } catch (e:any) {
      setBusy(false);
      setError(e.message || 'Checkout error');
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="text-xl font-bold">BadgeFlow</Link>
        <nav className="space-x-6 text-sm">
          <Link href="/pricing">Pricing</Link>
          <Link href="/single">Single card</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
      </div>

      <h1 className="text-2xl font-semibold mb-2">Start an order</h1>
      <p className="text-sm text-gray-600 mb-6">
        Upload your company logo, roster (CSV/XLSX with a <code>photo_filename</code> column),
        and staff photos. We’ll charge only for the records we can use.
      </p>

      {!orderId && <div className="rounded-md bg-gray-100 p-4 text-sm">Preparing draft order…</div>}

      {orderId && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div>
              <label className="font-medium">Company logo (PNG/SVG/JPG)</label><br/>
              <input type="file" accept="image/*,image/svg+xml" onChange={e => setLogo(e.target.files?.[0]||null)} />
            </div>
            <div>
              <label className="font-medium">Staff roster (CSV/XLSX — must include <code>photo_filename</code>)</label><br/>
              <input type="file" accept=".csv,.xlsx" onChange={e => setRoster(e.target.files?.[0]||null)} />
            </div>
            <div>
              <label className="font-medium">Staff photos (JPG/PNG) — filenames must match the <code>photo_filename</code> column</label><br/>
              <input type="file" accept=".jpg,.jpeg,.png" multiple onChange={e => setPhotos(e.target.files)} />
            </div>
            <div className="pt-2">
              <label className="font-medium">Notes (optional)</label>
              <textarea className="mt-1 w-full rounded-md border p-2" rows={4} value={notes} onChange={e=>setNotes(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input id="wallet" type="checkbox" checked={walletAddon} onChange={e=>setWalletAddon(e.target.checked)} />
              <label htmlFor="wallet">Add Mobile Wallet Pass (+£4.95 base, same % discounts)</label>
            </div>

            <button
              onClick={handleUpload}
              disabled={busy}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? 'Uploading…' : 'Upload files'}
            </button>

            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          </div>

          {summary && (
            <section className="rounded-xl border p-4">
              <h2 className="text-lg font-semibold mb-3">Upload summary</h2>
              <p>Photos uploaded: <b>{summary.photosUploaded}</b></p>
              <p>Roster rows: <b>{summary.rosterRows}</b></p>
              <p>Matched: <b>{summary.matched}</b></p>
              <p>Missing: <b>{summary.rosterRows - summary.matched}</b></p>

              <div className="mt-4 flex gap-3">
                <Link
                  href={`/review/${orderId}`}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-white text-sm hover:bg-indigo-700"
                >
                  Preview ID cards
                </Link>
                <button
                  onClick={checkout}
                  disabled={busy || summary.matched === 0}
                  className="rounded-md bg-sky-600 px-4 py-2 text-white text-sm hover:bg-sky-700 disabled:opacity-50"
                >
                  Proceed to payment
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
