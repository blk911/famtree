"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { AdminTemplatePreviewCard } from "@/components/vmb/admin/AdminTemplatePreviewCard";
import { AdminTemplateReviewModal } from "@/components/vmb/admin/AdminTemplateReviewModal";
import { OfferNailSelectionFields } from "@/components/vmb/admin/OfferNailSelectionFields";
import {
  baselineNailTemplateDraft,
  buildNailTemplateDrafts,
  nailTemplateDraftToOffer,
  TEMPLATE_LIBRARY_SAVED_MESSAGE,
  type NailTemplateDraft,
} from "@/lib/vmb/admin/nail-template-library";
import {
  resolveNailOfferAddonLabels,
  resolveNailOfferServiceLabels,
} from "@/lib/vmb/admin/nail-offer-builder-selections";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";
import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";
import type { VmbService } from "@/lib/vmb/services/service-types";

type Props = {
  salonId?: string;
  salonName: string;
  ownerName?: string;
};

export function TemplateLibraryAdminClient({ salonId, salonName, ownerName }: Props) {
  const [offers, setOffers] = useState<VmbOffer[]>([]);
  const [services, setServices] = useState<VmbService[]>([]);
  const [serviceOptions, setServiceOptions] = useState<VmbServiceOption[]>([]);
  const [drafts, setDrafts] = useState<NailTemplateDraft[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    DEFAULT_NAIL_INVITE_TEMPLATES[0]!.id,
  );
  const [draft, setDraft] = useState<NailTemplateDraft | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadOffers = useCallback(async () => {
    if (!salonId) return;
    const [offerRes, serviceRes] = await Promise.all([
      fetch("/api/vmb/offers"),
      fetch("/api/vmb/services"),
    ]);
    const offerData = (await offerRes.json()) as { ok?: boolean; offers?: VmbOffer[] };
    const serviceData = (await serviceRes.json()) as {
      ok?: boolean;
      services?: VmbService[];
      options?: VmbServiceOption[];
    };
    if (offerData.ok && offerData.offers) {
      setOffers(offerData.offers);
      setDrafts(buildNailTemplateDrafts(salonId, offerData.offers));
    }
    if (serviceData.ok && serviceData.services) {
      setServices(serviceData.services);
    }
    if (serviceData.ok && serviceData.options) {
      setServiceOptions(serviceData.options);
    }
  }, [salonId]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const selectedBaseline = useMemo(
    () => drafts.find((row) => row.templateId === selectedTemplateId),
    [drafts, selectedTemplateId],
  );

  useEffect(() => {
    if (selectedBaseline) {
      setDraft({ ...selectedBaseline });
    }
  }, [selectedBaseline]);

  const serviceFallbackById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const service of services) {
      map[service.id] = service.name;
    }
    return map;
  }, [services]);

  const optionFallbackById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const option of serviceOptions) {
      map[option.id] = option.name;
    }
    return map;
  }, [serviceOptions]);

  const previewServiceNames = useMemo(() => {
    if (!draft) return [];
    return resolveNailOfferServiceLabels(draft.serviceIds, serviceFallbackById);
  }, [draft, serviceFallbackById]);

  const previewRewardLabels = useMemo(() => {
    if (!draft) return [];
    return resolveNailOfferAddonLabels(draft.serviceOptionIds, optionFallbackById);
  }, [draft, optionFallbackById]);

  const tokenContext = useMemo(
    () => ({
      ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
      salonName: salonName || INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
      providerName: ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
    }),
    [ownerName, salonName],
  );

  function patchDraft(patch: Partial<NailTemplateDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function handleSaveToLibrary() {
    if (!draft || !salonId) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/vmb/offers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer: nailTemplateDraftToOffer(draft, salonId) }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (data.ok) {
      setReviewOpen(false);
      setStatus(TEMPLATE_LIBRARY_SAVED_MESSAGE);
      await loadOffers();
    } else {
      setStatus(data.error ?? "Save failed.");
    }
  }

  async function handleReset() {
    if (!draft || !salonId) return;
    const baseline = baselineNailTemplateDraft(draft.templateId);
    if (!baseline) return;
    setBusy(true);
    setStatus(null);
    setDraft({ ...baseline, saved: false });

    if (selectedBaseline?.saved) {
      await fetch(
        `/api/vmb/offers?offerId=${encodeURIComponent(nailTemplateDraftToOffer(draft, salonId).id)}`,
        { method: "DELETE" },
      );
    }

    setBusy(false);
    setStatus("Reset to default template.");
    await loadOffers();
  }

  if (!salonId) {
    return (
      <AdminBuilderShell title="Template Library" activeStep="library">
        <p className="vmb-admin-builder-grid__status">
          Sign in to a VMB salon trial to manage your template library.
        </p>
      </AdminBuilderShell>
    );
  }

  return (
    <AdminBuilderShell
      title="Template Library"
      subtitle="Edit invite messages, nail services, and rewards — then preview what clients will see."
      activeStep="library"
    >
      <div className="vmb-admin-builder-grid">
        <aside className="vmb-admin-builder-grid__list">
          <p className="vmb-admin-builder-grid__list-label">Template types</p>
          <ul>
            {drafts.map((row) => (
              <li key={row.templateId}>
                <button
                  type="button"
                  className={`vmb-admin-builder-grid__type${selectedTemplateId === row.templateId ? " vmb-admin-builder-grid__type--active" : ""}`}
                  onClick={() => setSelectedTemplateId(row.templateId)}
                >
                  {row.displayName}
                  {row.saved ? (
                    <span className="vmb-admin-builder-grid__override-dot" aria-label="Saved" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="vmb-admin-builder-grid__editor">
          {draft ? (
            <>
              <h2 className="vmb-admin-builder__panel-title">{draft.displayName}</h2>

              <label className="vmb-admin-builder-grid__field">
                <span>Headline</span>
                <input value={draft.headline} onChange={(e) => patchDraft({ headline: e.target.value })} />
              </label>
              <label className="vmb-admin-builder-grid__field">
                <span>Body</span>
                <textarea rows={6} value={draft.body} onChange={(e) => patchDraft({ body: e.target.value })} />
              </label>
              <label className="vmb-admin-builder-grid__field">
                <span>CTA Label</span>
                <input value={draft.ctaLabel} onChange={(e) => patchDraft({ ctaLabel: e.target.value })} />
              </label>

              <OfferNailSelectionFields
                serviceIds={draft.serviceIds}
                serviceOptionIds={draft.serviceOptionIds}
                onServiceIdsChange={(serviceIds) => patchDraft({ serviceIds })}
                onServiceOptionIdsChange={(serviceOptionIds) => patchDraft({ serviceOptionIds })}
              />

              <label className="vmb-admin-builder-grid__field vmb-offer-admin__checkbox">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => patchDraft({ active: e.target.checked })}
                />
                <span>Available To Clients</span>
              </label>

              <div className="vmb-admin-builder-grid__actions">
                <button
                  type="button"
                  className="taikos-opp-card__cta"
                  disabled={busy}
                  onClick={() => setReviewOpen(true)}
                >
                  Review Template
                </button>
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  disabled={busy}
                  onClick={() => void handleReset()}
                >
                  Reset
                </button>
              </div>
              {status ? <p className="vmb-admin-builder-grid__status">{status}</p> : null}
            </>
          ) : null}
        </section>

        <aside className="vmb-admin-builder-grid__preview">
          <AdminTemplatePreviewCard
            draft={draft}
            rewardLabels={previewRewardLabels}
            tokenContext={tokenContext}
          />
        </aside>
      </div>

      {draft ? (
        <AdminTemplateReviewModal
          open={reviewOpen}
          draft={draft}
          serviceNames={previewServiceNames}
          rewardLabels={previewRewardLabels}
          tokenContext={tokenContext}
          busy={busy}
          onClose={() => setReviewOpen(false)}
          onSave={() => void handleSaveToLibrary()}
        />
      ) : null}
    </AdminBuilderShell>
  );
}
