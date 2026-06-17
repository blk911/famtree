"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CardBuilderImageSlots } from "@/components/vmb/admin/CardBuilderImageSlots";
import { InviteTemplateRenderCard } from "@/components/vmb/invites/InviteTemplateRenderCard";
import {
  createInitialCardBuilderImageSlots,
  type CardBuilderDraftImageSlot,
} from "@/lib/vmb/card-templates/card-builder-preview-images";
import type { VmbCardTemplate } from "@/lib/vmb/card-templates/card-template-types";
import { getAllDefaultOffers } from "@/lib/vmb/offers/default-offers";
import { sortOffersForSelectorDisplay } from "@/lib/vmb/offers/offer-display-order";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";
import { getCardTypeForInviteTemplateId } from "@/lib/vmb/invite-templates/card-type-invite-template-map";
import { cloneInviteTemplate } from "@/lib/vmb/invite-templates/invite-template-copy-guard";
import { getDefaultNailInviteTemplate } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import {
  buildInviteTemplateRenderPayload,
  debugInvitePreviewSource,
  resolvedSalonOfferToRenderOffer,
} from "@/lib/vmb/invite-templates/invite-template-render";
import {
  INVITE_TEMPLATE_PREVIEW_CONTEXT,
  applyInviteTemplateTokens,
} from "@/lib/vmb/invite-templates/invite-template-tokens";
import type {
  InviteTemplateRenderOffer,
  VmbInviteOfferCategory,
  VmbInviteTemplate,
} from "@/lib/vmb/invite-templates/invite-template-types";
import { VMB_INVITE_OFFER_CATEGORIES } from "@/lib/vmb/invite-templates/invite-template-types";
import type { ResolvedSalonOfferDisplay } from "@/lib/vmb/salon-offers/salon-offer-catalog-types";
import { formatOfferPrice } from "@/lib/vmb/salon-offers/salon-offer-pricing";
import type { SalonOfferCatalogEntry } from "@/lib/vmb/salon-offers/salon-offer-catalog-types";

type Props = {
  salonId?: string;
  salonName: string;
  ownerName?: string;
  ownerPhotoUrl?: string;
};

function revokeDraftImageUrls(slots: CardBuilderDraftImageSlot[]) {
  for (const slot of slots) {
    if (slot.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(slot.previewUrl);
    }
  }
}

function catalogOfferToRenderOffer(offer: VmbOffer): InviteTemplateRenderOffer {
  return {
    name: offer.name,
    description: offer.description || offer.offerText,
    priceLabel: offer.valueLabel ?? "",
    serviceName: offer.name,
    addonLabels: [],
  };
}

/** Card-template store keeps offer/image metadata only — never invite copy fields. */
function buildCardTemplateOfferPayload(
  cardDraft: VmbCardTemplate,
  salonOfferCatalogId?: string,
): VmbCardTemplate {
  return {
    ...cardDraft,
    salonOfferCatalogId: salonOfferCatalogId || undefined,
  };
}

export function CardTemplateAdminClient({ salonId, salonName, ownerName, ownerPhotoUrl }: Props) {
  const [cardTemplates, setCardTemplates] = useState<VmbCardTemplate[]>([]);
  const [inviteTemplates, setInviteTemplates] = useState<VmbInviteTemplate[]>([]);
  const [inviteDrafts, setInviteDrafts] = useState<Record<string, VmbInviteTemplate>>({});
  const [offers, setOffers] = useState<VmbOffer[]>(getAllDefaultOffers());
  const [salonCatalogOffers, setSalonCatalogOffers] = useState<SalonOfferCatalogEntry[]>([]);
  const [selectedInviteId, setSelectedInviteId] = useState<string>("nails-private-client-network");
  const [cardDraft, setCardDraft] = useState<VmbCardTemplate | null>(null);
  const [selectedCatalogOfferId, setSelectedCatalogOfferId] = useState("");
  const [selectedSalonOfferId, setSelectedSalonOfferId] = useState("");
  const [salonOfferDisplay, setSalonOfferDisplay] = useState<ResolvedSalonOfferDisplay | null>(null);
  const [imageSlots, setImageSlots] = useState<CardBuilderDraftImageSlot[]>(() =>
    createInitialCardBuilderImageSlots(ownerPhotoUrl),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    if (!salonId) return;
    const [cardRes, inviteRes, offerRes, salonOfferRes] = await Promise.all([
      fetch("/api/vmb/card-templates"),
      fetch("/api/vmb/invite-templates?categoryId=nails&includeInactive=1"),
      fetch("/api/vmb/offers"),
      fetch("/api/vmb/salon-offers?activeOnly=1"),
    ]);
    const cardData = (await cardRes.json()) as { ok?: boolean; templates?: VmbCardTemplate[] };
    const inviteData = (await inviteRes.json()) as { ok?: boolean; templates?: VmbInviteTemplate[] };
    const offerData = (await offerRes.json()) as { ok?: boolean; offers?: VmbOffer[] };
    const salonOfferData = (await salonOfferRes.json()) as {
      ok?: boolean;
      offers?: SalonOfferCatalogEntry[];
    };

    if (cardData.ok && cardData.templates) {
      setCardTemplates(cardData.templates);
    }
    if (inviteData.ok && inviteData.templates?.length) {
      setInviteTemplates(inviteData.templates);
      const nextDrafts: Record<string, VmbInviteTemplate> = {};
      for (const template of inviteData.templates) {
        nextDrafts[template.id] = cloneInviteTemplate(template);
      }
      setInviteDrafts(nextDrafts);
      setSelectedInviteId((current) =>
        inviteData.templates!.some((row) => row.id === current)
          ? current
          : inviteData.templates![0]!.id,
      );
    }
    if (offerData.ok && offerData.offers) {
      setOffers(offerData.offers);
    }
    if (salonOfferData.ok && salonOfferData.offers) {
      setSalonCatalogOffers(salonOfferData.offers);
    }
  }, [salonId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedInvite = useMemo(
    () => (selectedInviteId ? inviteDrafts[selectedInviteId] : undefined),
    [inviteDrafts, selectedInviteId],
  );
  const mappedCardType = getCardTypeForInviteTemplateId(selectedInviteId);

  const selectedCardTemplate = useMemo(() => {
    if (!mappedCardType) return undefined;
    return cardTemplates.find((template) => template.type === mappedCardType);
  }, [cardTemplates, mappedCardType]);

  useEffect(() => {
    if (!selectedCardTemplate) {
      setCardDraft(null);
      setSelectedSalonOfferId("");
      return;
    }
    const normalized = { ...selectedCardTemplate };
    setCardDraft(normalized);
    setSelectedSalonOfferId(normalized.salonOfferCatalogId ?? "");
  }, [selectedCardTemplate]);

  useEffect(() => {
    setImageSlots((current) => {
      revokeDraftImageUrls(current);
      return createInitialCardBuilderImageSlots(ownerPhotoUrl);
    });
  }, [selectedInviteId, ownerPhotoUrl]);

  useEffect(() => {
    if (!selectedSalonOfferId || !salonId) {
      setSalonOfferDisplay(null);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/vmb/salon-offers/${encodeURIComponent(selectedSalonOfferId)}`);
      if (!res.ok) {
        setSalonOfferDisplay(null);
        return;
      }
      const json = (await res.json()) as { display?: ResolvedSalonOfferDisplay };
      setSalonOfferDisplay(json.display ?? null);
    })();
  }, [selectedSalonOfferId, salonId]);

  const activeOffers = useMemo(
    () => sortOffersForSelectorDisplay(offers.filter((offer) => offer.active)),
    [offers],
  );

  const selectedCatalogOffer = useMemo(
    () => activeOffers.find((offer) => offer.id === selectedCatalogOfferId),
    [activeOffers, selectedCatalogOfferId],
  );

  const recipientPreview = useMemo(
    () => ({
      clientName: INVITE_TEMPLATE_PREVIEW_CONTEXT.clientName,
      salonName: salonName || INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
      offerName: salonOfferDisplay?.name ?? selectedCatalogOffer?.name,
      offerPrice: salonOfferDisplay
        ? formatOfferPrice(salonOfferDisplay.priceCents)
        : selectedCatalogOffer?.valueLabel,
    }),
    [salonName, salonOfferDisplay, selectedCatalogOffer],
  );

  const providerPreview = useMemo(
    () => ({
      providerName: ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
    }),
    [ownerName],
  );

  const previewOffer = useMemo((): InviteTemplateRenderOffer | undefined => {
    if (salonOfferDisplay) return resolvedSalonOfferToRenderOffer(salonOfferDisplay);
    if (selectedCatalogOffer) return catalogOfferToRenderOffer(selectedCatalogOffer);
    return undefined;
  }, [salonOfferDisplay, selectedCatalogOffer]);

  const previewPayload = useMemo(() => {
    if (!selectedInvite || selectedInvite.id !== selectedInviteId) return null;
    return buildInviteTemplateRenderPayload({
      inviteTemplate: selectedInvite,
      recipientPreview,
      providerPreview,
      salonOffer: previewOffer,
    });
  }, [previewOffer, recipientPreview, providerPreview, selectedInvite, selectedInviteId]);

  useEffect(() => {
    if (!selectedInvite || !previewPayload) return;
    debugInvitePreviewSource({
      selectedInviteTemplateId: selectedInviteId,
      templateBody: selectedInvite.body,
      templateCtaLabel: selectedInvite.ctaLabel,
      legacyPersonalNote: cardDraft?.messageTemplate,
      legacyWhyThisMatters: cardDraft?.relationshipBenefitTemplate,
      finalBody: previewPayload.body,
      finalCtaLabel: previewPayload.ctaLabel,
    });
  }, [cardDraft, previewPayload, selectedInvite, selectedInviteId]);

  const offerSelectionEnabled = Boolean(
    cardDraft && cardDraft.offerMode !== "none" && mappedCardType,
  );

  function patchInviteDraft(id: string, patch: Partial<VmbInviteTemplate>) {
    setInviteDrafts((prev) => ({
      ...prev,
      [id]: cloneInviteTemplate({ ...prev[id]!, ...patch }),
    }));
  }

  function toggleAllowedCategory(id: string, category: VmbInviteOfferCategory) {
    const draft = inviteDrafts[id];
    if (!draft) return;
    const current = new Set(draft.allowedOfferCategories);
    if (current.has(category)) current.delete(category);
    else current.add(category);
    patchInviteDraft(id, { allowedOfferCategories: Array.from(current) });
  }

  function handleSalonOfferChange(offerId: string) {
    setSelectedSalonOfferId(offerId);
    if (cardDraft) {
      setCardDraft({ ...cardDraft, salonOfferCatalogId: offerId || undefined });
    }
  }

  async function handleSave() {
    if (!salonId || !selectedInvite) return;
    setBusy(true);
    setStatus(null);

    const inviteRes = await fetch("/api/vmb/invite-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedInvite),
    });
    const inviteData = (await inviteRes.json()) as { ok?: boolean; template?: VmbInviteTemplate; error?: string };

    if (!inviteRes.ok) {
      setBusy(false);
      setStatus(inviteData.error ?? "Invite template save failed.");
      return;
    }

    if (inviteData.template) {
      setInviteDrafts((prev) => ({
        ...prev,
        [inviteData.template!.id]: cloneInviteTemplate(inviteData.template!),
      }));
    }

    if (cardDraft && mappedCardType) {
      const cardRes = await fetch("/api/vmb/card-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: buildCardTemplateOfferPayload(cardDraft, selectedSalonOfferId || undefined),
        }),
      });
      const cardData = (await cardRes.json()) as { ok?: boolean; error?: string };
      setBusy(false);
      if (!cardRes.ok) {
        setStatus(cardData.error ?? "Offer settings save failed.");
        return;
      }
    } else {
      setBusy(false);
    }

    setStatus("Template saved.");
    if (cardDraft && mappedCardType) {
      await loadData();
    }
  }

  async function handleReset() {
    if (!salonId || !selectedInvite) return;
    setBusy(true);
    setStatus(null);

    const baseline = getDefaultNailInviteTemplate(selectedInvite.id);
    if (baseline) {
      patchInviteDraft(selectedInvite.id, baseline);
      await fetch("/api/vmb/invite-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseline),
      });
    }

    if (mappedCardType) {
      const res = await fetch(`/api/vmb/card-templates?type=${mappedCardType}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; template?: VmbCardTemplate; error?: string };
      if (data.ok && data.template) {
        setCardDraft({ ...data.template });
        setSelectedSalonOfferId(data.template.salonOfferCatalogId ?? "");
      }
    }

    setBusy(false);
    setStatus("Reset to default template.");
    await loadData();
  }

  if (!salonId) {
    return (
      <div className="vmb-card-template-workspace">
        <header className="vmb-card-template-workspace__header">
          <h1 className="vmb-card-template-workspace__title">Card Templates</h1>
          <p className="vmb-card-template-workspace__subtitle">Admin template manager</p>
        </header>
        <p className="vmb-template-admin__status">Sign in to a VMB salon trial to manage outreach card templates.</p>
      </div>
    );
  }

  return (
    <div className="vmb-card-template-workspace">
      <header className="vmb-card-template-workspace__header">
        <div className="vmb-card-template-workspace__header-row">
          <div>
            <h1 className="vmb-card-template-workspace__title">Card Templates</h1>
            <p className="vmb-card-template-workspace__subtitle">
              Nail invite templates are the source of truth — edit copy, attach offers, and preview the salon render
            </p>
          </div>
          <div className="vmb-card-template-workspace__catalog-links">
            <Link href="/admin/invites/nails">Nail catalog</Link>
            <Link href="/admin/invites/services">Services</Link>
            <Link href="/admin/invites/offers">Offers</Link>
          </div>
        </div>

        <div
          className="vmb-card-template-workspace__types"
          role="tablist"
          aria-label="Nail invite template types"
        >
          {inviteTemplates.map((template) => {
            const isActive = selectedInviteId === template.id;
            const baseline = getDefaultNailInviteTemplate(template.id);
            const draft = inviteDrafts[template.id];
            const isCustomized =
              Boolean(baseline && draft) &&
              Boolean(
                draft &&
                  baseline &&
                  (draft.body !== baseline.body ||
                    draft.ctaLabel !== baseline.ctaLabel ||
                    draft.headline !== baseline.headline),
              );
            return (
              <button
                key={template.id}
                type="button"
                role="tab"
                id={`card-template-tab-${template.id}`}
                aria-selected={isActive}
                aria-controls="card-template-editor-panel"
                tabIndex={isActive ? 0 : -1}
                className={`vmb-card-template-workspace__type${isActive ? " vmb-card-template-workspace__type--active" : ""}`}
                onClick={() => setSelectedInviteId(template.id)}
              >
                {inviteDrafts[template.id]?.displayName ?? template.displayName}
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
          aria-labelledby={`card-template-tab-${selectedInviteId}`}
          className="vmb-card-template-workspace__editor"
        >
          {selectedInvite ? (
            <>
              <div className="vmb-card-template-workspace__editor-meta">
                <span>{selectedInvite.displayName}</span>
                <span aria-hidden="true">·</span>
                <span>Nails</span>
                {mappedCardType ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Card slot: {mappedCardType.replace(/_/g, " ")}</span>
                  </>
                ) : null}
              </div>

              <section className="vmb-card-builder__section" aria-labelledby="card-builder-offer-heading">
                <h3 id="card-builder-offer-heading" className="vmb-card-builder__section-title">
                  Offer
                </h3>
                {offerSelectionEnabled || salonCatalogOffers.length > 0 ? (
                  <>
                    <label className="vmb-template-admin__field">
                      <span>Choose offer (salon)</span>
                      <select
                        value={selectedSalonOfferId}
                        onChange={(event) => handleSalonOfferChange(event.target.value)}
                      >
                        <option value="">Select a salon offer</option>
                        {salonCatalogOffers.map((offer) => (
                          <option key={offer.id} value={offer.id}>
                            {offer.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="vmb-template-admin__field">
                      <span>Catalog offer fallback</span>
                      <select
                        value={selectedCatalogOfferId}
                        onChange={(event) => setSelectedCatalogOfferId(event.target.value)}
                      >
                        <option value="">Select an offer</option>
                        {activeOffers.map((offer) => (
                          <option key={offer.id} value={offer.id}>
                            {offer.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="vmb-card-builder__section-note">
                      Offer fills the offer area only — invite copy and CTA stay on the nail template.
                    </p>
                  </>
                ) : (
                  <p className="vmb-card-builder__section-note">
                    Attach a salon or catalog offer to preview the offer area.
                  </p>
                )}
              </section>

              <section className="vmb-card-builder__section" aria-labelledby="card-builder-message-heading">
                <h3 id="card-builder-message-heading" className="vmb-card-builder__section-title">
                  Invite content
                </h3>
                <div className="vmb-card-template-workspace__fields">
                  <label className="vmb-template-admin__field">
                    <span>Intent (internal)</span>
                    <textarea
                      rows={2}
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedInvite.intent}
                      onChange={(e) => patchInviteDraft(selectedInvite.id, { intent: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Subject</span>
                    <input
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedInvite.subject}
                      onChange={(e) => patchInviteDraft(selectedInvite.id, { subject: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Eyebrow</span>
                    <input
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedInvite.eyebrow}
                      onChange={(e) => patchInviteDraft(selectedInvite.id, { eyebrow: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Headline</span>
                    <input
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedInvite.headline}
                      onChange={(e) => patchInviteDraft(selectedInvite.id, { headline: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Body</span>
                    <textarea
                      rows={4}
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedInvite.body}
                      onChange={(e) => patchInviteDraft(selectedInvite.id, { body: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>CTA label</span>
                    <input
                      className="vmb-card-template-workspace__copy-input"
                      value={selectedInvite.ctaLabel}
                      onChange={(e) => patchInviteDraft(selectedInvite.id, { ctaLabel: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Default offer category</span>
                    <select
                      value={selectedInvite.defaultOfferCategory}
                      onChange={(e) =>
                        patchInviteDraft(selectedInvite.id, {
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
                            checked={selectedInvite.allowedOfferCategories.includes(category)}
                            onChange={() => toggleAllowedCategory(selectedInvite.id, category)}
                          />
                          {category}
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>

                <p className="vmb-nail-invite-catalog__subject-preview">
                  Subject preview:{" "}
                  {applyInviteTemplateTokens(selectedInvite.subject, {
                    ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
                    ...recipientPreview,
                    ...providerPreview,
                  })}
                </p>
              </section>

              {mappedCardType ? (
                <CardBuilderImageSlots slots={imageSlots} onChange={setImageSlots} />
              ) : null}

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
              </div>
              {status ? <p className="vmb-template-admin__status">{status}</p> : null}
            </>
          ) : null}
        </section>

        <aside className="vmb-card-template-workspace__preview">
          <p className="vmb-template-admin__preview-label">Salon dashboard preview</p>
          <p className="vmb-template-admin__preview-meta">
            {recipientPreview.clientName ?? INVITE_TEMPLATE_PREVIEW_CONTEXT.clientName} ·{" "}
            {selectedInvite?.displayName ?? "Invite"}
          </p>
          {previewPayload && previewPayload.templateId === selectedInviteId ? (
            <InviteTemplateRenderCard
              key={selectedInviteId}
              payload={previewPayload}
              mode="adminPreview"
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
