"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminNailBuilderShell } from "@/components/vmb/admin/AdminNailBuilderShell";
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

  const presetsLink = (
    <Link href="/admin/service-catalog/presets" className="vmb-admin-nail-builder__header-link">
      Manage Preset Cards
    </Link>
  );

  return (
    <AdminNailBuilderShell
      title="Service Catalog"
      activeStep="services"
      headerExtra={presetsLink}
    >
      <div className="vmb-admin-nail-builder__workspace vmb-admin-nail-builder__workspace--two-col">
        <aside className="vmb-template-admin__list">
          <p className="vmb-template-admin__list-label">Categories</p>
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  className={`vmb-template-admin__type${selectedCategoryId === category.id ? " vmb-template-admin__type--active" : ""}`}
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

        <section className="vmb-template-admin__editor" aria-label={`${categoryLabel} services`}>
          <h2 className="vmb-card-template-workspace__editor-title">{categoryLabel}</h2>
          <p className="vmb-service-catalog__section-label">Services</p>
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

          {selectedService ? (
            <section className="vmb-service-catalog__detail" aria-label="Service detail">
              <h3 className="vmb-service-catalog__detail-title">{selectedService.name}</h3>
              <dl className="vmb-service-catalog__meta">
                <div>
                  <dt>Base Price</dt>
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
                <div>
                  <dt>Service ID</dt>
                  <dd className="vmb-service-catalog__id">{selectedService.id}</dd>
                </div>
              </dl>

              {addons.length > 0 ? (
                <>
                  <p className="vmb-service-catalog__section-label">Available Add-ons</p>
                  <ul className="vmb-service-catalog__addon-list">
                    {addons.map((addon) => (
                      <li key={addon.id} className="vmb-service-catalog__addon-item">
                        <span aria-hidden>✓</span> {addon.name}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ) : null}
        </section>
      </div>
    </AdminNailBuilderShell>
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
      <span>{service.name}</span>
      <span className="vmb-service-catalog__service-meta">
        {formatCatalogPrice(service.basePriceCents)} · {formatCatalogDuration(service.durationMinutes)}
      </span>
    </button>
  );
}
