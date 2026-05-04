"use client";

import Link from "next/link";

export type StudioEditorNavItem = { href: string; label: string };

export const STUDIO_EDITOR_DEFAULT_NAV: readonly StudioEditorNavItem[] = [
  { href: "#about", label: "ABOUT" },
  { href: "#team", label: "TEAM" },
  { href: "#services", label: "SERVICES" },
  { href: "#portfolio", label: "PORTFOLIO" },
  { href: "#book", label: "BOOK" },
  { href: "#contact", label: "CONTACT" },
  { href: "#vmb-salons", label: "VMB SALONS" },
];

/** Dark salon-style anchor row for the studio editor / preview page only. */
export function StudioEditorTopNav({
  items = STUDIO_EDITOR_DEFAULT_NAV,
}: {
  items?: readonly StudioEditorNavItem[];
}) {
  const list = Array.isArray(items) && items.length > 0 ? items : [...STUDIO_EDITOR_DEFAULT_NAV];

  return (
    <nav
      aria-label="Studio sections"
      className="mb-4 overflow-x-auto rounded-xl bg-[#0f0f0f] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-white/10 sm:px-5"
    >
      <ul className="flex min-w-max flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-x-8">
        {list.map(({ href, label }) => (
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
