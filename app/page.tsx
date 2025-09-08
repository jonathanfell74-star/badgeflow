// app/review/[session_id]/page.tsx
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

type OrderRow = {
  id: string;
  stripe_session_id: string;
  roster_path: string | null;
  logo_path: string | null;
  company: string | null;
  contact_email: string | null;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
};

type RosterPerson = {
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  site?: string;
  photo_filename?: string;
  [key: string]: string | undefined;
};

export const runtime = "nodejs"; // server component
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

// --- tiny CSV parser good enough for our simple roster
function parseCSV(text: string): RosterPerson[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // naïve split (OK for our template without quoted commas)
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row as RosterPerson;
  });
}

function basename(path: string) {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

export default async function ReviewPage({
  params,
}: {
  params: { session_id: string };
}) {
  const sessionId = decodeURIComponent(params.session_id);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // 1) Get the order row by Stripe session id
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .single<OrderRow>();

  if (orderErr || !order) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">ID-card preview</h1>
        <p className="mt-4 text-red-600">
          Could not load order for session <code>{sessionId}</code>.
        </p>
        {orderErr && <pre className="mt-2 text-sm opacity-75">{orderErr.message}</pre>}
      </div>
    );
  }

  // 2) Download and parse roster CSV
  let rosterMap = new Map<
    string,
    { first_name: string; last_name: string; role?: string; site?: string }
  >();

  if (order.roster_path) {
    const { data: rosterBlob, error: rosterErr } = await supabase.storage
      .from("orders")
      .download(order.roster_path);

    if (!rosterErr && rosterBlob) {
      const rosterText = await rosterBlob.text();
      const roster = parseCSV(rosterText);

      for (const r of roster) {
        const key = (r.photo_filename || "").trim().toLowerCase();
        if (!key) continue;
        rosterMap.set(key, {
          first_name: (r.first_name || "").trim(),
          last_name: (r.last_name || "").trim(),
          role: (r.role || "").trim() || undefined,
          site: (r.site || "").trim() || undefined,
        });
      }
    }
  }

  // 3) List uploaded photos
  const photoPrefix = `${sessionId}/photos`;
  const { data: list, error: listErr } = await supabase.storage
    .from("orders")
    .list(photoPrefix, { limit: 100 });

  const photoFiles = !listErr && list ? list.filter((f) => !f.name.startsWith(".")) : [];

  // 4) Create signed URLs for display
  const photoPaths = photoFiles.map((f) => `${sessionId}/photos/${f.name}`);
  const { data: signed } = await supabase.storage
    .from("orders")
    .createSignedUrls(photoPaths, 60 * 60); // 1hr

  const idCards: Array<{
    url: string;
    file: string;
    first_name: string;
    last_name: string;
    role?: string;
    site?: string;
  }> = [];

  const unmatched: string[] = [];

  (signed || []).forEach((s) => {
    const file = basename(s.path);
    const row = rosterMap.get(file.toLowerCase());
    if (row) {
      idCards.push({
        url: s.signedUrl!,
        file,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        site: row.site,
      });
    } else {
      unmatched.push(file);
    }
  });

  // --- UI
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">ID-card preview</h1>
        <div className="text-sm text-slate-600">
          Session: <code className="px-1 py-0.5 bg-slate-100 rounded">{sessionId}</code>
        </div>
      </div>

      <p className="mt-2 text-slate-600">
        Showing <span className="font-semibold">{idCards.length}</span> matched card
        {idCards.length === 1 ? "" : "s"} (photo ↔︎ roster). Cards are mockups of the
        final layout (white card, photo on the right).
      </p>

      {/* Cards grid */}
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {idCards.map((c) => (
          <div
            key={c.file}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-3"
            style={{ aspectRatio: "86 / 54" }} // CR80-ish aspect
          >
            <div className="h-full w-full grid grid-cols-3 gap-3">
              {/* Left: text */}
              <div className="col-span-2 flex flex-col justify-center">
                <div className="text-lg font-semibold leading-tight truncate">
                  {c.first_name} {c.last_name}
                </div>
                {c.role && (
                  <div className="text-sm text-slate-600 truncate">{c.role}</div>
                )}
                {c.site && (
                  <div className="text-sm text-slate-600 truncate">{c.site}</div>
                )}
              </div>

              {/* Right: photo */}
              <div className="col-span-1 flex items-center justify-center">
                {/* image fills a rounded frame on the right */}
                <div className="relative w-full h-full rounded-md overflow-hidden border border-slate-200">
                  <Image
                    src={c.url}
                    alt={`${c.first_name} ${c.last_name}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
            {/* filename footer */}
            <div className="mt-2 text-[11px] text-slate-500 text-right">{c.file}</div>
          </div>
        ))}
      </div>

      {/* Unmatched section */}
      <div className="mt-10">
        <details className="group">
          <summary className="cursor-pointer select-none text-slate-700 font-medium">
            Unmatched photos ({unmatched.length})
          </summary>
          {unmatched.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">All photos matched the roster.</p>
          ) : (
            <ul className="mt-2 list-disc pl-6 text-sm text-slate-700">
              {unmatched.map((f) => (
                <li key={f}>
                  <code>{f}</code> — no row with matching <code>photo_filename</code>
                </li>
              ))}
            </ul>
          )}
        </details>
      </div>

      <div className="mt-8">
        <a
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
