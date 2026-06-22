"use client";

import { useMemo, useState } from "react";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import type { CatalogServiceOffer, ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import {
  formatCatalogDuration,
  formatCatalogPrice,
  getCatalogServiceOfferWithAddons,
  listAddonsForServiceOffer,
  listCatalogServiceOffers,
  listServiceCategories,
} from "@/lib/vmb/services/canonical-service-catalog";

export function PlatformServiceCatalogClient() {
  const categories = useMemo(() => listServiceCategories(), []);
  const [selectedCategoryId, setSelectedCategoryId] = useState<ServiceCategoryId>("nails");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const services = useMemo(
    () => listCatalogServiceOffers(selectedCategoryId),
    [selectedCategoryId],
  );

  const activeServiceId = selectedServiceId || services[0]?.id || "";
  const selectedService = useMemo(
    () => (activeServiceId ? getCatalogServiceOfferWithAddons(activeServiceId) : undefined),
    [activeServiceId],
  );
  const addons = useMemo(
    () => (activeServiceId ? listAddonsForServiceOffer(activeServiceId) : []),
    [activeServiceId],
  );

  const categoryLabel = categories.find((category) => category.id === selectedCategoryId)?.name ?? "";

  return (
    <AdminBuilderShell
      title="Service Catalog"
      activeStep="services"
    >
      <div className="vmb-admin-builder-grid vmb-service-catalog-admin">
        <aside className="vmb-admin-builder-grid__list">
          <p className="vmb-admin-builder-grid__list-label">Categories</p>
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  className={`vmb-admin-builder-grid__type${selectedCategoryId === category.id ? " vmb-admin-builder-grid__type--active" : ""}`}
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setSelectedServiceId("");
                  }}
                >
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="vmb-admin-builder-grid__editor" aria-label={`${categoryLabel} services`}>
          <h2 className="vmb-admin-builder__panel-title">{categoryLabel}</h2>
          <ul className="vmb-service-catalog__service-list">
            {services.map((service) => (
              <li key={service.id}>
                <ServiceRow
                  service={service}
                  active={service.id === activeServiceId}
                  onSelect={() => setSelectedServiceId(service.id)}
                />
              </li>
            ))}
          </ul>
        </section>

        <aside className="vmb-admin-builder-grid__preview" aria-label="Service detail">
          <p className="vmb-admin-builder-grid__preview-label">Service detail</p>
          {selectedService ? (
            <div className="vmb-service-catalog__detail">
              <h3 className="vmb-service-catalog__detail-title">{selectedService.name}</h3>
              <dl className="vmb-service-catalog__meta">
                <div>
                  <dt>Base price</dt>
                  <dd>{formatCatalogPrice(selectedService.basePriceCents)}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{formatCatalogDuration(selectedService.durationMinutes)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selectedService.active ? "Active" : "Inactive"}</dd>
                </div>
              </dl>

              {addons.length > 0 ? (
                <>
                  <p className="vmb-service-catalog__section-label">Add-ons</p>
                  <ul className="vmb-service-catalog__addon-list">
                    {addons.map((addon) => (
                      <li key={addon.id} className="vmb-service-catalog__addon-item">
                        {addon.name}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <details className="vmb-service-catalog__id-row">
                <summary>Service ID</summary>
                <code className="vmb-service-catalog__id">{selectedService.id}</code>
              </details>
            </div>
          ) : (
            <p className="vmb-service-catalog__detail-empty">Select a service to view detail.</p>
          )}
        </aside>
      </div>
    </AdminBuilderShell>
  );
}

function ServiceRow({
  service,
  active,
  onSelect,
}: {
  service: CatalogServiceOffer;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`vmb-service-catalog__service-row${active ? " vmb-service-catalog__service-row--active" : ""}`}
      onClick={onSelect}
    >
      <span className="vmb-service-catalog__service-name">{service.name}</span>
      <span className="vmb-service-catalog__service-meta">
        {formatCatalogPrice(service.basePriceCents)} · {formatCatalogDuration(service.durationMinutes)}
      </span>
    </button>
  );
}
