"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";
import {
  buildClientOpportunities,
  type ClientOpportunityRow,
  type ClientOpportunitySummary,
} from "@/lib/vmb/client-opportunities";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export function VmbClientsClient() {
  const activeAnalysisId = useVmbActiveAnalysis();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ClientOpportunitySummary | null>(null);
  const [selectedRow, setSelectedRow] = useState<ClientOpportunityRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const url = activeAnalysisId
          ? `/api/vmb/analyze-book?id=${encodeURIComponent(activeAnalysisId)}`
          : "/api/vmb/analyze-book";
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as {
          ok: boolean;
          data?: VmbBookAnalysisResult | null;
        };
        if (!cancelled) {
          if (json.ok && json.data) {
            setSummary(buildClientOpportunities(json.data));
          } else {
            setSummary(null);
          }
        }
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activeAnalysisId]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: VMB_THEME.muted }}>
        Loading opportunities…
      </div>
    );
  }

  if (!summary || summary.rows.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px", textAlign: "center" }}>
        <p style={{ margin: "0 0 16px", fontSize: 17, color: VMB_THEME.muted }}>
          No client opportunities yet. Run your book analysis to see who to contact today.
        </p>
        <Link
          href="/vmb/start"
          style={{
            display: "inline-block",
            padding: "12px 20px",
            borderRadius: 12,
            background: VMB_THEME.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Find The Money
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 72px" }}>
      <header style={{ marginBottom: 24 }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: VMB_THEME.accent,
          }}
        >
          Client Opportunities
        </p>
        <h1
          style={{
            margin: "0 0 12px",
            fontSize: "clamp(24px, 3vw, 32px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Who should I contact today?
        </h1>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 20px",
            fontSize: 14,
            color: VMB_THEME.muted,
          }}
        >
          <span>
            <strong style={{ color: VMB_THEME.ink }}>{summary.clientsAnalyzed}</strong> Clients Analyzed
          </span>
          <span>
            Recoverable Revenue:{" "}
            <strong style={{ color: VMB_THEME.accent }}>
              ${summary.recoverableRevenue.toLocaleString()}
            </strong>
          </span>
          <span>
            <strong style={{ color: VMB_THEME.ink }}>{summary.reactivationCount}</strong> Reactivation
          </span>
          <span>
            <strong style={{ color: VMB_THEME.ink }}>{summary.referralCount}</strong> Referral
          </span>
          <span>
            <strong style={{ color: VMB_THEME.ink }}>{summary.giftCount}</strong> Gift
          </span>
          <span>
            <strong style={{ color: VMB_THEME.ink }}>{summary.trustedIntroCount}</strong> Trusted Intro
          </span>
        </div>
      </header>

      <div
        style={{
          background: "#fff",
          border: `1px solid ${VMB_THEME.line}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: VMB_THEME.warmBg, borderBottom: `1px solid ${VMB_THEME.line}` }}>
              {["CLIENT", "TRIGGER", "ACTION", "VALUE"].map((col) => (
                <th
                  key={col}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: VMB_THEME.muted,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelectedRow(row)}
                style={{
                  borderBottom: `1px solid ${VMB_THEME.line}`,
                  cursor: "pointer",
                  background: selectedRow?.id === row.id ? VMB_THEME.accentSoft : "#fff",
                }}
              >
                <td style={{ padding: "9px 14px", fontWeight: 700, color: VMB_THEME.ink }}>
                  {row.clientName}
                </td>
                <td style={{ padding: "9px 14px", color: VMB_THEME.muted }}>{row.triggerLabel}</td>
                <td style={{ padding: "9px 14px", fontWeight: 600, color: VMB_THEME.ink }}>
                  {row.action}
                </td>
                <td
                  style={{
                    padding: "9px 14px",
                    fontWeight: 800,
                    color: VMB_THEME.accent,
                    whiteSpace: "nowrap",
                  }}
                >
                  ${row.value.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRow ? (
        <OpportunityDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />
      ) : null}
    </div>
  );
}

function OpportunityDrawer({
  row,
  onClose,
}: {
  row: ClientOpportunityRow;
  onClose: () => void;
}) {
  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(28, 25, 23, 0.35)",
          zIndex: 50,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "min(420px, 100vw)",
          background: "#fff",
          borderLeft: `1px solid ${VMB_THEME.line}`,
          boxShadow: "-8px 0 32px rgba(28, 25, 23, 0.12)",
          zIndex: 51,
          padding: "24px 22px",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{row.clientName}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "none",
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              color: VMB_THEME.muted,
            }}
          >
            ×
          </button>
        </div>

        <dl style={{ margin: "0 0 24px", display: "grid", gap: 12, fontSize: 14 }}>
          <DetailItem label="Last Visit" value={row.lastVisit ?? "—"} />
          <DetailItem label="Last Service" value={row.lastService ?? "—"} />
          <DetailItem
            label="Lifetime Spend"
            value={row.lifetimeSpend ? `$${row.lifetimeSpend.toLocaleString()}` : "—"}
          />
          <DetailItem
            label="Potential Revenue"
            value={`$${row.potentialRevenue.toLocaleString()}`}
            accent
          />
          <DetailItem label="Opportunity Type" value={row.opportunityType} />
          <DetailItem label="Suggested Campaign" value={row.suggestedCampaign} />
        </dl>

        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: VMB_THEME.muted,
          }}
        >
          Suggested Message
        </p>
        <p
          style={{
            margin: 0,
            padding: "16px 14px",
            borderRadius: 12,
            background: VMB_THEME.warmBg,
            border: `1px solid ${VMB_THEME.line}`,
            fontSize: 15,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            color: VMB_THEME.ink,
          }}
        >
          {row.suggestedMessage}
        </p>
      </aside>
    </>
  );
}

function DetailItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt style={{ margin: 0, fontSize: 11, fontWeight: 700, color: VMB_THEME.muted }}>{label}</dt>
      <dd
        style={{
          margin: "4px 0 0",
          fontWeight: accent ? 800 : 600,
          color: accent ? VMB_THEME.accent : VMB_THEME.ink,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
