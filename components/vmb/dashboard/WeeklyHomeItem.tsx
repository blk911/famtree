"use client";

import Link from "next/link";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { ReactNode } from "react";

type Props = {
  title: string;
  summary: string;
  detail?: ReactNode;
  ctaLabel: string;
  onCta?: () => void;
  ctaHref?: string;
  ctaDisabled?: boolean;
};

export function WeeklyHomeItem({
  title,
  summary,
  detail,
  ctaLabel,
  onCta,
  ctaHref,
  ctaDisabled,
}: Props) {
  const ctaStyle = {
    display: "inline-block",
    marginTop: 12,
    padding: 0,
    border: "none",
    background: "none",
    fontSize: 14,
    fontWeight: 700,
    color: ctaDisabled ? VMB_THEME.muted : VMB_THEME.accent,
    cursor: ctaDisabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: ctaDisabled ? 0.55 : 1,
  } as const;

  return (
    <section
      style={{
        padding: "22px 0",
        borderBottom: `1px solid ${VMB_THEME.line}`,
      }}
    >
      <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <p style={{ margin: "0 0 4px", fontSize: 15, color: VMB_THEME.ink }}>{summary}</p>
      {detail ? (
        <div style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.5, color: VMB_THEME.muted }}>
          {detail}
        </div>
      ) : null}
      {ctaHref && !ctaDisabled ? (
        <Link href={ctaHref} style={ctaStyle}>
          {ctaLabel} →
        </Link>
      ) : (
        <button type="button" onClick={onCta} disabled={ctaDisabled} style={ctaStyle}>
          {ctaLabel} →
        </button>
      )}
    </section>
  );
}
