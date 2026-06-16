"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { SalonOfferClientPreview } from "@/components/vmb/salon/SalonOfferClientPreview";
import {
  calculateSalonOfferPriceCents,
  formatOfferPrice,
  resolveOfferPriceCents,
} from "@/lib/vmb/salon-offers/salon-offer-pricing";
import type { SalonOfferCatalogEntry } from "@/lib/vmb/salon-offers/salon-offer-catalog-types";
import type { ResolvedSalonOfferDisplay } from "@/lib/vmb/salon-offers/salon-offer-catalog-types";
import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";

type OfferDraft = {
  name: string;
  description: string;
  serviceId: string;
  addonIds: string[];
  priceOverrideCents: number | null;
  imageUrl: string;
  active: boolean;
};

const EMPTY_DRAFT: OfferDraft = {
  name: "",
  description: "",
  serviceId: "",
  addonIds: [],
  priceOverrideCents: null,
  imageUrl: "",
  active: true,
};

function entryToDraft(entry: SalonOfferCatalogEntry): OfferDraft {
  return {
    name: entry.name,
    description: entry.description,
    serviceId: entry.serviceId,
    addonIds: [...entry.addonIds],
    priceOverrideCents: entry.priceOverrideCents ?? null,
    imageUrl: entry.imageUrl ?? "",
    active: entry.active,
  };
}

export function SalonOffersClient({
  salonId,
  salonName,
}: {
  salonId?: string;
  salonName: string;
}) {
  const [offers, setOffers] = useState<SalonOfferCatalogEntry[]>([]);
  const [enabledServices, setEnabledServices] = useState<SalonFacingServiceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OfferDraft>(EMPTY_DRAFT);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [previewOffer, setPreviewOffer] = useState<ResolvedSalonOfferDisplay | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vmb/salon-offers?services=1");
      if (!res.ok) throw new Error("Could not load offers");
      const json = (await res.json()) as {
        offers: SalonOfferCatalogEntry[];
        enabledServices?: SalonFacingServiceOffer[];
      };
      setOffers(json.offers ?? []);
      setEnabledServices(json.enabledServices ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!salonId) {
      setLoading(false);
      return;
    }
    void load();
  }, [load, salonId]);

  const selectedService = useMemo(
    () => enabledServices.find((service) => service.serviceOfferId === draft.serviceId),
    [draft.serviceId, enabledServices],
  );

  const calculatedPrice = useMemo(
    () => (selectedService ? calculateSalonOfferPriceCents(selectedService, draft.addonIds) : 0),
    [draft.addonIds, selectedService],
  );

  const finalPrice = resolveOfferPriceCents(calculatedPrice, draft.priceOverrideCents);

  const serviceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const service of enabledServices) {
      map.set(service.serviceOfferId, service.displayName);
    }
    return map;
  }, [enabledServices]);

  function openCreate() {
    setEditingId(null);
    setDraft({
      ...EMPTY_DRAFT,
      serviceId: enabledServices[0]?.serviceOfferId ?? "",
    });
    setStep(1);
    setPanelOpen(true);
  }

  function openEdit(entry: SalonOfferCatalogEntry) {
    setEditingId(entry.id);
    setDraft(entryToDraft(entry));
    setStep(1);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setStep(1);
  }

  async function saveOffer() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        serviceId: draft.serviceId,
        addonIds: draft.addonIds,
        priceOverrideCents: draft.priceOverrideCents,
        imageUrl: draft.imageUrl || undefined,
        active: draft.active,
      };
      const res = await fetch(
        editingId ? "/api/vmb/salon-offers" : "/api/vmb/salon-offers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
        },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      closePanel();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function previewEntry(entry: SalonOfferCatalogEntry) {
    const res = await fetch(`/api/vmb/salon-offers/${encodeURIComponent(entry.id)}`);
    if (!res.ok) return;
    const json = (await res.json()) as { display?: ResolvedSalonOfferDisplay };
    if (json.display) setPreviewOffer(json.display);
  }

  return (
    <VmbPageFrame
      title="Offers"
      subtitle="Build client-facing offers from the services you offer. Use them in invitations."
      width="wide"
    >
      <div className="vmb-salon-offers">
        {salonName ? <p className="vmb-salon-offers__context">{salonName}</p> : null}

        <div className="vmb-salon-offers__toolbar">
          <button
            type="button"
            className="vmb-salon-offers__create"
            disabled={!salonId || enabledServices.length === 0}
            onClick={openCreate}
          >
            Create Offer
          </button>
        </div>

        {loading ? (
          <p className="vmb-salon-offers__state">Loading offers…</p>
        ) : !salonId ? (
          <p className="vmb-salon-offers__empty">
            Sign in to your salon workspace to build offers.
          </p>
        ) : error ? (
          <p className="vmb-salon-offers__state vmb-salon-offers__state--error">{error}</p>
        ) : enabledServices.length === 0 ? (
          <p className="vmb-salon-offers__empty">
            Enable services on your Services page before creating offers.
          </p>
        ) : offers.length === 0 ? (
          <p className="vmb-salon-offers__empty">
            No offers yet. Create your first client-facing offer.
          </p>
        ) : (
          <ul className="vmb-salon-offers__list">
            {offers.map((offer) => {
              const addonLabels = offer.addonIds
                .map((id) => {
                  const service = enabledServices.find((s) => s.serviceOfferId === offer.serviceId);
                  return service?.addons.find((a) => a.addonId === id)?.label;
                })
                .filter(Boolean);
              return (
                <li key={offer.id} className="vmb-salon-offers__card">
                  <div className="vmb-salon-offers__card-head">
                    <h2 className="vmb-salon-offers__card-title">{offer.name}</h2>
                    <p className="vmb-salon-offers__card-service">
                      {serviceNameById.get(offer.serviceId) ?? offer.serviceId}
                    </p>
                    {addonLabels.length > 0 ? (
                      <p className="vmb-salon-offers__card-addons">{addonLabels.join(" · ")}</p>
                    ) : null}
                    <p className="vmb-salon-offers__card-price">{formatOfferPrice(offer.priceCents)}</p>
                    <p className="vmb-salon-offers__card-status">
                      {offer.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="vmb-salon-offers__card-actions">
                    <button type="button" onClick={() => openEdit(offer)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => void previewEntry(offer)}>
                      Preview
                    </button>
                    <Link href={`/vmb/invites?salonOfferId=${encodeURIComponent(offer.id)}`}>
                      Use In Invite
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {panelOpen ? (
        <div className="vmb-salon-offers__panel-backdrop" onClick={closePanel} role="presentation">
          <aside
            className="vmb-salon-offers__panel"
            onClick={(e) => e.stopPropagation()}
            aria-label={editingId ? "Edit offer" : "Create offer"}
          >
            <header className="vmb-salon-offers__panel-header">
              <h2>{editingId ? "Edit Offer" : "Create Offer"}</h2>
              <button type="button" onClick={closePanel} aria-label="Close">
                ×
              </button>
            </header>

            <ol className="vmb-salon-offers__steps">
              {["Service", "Add-ons", "Details", "Pricing", "Image"].map((label, index) => (
                <li
                  key={label}
                  className={step === index + 1 ? "vmb-salon-offers__step--active" : ""}
                >
                  {index + 1}. {label}
                </li>
              ))}
            </ol>

            {step === 1 ? (
              <div className="vmb-salon-offers__step-body">
                <p className="vmb-salon-offers__step-label">Choose service</p>
                <ul className="vmb-salon-offers__service-pick">
                  {enabledServices.map((service) => (
                    <li key={service.serviceOfferId}>
                      <label>
                        <input
                          type="radio"
                          name="serviceId"
                          checked={draft.serviceId === service.serviceOfferId}
                          onChange={() =>
                            setDraft((prev) => ({
                              ...prev,
                              serviceId: service.serviceOfferId,
                              addonIds: [],
                            }))
                          }
                        />
                        {service.displayName}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {step === 2 && selectedService ? (
              <div className="vmb-salon-offers__step-body">
                <p className="vmb-salon-offers__step-label">Choose add-ons</p>
                {selectedService.addons.length === 0 ? (
                  <p className="vmb-salon-offers__hint">No add-ons for this service.</p>
                ) : (
                  <ul className="vmb-salon-offers__addon-pick">
                    {selectedService.addons.map((addon) => (
                      <li key={addon.addonId}>
                        <label>
                          <input
                            type="checkbox"
                            checked={draft.addonIds.includes(addon.addonId)}
                            onChange={() =>
                              setDraft((prev) => {
                                const next = prev.addonIds.includes(addon.addonId)
                                  ? prev.addonIds.filter((id) => id !== addon.addonId)
                                  : [...prev.addonIds, addon.addonId];
                                return { ...prev, addonIds: next };
                              })
                            }
                          />
                          {addon.label}
                          {addon.priceCents > 0 ? ` +${formatOfferPrice(addon.priceCents)}` : ""}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="vmb-salon-offers__step-body">
                <label className="vmb-salon-offers__field">
                  Offer name
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Birthday Babe"
                  />
                </label>
                <label className="vmb-salon-offers__field">
                  Description
                  <textarea
                    rows={3}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="A fun birthday nail set featuring chrome shine and crystal accents."
                  />
                </label>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="vmb-salon-offers__step-body">
                <p className="vmb-salon-offers__calc-row">
                  Calculated: <strong>{formatOfferPrice(calculatedPrice)}</strong>
                </p>
                <label className="vmb-salon-offers__field">
                  Offer price override ($)
                  <input
                    type="number"
                    min={0}
                    placeholder={String(Math.round(calculatedPrice / 100))}
                    value={
                      draft.priceOverrideCents === null
                        ? ""
                        : Math.round(draft.priceOverrideCents / 100)
                    }
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      setDraft((prev) => ({
                        ...prev,
                        priceOverrideCents: raw
                          ? Math.max(0, Math.round(Number(raw) * 100))
                          : null,
                      }));
                    }}
                  />
                </label>
                <p className="vmb-salon-offers__calc-row">
                  Client price: <strong>{formatOfferPrice(finalPrice)}</strong>
                </p>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="vmb-salon-offers__step-body">
                <label className="vmb-salon-offers__field">
                  Image URL (optional)
                  <input
                    value={draft.imageUrl}
                    onChange={(e) => setDraft((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://…"
                  />
                </label>
                <p className="vmb-salon-offers__hint">
                  Upload and AI gallery images coming soon.
                </p>
              </div>
            ) : null}

            <footer className="vmb-salon-offers__panel-footer">
              {step > 1 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)}>
                  Back
                </button>
              ) : (
                <span />
              )}
              {step < 5 ? (
                <button
                  type="button"
                  disabled={step === 1 && !draft.serviceId}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Next
                </button>
              ) : (
                <button type="button" disabled={saving || !draft.name.trim()} onClick={() => void saveOffer()}>
                  {saving ? "Saving…" : editingId ? "Save Offer" : "Create Offer"}
                </button>
              )}
            </footer>
          </aside>
        </div>
      ) : null}

      {previewOffer ? (
        <div className="vmb-salon-offers__panel-backdrop" onClick={() => setPreviewOffer(null)} role="presentation">
          <div className="vmb-salon-offers__preview-modal" onClick={(e) => e.stopPropagation()}>
            <SalonOfferClientPreview offer={previewOffer} variant="client" />
            <button type="button" className="vmb-salon-offers__preview-close" onClick={() => setPreviewOffer(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </VmbPageFrame>
  );
}
