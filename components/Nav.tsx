// components/Nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function linkClass(path: string, href: string) {
  const active = path === href;
  return `text-sm ${active ? "text-purple-700 font-semibold" : "text-gray-700 hover:text-black"}`;
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto max-w-5xl flex items-center justify-between py-4 px-6">
      <Link href="/" className="text-2xl font-black text-purple-700">
        BadgeFlow
      </Link>
      <div className="flex gap-6">
        <Link href="/pricing" className={linkClass(pathname, "/pricing")}>
          Pricing
        </Link>
        <Link href="/order" className={linkClass(pathname, "/order")}>
          Start an order
        </Link>
        <Link href="/upload" className={linkClass(pathname, "/upload")}>
          Upload
        </Link>
        <Link href="/dashboard" className={linkClass(pathname, "/dashboard")}>
          Dashboard
        </Link>
      </div>
    </nav>
  );
}
