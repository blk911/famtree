"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InviteDraftPreviewModal } from "@/components/vmb/dashboard/InviteDraftPreviewModal";
import { SalonInvitationPreviewModal } from "@/components/vmb/salon/SalonInvitationPreviewModal";
import { SuggestedInvitationCard } from "@/components/vmb/salon/SuggestedInvitationCard";
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
import { formatSnapshotUpdatedAt } from "@/lib/vmb/invites/invite-template-snapshot";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import {
  buildSuggestedInvitationsFromOpportunities,
  type SuggestedInvitationRecommendation,
} from "@/lib/vmb/invites/suggested-invitation-workflow";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";
import { fetchVmbAnalysisForSalon } from "@/lib/vmb/resolve-active-analysis-client";
import { VMB_THEME } from "@/lib/vmb/theme";
import { useSortableList } from "@/lib/vmb/useSortableList";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import { friendlyInviteDraftError } from "@/lib/vmb/invite-drafts/invite-draft-storage-errors";

type TabId = "suggested" | "drafts" | "sent" | "paused";

const TABS: { id: TabId; label: string }[] = [
  { id: "suggested", label: "Suggested" },
  { id: "drafts", label: "Drafts" },
  { id: "sent", label: "Sent" },
  { id: "paused", label: "Paused" },
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
  const [tab, setTab] = useState<TabId>("suggested");
  const [focusSection, setFocusSection] = useState<InviteSectionId | undefined>(
    () => parseInviteSection(initialSection),
  );
  const [drafts, setDrafts] = useState<VmbInviteDraft[]>([]);
  const [publishedCopies, setPublishedCopies] = useState<SalonInviteLocalCopy[]>([]);
  const [opportunitySummary, setOpportunitySummary] = useState<TaikosOpportunitySummary | null>(null);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [editDraftId, setEditDraftId] = useState<string | null>(null);
  const [activePublishedCopy, setActivePublishedCopy] = useState<SalonInviteLocalCopy | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const loadPublished = useCallback(async () => {
    try {
      const res = await fetch("/api/vmb/salon-invites", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; copies?: SalonInviteLocalCopy[] };
      setPublishedCopies(json.ok && json.copies ? json.copies : []);
    } catch {
      setPublishedCopies([]);
    }
  }, []);

  const loadOpportunities = useCallback(async () => {
    try {
      const res = await fetch("/api/taikos/opportunities", {
        cache: "no-store",
        credentials: "include",
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        setOpportunitySummary(null);
        return;
      }
      const json = (await res.json()) as { ok: boolean; data?: TaikosOpportunitySummary };
      setOpportunitySummary(res.ok && json.ok && json.data ? json.data : null);
    } catch {
      setOpportunitySummary(null);
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    if (resolved.resolving) return;
    setDraftError(null);
    try {
      const analysisOutcome = await fetchVmbAnalysisForSalon(resolved);
      if (!analysisOutcome.ok) {
        setAnalysis(null);
        setDrafts([]);
        if (tab !== "suggested") {
          setDraftError(`No active book analysis — ${VMB_BOOK_LOAD_LABEL.toLowerCase()} first.`);
        }
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
        if (tab !== "suggested") {
          setDraftError(friendlyInviteDraftError(draftJson.error));
        }
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
      if (tab !== "suggested") {
        setDraftError("Could not load invite drafts.");
      }
    }
  }, [resolved.analysisId, resolved.resolving, resolved.source, tab]);

  const loadSuggested = useCallback(async () => {
    setLoadingSuggested(true);
    await Promise.all([loadPublished(), loadOpportunities(), loadDrafts()]);
    setLoadingSuggested(false);
  }, [loadDrafts, loadOpportunities, loadPublished]);

  useEffect(() => {
    if (tab === "suggested") {
      void loadSuggested();
      return;
    }
    setLoadingDrafts(true);
    void loadDrafts().finally(() => setLoadingDrafts(false));
  }, [loadDrafts, loadSuggested, tab]);

  useEffect(() => {
    setFocusSection(parseInviteSection(initialSection));
  }, [initialSection]);

  const suggestedRecommendations = useMemo(() => {
    const opportunities = opportunitySummary?.opportunities ?? [];
    return buildSuggestedInvitationsFromOpportunities(opportunities, publishedCopies, {
      analysisContext: {
        analysisId: analysis?.analysisId ?? initialAnalysisId,
        salonName: analysis?.salonName,
        hasRealBookData: opportunities.length > 0,
      },
      drafts,
    });
  }, [
    analysis?.analysisId,
    analysis?.salonName,
    drafts,
    initialAnalysisId,
    opportunitySummary?.opportunities,
    publishedCopies,
  ]);

  const filteredDrafts = useMemo(() => {
    if (tab === "drafts") return drafts.filter((d) => d.status === "draft");
    if (tab === "paused") {
      return drafts.filter((d) => d.status === "skipped" || d.status === "approved");
    }
    if (tab === "sent") return drafts.filter((d) => d.status === "sent");
    return [];
  }, [drafts, tab]);

  const grouped = useMemo(() => {
    const map = new Map<InviteSectionId, VmbInviteDraft[]>();
    for (const section of INVITE_SECTION_ORDER) {
      map.set(section, []);
    }
    for (const draft of filteredDrafts) {
      const cat = draft.inviteCategory ?? "private_client_network";
      const list = map.get(cat) ?? [];
      list.push(draft);
      map.set(cat, list);
    }
    return map;
  }, [filteredDrafts]);

  const salonName = salonNameProp ?? analysis?.salonName ?? "your salon";
  const activeDraft = drafts.find((d) => d.draftId === activeDraftId) ?? null;
  const editDraft = drafts.find((d) => d.draftId === editDraftId) ?? null;

  const tokenContext = useMemo(
    () => ({
      ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
      salonName: typeof salonName === "string" ? salonName : INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
    }),
    [salonName],
  );

  const loading = tab === "suggested" ? loadingSuggested : loadingDrafts || resolved.resolving;

  async function ensureDraftForRecommendation(
    recommendation: SuggestedInvitationRecommendation,
  ): Promise<VmbInviteDraft | null> {
    if (recommendation.draftId) {
      return drafts.find((d) => d.draftId === recommendation.draftId) ?? null;
    }
    if (!analysis?.analysisId) return null;

    const buildRes = await fetch("/api/vmb/invite-drafts/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ analysisId: analysis.analysisId }),
    });
    const buildJson = (await buildRes.json()) as { ok?: boolean; data?: VmbInviteDraft[] };
    if (!buildRes.ok || !buildJson.ok || !buildJson.data) return null;

    const normalized = buildJson.data.map((d) => ({
      ...d,
      inviteCategory: d.inviteCategory ?? "private_client_network",
    }));
    setDrafts(normalized);

    const match = normalized.find(
      (d) => d.clientName.trim().toLowerCase() === recommendation.clientName.trim().toLowerCase(),
    );
    return match ?? null;
  }

  async function patchDraft(
    draftId: string,
    patch: { status?: VmbInviteDraft["status"]; editableMessage?: string },
  ): Promise<boolean> {
    setSavingDraft(true);
    try {
      const res = await fetch(`/api/vmb/invite-drafts/${encodeURIComponent(draftId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { ok?: boolean; data?: VmbInviteDraft };
      if (!res.ok || !json.ok || !json.data) return false;
      setDrafts((prev) => prev.map((d) => (d.draftId === draftId ? json.data! : d)));
      return true;
    } catch {
      return false;
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleApprove(recommendation: SuggestedInvitationRecommendation) {
    setActionBusyId(recommendation.id);
    try {
      const draft = await ensureDraftForRecommendation(recommendation);
      if (!draft) return;
      await patchDraft(draft.draftId, { status: "approved" });
    } finally {
      setActionBusyId(null);
    }
  }

  async function handlePause(recommendation: SuggestedInvitationRecommendation) {
    setActionBusyId(recommendation.id);
    try {
      const draft = await ensureDraftForRecommendation(recommendation);
      if (!draft) return;
      await patchDraft(draft.draftId, { status: "skipped" });
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleEditCopy(recommendation: SuggestedInvitationRecommendation) {
    setActionBusyId(recommendation.id);
    try {
      const draft = await ensureDraftForRecommendation(recommendation);
      if (draft) setEditDraftId(draft.draftId);
    } finally {
      setActionBusyId(null);
    }
  }

  function handlePreview(recommendation: SuggestedInvitationRecommendation) {
    if (recommendation.publishedCopy) {
      setActivePublishedCopy(recommendation.publishedCopy);
      return;
    }
    const draft = drafts.find((d) => d.draftId === recommendation.draftId);
    if (draft) {
      setActiveDraftId(draft.draftId);
    }
  }

  function emptyMessage(): string {
    if (tab === "suggested") {
      if ((opportunitySummary?.totalOpportunities ?? 0) === 0) {
        return "No suggested invitations yet — load your client book to see who to invite today.";
      }
      return "No actionable invitations right now. Check Drafts or Paused for items you already reviewed.";
    }
    if (tab === "sent") {
      return "No sent invitations yet.";
    }
    if (tab === "paused") {
      return "No paused invitations.";
    }
    if (draftError) return draftError;
    return "No invite drafts in this tab.";
  }

  return (
    <VmbPageFrame width="feed" headerless>
      <header className="vmb-page-frame__header">
        <p className="vmb-page-frame__eyebrow">{typeof salonName === "string" ? salonName : undefined}</p>
        <h1 className="vmb-page-frame__title">My Invitations</h1>
        <p className="vmb-page-frame__subtitle">
          {tab === "suggested"
            ? "What should I send today? Review suggested invitations from your book."
            : "Review the invitations VMB prepared for your salon."}
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

      {draftError && tab !== "suggested" ? (
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#b91c1c" }}>{draftError}</p>
      ) : null}

      {loading ? (
        <p style={{ fontSize: 14, color: VMB_THEME.muted }}>Loading invitations…</p>
      ) : tab === "suggested" ? (
        suggestedRecommendations.length === 0 ? (
          <EmptyPanel message={emptyMessage()} />
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {suggestedRecommendations.map((recommendation) => (
              <SuggestedInvitationCard
                key={recommendation.id}
                recommendation={recommendation}
                busy={actionBusyId === recommendation.id}
                onPreview={() => handlePreview(recommendation)}
                onApprove={() => void handleApprove(recommendation)}
                onEditCopy={() => void handleEditCopy(recommendation)}
                onPause={() => void handlePause(recommendation)}
              />
            ))}
            {publishedCopies.length > 0 ? (
              <PublishedLibrarySection
                copies={publishedCopies}
                onPreview={(copy) => setActivePublishedCopy(copy)}
              />
            ) : null}
          </div>
        )
      ) : filteredDrafts.length === 0 ? (
        <EmptyPanel message={emptyMessage()} />
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
          previewOnly
          onClose={() => setActiveDraftId(null)}
        />
      ) : null}

      {editDraft ? (
        <InviteDraftPreviewModal
          draft={editDraft}
          salonName={typeof salonName === "string" ? salonName : "Your Salon"}
          saving={savingDraft}
          onClose={() => setEditDraftId(null)}
          onSave={(message) => void patchDraft(editDraft.draftId, { editableMessage: message })}
          onApprove={(message) =>
            void patchDraft(editDraft.draftId, { status: "approved", editableMessage: message })
          }
          onSkip={() => void patchDraft(editDraft.draftId, { status: "skipped" })}
        />
      ) : null}

      {activePublishedCopy ? (
        <SalonInvitationPreviewModal
          open
          snapshot={activePublishedCopy.snapshot}
          tokenContext={tokenContext}
          onClose={() => setActivePublishedCopy(null)}
        />
      ) : null}
    </VmbPageFrame>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "24px 20px",
        borderRadius: 14,
        border: `1px solid ${VMB_THEME.line}`,
        background: "#fff",
      }}
    >
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: VMB_THEME.muted }}>{message}</p>
    </div>
  );
}

function PublishedLibrarySection({
  copies,
  onPreview,
}: {
  copies: SalonInviteLocalCopy[];
  onPreview: (copy: SalonInviteLocalCopy) => void;
}) {
  return (
    <section
      style={{
        borderRadius: 14,
        border: `1px solid ${VMB_THEME.line}`,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <header style={{ padding: "14px 16px", borderBottom: `1px solid ${VMB_THEME.line}` }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Published invitation library</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: VMB_THEME.muted }}>
          Admin-published templates available for your salon.
        </p>
      </header>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {copies.map((copy) => (
          <li
            key={copy.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
              gap: 12,
              alignItems: "center",
              padding: "14px 16px",
              borderTop: `1px solid ${VMB_THEME.line}`,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{copy.snapshot.templateName}</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: VMB_THEME.muted }}>
                Published from VMB library
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: VMB_THEME.muted }}>v{copy.publishedVersion}</p>
            <p style={{ margin: 0, fontSize: 13, color: VMB_THEME.muted }}>
              {formatSnapshotUpdatedAt(copy.snapshot)}
            </p>
            <button
              type="button"
              onClick={() => onPreview(copy)}
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
    </section>
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
