// app/review/[sessionId]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// Always fetch fresh data after uploads
export const dynamic = "force-dynamic";

// Minimal CSV utils for our simple format
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()));
  return { headers, rows };
}

function toMapByHeader(
  headers: string[],
  rows: string[][],
  keyHeader: string
): Map<string, Record<string, string>> {
  const keyIdx = headers.findIndex((h) => h.toLowerCase() === keyHeader.toLowerCase());
  const map = new Map<string, Record<string, string>>();
  if (keyIdx === -1) return map;
  for (const row of rows) {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => (rec[h] = row[i] ?? ""));
    const k = (row[keyIdx] ?? "").toLowerCase();
    if (k) map.set(k, rec);
  }
  return map;
}

export default async function ReviewPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const sessionId = params.sessionId;

  // 1) Get the most recent order by session id
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (orderErr || !order) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Review uploads</h1>
        <p className="mt-4 text-red-600">Could not find an order for this session.</p>
        <Link href="/dashboard" className="mt-6 inline-block text-indigo-600">
          Back to dashboard
        </Link>
      </main>
    );
  }

  const { roster_path, logo_path } = order as {
    roster_path: string | null;
    logo_path: string | null;
  };

  // 2) Read roster CSV (if present)
  let rosterText = "";
  if (roster_path) {
    const { data: rosterFile } = await supabase.storage.from("orders").download(roster_path);
    if (rosterFile) rosterText = await rosterFile.text();
  }
  const { headers, rows } = parseCsv(rosterText);
  const rosterMap = toMapByHeader(headers, rows, "photo_filename");

  // 3) List uploaded photos for this session
  const photoPrefix = `uploads/${sessionId}/photos`;
  const { data: listing } = await supabase.storage.from("orders").list(photoPrefix, {
    limit: 1000,
  });
  const files = (listing ?? [])
    .filter((o) => o.name && !o.name.endsWith("/"))
    .map((o) => o.name);

  // 4) Create signed URLs and match records
  type Match = {
    file: string;
    url: string;
    rec?: Record<string, string>;
  };

  const matches: Match[] = [];
  const missing: string[] = [];

  for (const name of files) {
    const fullPath = `${photoPrefix}/${name}`;
    const { data: signed } = await supabase.storage
      .from("orders")
      .createSignedUrl(fullPath, 60 * 10); // 10 minutes
    const url = signed?.signedUrl ?? "";

    const rec = rosterMap.get(name.toLowerCase());
    if (rec) {
      matches.push({ file: name, url, rec });
    } else {
      missing.push(name);
    }
  }

  // 5) CSV download of missing items (must be used on <a>, not <button>)
  const missingCsv =
    "missing_photo_filename\n" + missing.map((m) => `"${m}"`).join("\n");
  const missingHref = `data:text/csv;charset=utf-8,${encodeURIComponent(missingCsv)}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">BadgeFlow</Link>
        <nav className="flex gap-6">
          <Link href="/pricing" className="text-slate-700 hover:text-slate-900">Pricing</Link>
          <Link href="/order" className="text-slate-700 hover:text-slate-900">Start an order</Link>
          <Link href="/dashboard" className="text-slate-700 hover:text-slate-900">Dashboard</Link>
        </nav>
      </header>

      <section className="mt-10 grid gap-10 lg:grid-cols-[360px_1fr]">
        {/* Summary / actions */}
        <aside className="rounded-2xl border p-6">
          <h2 className="text-xl font-semibold">Upload summary</h2>
          <dl className="mt-4 space-y-2 text-slate-700">
            <div className="flex justify-between">
              <dt>Photos uploaded</dt>
              <dd className="font-medium">{files.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Roster rows</dt>
              <dd className="font-medium">{rows.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Matched</dt>
              <dd className="font-medium text-emerald-700">{matches.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Missing</dt>
              <dd className="font-medium text-amber-700">{missing.length}</dd>
            </div>
          </dl>

          {missing.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-slate-700">
                Show missing filenames
              </summary>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </details>
          )}

          <a
            href={missingHref}
            download="missing_filenames.csv"
            className="mt-4 inline-block w-full rounded-lg bg-sky-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-sky-700"
          >
            Download missing list (CSV)
          </a>
        </aside>

        {/* Card previews */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            {logo_path && <SmallLogo path={logo_path} />}
            <h2 className="text-xl font-semibold">Matched ID card previews</h2>
          </div>

          {matches.length === 0 ? (
            <p className="text-slate-600">
              No matches yet. Ensure your roster has a <code>photo_filename</code> column
              and filenames match the uploaded images.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map(({ file, url, rec }) => {
                const forename = rec?.forename || rec?.first_name || rec?.firstname || "";
                const surname = rec?.surname || rec?.last_name || rec?.lastname || "";
                const jobTitle = rec?.job_title || rec?.title || "";

                return (
                  <li key={file}>
                    <div className="rounded-2xl border bg-white p-4 shadow-sm">
                      {/* Simple ID card: name left, photo right */}
                      <div className="relative mx-auto flex h-44 w-full max-w-sm items-center rounded-xl border bg-white p-3">
                        <div className="flex-1 pr-3">
                          <p className="text-base font-semibold leading-tight">
                            {forename} {surname}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{jobTitle}</p>
                          <p className="mt-3 break-words text-xs text-slate-500">{file}</p>
                        </div>
                        <div className="h-32 w-24 overflow-hidden rounded-md border bg-slate-50">
                          {url ? (
                            <Image
                              src={url}
                              alt={`${forename} ${surname}`}
                              width={96}
                              height={128}
                              className="h-32 w-24 object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="h-full w-full bg-slate-100" />
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

// Small server component to render uploaded company logo (if present)
async function SmallLogo({ path }: { path: string }) {
  const { data } = await supabase.storage.from("orders").createSignedUrl(path, 60 * 10);
  const url = data?.signedUrl ?? "";
  if (!url) return null;
  return (
    <Image
      src={url}
      alt="Company logo"
      width={40}
      height={40}
      className="rounded bg-white object-contain p-1 ring-1 ring-slate-200"
      unoptimized
    />
  );
}
