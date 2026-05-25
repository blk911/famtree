// Compact member-only studio tools — lives in `MemberBreadcrumb` (not promotional hero chrome).

import Link from "next/link";
import type { CSSProperties } from "react";
import { STUDIO_BUILDER_WIZARD_HREF } from "@/lib/studios/publishedSpaceBridge";

/** Shared pill sizing with `MemberBreadcrumb` / Edit profile rhythm (muted utility). */
const utilityPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "#fafafa",
  border: "1px solid rgba(0, 0, 0, 0.08)",
  color: "#404040",
  fontSize: "11px",
  fontWeight: 600,
  textDecoration: "none",
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

type Props = {
  displayName: string;
  role?: string;
};

export function StudiosUtilityBar({ displayName, role }: Props) {
  const isAdmin = role === "admin" || role === "founder";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: "8px 10px",
      }}
    >
      <span style={{ fontSize: "12px", color: "#737373", fontWeight: 500 }}>
        Logged in as <span style={{ color: "#262626", fontWeight: 600 }}>{displayName}</span>
      </span>
      <nav
        aria-label="Studio builder tools"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <Link href={STUDIO_BUILDER_WIZARD_HREF} prefetch={false} style={utilityPill}>
          Create Studio
        </Link>
        <Link href="/studios/drafts" prefetch={false} style={utilityPill}>
          Drafts
        </Link>
        <Link href="/studios/my-studios" prefetch={false} style={utilityPill}>
          My Studios
        </Link>
        {isAdmin && (
          <Link
            href="/admin/studios/creator-lab"
            prefetch={false}
            style={{
              ...utilityPill,
              background: "#fdf2f8",
              border: "1px solid #fbcfe8",
              color: "#9d174d",
              fontWeight: 700,
            }}
          >
            🧪 Creator Intelligence
          </Link>
        )}
      </nav>
    </div>
  );
}
