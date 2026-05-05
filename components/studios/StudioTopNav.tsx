"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/** Matches studio shell: builder workflow vs client-facing site vs published live page. */
export type StudioTopNavMode = "edit" | "preview" | "published";

export type StudioViewMode = StudioTopNavMode;

const LINK_CLASS =
  "inline-block py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/88 transition hover:text-white sm:text-[11px]";

const BUILDER_NAV: readonly { href: string; label: string }[] = [
  { href: "#contact-info", label: "CONTACT INFO" },
  { href: "#marketing", label: "MARKETING" },
  { href: "#services", label: "SERVICES" },
  { href: "#portfolio", label: "PORTFOLIO" },
  { href: "#launch", label: "LAUNCH" },
];

const BUSINESS_NAV: readonly { href: string; label: string }[] = [
  { href: "#about", label: "ABOUT" },
  { href: "#services", label: "SERVICES" },
  { href: "#lessons", label: "PERFORMANCE" },
  { href: "#location", label: "LOCATION" },
  { href: "#contact", label: "CONTACT" },
];

export function StudioTopNav({
  mode,
  onLogout,
}: {
  mode: StudioTopNavMode;
  /** Optional override; default POST /api/auth/logout then home. */
  onLogout?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const items = mode === "edit" ? BUILDER_NAV : BUSINESS_NAV;

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <nav
      aria-label={mode === "edit" ? "Studio builder sections" : "Studio sections"}
      className="mb-4 overflow-x-auto rounded-xl bg-[#0f0f0f] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-white/10 sm:px-5"
    >
      <ul className="flex min-w-max flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-8">
        {items.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className={LINK_CLASS}>
              {label}
            </Link>
          </li>
        ))}
        {mode !== "edit" ? (
          <li key="logout">
            <button type="button" onClick={() => void handleLogout()} className={`${LINK_CLASS} cursor-pointer border-0 bg-transparent`}>
              LOG OUT
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
