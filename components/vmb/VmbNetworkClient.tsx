"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";
import { buildVmbSalonHref } from "@/lib/vmb/salon-href";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { TaikosGoalListItem } from "@/lib/taikos/goals/types";
import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";
import type { TrustedProviderIntroRequest } from "@/types/vmb/trusted-circle";

type Props = {
  initialAnalysisId?: string;
};

export function VmbNetworkClient({ initialAnalysisId }: Props = {}) {
  const activeAnalysisId = useVmbActiveAnalysis(initialAnalysisId);
  const [drafts, setDrafts] = useState<VmbInviteDraft[]>([]);
  const [intros, setIntros] = useState<TrustedProviderIntroRequest[]>([]);
  const [pcnGoal, setPcnGoal] = useState<TaikosGoalListItem | null>(null);
  const [referralOpps, setReferralOpps] = useState<TaikosOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [introRes, ctxRes] = await Promise.all([
          fetch("/api/vmb/trusted-intro", { cache: "no-store", credentials: "include" }),
          fetch("/api/taikos/context?pathname=/vmb/network", { cache: "no-store", credentials: "include" }),
        ]);
        const introJson = (await introRes.json()) as { ok: boolean; data?: TrustedProviderIntroRequest[] };
        if (!cancelled && introJson.ok && introJson.data) setIntros(introJson.data);

        const ctxJson = (await ctxRes.json()) as {
          ok: boolean;
          data?: {
            goalSummary: { goals: TaikosGoalListItem[] };
            opportunitySummary: { opportunities: TaikosOpportunity[] };
          };
        };
        if (!cancelled && ctxRes.ok && ctxJson.ok && ctxJson.data) {
          setPcnGoal(ctxJson.data.goalSummary.goals.find((g) => g.category === "PCN_GROWTH") ?? null);
          setReferralOpps(
            ctxJson.data.opportunitySummary.opportunities.filter((o) => o.category === "Referral").slice(0, 5),
          );
        }

        if (activeAnalysisId) {
          const params = new URLSearchParams({ analysisId: activeAnalysisId });
          const draftRes = await fetch(`/api/vmb/invite-drafts?${params}`, {
            cache: "no-store",
            credentials: "include",
          });
          const draftJson = (await draftRes.json()) as { ok: boolean; data?: VmbInviteDraft[] };
          if (!cancelled && draftJson.ok && draftJson.data) setDrafts(draftJson.data);
        }
      } catch {
        if (!cancelled) {
          setDrafts([]);
          setIntros([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activeAnalysisId]);

  const invited = drafts.filter((d) => d.status === "approved" || d.status === "sent").length;
  const joined = drafts.filter((d) => d.status === "sent").length;
  const pending = drafts.filter((d) => d.status === "draft").length;
  const topReferrers = intros.slice(0, 3).map((i) => i.clientName);

  return (
    <VmbPageFrame
      width="wide"
      title="Network"
      subtitle="PCN growth, referrals, and trusted introductions."
    >
      <Link
        href={buildVmbSalonHref("/vmb/today", activeAnalysisId)}
        style={{
          display: "inline-block",
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 700,
          color: VMB_THEME.accent,
          textDecoration: "none",
        }}
      >
        ← Today
      </Link>

      {loading ? (
        <p style={{ fontSize: 14, color: VMB_THEME.muted }}>Loading…</p>
      ) : (
        <>
          <section className="vmb-network-section" style={{ marginBottom: 28 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>Private Client Network</h2>
            <div style={{ display: "grid", gap: 8, fontSize: 15 }}>
              <StatLine label="Invited" value={invited} />
              <StatLine label="Pending" value={pending} />
              <StatLine label="Joined" value={joined} />
            </div>
          </section>

          {pcnGoal ? (
            <section className="vmb-network-section" style={{ marginBottom: 28 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>Growth Goal Progress</h2>
              <p style={{ margin: 0, fontSize: 14 }}>
                {pcnGoal.title}: {pcnGoal.currentValue} / {pcnGoal.targetValue} ({pcnGoal.progressPercent}%)
              </p>
            </section>
          ) : null}

          {topReferrers.length > 0 ? (
            <section className="vmb-network-section" style={{ marginBottom: 28 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>Top Referrers</h2>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 14 }}>
                {topReferrers.map((name) => (
                  <li key={name} style={{ padding: "6px 0" }}>
                    🤝 {name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {referralOpps.length > 0 ? (
            <section className="vmb-network-section" style={{ marginBottom: 28 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>Referral Opportunities</h2>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {referralOpps.map((opp) => (
                  <li key={opp.opportunityId} style={{ padding: "10px 0", borderBottom: `1px solid ${VMB_THEME.line}`, fontSize: 14 }}>
                    <strong>{opp.title}</strong>
                    <span style={{ color: VMB_THEME.muted }}> · ${opp.estimatedValue.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>Trusted Introductions</h2>
            {intros.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted }}>No introductions yet.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {intros.slice(0, 10).map((intro) => (
                  <li
                    key={intro.requestId}
                    style={{
                      padding: "12px 0",
                      borderBottom: `1px solid ${VMB_THEME.line}`,
                      fontSize: 14,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{intro.clientName}</span>
                    <span style={{ color: VMB_THEME.muted }}> · {intro.requestedCategory}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </VmbPageFrame>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: VMB_THEME.muted }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
