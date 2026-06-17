"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { AdminTemplatePreviewCard } from "@/components/vmb/admin/AdminTemplatePreviewCard";
import { useNailTemplateInventory } from "@/components/vmb/admin/useNailTemplateInventory";
import {
  builderRouteForTemplate,
  NAILS_TEMPLATE_BUILDER_ROUTE,
} from "@/lib/vmb/admin/nail-template-routes";
import {
  resolveNailOfferAddonLabels,
  resolveNailOfferServiceLabels,
} from "@/lib/vmb/admin/nail-offer-builder-selections";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";

type Props = {
  salonId?: string;
  salonName: string;
  ownerName?: string;
  initialTemplateId?: string;
};

export function NailsLibraryAdminClient({
  salonId,
  salonName,
  ownerName,
  initialTemplateId,
}: Props) {
  const { drafts, serviceFallbackById, optionFallbackById } = useNailTemplateInventory(salonId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId ?? DEFAULT_NAIL_INVITE_TEMPLATES[0]!.id,
  );
  const [publishStatus, setPublishStatus] = useState<string | null>(null);

  const selected = useMemo(
    () => drafts.find((row) => row.templateId === selectedTemplateId) ?? null,
    [drafts, selectedTemplateId],
  );

  const previewRewardLabels = useMemo(() => {
    if (!selected) return [];
    return resolveNailOfferAddonLabels(selected.serviceOptionIds, optionFallbackById);
  }, [optionFallbackById, selected]);

  const previewServiceNames = useMemo(() => {
    if (!selected) return [];
    return resolveNailOfferServiceLabels(selected.serviceIds, serviceFallbackById);
  }, [selected, serviceFallbackById]);

  const tokenContext = useMemo(
    () => ({
      ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
      salonName: salonName || INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
      providerName: ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
    }),
    [ownerName, salonName],
  );

  const savedCount = drafts.filter((row) => row.saved).length;

  if (!salonId) {
    return (
      <AdminBuilderShell title="Nails Library" activeStep="library">
        <p className="vmb-admin-builder-grid__status">
          Sign in to a VMB salon trial to view the Nails Library.
        </p>
      </AdminBuilderShell>
    );
  }

  return (
    <AdminBuilderShell
      title="Nails Library"
      subtitle="Master inventory — finished invitation assets ready to publish to salons."
      activeStep="library"
      flowActions={
        <Link href={NAILS_TEMPLATE_BUILDER_ROUTE} className="vmb-admin-builder__header-link">
          Open Template Builder
        </Link>
      }
    >
      <div className="vmb-admin-builder-grid">
        <aside className="vmb-admin-builder-grid__list">
          <p className="vmb-admin-builder-grid__list-label">Nails library</p>
          <p className="vmb-nails-library__count">
            {savedCount} of {drafts.length} in library
          </p>
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
                    <span className="vmb-admin-builder-grid__override-dot" aria-label="In library" />
                  ) : (
                    <span className="vmb-nails-library__draft-tag">Draft</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="vmb-admin-builder-grid__editor vmb-nails-library__detail">
          {selected ? (
            <>
              <h2 className="vmb-admin-builder__panel-title">{selected.displayName}</h2>
              <p className="vmb-nails-library__status">
                {selected.saved
                  ? "Finished asset — in master inventory."
                  : "Not saved yet — edit in Template Builder to add to library."}
              </p>

              <dl className="vmb-nails-library__meta">
                <div>
                  <dt>Headline</dt>
                  <dd>{selected.headline}</dd>
                </div>
                <div className="vmb-nails-library__meta-wide">
                  <dt>Body</dt>
                  <dd>{selected.body}</dd>
                </div>
                <div>
                  <dt>CTA</dt>
                  <dd>{selected.ctaLabel}</dd>
                </div>
                <div>
                  <dt>Services</dt>
                  <dd>
                    {previewServiceNames.length > 0 ? previewServiceNames.join(", ") : "None selected"}
                  </dd>
                </div>
                <div className="vmb-nails-library__meta-wide">
                  <dt>Rewards included</dt>
                  <dd>
                    {previewRewardLabels.length > 0 ? previewRewardLabels.join(", ") : "None selected"}
                  </dd>
                </div>
                <div>
                  <dt>Available to clients</dt>
                  <dd>{selected.active ? "Yes" : "No"}</dd>
                </div>
              </dl>

              <div className="vmb-admin-builder-grid__actions">
                <Link
                  href={builderRouteForTemplate(selected.templateId)}
                  className="taikos-opp-card__cta"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  disabled={!selected.saved}
                  onClick={() =>
                    setPublishStatus("Publish to salons ships in the next phase — salon local copies.")
                  }
                >
                  Publish To Salons
                </button>
              </div>
              {publishStatus ? <p className="vmb-admin-builder-grid__status">{publishStatus}</p> : null}
            </>
          ) : null}
        </section>

        <aside className="vmb-admin-builder-grid__preview">
          <AdminTemplatePreviewCard
            draft={selected}
            rewardLabels={previewRewardLabels}
            tokenContext={tokenContext}
          />
        </aside>
      </div>
    </AdminBuilderShell>
  );
}
