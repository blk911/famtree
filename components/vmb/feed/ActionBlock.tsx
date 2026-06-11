"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  title: string;
  summary: string;
  names?: string[];
  ctaLabel: string;
  onCta?: () => void;
  ctaHref?: string;
  ctaDisabled?: boolean;
  children?: ReactNode;
};

export function ActionBlock({
  title,
  summary,
  names = [],
  ctaLabel,
  onCta,
  ctaHref,
  ctaDisabled,
  children,
}: Props) {
  const ctaStyle = {
    display: "inline-block",
    marginTop: 14,
    padding: 0,
    border: "none",
    background: "none",
    fontSize: 14,
    fontWeight: 700,
    color: ctaDisabled ? VMB_THEME.muted : VMB_THEME.accent,
    cursor: ctaDisabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: ctaDisabled ? 0.5 : 1,
  } as const;

  return (
    <section style={{ padding: "24px 0", borderBottom: `1px solid ${VMB_THEME.line}` }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <p style={{ margin: "0 0 10px", fontSize: 15, color: VMB_THEME.ink }}>{summary}</p>
      {names.length > 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted, lineHeight: 1.5 }}>
          {names.slice(0, 3).join(" · ")}
        </p>
      ) : null}
      {children}
      {ctaHref && !ctaDisabled ? (
        <Link href={ctaHref} style={ctaStyle}>
          {ctaLabel}
        </Link>
      ) : (
        <button type="button" onClick={onCta} disabled={ctaDisabled} style={ctaStyle}>
          {ctaLabel}
        </button>
      )}
    </section>
  );
}
