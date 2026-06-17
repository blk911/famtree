"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InviteTemplateRenderCard } from "@/components/vmb/invites/InviteTemplateRenderCard";
import {
  buildInviteTemplateRenderPayload,
  resolvedSalonOfferToRenderOffer,
} from "@/lib/vmb/invite-templates/invite-template-render";
import {
  INVITE_TEMPLATE_PREVIEW_CONTEXT,
  applyInviteTemplateTokens,
} from "@/lib/vmb/invite-templates/invite-template-tokens";
import type {
  VmbInviteOfferCategory,
  VmbInviteTemplate,
} from "@/lib/vmb/invite-templates/invite-template-types";
import { VMB_INVITE_OFFER_CATEGORIES } from "@/lib/vmb/invite-templates/invite-template-types";
import type { ResolvedSalonOfferDisplay } from "@/lib/vmb/salon-offers/salon-offer-catalog-types";
import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import { listServiceCategories } from "@/lib/vmb/services/canonical-service-catalog";

const CATEGORY_OPTIONS: ServiceCategoryId[] = ["nails"];

type Props = {
  salonId?: string;
  salonName: string;
  providerName?: string;
};

export function NailInviteCatalogAdminClient({ salonId, salonName, providerName }: Props) {
  const categories = listServiceCategories().filter((category) =>
    CATEGORY_OPTIONS.includes(category.id),
  );
  const [categoryId, setCategoryId] = useState<ServiceCategoryId>("nails");
  const [templates, setTemplates] = useState<VmbInviteTemplate[]>([]);
  const [drafts, setDrafts] = useState<Record<string, VmbInviteTemplate>>({});
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedOfferDisplay, setSelectedOfferDisplay] = useState<ResolvedSalonOfferDisplay | null>(
    null,
  );
  const [salonOffers, setSalonOffers] = useState<
    Array<{ id: string; name: string; offerCategoryId?: string }>
  >([]);
  const [selectedSalonOfferId, setSelectedSalonOfferId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [templateRes, salonOfferRes] = await Promise.all([
        fetch(
          `/api/vmb/invite-templates?categoryId=${encodeURIComponent(categoryId)}&includeInactive=1`,
        ),
        salonId
          ? fetch("/api/vmb/salon-offers?activeOnly=1")
          : Promise.resolve(null),
      ]);
      if (!templateRes.ok) throw new Error("Could not load invite templates");
      const templateJson = (await templateRes.json()) as { templates: VmbInviteTemplate[] };
      setTemplates(templateJson.templates ?? []);
      const nextDrafts: Record<string, VmbInviteTemplate> = {};
      for (const template of templateJson.templates ?? []) {
        nextDrafts[template.id] = template;
      }
      setDrafts(nextDrafts);
      setSelectedId((current) => current || templateJson.templates?.[0]?.id || "");

      if (salonOfferRes?.ok) {
        const offerJson = (await salonOfferRes.json()) as {
          offers?: Array<{ id: string; name: string; offerCategoryId?: string }>;
        };
        setSalonOffers(offerJson.offers ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [categoryId, salonId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedSalonOfferId || !salonId) {
      setSelectedOfferDisplay(null);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/vmb/salon-offers/${encodeURIComponent(selectedSalonOfferId)}`);
      if (!res.ok) {
        setSelectedOfferDisplay(null);
        return;
      }
      const json = (await res.json()) as { display?: ResolvedSalonOfferDisplay };
      setSelectedOfferDisplay(json.display ?? null);
    })();
  }, [selectedSalonOfferId, salonId]);

  const selected = selectedId ? drafts[selectedId] : undefined;

  const tokenContext = useMemo(
    () => ({
      ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
      salonName: salonName || INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
      providerName: providerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
      offerName: selectedOfferDisplay?.name ?? INVITE_TEMPLATE_PREVIEW_CONTEXT.offerName,
      offerPrice: selectedOfferDisplay
        ? `$${Math.round(selectedOfferDisplay.priceCents / 100)}`
        : INVITE_TEMPLATE_PREVIEW_CONTEXT.offerPrice,
    }),
    [providerName, salonName, selectedOfferDisplay],
  );

  const previewPayload = useMemo(() => {
    if (!selected) return null;
    return buildInviteTemplateRenderPayload(
      selected,
      tokenContext,
      selectedOfferDisplay ? resolvedSalonOfferToRenderOffer(selectedOfferDisplay) : undefined,
    );
  }, [selected, selectedOfferDisplay, tokenContext]);

  function updateDraft(id: string, patch: Partial<VmbInviteTemplate>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  function toggleAllowedCategory(id: string, category: VmbInviteOfferCategory) {
    const draft = drafts[id];
    if (!draft) return;
    const current = new Set(draft.allowedOfferCategories);
    if (current.has(category)) current.delete(category);
    else current.add(category);
    updateDraft(id, { allowedOfferCategories: Array.from(current) });
  }

  async function saveTemplate(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/vmb/invite-templates", {
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

  return (
    <div className="vmb-nail-invite-catalog">
      <header className="vmb-nail-invite-catalog__header">
        <div>
          <h1 className="vmb-nail-invite-catalog__title">Nail Invite Catalog</h1>
          <p className="vmb-nail-invite-catalog__subtitle">
            Admin-defined invite templates — salon pages will consume these approved renders.
          </p>
        </div>
        <Link href="/admin/invites" className="vmb-nail-invite-catalog__back">
          ← Invites
        </Link>
      </header>

      <div className="vmb-nail-invite-catalog__layout">
        <nav className="vmb-nail-invite-catalog__categories" aria-label="Categories">
          <p className="vmb-nail-invite-catalog__nav-label">Category</p>
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  className={
                    categoryId === category.id
                      ? "vmb-nail-invite-catalog__nav-item vmb-nail-invite-catalog__nav-item--active"
                      : "vmb-nail-invite-catalog__nav-item"
                  }
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

        <section className="vmb-nail-invite-catalog__types" aria-label="Invite types">
          <p className="vmb-nail-invite-catalog__nav-label">Invite types</p>
          {loading ? (
            <p className="vmb-nail-invite-catalog__state">Loading templates…</p>
          ) : error ? (
            <p className="vmb-nail-invite-catalog__state vmb-nail-invite-catalog__state--error">
              {error}
            </p>
          ) : (
            <ul className="vmb-nail-invite-catalog__type-list">
              {templates.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    className={
                      selectedId === template.id
                        ? "vmb-nail-invite-catalog__type-row vmb-nail-invite-catalog__type-row--active"
                        : "vmb-nail-invite-catalog__type-row"
                    }
                    onClick={() => setSelectedId(template.id)}
                  >
                    <span>{drafts[template.id]?.displayName ?? template.displayName}</span>
                    {!drafts[template.id]?.active ? (
                      <span className="vmb-nail-invite-catalog__type-meta">inactive</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="vmb-nail-invite-catalog__editor" aria-label="Template editor">
          {selected ? (
            <>
              <div className="vmb-nail-invite-catalog__editor-head">
                <h2>{selected.displayName}</h2>
                <button
                  type="button"
                  className="vmb-nail-invite-catalog__select-invite"
                  onClick={() => setPreviewOpen(true)}
                >
                  Select Invite
                </button>
              </div>

              <p className="vmb-nail-invite-catalog__intent">{selected.intent}</p>

              <div className="vmb-nail-invite-catalog__fields">
                <label>
                  Display name
                  <input
                    value={selected.displayName}
                    onChange={(e) => updateDraft(selected.id, { displayName: e.target.value })}
                  />
                </label>
                <label>
                  Intent (internal)
                  <textarea
                    rows={2}
                    value={selected.intent}
                    onChange={(e) => updateDraft(selected.id, { intent: e.target.value })}
                  />
                </label>
                <label>
                  Subject
                  <input
                    value={selected.subject}
                    onChange={(e) => updateDraft(selected.id, { subject: e.target.value })}
                  />
                </label>
                <label>
                  Eyebrow
                  <input
                    value={selected.eyebrow}
                    onChange={(e) => updateDraft(selected.id, { eyebrow: e.target.value })}
                  />
                </label>
                <label>
                  Headline
                  <input
                    value={selected.headline}
                    onChange={(e) => updateDraft(selected.id, { headline: e.target.value })}
                  />
                </label>
                <label>
                  Body
                  <textarea
                    rows={4}
                    value={selected.body}
                    onChange={(e) => updateDraft(selected.id, { body: e.target.value })}
                  />
                </label>
                <label>
                  CTA label
                  <input
                    value={selected.ctaLabel}
                    onChange={(e) => updateDraft(selected.id, { ctaLabel: e.target.value })}
                  />
                </label>
                <label>
                  Default offer category
                  <select
                    value={selected.defaultOfferCategory}
                    onChange={(e) =>
                      updateDraft(selected.id, {
                        defaultOfferCategory: e.target.value as VmbInviteOfferCategory,
                      })
                    }
                  >
                    {VMB_INVITE_OFFER_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
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
                <label className="vmb-nail-invite-catalog__checkbox">
                  <input
                    type="checkbox"
                    checked={selected.active}
                    onChange={(e) => updateDraft(selected.id, { active: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <fieldset className="vmb-nail-invite-catalog__allowed">
                <legend>Allowed offer categories</legend>
                <ul>
                  {VMB_INVITE_OFFER_CATEGORIES.map((category) => (
                    <li key={category}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selected.allowedOfferCategories.includes(category)}
                          onChange={() => toggleAllowedCategory(selected.id, category)}
                        />
                        {category}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              {salonId && salonOffers.length > 0 ? (
                <label className="vmb-nail-invite-catalog__offer-pick">
                  Preview salon offer (optional)
                  <select
                    value={selectedSalonOfferId}
                    onChange={(e) => setSelectedSalonOfferId(e.target.value)}
                  >
                    <option value="">No offer selected</option>
                    {salonOffers.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {offer.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <p className="vmb-nail-invite-catalog__subject-preview">
                Subject preview: {applyInviteTemplateTokens(selected.subject, tokenContext)}
              </p>

              <button
                type="button"
                className="vmb-nail-invite-catalog__save"
                disabled={saving}
                onClick={() => void saveTemplate(selected.id)}
              >
                {saving ? "Saving…" : "Save template"}
              </button>
              {status ? <p className="vmb-nail-invite-catalog__status">{status}</p> : null}
            </>
          ) : (
            <p className="vmb-nail-invite-catalog__state">Select an invite type to edit.</p>
          )}
        </section>
      </div>

      {previewOpen && previewPayload ? (
        <div
          className="vmb-nail-invite-catalog__modal-backdrop"
          onClick={() => setPreviewOpen(false)}
          role="presentation"
        >
          <div
            className="vmb-nail-invite-catalog__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="salon-dashboard-preview-title"
          >
            <header className="vmb-nail-invite-catalog__modal-header">
              <h2 id="salon-dashboard-preview-title">Salon Dashboard Preview</h2>
              <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Close">
                ×
              </button>
            </header>
            <InviteTemplateRenderCard payload={previewPayload} mode="adminPreview" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
