"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { CardBuilderImageSlots } from "@/components/vmb/admin/CardBuilderImageSlots";
import { CardPreview } from "@/components/vmb/cards/CardPreview";
import {
  applyCardBuilderImagesToPreview,
  createInitialCardBuilderImageSlots,
  type CardBuilderDraftImageSlot,
} from "@/lib/vmb/card-templates/card-builder-preview-images";
import { buildPreviewFromTemplate } from "@/lib/vmb/card-templates/apply-card-template";
import {
  normalizeTemplateForEditor,
  resolveTemplateCta,
} from "@/lib/vmb/card-templates/template-copy-fields";
import type { VmbCardTemplate } from "@/lib/vmb/card-templates/card-template-types";
import { CARD_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/card-templates/default-card-templates";
import { getAllDefaultOffers } from "@/lib/vmb/offers/default-offers";
import { resolveOfferForTemplate } from "@/lib/vmb/offers/offer-resolver";
import { sortOffersForSelectorDisplay } from "@/lib/vmb/offers/offer-display-order";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";
import type { SalonOfferCatalogEntry } from "@/lib/vmb/salon-offers/salon-offer-catalog-types";
import { formatOfferPrice } from "@/lib/vmb/salon-offers/salon-offer-pricing";
import {
  getAllDefaultServiceOptions,
  getAllDefaultServices,
} from "@/lib/vmb/services/default-service-catalog";
import { VMB_CARD_TYPES, type VmbCardType } from "@/lib/vmb/cards/card-types";
import { cardActionLabel } from "@/lib/vmb/cards/card-type-labels";

type Props = {
  salonId?: string;
  salonName: string;
  ownerName?: string;
  ownerPhotoUrl?: string;
};

const TYPE_LABELS: Record<VmbCardType, string> = {
  pcn_invite: "Private Client Network",
  refresh_card: "Refresh Reminder",
  reactivation_card: "We Miss You",
  open_slot_fill: "Opening Just Became Available",
  referral_invite: "Referral Invite",
  vip_thank_you: "VIP Thank You",
  birthday_card: "Birthday",
  service_card: "Favorite Providers",
};

function revokeDraftImageUrls(slots: CardBuilderDraftImageSlot[]) {
  for (const slot of slots) {
    if (slot.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(slot.previewUrl);
    }
  }
}

export function CardTemplateAdminClient({ salonId, salonName, ownerName, ownerPhotoUrl }: Props) {
  const [templates, setTemplates] = useState<VmbCardTemplate[]>([]);
  const [offers, setOffers] = useState<VmbOffer[]>(getAllDefaultOffers());
  const [salonCatalogOffers, setSalonCatalogOffers] = useState<SalonOfferCatalogEntry[]>([]);
  const [selectedType, setSelectedType] = useState<VmbCardType>("pcn_invite");
  const [draft, setDraft] = useState<VmbCardTemplate | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [imageSlots, setImageSlots] = useState<CardBuilderDraftImageSlot[]>(() =>
    createInitialCardBuilderImageSlots(ownerPhotoUrl),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!salonId) return;
    const [templateRes, offerRes, salonOfferRes] = await Promise.all([
      fetch("/api/vmb/card-templates"),
      fetch("/api/vmb/offers"),
      fetch("/api/vmb/salon-offers?activeOnly=1"),
    ]);
    const data = (await templateRes.json()) as { ok?: boolean; templates?: VmbCardTemplate[] };
    const offerData = (await offerRes.json()) as { ok?: boolean; offers?: VmbOffer[] };
    const salonOfferData = (await salonOfferRes.json()) as {
      ok?: boolean;
      offers?: SalonOfferCatalogEntry[];
    };
    if (data.ok && data.templates) {
      setTemplates(data.templates);
    }
    if (offerData.ok && offerData.offers) {
      setOffers(offerData.offers);
    }
    if (salonOfferData.ok && salonOfferData.offers) {
      setSalonCatalogOffers(salonOfferData.offers);
    }
  }, [salonId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.type === selectedType),
    [templates, selectedType],
  );

  useEffect(() => {
    if (!selectedTemplate) return;
    const normalized = normalizeTemplateForEditor({ ...selectedTemplate });
    setDraft(normalized);
    const resolved = resolveOfferForTemplate(normalized, offers);
    setSelectedOfferId(resolved?.id ?? "");
  }, [selectedTemplate, offers]);

  useEffect(() => {
    setImageSlots((current) => {
      revokeDraftImageUrls(current);
      return createInitialCardBuilderImageSlots(ownerPhotoUrl);
    });
  }, [selectedType, ownerPhotoUrl]);

  const services = useMemo(() => getAllDefaultServices(), []);
  const serviceOptions = useMemo(() => getAllDefaultServiceOptions(), []);

  const activeOffers = useMemo(
    () => sortOffersForSelectorDisplay(offers.filter((offer) => offer.active)),
    [offers],
  );

  const selectedOffer = useMemo(
    () => activeOffers.find((offer) => offer.id === selectedOfferId),
    [activeOffers, selectedOfferId],
  );

  const offerSelectionEnabled = Boolean(draft && draft.offerMode !== "none");

  const selectedSalonCatalogOffer = useMemo(
    () => salonCatalogOffers.find((offer) => offer.id === draft?.salonOfferCatalogId),
    [draft?.salonOfferCatalogId, salonCatalogOffers],
  );

  const preview = useMemo(() => {
    if (!draft) return null;
    const base = buildPreviewFromTemplate(
      draft,
      {
        cardType: draft.type,
        recipientName: CARD_TEMPLATE_PREVIEW_CONTEXT.clientName,
        salonName: salonName || CARD_TEMPLATE_PREVIEW_CONTEXT.salonName,
        techName: ownerName || CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,
        serviceName: CARD_TEMPLATE_PREVIEW_CONTEXT.serviceName,
        lastVisit: CARD_TEMPLATE_PREVIEW_CONTEXT.lastVisit,
        visitCount: CARD_TEMPLATE_PREVIEW_CONTEXT.visitCount,
        referralCount: CARD_TEMPLATE_PREVIEW_CONTEXT.referralCount,
        recommendationText: CARD_TEMPLATE_PREVIEW_CONTEXT.offer,
        nextOpening: CARD_TEMPLATE_PREVIEW_CONTEXT.nextOpening,
        offers,
        selectedOfferId: selectedOfferId || undefined,
        services,
        serviceOptions,
      },
      ownerName || CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,
    );
    let model = applyCardBuilderImagesToPreview(base, imageSlots);

    if (selectedSalonCatalogOffer) {
      const offerText =
        selectedSalonCatalogOffer.description.trim() || selectedSalonCatalogOffer.name;
      model = {
        ...model,
        includeOffer: true,
        offer: {
          id: selectedSalonCatalogOffer.id,
          name: selectedSalonCatalogOffer.name,
          valueLabel: formatOfferPrice(selectedSalonCatalogOffer.priceCents),
          offerText,
          category: "salon",
        },
        inviteCopy: model.inviteCopy
          ? { ...model.inviteCopy, offerMessage: offerText }
          : model.inviteCopy,
      };
    }

    return model;
  }, [
    draft,
    salonName,
    ownerName,
    offers,
    selectedOfferId,
    services,
    serviceOptions,
    imageSlots,
    selectedSalonCatalogOffer,
  ]);

  async function handleSave() {
    if (!draft || !salonId) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/vmb/card-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: draft }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (data.ok) {
      setStatus("Template saved.");
      await loadTemplates();
    } else {
      setStatus(data.error ?? "Save failed.");
    }
  }

  async function handleReset() {
    if (!salonId) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch(`/api/vmb/card-templates?type=${selectedType}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; template?: VmbCardTemplate; error?: string };
    setBusy(false);
    if (data.ok && data.template) {
      setDraft(normalizeTemplateForEditor({ ...data.template }));
      const resolved = resolveOfferForTemplate(data.template, offers);
      setSelectedOfferId(resolved?.id ?? "");
      setImageSlots((current) => {
        revokeDraftImageUrls(current);
        return createInitialCardBuilderImageSlots(ownerPhotoUrl);
      });
      setStatus("Reset to default template.");
      await loadTemplates();
    } else {
      setStatus(data.error ?? "Reset failed.");
    }
  }

  function patchDraft(patch: Partial<VmbCardTemplate>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function handleSalonOfferChange(offerId: string) {
    patchDraft({ salonOfferCatalogId: offerId || undefined });
  }

  function handleOfferChange(offerId: string) {
    setSelectedOfferId(offerId);
    const offer = activeOffers.find((entry) => entry.id === offerId);
    if (offer) {
      patchDraft({ offerCategory: offer.category });
    }
  }

  function handleTypeKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + offset + VMB_CARD_TYPES.length) % VMB_CARD_TYPES.length;
    setSelectedType(VMB_CARD_TYPES[nextIndex]!);
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
              Choose the offer, edit the message, add card images, and watch the preview update
            </p>
          </div>
          <div className="vmb-card-template-workspace__catalog-links">
            <Link href="/admin/invites/services">Services</Link>
            <Link href="/admin/invites/offers">Offers</Link>
          </div>
        </div>

        <div
          className="vmb-card-template-workspace__types"
          role="tablist"
          aria-label="Outreach card template types"
        >
          {VMB_CARD_TYPES.map((type, index) => {
            const isActive = selectedType === type;
            const isCustomized = templates.some((template) => template.type === type && !template.isDefault);
            return (
              <button
                key={type}
                type="button"
                role="tab"
                id={`card-template-tab-${type}`}
                aria-selected={isActive}
                aria-controls="card-template-editor-panel"
                tabIndex={isActive ? 0 : -1}
                className={`vmb-card-template-workspace__type${isActive ? " vmb-card-template-workspace__type--active" : ""}`}
                onClick={() => setSelectedType(type)}
                onKeyDown={(event) => handleTypeKeyDown(event, index)}
              >
                {TYPE_LABELS[type]}
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
          aria-labelledby={`card-template-tab-${selectedType}`}
          className="vmb-card-template-workspace__editor"
        >
          {draft ? (
            <>
              <div className="vmb-card-template-workspace__editor-meta">
                <span>{cardActionLabel(draft.type)}</span>
                <span aria-hidden="true">·</span>
                <span>{draft.isDefault ? "Default template" : "Salon override"}</span>
              </div>

              <section className="vmb-card-builder__section" aria-labelledby="card-builder-offer-heading">
                <h3 id="card-builder-offer-heading" className="vmb-card-builder__section-title">
                  Offer
                </h3>
                {offerSelectionEnabled ? (
                  <>
                    <label className="vmb-template-admin__field">
                      <span>Choose offer (salon)</span>
                      <select
                        value={draft.salonOfferCatalogId ?? ""}
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
                    {selectedSalonCatalogOffer ? (
                      <div className="vmb-card-builder__offer-card">
                        <p className="vmb-card-builder__offer-card-title">
                          {selectedSalonCatalogOffer.name}
                        </p>
                        <p className="vmb-card-builder__offer-card-body">
                          {selectedSalonCatalogOffer.description}
                        </p>
                      </div>
                    ) : null}
                    <label className="vmb-template-admin__field">
                      <span className="vmb-card-builder__sr-only">Choose catalog offer fallback</span>
                      <select
                        value={selectedOfferId}
                        onChange={(event) => handleOfferChange(event.target.value)}
                      >
                        <option value="">Select an offer</option>
                        {activeOffers.map((offer) => (
                          <option key={offer.id} value={offer.id}>
                            {offer.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedOffer ? (
                      <div className="vmb-card-builder__offer-card">
                        <p className="vmb-card-builder__offer-card-title">{selectedOffer.name}</p>
                        <p className="vmb-card-builder__offer-card-body">
                          {selectedOffer.description || selectedOffer.offerText}
                        </p>
                        <p className="vmb-card-builder__offer-card-cta">{resolveTemplateCta(draft)}</p>
                      </div>
                    ) : (
                      <p className="vmb-card-builder__section-note">Select an offer to preview on the card.</p>
                    )}
                  </>
                ) : (
                  <p className="vmb-card-builder__section-note">This card type does not attach a catalog offer.</p>
                )}
              </section>

              <section className="vmb-card-builder__section" aria-labelledby="card-builder-message-heading">
                <h3 id="card-builder-message-heading" className="vmb-card-builder__section-title">
                  Message
                </h3>
                <div className="vmb-card-template-workspace__fields">
                  <label className="vmb-template-admin__field">
                    <span>Personal note</span>
                    <textarea
                      rows={2}
                      className="vmb-card-template-workspace__copy-input"
                      value={draft.messageTemplate}
                      onChange={(e) => patchDraft({ messageTemplate: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Why this matters</span>
                    <textarea
                      rows={2}
                      className="vmb-card-template-workspace__copy-input"
                      value={draft.relationshipBenefitTemplate ?? ""}
                      onChange={(e) => patchDraft({ relationshipBenefitTemplate: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Offer note</span>
                    <textarea
                      rows={2}
                      className="vmb-card-template-workspace__copy-input"
                      value={draft.offerTemplate ?? ""}
                      onChange={(e) => patchDraft({ offerTemplate: e.target.value })}
                    />
                  </label>
                  <label className="vmb-template-admin__field">
                    <span>Signature</span>
                    <textarea
                      rows={2}
                      className="vmb-card-template-workspace__copy-input"
                      value={draft.signatureTemplate}
                      onChange={(e) => patchDraft({ signatureTemplate: e.target.value })}
                    />
                  </label>
                </div>
              </section>

              <CardBuilderImageSlots slots={imageSlots} onChange={setImageSlots} />

              <details className="vmb-card-builder__advanced">
                <summary>Advanced</summary>
                <label className="vmb-template-admin__field">
                  <span>Template name (internal)</span>
                  <textarea
                    rows={2}
                    className="vmb-card-template-workspace__copy-input"
                    value={draft.name}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                  />
                </label>
              </details>

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
          <p className="vmb-template-admin__preview-label">Live preview</p>
          <p className="vmb-template-admin__preview-meta">
            {CARD_TEMPLATE_PREVIEW_CONTEXT.clientName} · {CARD_TEMPLATE_PREVIEW_CONTEXT.serviceName} ·{" "}
            {CARD_TEMPLATE_PREVIEW_CONTEXT.visitCount} visits · last visit{" "}
            {CARD_TEMPLATE_PREVIEW_CONTEXT.lastVisit}
          </p>
          {preview ? (
            <CardPreview
              model={preview}
              variant={draft?.type === "pcn_invite" ? "salon-invite" : "default"}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
