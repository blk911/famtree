"use client";

import { useCallback, useEffect, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { getServiceCategoryLabel } from "@/lib/vmb/services/canonical-service-catalog";
import type { ResolvedSalonService, ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";

type SalonServicesPayload = {
  categoryId: string;
  services: ResolvedSalonService[];
};

type ServiceDraft = {
  priceCents: number;
  durationMinutes: number;
  addonIds: string[];
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function SalonServicesClient({
  salonId,
  salonName,
}: {
  salonId?: string;
  salonName: string;
}) {
  const [data, setData] = useState<SalonServicesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ServiceDraft>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vmb/salon-services");
      if (!res.ok) throw new Error("Could not load services");
      const json = (await res.json()) as SalonServicesPayload & { ok?: boolean };
      setData({ categoryId: json.categoryId, services: json.services });
      const nextDrafts: Record<string, ServiceDraft> = {};
      for (const svc of json.services) {
        nextDrafts[svc.id] = {
          priceCents: svc.priceCents,
          durationMinutes: svc.durationMinutes,
          addonIds: svc.addons.filter((addon) => addon.enabled).map((addon) => addon.id),
        };
      }
      setDrafts(nextDrafts);
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

  async function persist(
    catalogServiceId: string,
    patch: Partial<{
      enabled: boolean;
      priceCents: number;
      durationMinutes: number;
      enabledAddonIds: string[];
    }>,
  ) {
    const res = await fetch("/api/vmb/salon-services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogServiceId, ...patch }),
    });
    if (!res.ok) throw new Error("Save failed");
    await load();
  }

  async function toggleEnabled(svc: ResolvedSalonService) {
    try {
      await persist(svc.id, { enabled: !svc.enabled });
    } catch {
      setError("Could not update service");
    }
  }

  async function saveDraft(catalogServiceId: string) {
    const draft = drafts[catalogServiceId];
    if (!draft) return;
    try {
      await persist(catalogServiceId, {
        priceCents: draft.priceCents,
        durationMinutes: draft.durationMinutes,
        enabledAddonIds: draft.addonIds,
      });
    } catch {
      setError("Could not save changes");
    }
  }

  function toggleConfigure(catalogServiceId: string) {
    if (expandedId === catalogServiceId) {
      void saveDraft(catalogServiceId);
      setExpandedId(null);
    } else {
      setExpandedId(catalogServiceId);
    }
  }

  function updateDraft(catalogServiceId: string, patch: Partial<ServiceDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [catalogServiceId]: { ...prev[catalogServiceId], ...patch },
    }));
  }

  function toggleAddon(catalogServiceId: string, addonId: string) {
    const current = drafts[catalogServiceId]?.addonIds ?? [];
    const next = current.includes(addonId)
      ? current.filter((id) => id !== addonId)
      : [...current, addonId];
    updateDraft(catalogServiceId, { addonIds: next });
  }

  const services = data?.services ?? [];
  const categoryLabel = data?.categoryId
    ? getServiceCategoryLabel(data.categoryId as ServiceCategoryId)
    : null;

  return (
    <VmbPageFrame
      title="Services"
      subtitle="Choose what you offer, set your price, and select the add-ons clients can buy."
      width="wide"
    >
      <div className="vmb-salon-services">
        {salonName ? (
          <p className="vmb-salon-services__context">{salonName}</p>
        ) : null}

        {loading ? (
          <p className="vmb-salon-services__state">Loading services…</p>
        ) : !salonId ? (
          <p className="vmb-salon-services__empty">
            Sign in to your salon workspace to configure services.
          </p>
        ) : error ? (
          <p className="vmb-salon-services__state vmb-salon-services__state--error">
            {error}
          </p>
        ) : services.length === 0 ? (
          <p className="vmb-salon-services__empty">
            No services loaded yet. Choose a category in your salon profile or ask
            VMB to load your starter menu.
          </p>
        ) : (
          <>
            {categoryLabel ? (
              <p className="vmb-salon-services__category">{categoryLabel}</p>
            ) : null}
            <ul className="vmb-salon-services__list">
              {services.map((svc) => {
                const draft = drafts[svc.id];
                const isExpanded = expandedId === svc.id;
                return (
                  <li key={svc.id} className="vmb-salon-services__item">
                    <div className="vmb-salon-services__row">
                      <label className="vmb-salon-services__enabled">
                        <input
                          type="checkbox"
                          checked={svc.enabled}
                          onChange={() => void toggleEnabled(svc)}
                          aria-label={`Offer ${svc.name}`}
                        />
                      </label>
                      <span className="vmb-salon-services__name">{svc.name}</span>
                      <span className="vmb-salon-services__price">
                        {formatPrice(svc.priceCents)}
                      </span>
                      <span className="vmb-salon-services__duration">
                        {formatDuration(svc.durationMinutes)}
                      </span>
                      <button
                        type="button"
                        className="vmb-salon-services__configure"
                        aria-expanded={isExpanded}
                        onClick={() => toggleConfigure(svc.id)}
                      >
                        {isExpanded ? "Done" : "Configure"}
                      </button>
                    </div>
                    {isExpanded && draft ? (
                      <div className="vmb-salon-services__panel">
                        <div className="vmb-salon-services__fields">
                          <label className="vmb-salon-services__field">
                            <span>Base price ($)</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={Math.round(draft.priceCents / 100)}
                              onChange={(e) =>
                                updateDraft(svc.id, {
                                  priceCents: Math.max(
                                    0,
                                    Math.round(Number(e.target.value) * 100),
                                  ),
                                })
                              }
                            />
                          </label>
                          <label className="vmb-salon-services__field">
                            <span>Duration (min)</span>
                            <input
                              type="number"
                              min={15}
                              step={15}
                              value={draft.durationMinutes}
                              onChange={(e) =>
                                updateDraft(svc.id, {
                                  durationMinutes: Math.max(
                                    15,
                                    Number(e.target.value) || 15,
                                  ),
                                })
                              }
                            />
                          </label>
                        </div>
                        {svc.addons.length > 0 ? (
                          <div className="vmb-salon-services__addons">
                            <p className="vmb-salon-services__addons-label">
                              Add-ons clients can buy
                            </p>
                            <ul className="vmb-salon-services__addon-list">
                              {svc.addons.map((addon) => (
                                <li key={addon.id}>
                                  <label className="vmb-salon-services__addon">
                                    <input
                                      type="checkbox"
                                      checked={draft.addonIds.includes(addon.id)}
                                      onChange={() => toggleAddon(svc.id, addon.id)}
                                    />
                                    <span>{addon.name}</span>
                                  </label>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </VmbPageFrame>
  );
}
