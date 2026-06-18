"use client";

import { VMB_THEME } from "@/lib/vmb/theme";
import type { PublishedCopyDebugEntry } from "@/lib/vmb/invites/published-copy-matching";
import type { SuggestedInvitationRecommendation } from "@/lib/vmb/invites/suggested-invitation-workflow";

type Props = {
  salonId: string | null;
  publishedCount: number;
  publishedCopies: PublishedCopyDebugEntry[];
  recommendations: SuggestedInvitationRecommendation[];
};

export function SuggestedInviteMatchingDebug({
  salonId,
  publishedCount,
  publishedCopies,
  recommendations,
}: Props) {
  return (
    <details
      className="vmb-suggested-invite-debug"
      style={{
        marginBottom: 20,
        borderRadius: 10,
        border: `1px dashed ${VMB_THEME.line}`,
        background: "#fafaf9",
        padding: "10px 12px",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: VMB_THEME.muted,
        }}
      >
        Invite match debug
      </summary>
      <div
        style={{
          marginTop: 10,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: 11,
          lineHeight: 1.5,
          color: VMB_THEME.ink,
          display: "grid",
          gap: 10,
        }}
      >
        <p style={{ margin: 0 }}>
          salonId: {salonId ?? "(none)"} · published copies: {publishedCount}
        </p>

        <section>
          <p style={{ margin: "0 0 4px", fontWeight: 700 }}>Published copies</p>
          {publishedCopies.length === 0 ? (
            <p style={{ margin: 0, color: VMB_THEME.muted }}>No copies from GET /api/vmb/salon-invites</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {publishedCopies.map((copy) => (
                <li key={copy.copyId}>
                  {copy.copyId} · keys [{copy.normalizedKeys.join(", ")}] · v{copy.publishedVersion}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p style={{ margin: "0 0 4px", fontWeight: 700 }}>Suggested matches</p>
          {recommendations.length === 0 ? (
            <p style={{ margin: 0, color: VMB_THEME.muted }}>No TAIKOS suggestions loaded</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {recommendations.map((row) => (
                <li key={row.id}>
                  {row.clientName} · {row.categoryLabel} · expected {row.templateId}
                  {row.matchNormalizedTemplateId ? ` (${row.matchNormalizedTemplateId})` : ""} →{" "}
                  {row.publishedCopy ? `matched ${row.publishedCopy.id} via ${row.matchSource}` : "no match"}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </details>
  );
}
