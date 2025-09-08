// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">BadgeFlow</Link>
        <nav className="flex gap-6">
          <Link href="/pricing" className="text-slate-700 hover:text-slate-900">Pricing</Link>
          <Link href="/order" className="text-slate-700 hover:text-slate-900">Start an order</Link>
          <Link href="/dashboard" className="text-slate-700 hover:text-slate-900">Dashboard</Link>
        </nav>
      </header>

      <section className="mt-16">
        <h1 className="text-4xl font-semibold tracking-tight">
          Simple ID card ordering — same-day dispatch before 3pm
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Upload a staff rota, optional photos, and we’ll handle printing & mobile wallet passes.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/order"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Start an order
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-slate-300 px-6 py-3 font-medium hover:bg-slate-50"
          >
            View pricing
          </Link>
        </div>
      </section>
    </main>
  );
}
