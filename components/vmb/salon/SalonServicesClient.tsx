"use client";

import { useCallback, useEffect, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { ServicePresetCard } from "@/components/vmb/services/ServicePresetCard";
import { getServiceCategoryLabel } from "@/lib/vmb/services/canonical-service-catalog";
import type { SalonServiceConfig, ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import { mergePresetsWithSalonConfigs } from "@/lib/vmb/services/merge-salon-service-offers";
import type { SalonFacingServiceOffer, ServicePresetCard as ServicePresetCardModel } from "@/lib/vmb/services/service-preset-types";

type ServiceDraft = {
  priceCents: number;
  durationMinutes: number;
  addonIds: string[];
  enabled: boolean;
};

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
  const [configureOpenId, setConfigureOpenId] = useState<string | null>(null);

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
        presets: ServicePresetCardModel[];
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
                const configureOpen = configureOpenId === svc.serviceOfferId;
                return (
                  <li key={svc.serviceOfferId}>
                    <ServicePresetCard
                      mode="salon"
                      title={svc.displayName}
                      description={svc.shortDescription}
                      price={draft.priceCents}
                      durationMinutes={draft.durationMinutes}
                      includedText={svc.includedText}
                      enabled={draft.enabled}
                      saving={saving}
                      configureOpen={configureOpen}
                      addons={svc.addons.map((addon) => ({
                        id: addon.addonId,
                        label: addon.label,
                        price: addon.priceCents,
                        selected: draft.addonIds.includes(addon.addonId),
                        active: true,
                        onToggle: () => toggleAddon(svc.serviceOfferId, addon.addonId),
                      }))}
                      onConfigure={() =>
                        setConfigureOpenId((current) =>
                          current === svc.serviceOfferId ? null : svc.serviceOfferId,
                        )
                      }
                      onPriceChange={(cents) =>
                        updateDraft(svc.serviceOfferId, { priceCents: cents })
                      }
                      onDurationChange={(minutes) =>
                        updateDraft(svc.serviceOfferId, { durationMinutes: minutes })
                      }
                      onToggleEnabled={() =>
                        updateDraft(svc.serviceOfferId, { enabled: !draft.enabled })
                      }
                      onSave={() => void persist(svc.serviceOfferId, {})}
                    />
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
