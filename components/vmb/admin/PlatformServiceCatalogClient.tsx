"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
    <div className="vmb-service-catalog">
      <header className="vmb-service-catalog__header">
        <div className="vmb-service-preset-admin__header-row">
          <div>
            <h1 className="vmb-service-catalog__title">Service Catalog</h1>
            <p className="vmb-service-catalog__subtitle">
              Canonical VMB services and add-ons — salons configure from this menu.
            </p>
          </div>
          <Link href="/admin/service-catalog/presets" className="vmb-service-preset-admin__manage-link">
            Manage Preset Cards
          </Link>
        </div>
      </header>

      <div className="vmb-service-catalog__layout">
        <nav className="vmb-service-catalog__nav" aria-label="Service categories">
          <p className="vmb-service-catalog__nav-label">Categories</p>
          <ul className="vmb-service-catalog__nav-list">
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  className={`vmb-service-catalog__nav-item${selectedCategoryId === category.id ? " vmb-service-catalog__nav-item--active" : ""}`}
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
        </nav>

        <section className="vmb-service-catalog__main" aria-label={`${categoryLabel} services`}>
          <h2 className="vmb-service-catalog__category-title">{categoryLabel.toUpperCase()}</h2>
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
    </div>
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
