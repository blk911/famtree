"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";
import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";
import type { TrustedProviderIntroRequest } from "@/types/vmb/trusted-circle";

const PAGE_MAX = 800;

type Props = {
  initialAnalysisId?: string;
};

export function VmbNetworkClient({ initialAnalysisId }: Props = {}) {
  const activeAnalysisId = useVmbActiveAnalysis(initialAnalysisId);
  const [drafts, setDrafts] = useState<VmbInviteDraft[]>([]);
  const [intros, setIntros] = useState<TrustedProviderIntroRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const introRes = await fetch("/api/vmb/trusted-intro", { cache: "no-store", credentials: "include" });
        const introJson = (await introRes.json()) as { ok: boolean; data?: TrustedProviderIntroRequest[] };
        if (!cancelled && introJson.ok && introJson.data) setIntros(introJson.data);

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

  return (
    <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "32px 20px 72px" }}>
      <header style={{ marginBottom: 20, paddingBottom: 18, borderBottom: `1px solid ${VMB_THEME.line}` }}>
        <Link
          href={appendVmbAnalysisQuery("/vmb/dashboard", activeAnalysisId)}
          style={{
            display: "inline-block",
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 700,
            color: VMB_THEME.accent,
            textDecoration: "none",
          }}
        >
          ← Home
        </Link>
        <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800 }}>Network</h1>
        <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted }}>
          Your private client network and trusted introductions.
        </p>
      </header>

      {loading ? (
        <p style={{ fontSize: 14, color: VMB_THEME.muted }}>Loading…</p>
      ) : (
        <>
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>Private Client Network</h2>
            <div style={{ display: "grid", gap: 8, fontSize: 15 }}>
              <StatLine label="Invited" value={invited} />
              <StatLine label="Joined" value={joined} />
              <StatLine label="Pending" value={pending} />
            </div>
          </section>

          <section>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>Trusted Introductions</h2>
            {intros.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted }}>
                No introductions yet.
              </p>
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
    </div>
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
