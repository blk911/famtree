"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { ServicePresetCard } from "@/components/vmb/services/ServicePresetCard";
import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import { listServiceCategories } from "@/lib/vmb/services/canonical-service-catalog";
import type {
  ServiceAddonPreset,
  ServicePresetCard as ServicePresetCardModel,
} from "@/lib/vmb/services/service-preset-types";

export function ServicePresetAdminClient() {
  const categories = listServiceCategories();
  const [categoryId, setCategoryId] = useState<ServiceCategoryId>("nails");
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
      setSelectedId((current) => current || json.presets[0]?.id || "");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const categoryLabel = categories.find((category) => category.id === categoryId)?.name ?? "";

  return (
    <AdminBuilderShell
      title="Manage Presets"
      subtitle="Salon-facing offer cards built from the canonical catalog."
      activeStep="presets"
    >
    <div className="vmb-service-catalog">
      <div className="vmb-service-catalog__layout">
        <nav className="vmb-service-catalog__nav" aria-label="Service categories">
          <p className="vmb-service-catalog__nav-label">Categories</p>
          <ul className="vmb-service-catalog__nav-list">
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  className={`vmb-service-catalog__nav-item${categoryId === category.id ? " vmb-service-catalog__nav-item--active" : ""}`}
                  onClick={() => {
                    setCategoryId(category.id);
                    setSelectedId("");
                  }}
                >
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section className="vmb-service-catalog__main" aria-label={`${categoryLabel} preset cards`}>
          <h2 className="vmb-service-catalog__category-title">{categoryLabel.toUpperCase()}</h2>
          {loading ? (
            <p className="vmb-service-preset-admin__state">Loading preset cards…</p>
          ) : error ? (
            <p className="vmb-service-preset-admin__state vmb-service-preset-admin__state--error">{error}</p>
          ) : (
            <>
              <ul className="vmb-service-preset-admin__list">
                {presets.map((preset) => (
                  <li key={preset.id}>
                    <button
                      type="button"
                      className={`vmb-service-preset-admin__row${selectedId === preset.id ? " vmb-service-preset-admin__row--active" : ""}`}
                      aria-expanded={selectedId === preset.id}
                      onClick={() => setSelectedId(preset.id)}
                    >
                      <span>{drafts[preset.id]?.displayName ?? preset.displayName}</span>
                      <span className="vmb-service-preset-admin__row-meta">
                        ${Math.round((drafts[preset.id]?.basePriceCents ?? preset.basePriceCents) / 100)} ·{" "}
                        {drafts[preset.id]?.durationMinutes ?? preset.durationMinutes} min
                        {!drafts[preset.id]?.active ? " · inactive" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {selected ? (
                <div className="vmb-service-preset-admin__editor-wrap">
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
                      <textarea
                        rows={2}
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
                      <textarea
                        rows={2}
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
                      <ul className="vmb-service-preset-admin__addon-list">
                        {selected.addonPresets.map((addon) => (
                          <li key={addon.addonId} className="vmb-service-preset-admin__addon-row">
                            <span className="vmb-service-preset-admin__addon-id">{addon.addonId}</span>
                            <label>
                              Label
                              <input
                                value={addon.label}
                                onChange={(e) =>
                                  updateAddonDraft(selected.id, addon.addonId, { label: e.target.value })
                                }
                              />
                            </label>
                            <label>
                              Price ($)
                              <input
                                type="number"
                                min={0}
                                value={Math.round(addon.priceCents / 100)}
                                onChange={(e) =>
                                  updateAddonDraft(selected.id, addon.addonId, {
                                    priceCents: Math.max(0, Math.round(Number(e.target.value) * 100)),
                                  })
                                }
                              />
                            </label>
                            <label>
                              Sort
                              <input
                                type="number"
                                value={addon.sortOrder}
                                onChange={(e) =>
                                  updateAddonDraft(selected.id, addon.addonId, {
                                    sortOrder: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </label>
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
            </>
          )}
        </section>
      </div>
    </div>
    </AdminBuilderShell>
  );
}
