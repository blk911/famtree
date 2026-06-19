"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InviteDraftPreviewModal } from "@/components/vmb/dashboard/InviteDraftPreviewModal";
import { BookLoadedStatusNote } from "@/components/vmb/BookLoadedStatusNote";
import { SalonInvitationPreviewModal } from "@/components/vmb/salon/SalonInvitationPreviewModal";
import { SalonInvitationEditCopyModal } from "@/components/vmb/salon/SalonInvitationEditCopyModal";
import { ApprovedInvitationsSection } from "@/components/vmb/salon/ApprovedInvitationsSection";
import { ApprovedInvitationCard } from "@/components/vmb/salon/ApprovedInvitationCard";
import { PublishedInvitationsSection } from "@/components/vmb/salon/PublishedInvitationsSection";
import { SuggestedInvitationCard } from "@/components/vmb/salon/SuggestedInvitationCard";
import { SuggestedInviteMatchingDebug } from "@/components/vmb/salon/SuggestedInviteMatchingDebug";
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
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import {
  getSalonInviteInventoryStatus,
  publishedCopiesForMatching,
} from "@/lib/vmb/invites/salon-invite-inventory";
import {
  buildSuggestedInvitationsFromOpportunities,
  type SuggestedInvitationRecommendation,
} from "@/lib/vmb/invites/suggested-invitation-workflow";
import { publishedCopiesForDebug } from "@/lib/vmb/invites/published-copy-matching";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";
import { fetchVmbAnalysisForSalon } from "@/lib/vmb/resolve-active-analysis-client";
import { VMB_THEME } from "@/lib/vmb/theme";
import { useSortableList } from "@/lib/vmb/useSortableList";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { VmbInviteDraft } from "@/types/vmb/invite-draft";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import {
  approvalDedupeKey,
  approvalDedupeKeyFromRecommendation,
  buildApprovalInputFromRecommendation,
  resolveRecommendationPreviewSnapshot,
} from "@/lib/vmb/invites/salon-invitation-approval-workflow";
import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";
import type { SalonInvitationApproval } from "@/types/vmb/salon-invitation-approval";
import { friendlyInviteDraftError } from "@/lib/vmb/invite-drafts/invite-draft-storage-errors";
import { ViewSalonPageLink } from "@/components/vmb/salon/ViewSalonPageLink";

type TabId = "suggested" | "approved" | "sent" | "paused";

const TABS: { id: TabId; label: string }[] = [
  { id: "suggested", label: "Suggested" },
  { id: "approved", label: "Approved" },
  { id: "sent", label: "Sent" },
  { id: "paused", label: "Paused" },
];

const SUGGESTED_PUBLISHED_EMPTY_MESSAGE =
  "No invitations have been published to your salon yet. Suggested matches below are previews only until Admin publishes matching invitations.";

const DEFAULT_PACKAGE_PREVIEW_NOTICE =
  "Preview uses default package because this template has not been published.";

type Props = {
  initialAnalysisId?: string;
  initialSection?: string;
  salonName?: string;
  salonId?: string;
};

export function VmbInvitesClient({
  initialAnalysisId,
  initialSection,
  salonName: salonNameProp,
  salonId: salonIdProp,
}: Props) {
  const resolved = useVmbActiveAnalysisState(initialAnalysisId);
  const [tab, setTab] = useState<TabId>("suggested");
  const [focusSection, setFocusSection] = useState<InviteSectionId | undefined>(
    () => parseInviteSection(initialSection),
  );
  const [drafts, setDrafts] = useState<VmbInviteDraft[]>([]);
  const [publishedCopies, setPublishedCopies] = useState<SalonInviteLocalCopy[]>([]);
  const [approvals, setApprovals] = useState<SalonInvitationApproval[]>([]);
  const [publishedSalonId, setPublishedSalonId] = useState<string | null>(salonIdProp ?? null);
  const [opportunitySummary, setOpportunitySummary] = useState<TaikosOpportunitySummary | null>(null);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [editDraftId, setEditDraftId] = useState<string | null>(null);
  const [activePublishedCopy, setActivePublishedCopy] = useState<SalonInviteLocalCopy | null>(null);
  const [previewApprovalSnapshot, setPreviewApprovalSnapshot] = useState<InviteTemplateSnapshot | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [editPublishedCopy, setEditPublishedCopy] = useState<SalonInviteLocalCopy | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [approveSuccessId, setApproveSuccessId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingInventory, setSavingInventory] = useState(false);

  const loadApprovals = useCallback(async () => {
    try {
      const res = await fetch("/api/vmb/salon-invitation-approvals", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        approvals?: SalonInvitationApproval[];
        salonId?: string;
      };
      setApprovals(json.ok && json.approvals ? json.approvals : []);
      if (json.ok && json.salonId) {
        setPublishedSalonId(json.salonId);
      }
    } catch {
      setApprovals([]);
    }
  }, []);

  const loadPublished = useCallback(async () => {
    try {
      const res = await fetch("/api/vmb/salon-invites", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        copies?: SalonInviteLocalCopy[];
        salonId?: string;
      };
      setPublishedCopies(json.ok && json.copies ? json.copies : []);
      setPublishedSalonId(json.ok && json.salonId ? json.salonId : null);
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
    await Promise.all([loadPublished(), loadOpportunities(), loadDrafts(), loadApprovals()]);
    setLoadingSuggested(false);
  }, [loadApprovals, loadDrafts, loadOpportunities, loadPublished]);

  const loadWorkflowTabs = useCallback(async () => {
    setLoadingDrafts(true);
    await Promise.all([loadDrafts(), loadApprovals(), loadPublished()]);
    setLoadingDrafts(false);
  }, [loadApprovals, loadDrafts, loadPublished]);

  useEffect(() => {
    if (tab === "suggested") {
      void loadSuggested();
      return;
    }
    void loadWorkflowTabs();
  }, [loadSuggested, loadWorkflowTabs, tab]);

  useEffect(() => {
    setFocusSection(parseInviteSection(initialSection));
  }, [initialSection]);

  const matchingPublishedCopies = useMemo(
    () => publishedCopiesForMatching(publishedCopies),
    [publishedCopies],
  );

  const suggestedRecommendations = useMemo(() => {
    const opportunities = opportunitySummary?.opportunities ?? [];
    return buildSuggestedInvitationsFromOpportunities(opportunities, matchingPublishedCopies, {
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
    matchingPublishedCopies,
  ]);

  const approvalDedupeKeys = useMemo(
    () => new Set(approvals.map((approval) => approvalDedupeKey(approval))),
    [approvals],
  );

  const resolvedSalonId = publishedSalonId ?? salonIdProp ?? null;

  const visibleSuggestedRecommendations = useMemo(() => {
    return suggestedRecommendations.filter((recommendation) => {
      if (!resolvedSalonId) return true;
      const key = approvalDedupeKeyFromRecommendation(resolvedSalonId, recommendation);
      if (!key) return true;
      return !approvalDedupeKeys.has(key);
    });
  }, [approvalDedupeKeys, resolvedSalonId, suggestedRecommendations]);

  const approvedRecords = useMemo(
    () => approvals.filter((approval) => approval.status === "approved"),
    [approvals],
  );

  const sentApprovals = useMemo(
    () => approvals.filter((approval) => approval.status === "sent"),
    [approvals],
  );

  const pausedApprovals = useMemo(
    () => approvals.filter((approval) => approval.status === "paused"),
    [approvals],
  );

  const pausedInventoryCopies = useMemo(
    () => publishedCopies.filter((copy) => getSalonInviteInventoryStatus(copy) === "paused"),
    [publishedCopies],
  );

  const filteredDrafts = useMemo(() => {
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

  const publishedCopyDebugEntries = useMemo(
    () => publishedCopiesForDebug(publishedCopies),
    [publishedCopies],
  );

  const salonId = publishedSalonId ?? salonIdProp ?? null;
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

  async function createApprovalFromRecommendation(
    recommendation: SuggestedInvitationRecommendation,
    action: "approve" | "pause",
  ): Promise<SalonInvitationApproval | null> {
    if (!resolvedSalonId) return null;
    const input = buildApprovalInputFromRecommendation(resolvedSalonId, recommendation, action);
    if ("error" in input) return null;

    const res = await fetch("/api/vmb/salon-invitation-approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, ...input }),
    });
    const json = (await res.json()) as { ok?: boolean; approval?: SalonInvitationApproval };
    if (!res.ok || !json.ok || !json.approval) return null;

    setApprovals((prev) => {
      const key = approvalDedupeKey(json.approval!);
      const others = prev.filter((row) => approvalDedupeKey(row) !== key);
      return [json.approval!, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
    return json.approval;
  }

  async function handleApprove(recommendation: SuggestedInvitationRecommendation) {
    if (!recommendation.publishedCopy) return;
    setActionBusyId(recommendation.id);
    try {
      const approval = await createApprovalFromRecommendation(recommendation, "approve");
      if (approval) {
        setApproveSuccessId(recommendation.id);
        window.setTimeout(() => {
          setApproveSuccessId((current) => (current === recommendation.id ? null : current));
        }, 2500);
      }
    } finally {
      setActionBusyId(null);
    }
  }

  async function handlePause(recommendation: SuggestedInvitationRecommendation) {
    setActionBusyId(recommendation.id);
    try {
      const approval = await createApprovalFromRecommendation(recommendation, "pause");
      if (approval) {
        setTab("paused");
      }
    } finally {
      setActionBusyId(null);
    }
  }

  async function patchApprovalStatus(
    approval: SalonInvitationApproval,
    action: "pause" | "resume",
  ): Promise<boolean> {
    setActionBusyId(approval.id);
    try {
      const res = await fetch(`/api/vmb/salon-invitation-approvals/${encodeURIComponent(approval.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { ok?: boolean; approval?: SalonInvitationApproval };
      if (!res.ok || !json.ok || !json.approval) return false;
      setApprovals((prev) =>
        prev.map((row) => (row.id === approval.id ? json.approval! : row)),
      );
      return true;
    } catch {
      return false;
    } finally {
      setActionBusyId(null);
    }
  }

  function handlePreview(recommendation: SuggestedInvitationRecommendation) {
    if (recommendation.publishedCopy) {
      setPreviewNotice(null);
      setActivePublishedCopy(recommendation.publishedCopy);
      return;
    }
    const adminSnapshot = resolveRecommendationPreviewSnapshot(recommendation, {
      salonName: typeof salonName === "string" ? salonName : undefined,
    });
    if (adminSnapshot) {
      setPreviewNotice(DEFAULT_PACKAGE_PREVIEW_NOTICE);
      setPreviewApprovalSnapshot(adminSnapshot);
      return;
    }
    const draft = drafts.find((d) => d.draftId === recommendation.draftId);
    if (draft) {
      setActiveDraftId(draft.draftId);
    }
  }

  function closePreviewSnapshot() {
    setPreviewApprovalSnapshot(null);
    setPreviewNotice(null);
  }

  function replacePublishedCopy(updated: SalonInviteLocalCopy) {
    setPublishedCopies((prev) => {
      const next = prev.filter((copy) => copy.id !== updated.id);
      return [updated, ...next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  }

  async function patchPublishedCopy(
    copy: SalonInviteLocalCopy,
    patch: {
      inventoryStatus?: "published" | "paused";
      headline?: string;
      body?: string;
      ctaLabel?: string;
    },
  ): Promise<boolean> {
    setSavingInventory(true);
    try {
      const res = await fetch(`/api/vmb/salon-invites/${encodeURIComponent(copy.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { ok?: boolean; copy?: SalonInviteLocalCopy };
      if (!res.ok || !json.ok || !json.copy) return false;
      replacePublishedCopy(json.copy);
      return true;
    } catch {
      return false;
    } finally {
      setSavingInventory(false);
    }
  }

  async function handleInventoryPause(copy: SalonInviteLocalCopy) {
    setActionBusyId(copy.id);
    try {
      const nextStatus = getSalonInviteInventoryStatus(copy) === "paused" ? "published" : "paused";
      await patchPublishedCopy(copy, { inventoryStatus: nextStatus });
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleInventoryDuplicate(copy: SalonInviteLocalCopy) {
    setActionBusyId(copy.id);
    try {
      const res = await fetch(`/api/vmb/salon-invites/${encodeURIComponent(copy.id)}`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; copy?: SalonInviteLocalCopy };
      if (res.ok && json.ok && json.copy) {
        replacePublishedCopy(json.copy);
      }
    } finally {
      setActionBusyId(null);
    }
  }

  function handleInventoryEditCopy(copy: SalonInviteLocalCopy) {
    setEditPublishedCopy(copy);
  }

  function emptyMessage(): string {
    if (tab === "approved") {
      return "No invitations approved yet.";
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
    <VmbPageFrame width="full" headerless>
      <header className="vmb-page-frame__header">
        <div className="vmb-page-frame__header-main">
          <div className="vmb-page-frame__header-copy">
            <p className="vmb-page-frame__eyebrow">{typeof salonName === "string" ? salonName : undefined}</p>
            <h1 className="vmb-page-frame__title">Opportunity Center</h1>
            <p className="vmb-page-frame__subtitle">
              Review client opportunities and choose which invitations should appear on your salon page
              and future outreach.
            </p>
          </div>
          <div className="vmb-page-frame__header-action">
            <ViewSalonPageLink />
          </div>
        </div>
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

      {tab === "suggested" && analysis ? (
        <BookLoadedStatusNote
          loadedAt={analysis.generatedAt}
          clientCount={analysis.recordCount}
        />
      ) : null}

      {loading ? (
        <p style={{ fontSize: 14, color: VMB_THEME.muted }}>Loading invitations…</p>
      ) : tab === "suggested" ? (
        <div style={{ display: "grid", gap: 28 }}>
          <SuggestedInviteMatchingDebug
            salonId={resolvedSalonId}
            publishedCount={publishedCopies.length}
            publishedCopies={publishedCopyDebugEntries}
            recommendations={suggestedRecommendations}
          />
          <PublishedInvitationsSection
            copies={publishedCopies}
            tokenContext={tokenContext}
            actionBusyId={actionBusyId}
            emptyMessage={SUGGESTED_PUBLISHED_EMPTY_MESSAGE}
            onPreview={(copy) => setActivePublishedCopy(copy)}
            onEditCopy={handleInventoryEditCopy}
            onPause={(copy) => void handleInventoryPause(copy)}
            onDuplicate={(copy) => void handleInventoryDuplicate(copy)}
          />
          <SuggestedMatchesSection
            recommendations={visibleSuggestedRecommendations}
            actionBusyId={actionBusyId}
            approveSuccessId={approveSuccessId}
            tokenContext={tokenContext}
            salonName={typeof salonName === "string" ? salonName : undefined}
            onPreview={handlePreview}
            onApprove={(recommendation) => void handleApprove(recommendation)}
            onPause={(recommendation) => void handlePause(recommendation)}
          />
        </div>
      ) : tab === "approved" ? (
        <ApprovedInvitationsSection
          approvals={approvedRecords}
          actionBusyId={actionBusyId}
          onPreview={(approval) => setPreviewApprovalSnapshot(approval.snapshot)}
          onPause={(approval) => void patchApprovalStatus(approval, "pause")}
        />
      ) : tab === "paused" ? (
        <PausedInvitationsSection
          pausedApprovals={pausedApprovals}
          pausedInventoryCopies={pausedInventoryCopies}
          actionBusyId={actionBusyId}
          onPreviewApproval={(approval) => setPreviewApprovalSnapshot(approval.snapshot)}
          onPreviewInventory={(copy) => setActivePublishedCopy(copy)}
          onResumeApproval={(approval) => void patchApprovalStatus(approval, "resume")}
        />
      ) : tab === "sent" && sentApprovals.length === 0 && filteredDrafts.length === 0 ? (
        <EmptyPanel message={emptyMessage()} />
      ) : tab === "sent" ? (
        <div style={{ display: "grid", gap: 28 }}>
          {sentApprovals.length > 0 ? (
            <section>
              <header style={{ marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Sent Invitations</h2>
              </header>
              <div style={{ display: "grid", gap: 16 }}>
                {sentApprovals.map((approval) => (
                  <ApprovedInvitationCard
                    key={approval.id}
                    approval={approval}
                    busy={actionBusyId === approval.id}
                    onPreview={() => setPreviewApprovalSnapshot(approval.snapshot)}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {filteredDrafts.length > 0 ? (
            <div style={{ display: "grid", gap: 28 }}>
              {INVITE_SECTION_ORDER.map((section) => {
                const rows = grouped.get(section) ?? [];
                if (rows.length === 0) return null;
                return (
                  <section key={section}>
                    <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>
                      {INVITE_SECTION_LABELS[section]}
                    </h2>
                    <InviteSectionRows rows={rows} onPreview={(draftId) => setActiveDraftId(draftId)} />
                  </section>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

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

      {previewApprovalSnapshot ? (
        <SalonInvitationPreviewModal
          open
          snapshot={previewApprovalSnapshot}
          tokenContext={tokenContext}
          notice={previewNotice ?? undefined}
          onClose={closePreviewSnapshot}
        />
      ) : null}

      {editPublishedCopy ? (
        <SalonInvitationEditCopyModal
          copy={editPublishedCopy}
          saving={savingInventory}
          onClose={() => setEditPublishedCopy(null)}
          onSave={(patch) =>
            void patchPublishedCopy(editPublishedCopy, patch).then((ok) => {
              if (ok) setEditPublishedCopy(null);
            })
          }
        />
      ) : null}
    </VmbPageFrame>
  );
}

function SuggestedMatchesSection({
  recommendations,
  actionBusyId,
  approveSuccessId,
  tokenContext,
  salonName,
  onPreview,
  onApprove,
  onPause,
}: {
  recommendations: SuggestedInvitationRecommendation[];
  actionBusyId: string | null;
  approveSuccessId: string | null;
  tokenContext: InviteTemplateTokenContext;
  salonName?: string;
  onPreview: (recommendation: SuggestedInvitationRecommendation) => void;
  onApprove: (recommendation: SuggestedInvitationRecommendation) => void;
  onPause: (recommendation: SuggestedInvitationRecommendation) => void;
}) {
  return (
    <section>
      <header style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Suggested Matches</h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: VMB_THEME.muted }}>
          TAIKOS recommendations mapped to your published salon invitation inventory.
        </p>
      </header>
      {recommendations.length === 0 ? (
        <EmptyPanel message="No suggested invitations right now." />
      ) : (
        <div className="vmb-suggested-invite-list">
          {recommendations.map((recommendation) => {
            const previewSnapshot = resolveRecommendationPreviewSnapshot(recommendation, { salonName });
            const cardTokenContext = {
              ...tokenContext,
              clientName: recommendation.clientName,
            };
            return (
              <SuggestedInvitationCard
                key={recommendation.id}
                recommendation={recommendation}
                previewSnapshot={previewSnapshot}
                tokenContext={cardTokenContext}
                busy={actionBusyId === recommendation.id}
                approveSuccess={approveSuccessId === recommendation.id}
                onPreview={() => onPreview(recommendation)}
                onApprove={() => onApprove(recommendation)}
                onPause={() => onPause(recommendation)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function PausedInvitationsSection({
  pausedApprovals,
  pausedInventoryCopies,
  actionBusyId,
  onPreviewApproval,
  onPreviewInventory,
  onResumeApproval,
}: {
  pausedApprovals: SalonInvitationApproval[];
  pausedInventoryCopies: SalonInviteLocalCopy[];
  actionBusyId: string | null;
  onPreviewApproval: (approval: SalonInvitationApproval) => void;
  onPreviewInventory: (copy: SalonInviteLocalCopy) => void;
  onResumeApproval: (approval: SalonInvitationApproval) => void;
}) {
  const hasItems = pausedApprovals.length > 0 || pausedInventoryCopies.length > 0;

  return (
    <section style={{ display: "grid", gap: 24 }}>
      <header>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Paused Invitations</h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: VMB_THEME.muted }}>
          Paused suggestions and inventory templates excluded from active matching.
        </p>
      </header>
      {!hasItems ? (
        <EmptyPanel message="No paused invitations." />
      ) : (
        <>
          {pausedApprovals.length > 0 ? (
            <div style={{ display: "grid", gap: 16 }}>
              {pausedApprovals.map((approval) => (
                <ApprovedInvitationCard
                  key={approval.id}
                  approval={approval}
                  busy={actionBusyId === approval.id}
                  onPreview={() => onPreviewApproval(approval)}
                  onResume={() => onResumeApproval(approval)}
                />
              ))}
            </div>
          ) : null}
          {pausedInventoryCopies.length > 0 ? (
            <div style={{ display: "grid", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Paused inventory templates</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                {pausedInventoryCopies.map((copy) => (
                  <li
                    key={copy.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${VMB_THEME.line}`,
                      background: "#fff",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{copy.snapshot.templateName}</span>
                    <button
                      type="button"
                      onClick={() => onPreviewInventory(copy)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: `1px solid ${VMB_THEME.line}`,
                        background: "#fff",
                        fontSize: 12,
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
          ) : null}
        </>
      )}
    </section>
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
