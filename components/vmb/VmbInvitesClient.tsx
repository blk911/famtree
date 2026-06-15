"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { InviteDraftPreviewModal } from "@/components/vmb/dashboard/InviteDraftPreviewModal";
import { SortableListHeader } from "@/components/vmb/SortableListHeader";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { useVmbActiveAnalysisState } from "@/components/vmb/useVmbActiveAnalysis";
import { VMB_BOOK_LOAD_LABEL } from "@/lib/vmb/book-load-cta";
import {
  INVITE_SECTION_LABELS,
  INVITE_SECTION_ORDER,
  parseInviteSection,
  type InviteSectionId,
} from "@/lib/vmb/invites/sections";
import { buildVmbSalonHref } from "@/lib/vmb/salon-href";
import { fetchVmbAnalysisForSalon } from "@/lib/vmb/resolve-active-analysis-client";
import { VMB_THEME } from "@/lib/vmb/theme";
import { useSortableList } from "@/lib/vmb/useSortableList";
import type { VmbInviteDraft, InviteDraftStatus } from "@/types/vmb/invite-draft";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import { friendlyInviteDraftError } from "@/lib/vmb/invite-drafts/invite-draft-storage-errors";

type TabId = "drafts" | "approved" | "skipped" | "sent";

const TABS: { id: TabId; label: string }[] = [
  { id: "drafts", label: "Drafts" },
  { id: "approved", label: "Approved" },
  { id: "skipped", label: "Skipped" },
  { id: "sent", label: "Sent" },
];

type Props = {
  initialAnalysisId?: string;
  initialSection?: string;
  salonName?: string;
};

export function VmbInvitesClient({
  initialAnalysisId,
  initialSection,
  salonName: salonNameProp,
}: Props) {
  const resolved = useVmbActiveAnalysisState(initialAnalysisId);
  const [tab, setTab] = useState<TabId>("drafts");
  const [focusSection, setFocusSection] = useState<InviteSectionId | undefined>(
    () => parseInviteSection(initialSection),
  );
  const [drafts, setDrafts] = useState<VmbInviteDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    if (resolved.resolving) return;
    setLoading(true);
    setError(null);
    try {
      const analysisOutcome = await fetchVmbAnalysisForSalon(resolved);
      if (!analysisOutcome.ok) {
        setAnalysis(null);
        setDrafts([]);
        setError(`No active book analysis — ${VMB_BOOK_LOAD_LABEL.toLowerCase()} first.`);
        return;
      }
      setAnalysis(analysisOutcome.data);

      const params = new URLSearchParams({ analysisId: analysisOutcome.data.analysisId });
      const draftRes = await fetch(`/api/vmb/invite-drafts?${params}`, {
        cache: "no-store",
        credentials: "include",
      });
      const draftJson = (await draftRes.json()) as {
        ok: boolean;
        data?: VmbInviteDraft[];
        error?: string;
      };
      if (!draftRes.ok || !draftJson.ok) {
        setDrafts([]);
        setError(friendlyInviteDraftError(draftJson.error));
        return;
      }
      setDrafts(
        (draftJson.data ?? []).map((d) => ({
          ...d,
          inviteCategory: d.inviteCategory ?? "private_client_network",
        })),
      );
    } catch {
      setDrafts([]);
      setAnalysis(null);
      setError("Could not load invites.");
    } finally {
      setLoading(false);
    }
  }, [resolved.analysisId, resolved.resolving, resolved.source]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  useEffect(() => {
    setFocusSection(parseInviteSection(initialSection));
  }, [initialSection]);

  const filtered = useMemo(() => {
    if (tab === "drafts") return drafts.filter((d) => d.status === "draft");
    if (tab === "approved") return drafts.filter((d) => d.status === "approved");
    if (tab === "skipped") return drafts.filter((d) => d.status === "skipped");
    return drafts.filter((d) => d.status === "sent");
  }, [drafts, tab]);

  const grouped = useMemo(() => {
    const map = new Map<InviteSectionId, VmbInviteDraft[]>();
    for (const section of INVITE_SECTION_ORDER) {
      map.set(section, []);
    }
    for (const draft of filtered) {
      const cat = draft.inviteCategory ?? "private_client_network";
      const list = map.get(cat) ?? [];
      list.push(draft);
      map.set(cat, list);
    }
    return map;
  }, [filtered]);

  const salonName = salonNameProp ?? analysis?.salonName ?? "your salon";
  const homeHref = buildVmbSalonHref("/vmb/dashboard", resolved.analysisId);
  const activeDraft = drafts.find((d) => d.draftId === activeDraftId) ?? null;

  async function patchDraft(
    draftId: string,
    patch: { status?: InviteDraftStatus; editableMessage?: string },
  ) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/vmb/invite-drafts/${encodeURIComponent(draftId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { ok: boolean; data?: VmbInviteDraft; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setError(friendlyInviteDraftError(json.error));
        return false;
      }
      setDrafts((current) => current.map((d) => (d.draftId === draftId ? json.data! : d)));
      return true;
    } catch {
      setError("Update failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <VmbPageFrame
      width="feed"
      headerless
    >
      <header className="vmb-page-frame__header">
        <p className="vmb-page-frame__eyebrow">{typeof salonName === "string" ? salonName : undefined}</p>
        <h1 className="vmb-page-frame__title">Invites</h1>
        <p className="vmb-page-frame__subtitle">
          Review the messages VMB prepared from this week&apos;s client book.
        </p>
      </header>
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

      {error ? (
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#b91c1c" }}>{error}</p>
      ) : null}

      {loading || resolved.resolving ? (
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
            {tab === "sent"
              ? "No sent invites yet — approve drafts first, then sending will arrive in a future release."
              : "No invite drafts in this tab. Start from Home → Preview Invites."}
          </p>
          <Link href={homeHref} style={{ fontSize: 14, fontWeight: 700, color: VMB_THEME.accent, textDecoration: "none" }}>
            Go to Home
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 28 }}>
          {INVITE_SECTION_ORDER.map((section) => {
            const rows = grouped.get(section) ?? [];
            if (rows.length === 0) return null;
            const highlighted = focusSection === section;
            return (
              <section
                key={section}
                id={`invite-section-${section}`}
                style={{
                  borderRadius: 14,
                  border: `1px solid ${highlighted ? VMB_THEME.accent : VMB_THEME.line}`,
                  background: "#fff",
                  padding: "16px 16px 8px",
                  boxShadow: highlighted ? "0 2px 8px rgba(157, 23, 77, 0.06)" : "none",
                }}
              >
                <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>
                  {INVITE_SECTION_LABELS[section]}
                </h2>
                <InviteSectionRows rows={rows} onPreview={(draftId) => setActiveDraftId(draftId)} />
              </section>
            );
          })}
        </div>
      )}

      {activeDraft ? (
        <InviteDraftPreviewModal
          draft={activeDraft}
          salonName={typeof salonName === "string" ? salonName : "Your Salon"}
          saving={saving}
          onClose={() => setActiveDraftId(null)}
          onSave={async (message) => {
            const ok = await patchDraft(activeDraft.draftId, { editableMessage: message });
            if (ok) setActiveDraftId(null);
          }}
          onApprove={async (message) => {
            const ok = await patchDraft(activeDraft.draftId, {
              editableMessage: message,
              status: "approved",
            });
            if (ok) setActiveDraftId(null);
          }}
          onSkip={async () => {
            const ok = await patchDraft(activeDraft.draftId, { status: "skipped" });
            if (ok) setActiveDraftId(null);
          }}
        />
      ) : null}
    </VmbPageFrame>
  );
}

type InviteSortKey = "clientName" | "reason" | "value" | "status";

function InviteSectionRows({
  rows,
  onPreview,
}: {
  rows: VmbInviteDraft[];
  onPreview: (draftId: string) => void;
}) {
  const accessors = useMemo(
    () => ({
      clientName: (d: VmbInviteDraft) => d.clientName,
      reason: (d: VmbInviteDraft) => d.reasonSelected,
      value: (d: VmbInviteDraft) => d.potentialValue,
      status: (d: VmbInviteDraft) => d.status,
    }),
    [],
  );

  const { sortedItems, sortKey, sortDirection, setSort } = useSortableList(rows, {
    defaultKey: "value",
    defaultDirection: "desc",
    accessors,
  });

  return (
    <div>
      <SortableListHeader<InviteSortKey>
        columns={[
          { key: "clientName", label: "Client" },
          { key: "reason", label: "Reason" },
          { key: "value", label: "Value", align: "right" },
          { key: "status", label: "Status" },
        ]}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={setSort}
        gridTemplateColumns="1fr 1.2fr 0.7fr 0.7fr auto"
        trailingColumn=""
      />
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 0 }}>
        {sortedItems.map((draft) => (
          <li
            key={draft.draftId}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr 0.7fr 0.7fr auto",
              gap: 8,
              alignItems: "center",
              padding: "12px 0",
              borderTop: `1px solid ${VMB_THEME.line}`,
            }}
          >
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{draft.clientName}</p>
            <p style={{ margin: 0, fontSize: 13, color: VMB_THEME.muted }}>{draft.reasonSelected}</p>
            <p style={{ margin: 0, fontSize: 13, color: VMB_THEME.muted, textAlign: "right" }}>
              ${draft.potentialValue.toLocaleString()}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: VMB_THEME.muted }}>{draft.status}</p>
            <button
              type="button"
              onClick={() => onPreview(draft.draftId)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${VMB_THEME.line}`,
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Preview
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
