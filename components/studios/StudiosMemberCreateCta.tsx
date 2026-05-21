"use client";

import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { studioBuilderHref } from "@/lib/studios/builder/entry";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE } from "@/lib/studios/visual";

type Props = {
  isAuthenticated: boolean;
  continueDraftId?: string | null;
  variant?: "hero" | "banner";
};

export function StudiosMemberCreateCta({
  isAuthenticated,
  continueDraftId,
  variant = "banner",
}: Props) {
  if (!isAuthenticated) return null;

  const href = studioBuilderHref(continueDraftId ?? undefined);
  const primaryLabel = continueDraftId ? "Continue draft" : "Create Studio";
  const secondaryLabel = continueDraftId ? "Resume your studio builder" : "Build your private Studio";

  if (variant === "hero") {
    return (
      <Link
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 22px",
          borderRadius: "999px",
          background: "linear-gradient(135deg, #b8956c 0%, #9a7d52 100%)",
          color: "#fff",
          fontSize: "14px",
          fontWeight: 700,
          textDecoration: "none",
          boxShadow: "0 4px 14px rgba(154, 125, 82, 0.35)",
        }}
      >
        {secondaryLabel} <ArrowRight style={{ width: "15px", height: "15px" }} />
      </Link>
    );
  }

  return (
    <div
      style={{
        maxWidth: "960px",
        margin: "0 auto 24px",
        padding: "16px 18px",
        borderRadius: "18px",
        background: "rgba(255,255,255,0.92)",
        border: `1px solid ${STUDIOS_LINE}`,
        boxShadow: STUDIOS_CARD_SHADOW,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "rgba(184, 149, 108, 0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <PenLine style={{ width: 18, height: 18, color: "#9a7d52" }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: STUDIOS_INK }}>{primaryLabel}</div>
          <div style={{ fontSize: 13, color: "#78716c", marginTop: 2 }}>
            {continueDraftId
              ? "Pick up where you left off — sources, draft, and review."
              : "Choose a template, add public links, and draft your published studio."}
          </div>
        </div>
      </div>
      <Link
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          borderRadius: "999px",
          background: STUDIOS_INK,
          color: "#fff",
          fontSize: "13px",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        {primaryLabel} <ArrowRight style={{ width: 14, height: 14 }} />
      </Link>
    </div>
  );
}
