"use client";
// components/studios/creator-lab/CreatorIntelligenceNav.tsx
// Shared subnav for all Creator Intelligence admin tools.
// Thin, compact, horizontal. Active state highlighted.

import Link from "next/link";

export type CreatorIntelligenceTool =
  | "assembler"
  | "ig-resolver"
  | "hashtag-harvest"
  | "styleseat"
  | "education-seeds"
  | "education-directory"
  | "prospects"
  | "runs";

const TOOLS: { id: CreatorIntelligenceTool; label: string; href: string }[] = [
  { id: "assembler",       label: "Studio Assembler",   href: "/admin/studios/creator-lab" },
  { id: "ig-resolver",     label: "IG Resolver",        href: "/admin/studios/creator-lab/ig-stubs" },
  { id: "hashtag-harvest", label: "Hashtag Harvest",    href: "/admin/studios/creator-lab/hashtag-harvest" },
  { id: "styleseat",        label: "StyleSeat Discovery",  href: "/admin/studios/styleseat" },
  { id: "education-seeds",      label: "Education Seeds",     href: "/admin/studios/education-seeds" },
  { id: "education-directory",  label: "Edu Directory",       href: "/admin/studios/education-directory" },
  { id: "prospects",            label: "Prospects",           href: "/admin/studios/prospects" },
  { id: "runs",            label: "Runs",               href: "/admin/studios/runs" },
];

export function CreatorIntelligenceNav({ current }: { current: CreatorIntelligenceTool }) {
  return (
    <div style={{ marginBottom: 22 }}>

      {/* Parent breadcrumb */}
      <div style={{
        fontSize: 11,
        color: "#a8a29e",
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 5,
        letterSpacing: "0.01em",
      }}>
        <Link href="/admin/studios" style={{ color: "#78716c", textDecoration: "none", fontWeight: 600 }}>
          AIH Studios
        </Link>
        <span style={{ color: "#d6d3d1", fontSize: 10 }}>›</span>
        <span style={{ color: "#44403c", fontWeight: 700 }}>Creator Intelligence</span>
      </div>

      {/* Tool pill rail */}
      <div style={{
        display: "inline-flex",
        gap: 2,
        flexWrap: "wrap",
        alignItems: "center",
        background: "#f5f4f2",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        padding: "3px 4px",
      }}>
        {TOOLS.map(({ id, label, href }) => {
          const active = id === current;
          return (
            <Link
              key={id}
              href={href}
              style={{
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                color: active ? "#1c1917" : "#78716c",
                background: active ? "#ffffff" : "transparent",
                border: active ? "1px solid #e2e0dc" : "1px solid transparent",
                borderRadius: 7,
                padding: "4px 11px",
                textDecoration: "none",
                whiteSpace: "nowrap",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                lineHeight: "1.5",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

    </div>
  );
}
