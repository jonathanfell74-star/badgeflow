'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

function CardPreview({forename, surname, title, department, photoUrl}:{forename:string; surname:string; title?:string; department?:string; photoUrl?:string}) {
  return (
    <div className="rounded-2xl border shadow-sm w-[520px] h-[320px] bg-white flex overflow-hidden">
      {/* left: text */}
      <div className="flex-1 p-6 flex flex-col justify-center">
        <div className="text-2xl font-semibold">{forename || 'Forename'} {surname || 'Surname'}</div>
        <div className="mt-2 text-gray-600">{title || 'Job title'}</div>
        <div className="text-gray-500">{department || 'Department'}</div>
      </div>
      {/* right: photo */}
      <div className="w-[180px] bg-gray-100 flex items-center justify-center">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="photo preview" className="h-[260px] w-[160px] object-cover rounded-md" />
        ) : (
          <div className="h-[260px] w-[160px] bg-gray-200 rounded-md" />
        )}
      </div>
    </div>
  );
}

export default function SingleCardPage() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [forename, setForename] = useState('');
  const [surname, setSurname] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = window.localStorage.getItem('badgeflow_order_id');
    setOrderId(id);
  }, []);

  useEffect(() => {
    if (photo) {
      const u = URL.createObjectURL(photo);
      setPhotoUrl(u);
      return () => URL.revokeObjectURL(u);
    }
  }, [photo]);

  async function addToBatch() {
    if (!orderId || !photo || !forename || !surname) {
      setMsg('Please fill name and choose a photo.');
      return;
    }
    setSaving(true);
    setMsg(null);
    const fd = new FormData();
    fd.append('order_id', orderId);
    fd.append('forename', forename);
    fd.append('surname', surname);
    fd.append('title', title);
    fd.append('department', department);
    fd.append('photo', photo);
    const res = await fetch('/api/orders/add-manual', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || 'Failed to add');
      setSaving(false);
      return;
    }
    setSaving(false);
    setMsg('Added to batch. You can add another, or go to Start to upload/checkout.');
    setForename(''); setSurname(''); setTitle(''); setDepartment(''); setPhoto(null); setPhotoUrl(undefined);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Single card — live preview</h1>
        <p className="text-sm text-gray-600">Cards are added to your current draft order.</p>
      </div>

      {!orderId && (
        <div className="rounded-md bg-yellow-50 p-3 text-sm">
          Start an order first on <a className="underline" href="/start">/start</a> so we can store your batch.
        </div>
      )}

      {orderId && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <form className="space-y-4" onSubmit={e=>{e.preventDefault(); addToBatch();}}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Forename</label>
                <input className="mt-1 w-full rounded-md border p-2" value={forename} onChange={e=>setForename(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Surname</label>
                <input className="mt-1 w-full rounded-md border p-2" value={surname} onChange={e=>setSurname(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Job title</label>
              <input className="mt-1 w-full rounded-md border p-2" value={title} onChange={e=>setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Department</label>
              <input className="mt-1 w-full rounded-md border p-2" value={department} onChange={e=>setDepartment(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Photo (JPG/PNG)</label><br/>
              <input type="file" accept=".jpg,.jpeg,.png" onChange={e=>setPhoto(e.target.files?.[0]||null)} />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add to batch'}
            </button>
            {msg && <div className="text-sm text-gray-700">{msg}</div>}
          </form>

          <div>
            <CardPreview
              forename={forename}
              surname={surname}
              title={title}
              department={department}
              photoUrl={photoUrl}
            />
          </div>
        </div>
      )}
    </main>
  );
}
