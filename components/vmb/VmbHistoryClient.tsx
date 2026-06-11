"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";
import { buildVmbSalonHref } from "@/lib/vmb/salon-href";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";
import type { TrustedProviderIntroRequest } from "@/types/vmb/trusted-circle";

const PAGE_MAX = 800;

type Props = {
  initialAnalysisId?: string;
};

export function VmbHistoryClient({ initialAnalysisId }: Props = {}) {
  const activeAnalysisId = useVmbActiveAnalysis(initialAnalysisId);
  const [invites, setInvites] = useState<VmbInviteDraft[]>([]);
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
          if (!cancelled && draftJson.ok && draftJson.data) {
            setInvites(
              draftJson.data.filter((d) => d.status === "approved" || d.status === "skipped" || d.status === "sent"),
            );
          }
        }
      } catch {
        if (!cancelled) {
          setInvites([]);
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

  return (
    <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: "32px 20px 72px" }}>
      <header style={{ marginBottom: 20, paddingBottom: 18, borderBottom: `1px solid ${VMB_THEME.line}` }}>
        <Link
          href={buildVmbSalonHref("/vmb/dashboard", activeAnalysisId)}
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
        <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800 }}>History</h1>
        <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted }}>
          Past weekly actions from your salon.
        </p>
      </header>

      {loading ? (
        <p style={{ fontSize: 14, color: VMB_THEME.muted }}>Loading…</p>
      ) : (
        <>
          <HistorySection title="Private Client Invites">
            {invites.length === 0 ? (
              <EmptyLine text="Approved and skipped invites will appear here." />
            ) : (
              invites.map((item) => (
                <HistoryRow
                  key={item.draftId}
                  primary={item.clientName}
                  secondary={item.status === "approved" ? "Approved" : item.status === "skipped" ? "Skipped" : "Sent"}
                  when={formatWhen(item.updatedAt)}
                />
              ))
            )}
          </HistorySection>

          <HistorySection title="Trusted Introductions">
            {intros.length === 0 ? (
              <EmptyLine text="Introduction requests will appear here." />
            ) : (
              intros.slice(0, 12).map((item) => (
                <HistoryRow
                  key={item.requestId}
                  primary={`${item.clientName} → ${item.requestedCategory}`}
                  secondary="Requested"
                  when={formatWhen(item.createdAt)}
                />
              ))
            )}
          </HistorySection>

          <HistorySection title="Welcomes & Revenue Moves">
            <EmptyLine text="Past welcomes and revenue touches will archive here as you approve them." />
          </HistorySection>
        </>
      )}
    </div>
  );
}

function HistorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800 }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function HistoryRow({
  primary,
  secondary,
  when,
}: {
  primary: string;
  secondary: string;
  when: string;
}) {
  return (
    <div
      style={{
        padding: "12px 0",
        borderBottom: `1px solid ${VMB_THEME.line}`,
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 14,
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{primary}</div>
        <div style={{ color: VMB_THEME.muted, fontSize: 13 }}>{secondary}</div>
      </div>
      <div style={{ color: VMB_THEME.muted, fontSize: 12, whiteSpace: "nowrap" }}>{when}</div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted }}>{text}</p>;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
