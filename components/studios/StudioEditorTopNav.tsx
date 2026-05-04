"use client";

import Link from "next/link";

const ITEMS: { href: string; label: string }[] = [
  { href: "#about", label: "About" },
  { href: "#team", label: "Team" },
  { href: "#services", label: "Services" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#book", label: "Book" },
  { href: "#contact", label: "Contact" },
  { href: "#vmb-salons", label: "VMB Salons" },
];

/** Dark salon-style anchor row for the studio editor / preview page only. */
export function StudioEditorTopNav() {
  return (
    <nav
      aria-label="Studio sections"
      className="mb-4 overflow-x-auto rounded-xl bg-[#0f0f0f] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-white/10 sm:px-5"
    >
      <ul className="flex min-w-max flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-x-8">
        {ITEMS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-block py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/88 transition hover:text-white sm:text-[11px]"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
