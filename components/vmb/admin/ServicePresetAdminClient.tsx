"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { ServicePresetCard } from "@/components/vmb/services/ServicePresetCard";
import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import { listServiceCategories } from "@/lib/vmb/services/canonical-service-catalog";
import type {
  ServiceAddonPreset,
  ServicePresetCard as ServicePresetCardModel,
} from "@/lib/vmb/services/service-preset-types";

const ADDON_OFFER_TITLES: Record<string, string> = {
  "addon-french": "FRENCH TIPS",
  "addon-chrome": "CHROME",
  "addon-crystals": "CRYSTALS",
  "addon-freestyle-art": "FREESTYLE ART",
};

export function ServicePresetAdminClient() {
  const categories = listServiceCategories();
  const searchParams = useSearchParams();
  const requestedCategoryId = searchParams.get("categoryId");
  const categoryId: ServiceCategoryId = categories.some((category) => category.id === requestedCategoryId)
    ? requestedCategoryId as ServiceCategoryId
    : "nails";
  const [presets, setPresets] = useState<ServicePresetCardModel[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ServicePresetCardModel>>({});
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/vmb/service-presets?categoryId=${encodeURIComponent(categoryId)}&includeInactive=1`,
      );
      if (!res.ok) throw new Error("Could not load preset cards");
      const json = (await res.json()) as { presets: ServicePresetCardModel[] };
      setPresets(json.presets);
      const nextDrafts: Record<string, ServicePresetCardModel> = {};
      for (const preset of json.presets) {
        nextDrafts[preset.id] = preset;
      }
      setDrafts(nextDrafts);
      setSelectedId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = selectedId ? drafts[selectedId] : undefined;

  function updateDraft(id: string, patch: Partial<ServicePresetCardModel>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  function updateAddonDraft(presetId: string, addonId: string, patch: Partial<ServiceAddonPreset>) {
    setDrafts((prev) => {
      const preset = prev[presetId];
      if (!preset) return prev;
      return {
        ...prev,
        [presetId]: {
          ...preset,
          addonPresets: preset.addonPresets.map((addon) =>
            addon.addonId === addonId ? { ...addon, ...patch } : addon,
          ),
        },
      };
    });
  }

  async function savePreset(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/vmb/service-presets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setStatus(`Saved ${draft.displayName}`);
      await load();
      setSelectedId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const categoryLabel = categories.find((category) => category.id === categoryId)?.name ?? "";
  const selectedIndex = presets.findIndex((preset) => preset.id === selectedId);

  return (
    <AdminBuilderShell
      title="Offer Presets"
      subtitle="Edit canonical salon offers and review the client-facing card."
      activeStep="services"
    >
    <div className="vmb-service-catalog">
      <div className="vmb-service-catalog__layout">
        <section className="vmb-service-catalog__main" aria-label={`${categoryLabel} preset cards`}>
          <h2 className="vmb-service-catalog__category-title">{categoryLabel.toUpperCase()}</h2>
          {loading ? (
            <p className="vmb-service-preset-admin__state">Loading preset cards…</p>
          ) : error ? (
            <p className="vmb-service-preset-admin__state vmb-service-preset-admin__state--error">{error}</p>
          ) : (
            <>
              <div className="vmb-service-preset-admin__list">
                {presets.map((preset, index) => (
                  <div key={preset.id} style={{ order: index * 2 }}>
                    <button
                      type="button"
                      className={`vmb-service-preset-admin__row${selectedId === preset.id ? " vmb-service-preset-admin__row--active" : ""}`}
                      aria-expanded={selectedId === preset.id}
                      onClick={() => setSelectedId((current) => current === preset.id ? "" : preset.id)}
                    >
                      <span>{drafts[preset.id]?.displayName ?? preset.displayName}</span>
                      <span className="vmb-service-preset-admin__row-meta">
                        ${Math.round((drafts[preset.id]?.basePriceCents ?? preset.basePriceCents) / 100)} ·{" "}
                        {drafts[preset.id]?.durationMinutes ?? preset.durationMinutes} min
                        {!drafts[preset.id]?.active ? " · inactive" : ""}
                      </span>
                    </button>
                  </div>
                ))}

              {selected ? (
                <div
                  className="vmb-service-preset-admin__editor-wrap"
                  style={{ order: selectedIndex * 2 + 1 }}
                >
                  <aside className="vmb-service-preset-admin__preview" aria-label="Card preview">
                    <p className="vmb-service-catalog__section-label">Card preview</p>
                    <ServicePresetCard
                      mode="admin"
                      title={selected.displayName}
                      description={selected.shortDescription}
                      price={selected.basePriceCents}
                      durationMinutes={selected.durationMinutes}
                      includedText={selected.includedText}
                      addons={selected.addonPresets.map((addon) => ({
                        id: addon.addonId,
                        label: addon.label,
                        price: addon.priceCents,
                        selected: false,
                        active: true,
                      }))}
                    />
                  </aside>

                  <div className="vmb-service-preset-admin__editor">
                  <p className="vmb-service-catalog__section-label">Offer details</p>
                  <p className="vmb-service-preset-admin__linked">
                    Linked offer: <code>{selected.serviceOfferId}</code>
                  </p>
                  <div className="vmb-service-preset-admin__fields">
                    <label>
                      Display name
                      <input
                        value={selected.displayName}
                        onChange={(e) => updateDraft(selected.id, { displayName: e.target.value })}
                      />
                    </label>
                    <label>
                      Short description
                      <input
                        value={selected.shortDescription}
                        onChange={(e) => updateDraft(selected.id, { shortDescription: e.target.value })}
                      />
                    </label>
                    <label>
                      Base price ($)
                      <input
                        type="number"
                        min={0}
                        value={Math.round(selected.basePriceCents / 100)}
                        onChange={(e) =>
                          updateDraft(selected.id, {
                            basePriceCents: Math.max(0, Math.round(Number(e.target.value) * 100)),
                          })
                        }
                      />
                    </label>
                    <label>
                      Duration (min)
                      <input
                        type="number"
                        min={15}
                        step={15}
                        value={selected.durationMinutes}
                        onChange={(e) =>
                          updateDraft(selected.id, {
                            durationMinutes: Math.max(15, Number(e.target.value) || 15),
                          })
                        }
                      />
                    </label>
                    <label>
                      Included text
                      <input
                        value={selected.includedText}
                        onChange={(e) => updateDraft(selected.id, { includedText: e.target.value })}
                      />
                    </label>
                    <label>
                      Sort order
                      <input
                        type="number"
                        value={selected.sortOrder}
                        onChange={(e) =>
                          updateDraft(selected.id, { sortOrder: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                  </div>

                  {selected.addonPresets.length > 0 ? (
                    <>
                      <p className="vmb-service-catalog__section-label">Add-on presets</p>
                      <div className="vmb-service-preset-admin__addon-head" aria-hidden="true">
                        <span>Offer</span>
                        <span>Label</span>
                        <span>Price ($)</span>
                        <span>Sort</span>
                      </div>
                      <ul className="vmb-service-preset-admin__addon-list">
                        {selected.addonPresets.map((addon) => (
                          <li key={addon.addonId} className="vmb-service-preset-admin__addon-row">
                            <strong className="vmb-service-preset-admin__addon-title">
                              {ADDON_OFFER_TITLES[addon.addonId] ?? addon.label.toUpperCase()}
                            </strong>
                            <input
                              aria-label={`${addon.label} label`}
                              placeholder="Label"
                              value={addon.label}
                              onChange={(e) =>
                                updateAddonDraft(selected.id, addon.addonId, { label: e.target.value })
                              }
                            />
                            <input
                              aria-label={`${addon.label} price`}
                              placeholder="Price"
                              type="number"
                              min={0}
                              value={Math.round(addon.priceCents / 100)}
                              onChange={(e) =>
                                updateAddonDraft(selected.id, addon.addonId, {
                                  priceCents: Math.max(0, Math.round(Number(e.target.value) * 100)),
                                })
                              }
                            />
                            <input
                              aria-label={`${addon.label} sort order`}
                              placeholder="Sort"
                              type="number"
                              value={addon.sortOrder}
                              onChange={(e) =>
                                updateAddonDraft(selected.id, addon.addonId, {
                                  sortOrder: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  <button
                    type="button"
                    className="vmb-service-preset-admin__save"
                    disabled={saving}
                    onClick={() => void savePreset(selected.id)}
                  >
                    {saving ? "Saving…" : "Save preset card"}
                  </button>
                  {status ? <p className="vmb-service-preset-admin__status">{status}</p> : null}
                  </div>
                </div>
              ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
    </AdminBuilderShell>
  );
}
