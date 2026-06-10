"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VmbCard } from "@/components/vmb/VmbCard";
import { writeActiveAnalysisId } from "@/lib/vmb/active-analysis";
import { DEMO_DASHBOARD_CARDS, DEMO_DASHBOARD_HERO } from "@/lib/vmb/demo-data";
import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";
import { vmbProviderLabel } from "@/lib/vmb/provider-labels";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult, VmbBookOpportunity } from "@/types/vmb/book-analysis";

type Props = {
  analysisId?: string;
};

export function VmbDashboardClient({ analysisId }: Props) {
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [invalidAnalysis, setInvalidAnalysis] = useState(false);

  useEffect(() => {
    if (analysisId) writeActiveAnalysisId(analysisId);
  }, [analysisId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setInvalidAnalysis(false);
      try {
        const url = analysisId
          ? `/api/vmb/analyze-book?id=${encodeURIComponent(analysisId)}`
          : "/api/vmb/analyze-book";
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as {
          ok: boolean;
          data?: VmbBookAnalysisResult | null;
        };
        if (!cancelled) {
          if (json.ok && json.data) {
            setAnalysis(json.data);
            setIsDemo(false);
            writeActiveAnalysisId(json.data.analysisId);
          } else if (analysisId) {
            setAnalysis(null);
            setIsDemo(false);
            setInvalidAnalysis(true);
          } else {
            setAnalysis(null);
            setIsDemo(true);
          }
        }
      } catch {
        if (!cancelled) {
          if (analysisId) {
            setAnalysis(null);
            setIsDemo(false);
            setInvalidAnalysis(true);
          } else {
            setAnalysis(null);
            setIsDemo(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: VMB_THEME.muted }}>
        Loading your results…
      </div>
    );
  }

  if (invalidAnalysis) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px", textAlign: "center" }}>
        <p style={{ margin: "0 0 16px", fontSize: 17, color: VMB_THEME.muted }}>
          No active book analysis found. Start with Find The Money.
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

  const salonName = analysis?.salonName ?? DEMO_DASHBOARD_HERO.salonName;
  const revenue =
    analysis?.estimatedRecoverableRevenue ?? DEMO_DASHBOARD_HERO.potentialRevenue;

  const cards = analysis
    ? [
        {
          label: "Reactivation Targets",
          count: analysis.reactivationTargets.length,
          amount: sumValues(analysis.reactivationTargets),
        },
        {
          label: "Referral Opportunities",
          count: analysis.referralOpportunities.length,
          amount: sumValues(analysis.referralOpportunities),
        },
        {
          label: "Gift Opportunities",
          count: analysis.giftOpportunities.length,
          amount: sumValues(analysis.giftOpportunities),
        },
        {
          label: "Trusted Provider Intros",
          count: analysis.trustedProviderIntroOpportunities.length,
          amount: null,
        },
        {
          label: "Estimated Recoverable Revenue",
          count: null,
          amount: revenue,
        },
      ]
    : DEMO_DASHBOARD_CARDS.map((c) => ({
        label: c.label,
        count: c.value,
        amount: c.amount,
      }));

  const topOpps: VmbBookOpportunity[] = analysis
    ? [
        ...analysis.reactivationTargets,
        ...analysis.referralOpportunities,
        ...analysis.giftOpportunities,
      ].slice(0, 8)
    : [];

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 72px" }}>
      {isDemo ? (
        <p
          style={{
            margin: "0 0 20px",
            padding: "12px 16px",
            borderRadius: 12,
            background: "#fff",
            border: `1px solid ${VMB_THEME.line}`,
            fontSize: 14,
            color: VMB_THEME.muted,
          }}
        >
          Showing sample results.{" "}
          <Link href="/vmb/start" style={{ color: VMB_THEME.accent, fontWeight: 700 }}>
            Find the gold in your book →
          </Link>
        </p>
      ) : null}

      <div
        style={{
          marginBottom: 36,
          padding: "36px 28px",
          borderRadius: 22,
          background: `linear-gradient(135deg, ${VMB_THEME.accentSoft} 0%, #fff 70%)`,
          border: `1px solid ${VMB_THEME.line}`,
        }}
      >
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: VMB_THEME.accent,
          }}
        >
          {salonName}
        </p>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "clamp(30px, 4vw, 42px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Find The Gold In Your Book
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(32px, 4.5vw, 48px)",
            fontWeight: 800,
            color: VMB_THEME.accent,
            letterSpacing: "-0.03em",
          }}
        >
          ${revenue.toLocaleString()}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 15, color: VMB_THEME.muted }}>
          Potential revenue found
        </p>
        {!isDemo && analysis ? (
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${VMB_THEME.line}`,
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              fontSize: 14,
              color: VMB_THEME.muted,
            }}
          >
            <span>
              <strong style={{ color: VMB_THEME.ink }}>Provider:</strong>{" "}
              {vmbProviderLabel(analysis.providerPlatform)}
            </span>
            <span>
              <strong style={{ color: VMB_THEME.ink }}>Records analyzed:</strong>{" "}
              {analysis.recordCount}
            </span>
            {analysis.parseSummary?.fileName ? (
              <span>
                <strong style={{ color: VMB_THEME.ink }}>File:</strong>{" "}
                {analysis.parseSummary.fileName}
              </span>
            ) : null}
          </div>
        ) : null}
        {!isDemo && analysis?.parseSummary?.warnings && analysis.parseSummary.warnings.length > 0 ? (
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 13,
              color: "#b45309",
              lineHeight: 1.5,
            }}
          >
            {analysis.parseSummary.warnings.slice(0, 4).join(" · ")}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <VmbCard key={card.label}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: VMB_THEME.muted }}>
              {card.label}
            </p>
            {card.count != null ? (
              <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800 }}>{card.count}</p>
            ) : null}
            {card.amount != null ? (
              <p
                style={{
                  margin: 0,
                  fontSize: card.count == null ? 26 : 15,
                  fontWeight: card.count == null ? 800 : 700,
                  color: card.count == null ? VMB_THEME.accent : VMB_THEME.ink,
                }}
              >
                ${card.amount.toLocaleString()}
                {card.count != null ? " potential" : ""}
              </p>
            ) : null}
          </VmbCard>
        ))}
      </div>

      {topOpps.length > 0 ? (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 800 }}>Top opportunities</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {topOpps.map((opp) => (
              <VmbCard key={opp.id} padding="sm">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>{opp.clientName}</p>
                    <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted }}>{opp.summary}</p>
                  </div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: VMB_THEME.accent }}>
                    ${opp.estimatedValue}
                  </p>
                </div>
              </VmbCard>
            ))}
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 40,
          padding: "24px 22px",
          borderRadius: 16,
          background: VMB_THEME.accentSoft,
          border: `1px solid ${VMB_THEME.accentMuted}`,
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800 }}>Build Trusted Circle</p>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: VMB_THEME.muted }}>
          Ask happy clients for trusted provider intros across nails, skin, wax, lashes, and massage.
        </p>
        <Link
          href={appendVmbAnalysisQuery("/vmb/network", analysis?.analysisId ?? analysisId)}
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
          Open your network
        </Link>
      </div>
    </div>
  );
}

function sumValues(opps: VmbBookOpportunity[]): number {
  return opps.reduce((s, o) => s + o.estimatedValue, 0);
}
