"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";
import type { VmbService, VmbServiceCategory } from "@/lib/vmb/services/service-types";
import { VMB_SERVICE_CATEGORIES } from "@/lib/vmb/services/service-types";

type Props = {
  salonId?: string;
};

const CATEGORY_LABELS: Record<VmbServiceCategory, string> = {
  nails: "Nails",
  hair: "Hair",
  brows: "Brows",
  lashes: "Lashes",
  waxing: "Waxing",
  facial: "Facial",
  massage: "Massage",
  other: "Other",
};

export function ServiceCatalogAdminClient({ salonId }: Props) {
  const [services, setServices] = useState<VmbService[]>([]);
  const [options, setOptions] = useState<VmbServiceOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [serviceDraft, setServiceDraft] = useState<VmbService | null>(null);
  const [optionDraft, setOptionDraft] = useState<VmbServiceOption | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!salonId) return;
    const res = await fetch("/api/vmb/services");
    const data = (await res.json()) as {
      ok?: boolean;
      services?: VmbService[];
      options?: VmbServiceOption[];
    };
    if (data.ok && data.services) {
      setServices(data.services);
      if (!selectedServiceId && data.services[0]) {
        setSelectedServiceId(data.services[0].id);
      }
    }
    if (data.ok && data.options) {
      setOptions(data.options);
    }
  }, [salonId, selectedServiceId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [services, selectedServiceId],
  );

  const serviceOptions = useMemo(
    () => options.filter((option) => option.serviceId === selectedServiceId),
    [options, selectedServiceId],
  );

  useEffect(() => {
    if (selectedService) {
      setServiceDraft({ ...selectedService });
    }
  }, [selectedService]);

  const selectedOption = useMemo(
    () => serviceOptions.find((option) => option.id === selectedOptionId),
    [serviceOptions, selectedOptionId],
  );

  useEffect(() => {
    if (selectedOption) {
      setOptionDraft({ ...selectedOption });
    } else if (serviceOptions[0]) {
      setSelectedOptionId(serviceOptions[0].id);
    } else {
      setOptionDraft(null);
      setSelectedOptionId("");
    }
  }, [selectedOption, serviceOptions]);

  async function handleSaveService() {
    if (!serviceDraft || !salonId) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/vmb/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: serviceDraft }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    setStatus(data.ok ? "Service saved." : data.error ?? "Save failed.");
    if (data.ok) await loadCatalog();
  }

  async function handleSaveOption() {
    if (!optionDraft || !salonId) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/vmb/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option: optionDraft }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    setStatus(data.ok ? "Option saved." : data.error ?? "Save failed.");
    if (data.ok) await loadCatalog();
  }

  function handleAddOption() {
    if (!selectedServiceId) return;
    const now = new Date().toISOString();
    const next: VmbServiceOption = {
      id: `custom-${Date.now()}`,
      serviceId: selectedServiceId,
      name: "New Option",
      groupName: "Add-On",
      active: true,
      displayOrder: serviceOptions.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    setOptionDraft(next);
    setSelectedOptionId(next.id);
  }

  if (!salonId) {
    return (
      <VmbPageFrame title="Service Catalog" subtitle="Salon services and options">
        <p>Sign in to a VMB salon trial to manage your service catalog.</p>
      </VmbPageFrame>
    );
  }

  return (
    <VmbPageFrame title="Service Catalog" subtitle="Services, options, and pricing labels">
      <div className="vmb-template-admin vmb-service-admin">
        <aside className="vmb-template-admin__list">
          <p className="vmb-template-admin__list-label">Services</p>
          <ul>
            {services.map((service) => (
              <li key={service.id}>
                <button
                  type="button"
                  className={`vmb-template-admin__type${selectedServiceId === service.id ? " vmb-template-admin__type--active" : ""}`}
                  onClick={() => setSelectedServiceId(service.id)}
                >
                  {service.name}
                  <span className="vmb-service-admin__category">{CATEGORY_LABELS[service.category]}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="vmb-offer-admin__links">
            <Link href="/vmb/admin/offers">Offers</Link>
            <Link href="/vmb/admin/templates">Templates</Link>
          </div>
        </aside>

        <section className="vmb-template-admin__editor">
          {serviceDraft ? (
            <>
              <div className="vmb-template-admin__editor-head">
                <h2>{serviceDraft.name}</h2>
                <p>{CATEGORY_LABELS[serviceDraft.category]} · {serviceDraft.isDefault ? "Default" : "Salon service"}</p>
              </div>
              <label className="vmb-template-admin__field">
                <span>Name</span>
                <input
                  value={serviceDraft.name}
                  onChange={(e) => setServiceDraft({ ...serviceDraft, name: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Category</span>
                <select
                  value={serviceDraft.category}
                  onChange={(e) =>
                    setServiceDraft({ ...serviceDraft, category: e.target.value as VmbServiceCategory })
                  }
                >
                  {VMB_SERVICE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="vmb-template-admin__field">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={serviceDraft.description ?? ""}
                  onChange={(e) => setServiceDraft({ ...serviceDraft, description: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field vmb-offer-admin__checkbox">
                <input
                  type="checkbox"
                  checked={serviceDraft.active}
                  onChange={(e) => setServiceDraft({ ...serviceDraft, active: e.target.checked })}
                />
                <span>Active</span>
              </label>
              <button type="button" className="taikos-opp-card__cta" disabled={busy} onClick={() => void handleSaveService()}>
                {busy ? "Saving…" : "Save service"}
              </button>
            </>
          ) : null}
        </section>

        <aside className="vmb-template-admin__preview vmb-service-admin__options">
          <div className="vmb-service-admin__options-head">
            <p className="vmb-template-admin__preview-label">Options</p>
            <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--ghost" onClick={handleAddOption}>
              Add Option
            </button>
          </div>
          <ul className="vmb-service-admin__option-list">
            {serviceOptions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={`vmb-template-admin__type${selectedOptionId === option.id ? " vmb-template-admin__type--active" : ""}`}
                  onClick={() => setSelectedOptionId(option.id)}
                >
                  <span>{option.groupName ? `${option.groupName}: ` : ""}{option.name}</span>
                  {option.valueLabel ? <span className="vmb-service-admin__value-label">{option.valueLabel}</span> : null}
                </button>
              </li>
            ))}
          </ul>

          {optionDraft ? (
            <div className="vmb-service-admin__option-editor">
              <label className="vmb-template-admin__field">
                <span>Name</span>
                <input
                  value={optionDraft.name}
                  onChange={(e) => setOptionDraft({ ...optionDraft, name: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Group</span>
                <input
                  value={optionDraft.groupName ?? ""}
                  onChange={(e) => setOptionDraft({ ...optionDraft, groupName: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Value label</span>
                <input
                  value={optionDraft.valueLabel ?? ""}
                  onChange={(e) => setOptionDraft({ ...optionDraft, valueLabel: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Description</span>
                <textarea
                  rows={2}
                  value={optionDraft.description ?? ""}
                  onChange={(e) => setOptionDraft({ ...optionDraft, description: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field vmb-offer-admin__checkbox">
                <input
                  type="checkbox"
                  checked={optionDraft.active}
                  onChange={(e) => setOptionDraft({ ...optionDraft, active: e.target.checked })}
                />
                <span>Active</span>
              </label>
              <button type="button" className="taikos-opp-card__cta" disabled={busy} onClick={() => void handleSaveOption()}>
                {busy ? "Saving…" : "Save option"}
              </button>
            </div>
          ) : null}
          {status ? <p className="vmb-template-admin__status">{status}</p> : null}
        </aside>
      </div>
    </VmbPageFrame>
  );
}
