'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className={`text-sm hover:text-sky-700 ${
        isActive(href) ? 'font-semibold text-sky-700' : 'text-gray-700'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold">
          BadgeFlow
        </Link>
        <nav className="flex items-center gap-6">
          <NavLink href="/pricing" label="Pricing" />
          <NavLink href="/start" label="Start an order" />
          <NavLink href="/single" label="Single card" />
          <NavLink href="/dashboard" label="Dashboard" />
        </nav>
      </div>
    </header>
  );
}
