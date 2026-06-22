"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { OfferPricingSummary } from "@/components/vmb/admin/AdminDefaultPackageSummary";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { AdminTemplateReviewModal } from "@/components/vmb/admin/AdminTemplateReviewModal";
import { BuilderImageInsertsSection } from "@/components/vmb/admin/BuilderImageInsertsSection";
import { OfferNailSelectionFields } from "@/components/vmb/admin/OfferNailSelectionFields";
import { SnapshotPreviewCard } from "@/components/vmb/admin/SnapshotPreviewCard";
import { useNailTemplateInventory } from "@/components/vmb/admin/useNailTemplateInventory";
import {
  baselineNailTemplateDraft,
  buildDraftInviteSnapshot,
  nailTemplateDraftToOffer,
  type NailTemplateDraft,
} from "@/lib/vmb/admin/nail-template-library";
import { libraryRouteForTemplate } from "@/lib/vmb/admin/nail-template-routes";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";
import { calculateInvitationPackagePricing } from "@/lib/vmb/invites/invitation-package-pricing";
import {
  EMPTY_SALON_INVITE_IMAGE_INSERTS,
  type SalonInviteImageInserts,
} from "@/lib/vmb/invites/salon-invite-image-inserts";

type Props = {
  salonId?: string;
  salonName: string;
  ownerName?: string;
  initialTemplateId?: string;
};

export function TemplateBuilderAdminClient({
  salonId,
  salonName,
  ownerName,
  initialTemplateId,
}: Props) {
  const {
    drafts,
    reload,
    serviceFallbackById,
    optionFallbackById,
    servicePriceById,
    addonPriceByServiceId,
  } = useNailTemplateInventory(salonId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId ?? DEFAULT_NAIL_INVITE_TEMPLATES[0]!.id,
  );
  const [draft, setDraft] = useState<NailTemplateDraft | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageInserts, setImageInserts] = useState<SalonInviteImageInserts>(
    EMPTY_SALON_INVITE_IMAGE_INSERTS,
  );
  const loadedTemplateIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialTemplateId) return;
    if (drafts.some((row) => row.templateId === initialTemplateId)) {
      setSelectedTemplateId(initialTemplateId);
    }
  }, [drafts, initialTemplateId]);

  const selectedBaseline = useMemo(
    () => drafts.find((row) => row.templateId === selectedTemplateId),
    [drafts, selectedTemplateId],
  );

  const selectedTemplate = useMemo(
    () => DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === selectedTemplateId),
    [selectedTemplateId],
  );

  useEffect(() => {
    if (!selectedBaseline) return;
    if (loadedTemplateIdRef.current === selectedTemplateId) return;
    loadedTemplateIdRef.current = selectedTemplateId;
    setDraft({
      ...selectedBaseline,
      serviceIds: selectedBaseline.serviceIds.slice(0, 1),
    });
    const snapshot = selectedBaseline.librarySnapshot;
    setImageInserts({
      ownerPhotoUrl: snapshot?.ownerPhotoUrl,
      salonLogoUrl: snapshot?.salonLogoUrl,
      serviceImageUrl: snapshot?.serviceImageUrl,
    });
    setSaveSuccess(false);
    setStatus(null);
  }, [selectedBaseline, selectedTemplateId]);

  const tokenContext = useMemo(
    () => ({
      ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
      salonName: salonName || INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
      providerName: ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
    }),
    [ownerName, salonName],
  );

  const livePricing = useMemo(() => {
    if (!draft) return null;
    const addonPriceById = addonPriceByServiceId[draft.serviceIds[0] ?? ""];
    return calculateInvitationPackagePricing({
      serviceIds: draft.serviceIds,
      serviceOptionIds: draft.serviceOptionIds,
      servicePriceById,
      addonPriceById,
      savingsAmount: draft.savingsAmount ?? 0,
      inviteType: selectedTemplate?.inviteType,
    });
  }, [addonPriceByServiceId, draft, selectedTemplate, servicePriceById]);

  const previewSnapshot = useMemo(() => {
    if (!draft || !livePricing) return null;
    return buildDraftInviteSnapshot(draft, {
      ownerName: ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
      salonName,
      ownerPhotoUrl: imageInserts.ownerPhotoUrl,
      salonLogoUrl: imageInserts.salonLogoUrl,
      serviceImageUrl: imageInserts.serviceImageUrl,
      totalValue: livePricing.totalValue,
      savingsAmount: livePricing.savingsAmount,
      offerPrice: livePricing.offerPrice,
      valueLabel: livePricing.valueLabel,
      priceLabel: livePricing.priceLabel,
    });
  }, [draft, imageInserts, livePricing, ownerName, salonName]);

  function patchDraft(patch: Partial<NailTemplateDraft>) {
    setSaveSuccess(false);
    setStatus(null);
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function handleImageInsertsChange(next: SalonInviteImageInserts) {
    setSaveSuccess(false);
    setStatus(null);
    setImageInserts(next);
  }

  async function handleSaveToLibrary() {
    if (!draft || !salonId || !previewSnapshot) return;
    setBusy(true);
    setStatus(null);
    const snapshot = {
      ...previewSnapshot,
      status: "library" as const,
      version: previewSnapshot.version > 0 ? previewSnapshot.version : 1,
    };
    const res = await fetch("/api/vmb/invite-library/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: draft.templateId,
        offer: nailTemplateDraftToOffer(draft, salonId, snapshot),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; copyId?: string };
    setBusy(false);
    if (data.ok) {
      setReviewOpen(false);
      setSaveSuccess(true);
      setDraft((current) =>
        current ? { ...current, saved: true, librarySnapshot: snapshot } : current,
      );
      void reload();
    } else {
      setSaveSuccess(false);
      setStatus(data.error ?? "Save failed.");
    }
  }

  async function handleReset() {
    if (!draft || !salonId) return;
    const baseline = baselineNailTemplateDraft(draft.templateId);
    if (!baseline) return;
    setBusy(true);
    setStatus(null);
    setSaveSuccess(false);
    setDraft({ ...baseline, saved: false });
    setImageInserts(EMPTY_SALON_INVITE_IMAGE_INSERTS);

    if (selectedBaseline?.saved) {
      await fetch(
        `/api/vmb/offers?offerId=${encodeURIComponent(nailTemplateDraftToOffer(draft, salonId).id)}`,
        { method: "DELETE" },
      );
    }

    setBusy(false);
    setStatus("Reset to default template.");
    loadedTemplateIdRef.current = null;
    void reload();
  }

  if (!salonId) {
    return (
      <AdminBuilderShell title="Nails Template Builder" activeStep="builder">
        <p className="vmb-admin-builder-grid__status">
          Sign in to a VMB salon trial to build invitation templates.
        </p>
      </AdminBuilderShell>
    );
  }

  return (
    <AdminBuilderShell
      title="Nails Template Builder"
      subtitle="Workbench for creating and refining invitation assets — save finished versions to Library."
      activeStep="builder"
    >
      <div className="vmb-admin-builder-grid">
        <aside className="vmb-admin-builder-grid__list">
          <p className="vmb-admin-builder-grid__list-label">Invite types</p>
          <ul>
            {drafts.map((row) => (
              <li key={row.templateId}>
                <button
                  type="button"
                  className={`vmb-admin-builder-grid__type${selectedTemplateId === row.templateId ? " vmb-admin-builder-grid__type--active" : ""}`}
                  onClick={() => {
                    loadedTemplateIdRef.current = null;
                    setSelectedTemplateId(row.templateId);
                  }}
                >
                  {row.displayName}
                  {row.saved ? (
                    <span className="vmb-admin-builder-grid__override-dot" aria-label="In library" />
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
                key={draft.templateId}
                serviceIds={draft.serviceIds}
                serviceOptionIds={draft.serviceOptionIds}
                savingsAmount={draft.savingsAmount ?? 0}
                onServiceIdsChange={(serviceIds) => patchDraft({ serviceIds })}
                onServiceOptionIdsChange={(serviceOptionIds) => patchDraft({ serviceOptionIds })}
                onSavingsAmountChange={(savingsAmount) => patchDraft({ savingsAmount })}
              />

              {selectedTemplate && livePricing ? (
                <OfferPricingSummary
                  serviceIds={draft.serviceIds}
                  serviceOptionIds={draft.serviceOptionIds}
                  expirationLabel={selectedTemplate.defaultPackage.expirationLabel}
                  pricing={livePricing}
                  serviceFallbackById={serviceFallbackById}
                  rewardFallbackById={optionFallbackById}
                  servicePriceById={servicePriceById}
                  addonPriceById={addonPriceByServiceId[draft.serviceIds[0] ?? ""]}
                />
              ) : null}

              <BuilderImageInsertsSection inserts={imageInserts} onChange={handleImageInsertsChange} />

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
              {saveSuccess ? (
                <div className="vmb-admin-builder-grid__save-success">
                  <p className="vmb-admin-builder-grid__status vmb-admin-builder-grid__status--success">
                    ✓ Saved to Library and sent to Salon Review
                  </p>
                  <Link
                    href={libraryRouteForTemplate(draft.templateId)}
                    className="vmb-admin-builder-grid__save-link"
                  >
                    View in Library
                  </Link>
                </div>
              ) : status ? (
                <p className="vmb-admin-builder-grid__status">{status}</p>
              ) : null}
            </>
          ) : null}
        </section>

        <aside className="vmb-admin-builder-grid__preview">
          <SnapshotPreviewCard
            snapshot={previewSnapshot}
            tokenContext={tokenContext}
            serviceFallbackById={serviceFallbackById}
            rewardFallbackById={optionFallbackById}
          />
        </aside>
      </div>

      {previewSnapshot && draft ? (
        <AdminTemplateReviewModal
          open={reviewOpen}
          snapshot={previewSnapshot}
          active={draft.active}
          tokenContext={tokenContext}
          serviceFallbackById={serviceFallbackById}
          rewardFallbackById={optionFallbackById}
          busy={busy}
          onClose={() => setReviewOpen(false)}
          onSave={() => void handleSaveToLibrary()}
        />
      ) : null}
    </AdminBuilderShell>
  );
}
