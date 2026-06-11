"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";
import { buildVmbSalonHref } from "@/lib/vmb/salon-href";
import { fetchVmbAnalysisForSalon, resolveActiveVmbAnalysisClient } from "@/lib/vmb/resolve-active-analysis-client";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

type TabId = "drafts" | "approved" | "sent" | "replies";

const TABS: { id: TabId; label: string }[] = [
  { id: "drafts", label: "Drafts" },
  { id: "approved", label: "Approved" },
  { id: "sent", label: "Sent" },
  { id: "replies", label: "Replies" },
];

type Props = {
  initialAnalysisId?: string;
};

export function VmbInvitesClient({ initialAnalysisId }: Props) {
  const activeAnalysisId = useVmbActiveAnalysis(initialAnalysisId);
  const [tab, setTab] = useState<TabId>("drafts");
  const [drafts, setDrafts] = useState<VmbInviteDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const resolved = await resolveActiveVmbAnalysisClient({
          queryId: initialAnalysisId?.trim() || activeAnalysisId,
          sessionId: activeAnalysisId,
        });
        const analysisOutcome = await fetchVmbAnalysisForSalon(resolved);
        if (cancelled) return;

        const loadedAnalysis = analysisOutcome.ok ? analysisOutcome.data : null;
        setAnalysis(loadedAnalysis);

        if (!loadedAnalysis?.analysisId) {
          setDrafts([]);
          return;
        }

        const params = new URLSearchParams({ analysisId: loadedAnalysis.analysisId });
        const draftRes = await fetch(`/api/vmb/invite-drafts?${params}`, {
          cache: "no-store",
          credentials: "include",
        });
        const draftJson = (await draftRes.json()) as { ok: boolean; data?: VmbInviteDraft[] };
        if (!cancelled && draftJson.ok && draftJson.data) {
          setDrafts(draftJson.data);
        } else if (!cancelled) {
          setDrafts([]);
        }
      } catch {
        if (!cancelled) {
          setDrafts([]);
          setAnalysis(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeAnalysisId, initialAnalysisId]);

  const filtered = useMemo(() => {
    if (tab === "replies") return [];
    if (tab === "drafts") return drafts.filter((d) => d.status === "draft");
    if (tab === "approved") return drafts.filter((d) => d.status === "approved");
    return drafts.filter((d) => d.status === "sent");
  }, [drafts, tab]);

  const homeHref = buildVmbSalonHref("/vmb/dashboard", activeAnalysisId);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 72px" }}>
      <h1
        style={{
          margin: "0 0 8px",
          fontSize: "clamp(26px, 4vw, 32px)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        Invites
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 15, color: VMB_THEME.muted, lineHeight: 1.5 }}>
        Private client network invitations for {analysis?.salonName ?? "your salon"}.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 24,
          borderBottom: `1px solid ${VMB_THEME.line}`,
          paddingBottom: 12,
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${active ? VMB_THEME.accent : VMB_THEME.line}`,
                background: active ? VMB_THEME.accentSoft : "#fff",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? VMB_THEME.ink : VMB_THEME.muted,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p style={{ fontSize: 14, color: VMB_THEME.muted }}>Loading invites…</p>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "24px 20px",
            borderRadius: 14,
            border: `1px solid ${VMB_THEME.line}`,
            background: "#fff",
          }}
        >
          <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.5, color: VMB_THEME.muted }}>
            {tab === "replies"
              ? "No replies yet. Sent invites will show responses here."
              : "No invite drafts yet. Start from Home → Preview Invites."}
          </p>
          <Link
            href={homeHref}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: VMB_THEME.accent,
              textDecoration: "none",
            }}
          >
            Go to Home
          </Link>
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {filtered.map((draft) => (
            <li
              key={draft.draftId}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: `1px solid ${VMB_THEME.line}`,
                background: "#fff",
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>{draft.clientName}</p>
              <p style={{ margin: 0, fontSize: 13, color: VMB_THEME.muted }}>{draft.reasonSelected}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
