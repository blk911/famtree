"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { ResolvedSalonService, ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import { formatCatalogDuration, formatCatalogPrice } from "@/lib/vmb/services/canonical-service-catalog";

type Props = {
  salonId?: string;
  salonName?: string;
};

export function SalonServicesClient({ salonId, salonName = "Your Salon" }: Props) {
  const [categoryId, setCategoryId] = useState<ServiceCategoryId>("nails");
  const [services, setServices] = useState<ResolvedSalonService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    if (!salonId) return;
    const res = await fetch(`/api/vmb/salon-services?category=${categoryId}`, { cache: "no-store" });
    const data = (await res.json()) as { ok?: boolean; services?: ResolvedSalonService[] };
    if (data.ok && data.services) {
      setServices(data.services);
      setSelectedServiceId((current) => current || data.services?.[0]?.id || "");
    }
  }, [salonId, categoryId]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  useEffect(() => {
    setSelectedServiceId("");
  }, [categoryId]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? services[0],
    [services, selectedServiceId],
  );

  async function saveService(patch: Partial<ResolvedSalonService>) {
    if (!salonId || !selectedService) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/vmb/salon-services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalogServiceId: selectedService.id,
        enabled: patch.enabled ?? selectedService.enabled,
        priceCents: patch.priceCents ?? selectedService.priceCents,
        durationMinutes: patch.durationMinutes ?? selectedService.durationMinutes,
        enabledAddonIds:
          patch.addons?.filter((addon) => addon.enabled).map((addon) => addon.id) ??
          selectedService.addons.filter((addon) => addon.enabled).map((addon) => addon.id),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (data.ok) {
      setStatus("Saved.");
      await loadServices();
    } else {
      setStatus(data.error ?? "Save failed.");
    }
  }

  if (!salonId) {
    return (
      <VmbPageFrame title="Services" subtitle={salonName}>
        <p className="vmb-page-state">Sign in to your salon trial to configure services.</p>
      </VmbPageFrame>
    );
  }

  return (
    <VmbPageFrame
      title="Services"
      subtitle="Turn on the services you offer and set your prices."
    >
      <div className="vmb-salon-services">
        <label className="vmb-salon-services__category-picker">
          <span>Category</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value as ServiceCategoryId)}
          >
            <option value="nails">Nails</option>
            <option value="hair">Hair</option>
            <option value="lashes">Lashes</option>
            <option value="brows">Brows</option>
            <option value="waxing">Waxing</option>
            <option value="skin">Skin</option>
            <option value="massage">Massage</option>
            <option value="barber">Barber</option>
          </select>
        </label>

        <ul className="vmb-salon-services__list">
          {services.map((service) => (
            <li key={service.id}>
              <button
                type="button"
                className={`vmb-salon-services__row${selectedService?.id === service.id ? " vmb-salon-services__row--active" : ""}`}
                onClick={() => setSelectedServiceId(service.id)}
              >
                <span className="vmb-salon-services__check" aria-hidden>
                  {service.enabled ? "✓" : "□"}
                </span>
                <span className="vmb-salon-services__name">{service.name}</span>
                <span className="vmb-salon-services__price">
                  {service.enabled ? formatCatalogPrice(service.priceCents) : "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {selectedService ? (
          <section className="vmb-salon-services__panel" aria-label="Service configuration">
            <h2 className="vmb-salon-services__panel-title">{selectedService.name}</h2>

            <label className="vmb-salon-services__field vmb-salon-services__field--checkbox">
              <input
                type="checkbox"
                checked={selectedService.enabled}
                onChange={(event) => void saveService({ enabled: event.target.checked })}
                disabled={busy}
              />
              <span>Offer this service</span>
            </label>

            <label className="vmb-salon-services__field">
              <span>Price</span>
              <input
                type="number"
                min={0}
                step={1}
                value={Math.round(selectedService.priceCents / 100)}
                onChange={(event) => {
                  const dollars = Number.parseInt(event.target.value, 10);
                  if (Number.isNaN(dollars)) return;
                  setServices((current) =>
                    current.map((service) =>
                      service.id === selectedService.id
                        ? { ...service, priceCents: dollars * 100 }
                        : service,
                    ),
                  );
                }}
                onBlur={() => void saveService({ priceCents: selectedService.priceCents })}
                disabled={busy || !selectedService.enabled}
              />
            </label>

            <label className="vmb-salon-services__field">
              <span>Duration (minutes)</span>
              <input
                type="number"
                min={15}
                step={5}
                value={selectedService.durationMinutes}
                onChange={(event) => {
                  const minutes = Number.parseInt(event.target.value, 10);
                  if (Number.isNaN(minutes)) return;
                  setServices((current) =>
                    current.map((service) =>
                      service.id === selectedService.id ? { ...service, durationMinutes: minutes } : service,
                    ),
                  );
                }}
                onBlur={() => void saveService({ durationMinutes: selectedService.durationMinutes })}
                disabled={busy || !selectedService.enabled}
              />
              <span className="vmb-salon-services__hint">
                {formatCatalogDuration(selectedService.durationMinutes)}
              </span>
            </label>

            {selectedService.addons.length > 0 ? (
              <fieldset className="vmb-salon-services__addons" disabled={busy || !selectedService.enabled}>
                <legend>Available Add-ons</legend>
                <ul>
                  {selectedService.addons.map((addon) => (
                    <li key={addon.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={addon.enabled}
                          onChange={(event) => {
                            const nextAddons = selectedService.addons.map((entry) =>
                              entry.id === addon.id ? { ...entry, enabled: event.target.checked } : entry,
                            );
                            void saveService({ addons: nextAddons });
                          }}
                        />
                        <span>{addon.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ) : null}
          </section>
        ) : null}

        {status ? <p className="vmb-salon-services__status">{status}</p> : null}
      </div>
    </VmbPageFrame>
  );
}
