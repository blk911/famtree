"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ContextRailSection } from "./ContextRailSection";
import {
  TRUST_CIRCLES_EMPTY_HINT,
  TRUST_CIRCLES_EMPTY_TITLE,
} from "@/lib/trust/display";

type TrustCircleRow = {
  id: string;
  label: string;
  memberCount?: number;
};

export function ContextRailTrustCirclesSection({
  title = "Trust circles",
  activeUnits,
  draftCount = 0,
  showDraftInRail = false,
  href,
  rows,
  onRowClick,
  emptyHref = "/invite",
}: {
  title?: string;
  activeUnits: TrustCircleRow[];
  draftCount?: number;
  /** Rails default: hide draft rows unless no active circles. */
  showDraftInRail?: boolean;
  href?: string;
  rows?: ReactNode;
  onRowClick?: (id: string) => void;
  emptyHref?: string;
}) {
  const showDraft = showDraftInRail && draftCount > 0 && activeUnits.length === 0;

  if (activeUnits.length === 0 && !showDraft) {
    return (
      <ContextRailSection title={title}>
        <p style={{ fontSize: 11, color: "#57534e", margin: "0 0 4px", fontWeight: 600 }}>
          {TRUST_CIRCLES_EMPTY_TITLE}
        </p>
        <p style={{ fontSize: 11, color: "#78716c", margin: 0, lineHeight: 1.45 }}>
          {TRUST_CIRCLES_EMPTY_HINT}{" "}
          <Link href={emptyHref} style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
            Get started →
          </Link>
        </p>
      </ContextRailSection>
    );
  }

  return (
    <ContextRailSection title={title} count={activeUnits.length || undefined} href={href}>
      {rows ?? (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, color: "#57534e" }}>
          {activeUnits.map((unit) => (
            <li key={unit.id} style={{ padding: "4px 0", borderBottom: "1px solid #f5f4f0" }}>
              {onRowClick ? (
                <button
                  type="button"
                  onClick={() => onRowClick(unit.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 11,
                    color: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  🤝 {unit.label}
                  {unit.memberCount != null && (
                    <span style={{ color: "#a8a29e" }}> ({unit.memberCount})</span>
                  )}
                </button>
              ) : (
                <>
                  🤝 {unit.label}
                  {unit.memberCount != null && (
                    <span style={{ color: "#a8a29e" }}> ({unit.memberCount})</span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {showDraft && (
        <p style={{ fontSize: 11, color: "#78716c", margin: "8px 0 0", lineHeight: 1.45 }}>
          Draft — setup needed
          {draftCount > 1 ? ` (${draftCount} spaces)` : ""}. Invite someone to finish.
        </p>
      )}
    </ContextRailSection>
  );
}
