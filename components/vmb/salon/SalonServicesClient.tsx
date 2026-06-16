"use client";

import { useCallback, useEffect, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { getServiceCategoryLabel } from "@/lib/vmb/services/canonical-service-catalog";
import type { SalonServiceConfig, ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import { mergePresetsWithSalonConfigs } from "@/lib/vmb/services/merge-salon-service-offers";
import type { SalonFacingServiceOffer, ServicePresetCard } from "@/lib/vmb/services/service-preset-types";

type ServiceDraft = {
  priceCents: number;
  durationMinutes: number;
  addonIds: string[];
  enabled: boolean;
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export function SalonServicesClient({
  salonId,
  salonName,
}: {
  salonId?: string;
  salonName: string;
}) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [services, setServices] = useState<SalonFacingServiceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ServiceDraft>>({});

  const syncDrafts = useCallback((items: SalonFacingServiceOffer[]) => {
    const next: Record<string, ServiceDraft> = {};
    for (const svc of items) {
      next[svc.serviceOfferId] = {
        priceCents: svc.priceCents,
        durationMinutes: svc.durationMinutes,
        addonIds: svc.addons.filter((addon) => addon.enabled).map((addon) => addon.addonId),
        enabled: svc.enabled,
      };
    }
    setDrafts(next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [presetsRes, configsRes] = await Promise.all([
        fetch("/api/vmb/service-presets"),
        fetch("/api/vmb/salon-services?configs=1"),
      ]);
      if (!presetsRes.ok || !configsRes.ok) throw new Error("Could not load services");
      const presetsJson = (await presetsRes.json()) as {
        categoryId: string;
        presets: ServicePresetCard[];
      };
      const configsJson = (await configsRes.json()) as {
        categoryId: string;
        configs: SalonServiceConfig[];
      };
      setCategoryId(presetsJson.categoryId);
      const merged = mergePresetsWithSalonConfigs(presetsJson.presets, configsJson.configs);
      setServices(merged);
      syncDrafts(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [syncDrafts]);

  useEffect(() => {
    if (!salonId) {
      setLoading(false);
      return;
    }
    void load();
  }, [load, salonId]);

  async function persist(serviceOfferId: string, patch: Partial<ServiceDraft>) {
    const draft = { ...drafts[serviceOfferId], ...patch };
    setSavingId(serviceOfferId);
    setError(null);
    try {
      const res = await fetch("/api/vmb/salon-services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogServiceId: serviceOfferId,
          enabled: draft.enabled,
          priceCents: draft.priceCents,
          durationMinutes: draft.durationMinutes,
          enabledAddonIds: draft.addonIds,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      await load();
    } catch {
      setError("Could not save changes");
    } finally {
      setSavingId(null);
    }
  }

  function updateDraft(serviceOfferId: string, patch: Partial<ServiceDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [serviceOfferId]: { ...prev[serviceOfferId], ...patch },
    }));
  }

  function toggleAddon(serviceOfferId: string, addonId: string) {
    const current = drafts[serviceOfferId]?.addonIds ?? [];
    const next = current.includes(addonId)
      ? current.filter((id) => id !== addonId)
      : [...current, addonId];
    updateDraft(serviceOfferId, { addonIds: next });
  }

  const categoryLabel = categoryId
    ? getServiceCategoryLabel(categoryId as ServiceCategoryId)
    : null;

  return (
    <VmbPageFrame
      title="Services"
      subtitle="Turn on the services you offer, set your price, and choose the add-ons clients can buy."
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
          <p className="vmb-salon-services__state vmb-salon-services__state--error">{error}</p>
        ) : services.length === 0 ? (
          <p className="vmb-salon-services__empty">
            No services loaded yet. Choose a category in your salon profile or ask VMB to load
            your starter menu.
          </p>
        ) : (
          <>
            {categoryLabel ? (
              <p className="vmb-salon-services__category">{categoryLabel}</p>
            ) : null}
            <ul className="vmb-salon-services__cards">
              {services.map((svc) => {
                const draft = drafts[svc.serviceOfferId];
                if (!draft) return null;
                const saving = savingId === svc.serviceOfferId;
                return (
                  <li key={svc.serviceOfferId} className="vmb-salon-services__card">
                    <div className="vmb-salon-services__card-head">
                      <h2 className="vmb-salon-services__card-title">{svc.displayName}</h2>
                      <p className="vmb-salon-services__card-desc">{svc.shortDescription}</p>
                      <p className="vmb-salon-services__card-meta">
                        Starts at {formatPrice(draft.priceCents)} ·{" "}
                        {formatDuration(draft.durationMinutes)}
                      </p>
                    </div>

                    {svc.includedText ? (
                      <div className="vmb-salon-services__included">
                        <p className="vmb-salon-services__included-label">Includes:</p>
                        <p>{svc.includedText}</p>
                      </div>
                    ) : null}

                    <div className="vmb-salon-services__card-fields">
                      <label className="vmb-salon-services__field">
                        <span>Your price ($)</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={Math.round(draft.priceCents / 100)}
                          onChange={(e) =>
                            updateDraft(svc.serviceOfferId, {
                              priceCents: Math.max(0, Math.round(Number(e.target.value) * 100)),
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
                            updateDraft(svc.serviceOfferId, {
                              durationMinutes: Math.max(15, Number(e.target.value) || 15),
                            })
                          }
                        />
                      </label>
                    </div>

                    {svc.addons.length > 0 ? (
                      <div className="vmb-salon-services__addons">
                        <p className="vmb-salon-services__addons-label">Add-ons:</p>
                        <ul className="vmb-salon-services__addon-list">
                          {svc.addons.map((addon) => (
                            <li key={addon.addonId}>
                              <label className="vmb-salon-services__addon">
                                <input
                                  type="checkbox"
                                  checked={draft.addonIds.includes(addon.addonId)}
                                  onChange={() => toggleAddon(svc.serviceOfferId, addon.addonId)}
                                />
                                <span>
                                  {addon.label}
                                  {addon.priceCents > 0
                                    ? ` +${formatPrice(addon.priceCents)}`
                                    : ""}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="vmb-salon-services__card-actions">
                      <label className="vmb-salon-services__enable-toggle">
                        <input
                          type="checkbox"
                          checked={draft.enabled}
                          onChange={(e) =>
                            updateDraft(svc.serviceOfferId, { enabled: e.target.checked })
                          }
                        />
                        Offer this service
                      </label>
                      <button
                        type="button"
                        className="vmb-salon-services__save"
                        disabled={saving}
                        onClick={() => void persist(svc.serviceOfferId, {})}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
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
