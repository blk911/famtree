"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminFinalCardCheckModal } from "@/components/vmb/invites/AdminFinalCardCheckModal";
import { AdminNailInviteCard } from "@/components/vmb/invites/AdminNailInviteCard";
import { AdminNailInvitePreviewDebugPanel } from "@/components/vmb/invites/AdminNailInvitePreviewDebugPanel";
import { getAllDefaultOffers } from "@/lib/vmb/offers/default-offers";
import { sortOffersForSelectorDisplay } from "@/lib/vmb/offers/offer-display-order";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";
import {
  ADMIN_INVITE_RENDER_DEBUG_STYLE,
  debugPreview160,
  inviteDraftsHaveDuplicateBodies,
  inviteDraftStats,
} from "@/lib/vmb/invite-templates/admin-nail-invite-card-content";
import { selectInviteTemplateId } from "@/lib/vmb/invite-templates/admin-invite-template-selection";
import {
  cloneInviteTemplate,
  sanitizeInviteTemplateAgainstLegacyBleed,
} from "@/lib/vmb/invite-templates/invite-template-copy-guard";
import {
  DEFAULT_NAIL_INVITE_TEMPLATES,
  getDefaultNailInviteTemplate,
} from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import {
  INVITE_TEMPLATE_PREVIEW_CONTEXT,
  applyInviteTemplateTokens,
} from "@/lib/vmb/invite-templates/invite-template-tokens";
import type {
  VmbInviteOfferCategory,
  VmbInviteTemplate,
} from "@/lib/vmb/invite-templates/invite-template-types";
import { VMB_INVITE_OFFER_CATEGORIES } from "@/lib/vmb/invite-templates/invite-template-types";

type Props = {
  salonId?: string;
  salonName: string;
  ownerName?: string;
};

const NAIL_INVITE_TEMPLATES_URL =
  "/api/vmb/invite-templates?categoryId=nails&includeInactive=1";

function buildInitialDrafts(): Record<string, VmbInviteTemplate> {
  const drafts: Record<string, VmbInviteTemplate> = {};
  for (const baseline of DEFAULT_NAIL_INVITE_TEMPLATES) {
    drafts[baseline.id] = cloneInviteTemplate(baseline);
  }
  return drafts;
}

export function CardTemplateAdminClient({ salonId, salonName, ownerName }: Props) {
  const [inviteDrafts, setInviteDrafts] = useState<Record<string, VmbInviteTemplate>>(buildInitialDrafts);
  const [offers, setOffers] = useState<VmbOffer[]>(getAllDefaultOffers());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("nails-private-client-network");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [finalCardCheckOpen, setFinalCardCheckOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverReloadStats, setServerReloadStats] = useState<{
    count: number;
    uniqueBodies: number;
  } | null>(null);

  const templateIds = useMemo(
    () => DEFAULT_NAIL_INVITE_TEMPLATES.map((row) => row.id),
    [],
  );

  const selectedDraft = inviteDrafts[selectedTemplateId];
  const previewTemplate = selectedDraft;

  const selectTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplateId((current) => selectInviteTemplateId(templateIds, templateId, current));
    },
    [templateIds],
  );

  const loadInviteTemplates = useCallback(async () => {
    const inviteRes = await fetch(NAIL_INVITE_TEMPLATES_URL, { cache: "no-store" });
    const inviteData = (await inviteRes.json()) as { ok?: boolean; templates?: VmbInviteTemplate[] };

    const nextDrafts = buildInitialDrafts();
    if (inviteData.ok && inviteData.templates?.length) {
      for (const row of inviteData.templates) {
        if (!nextDrafts[row.id]) continue;
        nextDrafts[row.id] = cloneInviteTemplate(sanitizeInviteTemplateAgainstLegacyBleed(row));
      }
    }

    const stats = inviteDraftStats(nextDrafts);
    setInviteDrafts(nextDrafts);
    setServerReloadStats(stats);
    setSelectedTemplateId((current) =>
      selectInviteTemplateId(templateIds, current, DEFAULT_NAIL_INVITE_TEMPLATES[0]!.id),
    );
    return stats;
  }, [templateIds]);

  async function handleReloadFromServer() {
    setBusy(true);
    setStatus(null);
    try {
      const stats = await loadInviteTemplates();
      setStatus(`Reloaded ${stats.count} templates from server (${stats.uniqueBodies} unique bodies).`);
    } catch {
      setStatus("Failed to reload templates from server.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadInviteTemplates();
  }, [loadInviteTemplates]);

  useEffect(() => {
    void (async () => {
      const offerRes = await fetch("/api/vmb/offers");
      const offerData = (await offerRes.json()) as { ok?: boolean; offers?: VmbOffer[] };
      if (offerData.ok && offerData.offers) {
        setOffers(offerData.offers);
      }
    })();
  }, []);

  const storeHasDuplicateBodies = useMemo(
    () => inviteDraftsHaveDuplicateBodies(inviteDrafts),
    [inviteDrafts],
  );

  const tokenContext = useMemo(
    () => ({
      ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
      clientName: INVITE_TEMPLATE_PREVIEW_CONTEXT.clientName,
      salonName: salonName || INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
      providerName: ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
    }),
    [ownerName, salonName],
  );

  const activeOffers = useMemo(
    () => sortOffersForSelectorDisplay(offers.filter((offer) => offer.active)),
    [offers],
  );

  const selectedOffer = useMemo(
    () => activeOffers.find((offer) => offer.id === selectedOfferId),
    [activeOffers, selectedOfferId],
  );

  const previewOffer = useMemo(() => {
    if (!selectedOffer) return undefined;
    return {
      name: selectedOffer.name,
      description: selectedOffer.description || selectedOffer.offerText,
      price: selectedOffer.valueLabel ?? "",
      serviceName: selectedOffer.name,
      addonLabels: [] as string[],
    };
  }, [selectedOffer]);

  function patchSelectedDraft(patch: Partial<VmbInviteTemplate>) {
    setInviteDrafts((prev) => ({
      ...prev,
      [selectedTemplateId]: cloneInviteTemplate({ ...prev[selectedTemplateId]!, ...patch }),
    }));
  }

  function toggleAllowedCategory(category: VmbInviteOfferCategory) {
    const draft = inviteDrafts[selectedTemplateId];
    if (!draft) return;
    const current = new Set(draft.allowedOfferCategories);
    if (current.has(category)) current.delete(category);
    else current.add(category);
    patchSelectedDraft({ allowedOfferCategories: Array.from(current) });
  }

  async function handleSave() {
    if (!salonId || !selectedDraft) return;
    setBusy(true);
    setStatus(null);

    const inviteRes = await fetch("/api/vmb/invite-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedDraft),
    });
    const inviteData = (await inviteRes.json()) as { ok?: boolean; template?: VmbInviteTemplate; error?: string };

    setBusy(false);
    if (!inviteRes.ok) {
      setStatus(inviteData.error ?? "Invite template save failed.");
      return;
    }

    if (inviteData.template) {
      setInviteDrafts((prev) => ({
        ...prev,
        [inviteData.template!.id]: cloneInviteTemplate(
          sanitizeInviteTemplateAgainstLegacyBleed(inviteData.template!),
        ),
      }));
    }

    setStatus("Template saved.");
  }

  async function handleReset() {
    if (!salonId || !selectedDraft) return;
    setBusy(true);
    setStatus(null);

    const baseline = getDefaultNailInviteTemplate(selectedDraft.id);
    if (baseline) {
      setInviteDrafts((prev) => ({
        ...prev,
        [selectedTemplateId]: cloneInviteTemplate(baseline),
      }));
      await fetch("/api/vmb/invite-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseline),
      });
    }

    setBusy(false);
    setStatus("Reset to default template.");
    await loadInviteTemplates();
  }

  if (!salonId) {
    return (
      <div className="vmb-card-template-workspace">
        <div style={ADMIN_INVITE_RENDER_DEBUG_STYLE} data-testid="admin-invite-page-render-debug">
          <strong>PAGE RENDER DEBUG (always visible)</strong>
          {"\n"}selectedTemplateId: {selectedTemplateId}
          {"\n"}selectedDraft.headline: {selectedDraft?.headline ?? "(missing draft)"}
          {"\n"}selectedDraft.ctaLabel: {selectedDraft?.ctaLabel ?? "(missing draft)"}
          {"\n"}selectedDraft.body: {debugPreview160(selectedDraft?.body)}
          {"\n"}previewTemplate.id: {previewTemplate?.id ?? "(missing)"}
          {"\n"}previewTemplate.headline: {previewTemplate?.headline ?? "(missing)"}
          {"\n"}previewTemplate.ctaLabel: {previewTemplate?.ctaLabel ?? "(missing)"}
          {"\n"}previewTemplate.body: {debugPreview160(previewTemplate?.body)}
        </div>
        <header className="vmb-card-template-workspace__header">
          <h1 className="vmb-card-template-workspace__title">Nail Invite Templates</h1>
          <p className="vmb-card-template-workspace__subtitle">Admin template manager</p>
        </header>
        <p className="vmb-template-admin__status">Sign in to a VMB salon trial to manage nail invite templates.</p>
      </div>
    );
  }

  return (
    <div className="vmb-card-template-workspace">
      <div style={ADMIN_INVITE_RENDER_DEBUG_STYLE} data-testid="admin-invite-page-render-debug">
        <strong>PAGE RENDER DEBUG (always visible)</strong>
        {"\n"}selectedTemplateId: {selectedTemplateId}
        {"\n"}selectedDraft.headline: {selectedDraft?.headline ?? "(missing draft)"}
        {"\n"}selectedDraft.ctaLabel: {selectedDraft?.ctaLabel ?? "(missing draft)"}
        {"\n"}selectedDraft.body: {debugPreview160(selectedDraft?.body)}
        {"\n"}previewTemplate.id: {previewTemplate?.id ?? "(missing)"}
        {"\n"}previewTemplate.headline: {previewTemplate?.headline ?? "(missing)"}
        {"\n"}previewTemplate.ctaLabel: {previewTemplate?.ctaLabel ?? "(missing)"}
        {"\n"}previewTemplate.body: {debugPreview160(previewTemplate?.body)}
      </div>
      <header className="vmb-card-template-workspace__header">
        <div className="vmb-card-template-workspace__header-row">
          <div>
            <h1 className="vmb-card-template-workspace__title">Nail Invite Templates</h1>
            <p className="vmb-card-template-workspace__subtitle">
              Admin nail invite cards — one selected template drives editor and preview
            </p>
          </div>
          <div className="vmb-card-template-workspace__catalog-links">
            <button
              type="button"
              className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
              disabled={busy}
              onClick={() => void handleReloadFromServer()}
            >
              {busy ? "Reloading…" : "Reload templates from server"}
            </button>
            <Link href="/admin/invites/nails">Nail catalog</Link>
            <Link href="/admin/invites/services">Services</Link>
            <Link href="/admin/invites/offers">Offers</Link>
          </div>
        </div>

        {storeHasDuplicateBodies ? (
          <p className="vmb-admin-nail-invite-debug__warning" role="alert">
            Invite template store has duplicate bodies. Run npm run repair:nail-invite-templates.
          </p>
        ) : null}

        <div
          className="vmb-card-template-workspace__types"
          role="tablist"
          aria-label="Nail invite template types"
        >
          {DEFAULT_NAIL_INVITE_TEMPLATES.map((baseline) => {
            const isActive = selectedTemplateId === baseline.id;
            const draft = inviteDrafts[baseline.id];
            const isCustomized =
              Boolean(draft) &&
              (draft.body !== baseline.body ||
                draft.ctaLabel !== baseline.ctaLabel ||
                draft.headline !== baseline.headline);
            return (
              <button
                key={baseline.id}
                type="button"
                role="tab"
                id={`card-template-tab-${baseline.id}`}
                aria-selected={isActive}
                aria-controls="card-template-editor-panel"
                tabIndex={isActive ? 0 : -1}
                className={`vmb-card-template-workspace__type${isActive ? " vmb-card-template-workspace__type--active" : ""}`}
                onClick={() => selectTemplate(baseline.id)}
              >
                {draft?.displayName ?? baseline.displayName}
                {isCustomized ? (
                  <span className="vmb-template-admin__override-dot" aria-label="Customized" />
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      <div className="vmb-card-template-workspace__body">
        <section
          id="card-template-editor-panel"
          role="tabpanel"
          aria-labelledby={`card-template-tab-${selectedTemplateId}`}
          className="vmb-card-template-workspace__editor"
        >
          {selectedDraft ? (
            <>
              <label className="vmb-template-admin__field">
                <span>Select invite</span>
                <select
                  value={selectedTemplateId}
                  onChange={(event) => selectTemplate(event.target.value)}
                >
                  {DEFAULT_NAIL_INVITE_TEMPLATES.map((baseline) => (
                    <option key={baseline.id} value={baseline.id}>
                      {inviteDrafts[baseline.id]?.displayName ?? baseline.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="vmb-card-template-workspace__editor-meta">
                <span>{selectedDraft.displayName}</span>
                <span aria-hidden="true">·</span>
                <span>Nails</span>
                <span aria-hidden="true">·</span>
                <span>{selectedTemplateId}</span>
              </div>

              <section className="vmb-card-builder__section" aria-labelledby="card-builder-offer-heading">
                <h3 id="card-builder-offer-heading" className="vmb-card-builder__section-title">
                  Offer preview (optional)
                </h3>
                <label className="vmb-template-admin__field">
                  <span>Catalog offer for offer block only</span>
                  <select
                    value={selectedOfferId}
                    onChange={(event) => setSelectedOfferId(event.target.value)}
                  >
                    <option value="">No offer selected</option>
                    {activeOffers.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {offer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="vmb-card-builder__section-note">
                  Offer fills the offer block only — headline, body, subject, and CTA stay on the invite template.
                </p>
              </section>

              <section
                key={selectedTemplateId}
                className="vmb-card-builder__section"
                aria-labelledby="card-builder-message-heading"
              >
                <h3 id="card-builder-message-heading" className="vmb-card-builder__section-title">
                  Invite content
                </h3>
                <div className="vmb-card-template-workspace__fields">
                  <label className="vmb-template-admin__field">
                    <span>Intent (internal)</span>
                    <textarea
                      rows={2}
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedDraft.intent}
                      onChange={(e) => patchSelectedDraft({ intent: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Subject</span>
                    <input
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedDraft.subject}
                      onChange={(e) => patchSelectedDraft({ subject: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Eyebrow</span>
                    <input
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedDraft.eyebrow}
                      onChange={(e) => patchSelectedDraft({ eyebrow: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Headline</span>
                    <input
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedDraft.headline}
                      onChange={(e) => patchSelectedDraft({ headline: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Body</span>
                    <textarea
                      rows={4}
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedDraft.body}
                      onChange={(e) => patchSelectedDraft({ body: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>CTA label</span>
                    <input
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedDraft.ctaLabel}
                      onChange={(e) => patchSelectedDraft({ ctaLabel: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Default offer category</span>
                    <select
                      value={selectedDraft.defaultOfferCategory}
                      onChange={(e) =>
                        patchSelectedDraft({
                          defaultOfferCategory: e.target.value as VmbInviteOfferCategory,
                        })
                      }
                    >
                      {VMB_INVITE_OFFER_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <fieldset className="vmb-nail-invite-catalog__allowed">
                  <legend>Allowed offer categories</legend>
                  <ul>
                    {VMB_INVITE_OFFER_CATEGORIES.map((category) => (
                      <li key={category}>
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedDraft.allowedOfferCategories.includes(category)}
                            onChange={() => toggleAllowedCategory(category)}
                          />
                          {category}
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>

                <p className="vmb-nail-invite-catalog__subject-preview">
                  Subject preview: {applyInviteTemplateTokens(selectedDraft.subject, tokenContext)}
                </p>
              </section>

              <div className="vmb-template-admin__actions">
                <button type="button" className="taikos-opp-card__cta" disabled={busy} onClick={() => void handleSave()}>
                  {busy ? "Saving…" : "Save template"}
                </button>
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  disabled={busy}
                  onClick={() => void handleReset()}
                >
                  Reset to default
                </button>
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  onClick={() => setFinalCardCheckOpen(true)}
                >
                  Review final card
                </button>
              </div>
              {status ? <p className="vmb-template-admin__status">{status}</p> : null}
            </>
          ) : null}
        </section>

        <aside className="vmb-card-template-workspace__preview">
          <p className="vmb-template-admin__preview-label">Admin nail invite card</p>
          <p className="vmb-template-admin__preview-meta">
            {tokenContext.clientName} · {selectedDraft?.displayName ?? "Invite"}
          </p>
          {selectedDraft ? (
            <AdminNailInviteCard
              key={selectedTemplateId}
              template={selectedDraft}
              tokenContext={tokenContext}
              offer={previewOffer}
            />
          ) : null}
          {selectedDraft ? (
            <AdminNailInvitePreviewDebugPanel
              selectedTemplateId={selectedTemplateId}
              dropdownValue={selectedTemplateId}
              pillSelectedId={selectedTemplateId}
              template={selectedDraft}
              tokenContext={tokenContext}
              serverTemplateCount={serverReloadStats?.count}
              serverUniqueBodyCount={serverReloadStats?.uniqueBodies}
            />
          ) : null}
        </aside>
      </div>

      {selectedDraft ? (
        <AdminFinalCardCheckModal
          open={finalCardCheckOpen}
          onClose={() => setFinalCardCheckOpen(false)}
          template={selectedDraft}
          tokenContext={tokenContext}
          offer={previewOffer}
        />
      ) : null}
    </div>
  );
}
