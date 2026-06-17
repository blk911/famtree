"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { AdminOfferPreviewCard } from "@/components/vmb/admin/AdminOfferPreviewCard";
import {
  AdminOfferReviewModal,
  OFFER_CATALOG_SAVED_MESSAGE,
} from "@/components/vmb/admin/AdminOfferReviewModal";
import { OfferNailSelectionFields } from "@/components/vmb/admin/OfferNailSelectionFields";
import {
  resolveNailOfferAddonLabels,
  resolveNailOfferServiceLabels,
} from "@/lib/vmb/admin/nail-offer-builder-selections";
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
  const [reviewOpen, setReviewOpen] = useState(false);
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

  const serviceFallbackById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const service of services) {
      map[service.id] = service.name;
    }
    return map;
  }, [services]);

  const optionFallbackById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const option of serviceOptions) {
      map[option.id] = option.name;
    }
    return map;
  }, [serviceOptions]);

  const previewServiceNames = useMemo(() => {
    if (!draft) return [];
    return resolveNailOfferServiceLabels(draft.serviceIds, serviceFallbackById);
  }, [draft, serviceFallbackById]);

  const previewRewardLabels = useMemo(() => {
    if (!draft) return [];
    return resolveNailOfferAddonLabels(draft.serviceOptionIds, optionFallbackById);
  }, [draft, optionFallbackById]);

  async function handleSaveToCatalog() {
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
      setReviewOpen(false);
      setStatus(OFFER_CATALOG_SAVED_MESSAGE);
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
      <AdminBuilderShell title="Offer Catalog" activeStep="offers">
        <p className="vmb-admin-builder-grid__status">Sign in to a VMB salon trial to manage your offer catalog.</p>
      </AdminBuilderShell>
    );
  }

  return (
    <AdminBuilderShell title="Offer Catalog" activeStep="offers">
      <div className="vmb-admin-builder-grid">
        <aside className="vmb-admin-builder-grid__list">
          <p className="vmb-admin-builder-grid__list-label">Offer categories</p>
          <ul>
            {VMB_OFFER_CATEGORIES.map((category) => (
              <li key={category}>
                <button
                  type="button"
                  className={`vmb-admin-builder-grid__type${selectedCategory === category ? " vmb-admin-builder-grid__type--active" : ""}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {CATEGORY_LABELS[category]}
                  {offers.find((offer) => offer.category === category && !offer.isDefault) ? (
                    <span className="vmb-admin-builder-grid__override-dot" aria-label="Customized" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="vmb-admin-builder-grid__editor">
          {draft ? (
            <>
              <h2 className="vmb-admin-builder__panel-title">{draft.name || CATEGORY_LABELS[draft.category]}</h2>

              <label className="vmb-admin-builder-grid__field">
                <span>Offer name</span>
                <input value={draft.name} onChange={(e) => patchDraft({ name: e.target.value })} />
              </label>
              <label className="vmb-admin-builder-grid__field">
                <span>Value label</span>
                <input
                  value={draft.valueLabel ?? ""}
                  onChange={(e) => patchDraft({ valueLabel: e.target.value })}
                />
              </label>
              <label className="vmb-admin-builder-grid__field">
                <span>Offer text</span>
                <textarea
                  rows={4}
                  value={draft.offerText}
                  onChange={(e) => patchDraft({ offerText: e.target.value })}
                />
              </label>
              <OfferNailSelectionFields
                serviceIds={draft.serviceIds}
                serviceOptionIds={draft.serviceOptionIds}
                onServiceIdsChange={(serviceIds) => patchDraft({ serviceIds })}
                onServiceOptionIdsChange={(serviceOptionIds) => patchDraft({ serviceOptionIds })}
              />
              <label className="vmb-admin-builder-grid__field vmb-offer-admin__checkbox">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => patchDraft({ active: e.target.checked })}
                />
                <span>Available to Clients</span>
              </label>

              <div className="vmb-admin-builder-grid__actions">
                <button
                  type="button"
                  className="taikos-opp-card__cta"
                  disabled={busy}
                  onClick={() => setReviewOpen(true)}
                >
                  Review Offer
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
              {status ? <p className="vmb-admin-builder-grid__status">{status}</p> : null}
            </>
          ) : null}
        </section>

        <aside className="vmb-admin-builder-grid__preview">
          <AdminOfferPreviewCard
            offer={draft}
            serviceNames={previewServiceNames}
            addonLabels={previewRewardLabels}
          />
        </aside>
      </div>

      {draft ? (
        <AdminOfferReviewModal
          open={reviewOpen}
          offer={draft}
          serviceNames={previewServiceNames}
          rewardLabels={previewRewardLabels}
          busy={busy}
          onClose={() => setReviewOpen(false)}
          onSave={() => void handleSaveToCatalog()}
        />
      ) : null}
    </AdminBuilderShell>
  );
}
