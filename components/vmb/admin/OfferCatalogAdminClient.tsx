"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CardPreviewOfferBlock } from "@/components/vmb/cards/CardPreviewOfferBlock";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
import { VMB_OFFER_CATEGORIES, type VmbOffer, type VmbOfferCategory } from "@/lib/vmb/offers/offer-types";
import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";
import type { VmbService } from "@/lib/vmb/services/service-types";

type Props = {
  salonId?: string;
};

const CATEGORY_LABELS: Record<VmbOfferCategory, string> = {
  new_client: "New Client",
  birthday: "Birthday",
  pcn: "PCN",
  vip: "VIP",
  referral: "Referral",
  reactivation: "Reactivation",
  refresh: "Refresh",
  open_slot: "Open Slot",
  service: "Service",
  seasonal: "Seasonal",
};

export function OfferCatalogAdminClient({ salonId }: Props) {
  const [offers, setOffers] = useState<VmbOffer[]>([]);
  const [services, setServices] = useState<VmbService[]>([]);
  const [serviceOptions, setServiceOptions] = useState<VmbServiceOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<VmbOfferCategory>("birthday");
  const [draft, setDraft] = useState<VmbOffer | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadOffers = useCallback(async () => {
    if (!salonId) return;
    const [offerRes, serviceRes] = await Promise.all([
      fetch("/api/vmb/offers"),
      fetch("/api/vmb/services"),
    ]);
    const data = (await offerRes.json()) as { ok?: boolean; offers?: VmbOffer[] };
    const serviceData = (await serviceRes.json()) as {
      ok?: boolean;
      services?: VmbService[];
      options?: VmbServiceOption[];
    };
    if (data.ok && data.offers) {
      setOffers(data.offers);
    }
    if (serviceData.ok && serviceData.services) {
      setServices(serviceData.services);
    }
    if (serviceData.ok && serviceData.options) {
      setServiceOptions(serviceData.options);
    }
  }, [salonId]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.category === selectedCategory),
    [offers, selectedCategory],
  );

  useEffect(() => {
    if (selectedOffer) {
      setDraft({ ...selectedOffer });
    }
  }, [selectedOffer]);

  const previewModel = useMemo((): CardPreviewModel | null => {
    if (!draft) return null;
    return {
      cardType: "birthday_card",
      salutation: "Dear Grace,",
      title: "Happy Birthday",
      subtitle: "Wishing you a wonderful year",
      body: "I hope your birthday feels special.",
      imageLayout: "single",
      imageSlots: [{ id: "hero", label: "Hero image" }],
      accent: "rose",
      cta: "Claim Birthday Treat",
      tags: [],
      metadata: {},
      includeOffer: true,
      offerProminent: true,
      offer: {
        id: draft.id,
        name: draft.name,
        valueLabel: draft.valueLabel,
        offerText: draft.offerText,
        terms: draft.terms,
        category: draft.category,
      },
    };
  }, [draft]);

  async function handleSave() {
    if (!draft || !salonId) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/vmb/offers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer: { ...draft, source: draft.source ?? "manual" } }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (data.ok) {
      setStatus("Offer saved.");
      await loadOffers();
    } else {
      setStatus(data.error ?? "Save failed.");
    }
  }

  async function handleArchive() {
    if (!draft || !salonId || draft.isDefault) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch(`/api/vmb/offers?offerId=${encodeURIComponent(draft.id)}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (data.ok) {
      setStatus("Offer archived.");
      await loadOffers();
    } else {
      setStatus(data.error ?? "Archive failed.");
    }
  }

  async function handleResetDefaults() {
    if (!salonId) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/vmb/offers?reset=1", { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (data.ok) {
      setStatus("Reset to default offers.");
      await loadOffers();
    } else {
      setStatus(data.error ?? "Reset failed.");
    }
  }

  function patchDraft(patch: Partial<VmbOffer>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  if (!salonId) {
    return (
      <VmbPageFrame title="Offer Catalog" subtitle="Salon offers for outreach cards">
        <p>Sign in to a VMB salon trial to manage your offer catalog.</p>
      </VmbPageFrame>
    );
  }

  return (
    <VmbPageFrame title="Offer Catalog" subtitle="Editable salon offers for template slots">
      <div className="vmb-template-admin vmb-offer-admin">
        <aside className="vmb-template-admin__list">
          <p className="vmb-template-admin__list-label">Offer categories</p>
          <ul>
            {VMB_OFFER_CATEGORIES.map((category) => (
              <li key={category}>
                <button
                  type="button"
                  className={`vmb-template-admin__type${selectedCategory === category ? " vmb-template-admin__type--active" : ""}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {CATEGORY_LABELS[category]}
                  {offers.find((offer) => offer.category === category && !offer.isDefault) ? (
                    <span className="vmb-template-admin__override-dot" aria-label="Customized" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="vmb-offer-admin__links">
            <Link href="/admin/invites/services">Services</Link>
            <Link href="/admin/invites/templates">Templates</Link>
          </div>
        </aside>

        <section className="vmb-template-admin__editor">
          {draft ? (
            <>
              <div className="vmb-template-admin__editor-head">
                <h2>{CATEGORY_LABELS[draft.category]}</h2>
                <p>
                  {draft.isDefault ? "Default offer" : "Salon offer"} · Source:{" "}
                  {draft.source ?? "default"}
                  {draft.confidence != null ? ` · Confidence: ${Math.round(draft.confidence * 100)}%` : ""}
                </p>
              </div>

              <label className="vmb-template-admin__field">
                <span>Name</span>
                <input value={draft.name} onChange={(e) => patchDraft({ name: e.target.value })} />
              </label>
              <label className="vmb-template-admin__field">
                <span>Description</span>
                <input
                  value={draft.description}
                  onChange={(e) => patchDraft({ description: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Value label</span>
                <input
                  value={draft.valueLabel ?? ""}
                  onChange={(e) => patchDraft({ valueLabel: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Offer text</span>
                <textarea
                  rows={4}
                  value={draft.offerText}
                  onChange={(e) => patchDraft({ offerText: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Terms</span>
                <textarea
                  rows={2}
                  value={draft.terms ?? ""}
                  onChange={(e) => patchDraft({ terms: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Linked services</span>
                <select
                  multiple
                  value={draft.serviceIds ?? []}
                  onChange={(e) =>
                    patchDraft({
                      serviceIds: Array.from(e.target.selectedOptions).map((option) => option.value),
                    })
                  }
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="vmb-template-admin__field">
                <span>Linked service options</span>
                <select
                  multiple
                  value={draft.serviceOptionIds ?? []}
                  onChange={(e) =>
                    patchDraft({
                      serviceOptionIds: Array.from(e.target.selectedOptions).map((option) => option.value),
                    })
                  }
                >
                  {serviceOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {services.find((service) => service.id === option.serviceId)?.name ?? "Service"} ·{" "}
                      {option.groupName ? `${option.groupName}: ` : ""}
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="vmb-template-admin__field">
                <span>Service tags (comma-separated)</span>
                <input
                  value={(draft.serviceTags ?? []).join(", ")}
                  onChange={(e) =>
                    patchDraft({
                      serviceTags: e.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
              <label className="vmb-template-admin__field vmb-offer-admin__checkbox">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => patchDraft({ active: e.target.checked })}
                />
                <span>Active</span>
              </label>
              {draft.confidence != null ? (
                <label className="vmb-template-admin__field">
                  <span>Detection confidence</span>
                  <input value={`${Math.round(draft.confidence * 100)}%`} readOnly />
                </label>
              ) : null}

              <div className="vmb-template-admin__actions">
                <button type="button" className="taikos-opp-card__cta" disabled={busy} onClick={() => void handleSave()}>
                  {busy ? "Saving…" : "Save offer"}
                </button>
                {!draft.isDefault ? (
                  <button
                    type="button"
                    className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                    disabled={busy}
                    onClick={() => void handleArchive()}
                  >
                    Archive
                  </button>
                ) : null}
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  disabled={busy}
                  onClick={() => void handleResetDefaults()}
                >
                  Reset defaults
                </button>
              </div>
              {status ? <p className="vmb-template-admin__status">{status}</p> : null}
            </>
          ) : null}
        </section>

        <aside className="vmb-template-admin__preview">
          <p className="vmb-template-admin__preview-label">Card preview</p>
          <p className="vmb-template-admin__preview-meta">How this offer appears in a birthday card</p>
          {previewModel ? (
            <div className="vmb-offer-admin__card-preview">
              <p className="vmb-card-preview__salutation">{previewModel.salutation}</p>
              <h3 className="vmb-card-preview__title">{previewModel.title}</h3>
              <p className="vmb-card-preview__subtitle">{previewModel.subtitle}</p>
              <p className="vmb-card-preview__copy">{previewModel.body}</p>
              <CardPreviewOfferBlock model={previewModel} />
            </div>
          ) : null}
        </aside>
      </div>
    </VmbPageFrame>
  );
}
