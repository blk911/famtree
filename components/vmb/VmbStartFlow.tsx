"use client";

import { useState } from "react";
import Link from "next/link";
import { VmbCard } from "@/components/vmb/VmbCard";
import { DEMO_START_ANALYSIS } from "@/lib/vmb/demo-data";
import { VMB_THEME } from "@/lib/vmb/theme";

const PROVIDERS = ["GlossGenius", "Vagaro", "Square", "Fresha", "Other"] as const;

export function VmbStartFlow() {
  const [provider, setProvider] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 80px" }}>
      <VmbCard padding="lg">
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Let&apos;s Find The Gold In Your Book
        </h1>
        <p style={{ margin: "0 0 32px", fontSize: 15, lineHeight: 1.6, color: VMB_THEME.muted }}>
          Connect your booking export. VMB surfaces reactivation, referral, and gift opportunities
          from the relationships you already have.
        </p>

        <div style={{ display: "grid", gap: 28 }}>
          <section>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 13,
                fontWeight: 700,
                color: VMB_THEME.ink,
              }}
            >
              Step 1 — Who is your booking provider?
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {PROVIDERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `1px solid ${provider === p ? VMB_THEME.accent : VMB_THEME.line}`,
                    background: provider === p ? VMB_THEME.accentSoft : "#fff",
                    fontSize: 15,
                    fontWeight: provider === p ? 700 : 500,
                    color: VMB_THEME.ink,
                    cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 13,
                fontWeight: 700,
                color: VMB_THEME.ink,
              }}
            >
              Step 2 — Upload export
            </p>
            <label
              style={{
                display: "block",
                padding: "20px 18px",
                borderRadius: 12,
                border: `1px dashed ${VMB_THEME.line}`,
                background: "#fff",
                cursor: "pointer",
                fontSize: 14,
                color: VMB_THEME.muted,
              }}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                style={{ display: "block", marginBottom: 8, fontSize: 13 }}
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
              CSV or XLSX from your booking platform
              {fileName ? (
                <span style={{ display: "block", marginTop: 8, color: VMB_THEME.ink, fontWeight: 600 }}>
                  {fileName}
                </span>
              ) : null}
            </label>
          </section>

          <section>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 13,
                fontWeight: 700,
                color: VMB_THEME.ink,
              }}
            >
              Step 3 — Analyze
            </p>
            <button
              type="button"
              onClick={() => setAnalyzed(true)}
              disabled={!provider}
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 12,
                border: "none",
                background: provider ? VMB_THEME.accent : VMB_THEME.line,
                color: provider ? "#fff" : VMB_THEME.muted,
                fontSize: 15,
                fontWeight: 700,
                cursor: provider ? "pointer" : "not-allowed",
              }}
            >
              Run Analysis
            </button>
          </section>

          {analyzed ? (
            <div
              style={{
                padding: "22px 20px",
                borderRadius: 14,
                background: VMB_THEME.accentSoft,
                border: `1px solid ${VMB_THEME.accentMuted}`,
              }}
            >
              <p
                style={{
                  margin: "0 0 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: VMB_THEME.accent,
                }}
              >
                Analysis complete
              </p>
              <ul
                style={{
                  margin: "0 0 20px",
                  padding: 0,
                  listStyle: "none",
                  display: "grid",
                  gap: 10,
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                <li>{DEMO_START_ANALYSIS.reactivationTargets} Reactivation Targets</li>
                <li>{DEMO_START_ANALYSIS.referralOpportunities} Referral Opportunities</li>
                <li>{DEMO_START_ANALYSIS.giftOpportunities} Gift Opportunities</li>
              </ul>
              <p style={{ margin: "0 0 20px", fontSize: 15, color: VMB_THEME.muted }}>
                Estimated Recoverable Revenue:{" "}
                <strong style={{ color: VMB_THEME.ink, fontSize: 22 }}>
                  ${DEMO_START_ANALYSIS.estimatedRecoverableRevenue.toLocaleString()}
                </strong>
              </p>
              <Link
                href="/vmb/dashboard"
                style={{
                  display: "inline-block",
                  fontSize: 14,
                  fontWeight: 700,
                  color: VMB_THEME.accent,
                  textDecoration: "none",
                }}
              >
                View your dashboard →
              </Link>
            </div>
          ) : null}
        </div>
      </VmbCard>
    </div>
  );
}
