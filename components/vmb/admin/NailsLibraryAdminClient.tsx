"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminDefaultPackageSummary } from "@/components/vmb/admin/AdminDefaultPackageSummary";
import { resolveAdminDefaultInvitationPackageWithPricing } from "@/lib/vmb/invite-templates/admin-default-invitation-package";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { AdminSalonInviteReviewModal } from "@/components/vmb/admin/AdminSalonInviteReviewModal";
import { useNailTemplateInventory } from "@/components/vmb/admin/useNailTemplateInventory";
import {
  builderRouteForTemplate,
  NAILS_TEMPLATE_BUILDER_ROUTE,
} from "@/lib/vmb/admin/nail-template-routes";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import type { SalonInviteCopyBackend } from "@/lib/vmb/invites/salon-invite-local-copy-store";
import {
  formatSnapshotStatus,
  formatSnapshotUpdatedAt,
} from "@/lib/vmb/invites/invite-template-snapshot";

type Props = {
  salonId?: string;
  salonName: string;
  ownerName?: string;
  initialTemplateId?: string;
};

type PublishVerification = {
  copy: SalonInviteLocalCopy;
  backend: SalonInviteCopyBackend;
  salonId: string;
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [publishVerification, setPublishVerification] = useState<PublishVerification | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);

  const savedDrafts = useMemo(() => drafts.filter((row) => row.saved), [drafts]);

  const selected = useMemo(
    () => savedDrafts.find((row) => row.templateId === selectedTemplateId) ?? savedDrafts[0] ?? null,
    [savedDrafts, selectedTemplateId],
  );

  const librarySnapshot = selected?.librarySnapshot ?? null;

  const selectedTemplate = useMemo(
    () => DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === selectedTemplateId),
    [selectedTemplateId],
  );

  useEffect(() => {
    setPublishVerification(null);
    setPublishStatus(null);
  }, [selectedTemplateId]);

  const tokenContext = useMemo(
    () => ({
      ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
      salonName: salonName || INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
      providerName: ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
    }),
    [ownerName, salonName],
  );

  async function handlePublishToSalons() {
    if (!librarySnapshot || !salonId || !selected) return;
    setPublishBusy(true);
    setPublishStatus(null);
    setPublishVerification(null);
    const res = await fetch("/api/vmb/invite-library/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selected.templateId }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      copy?: SalonInviteLocalCopy;
      backend?: SalonInviteCopyBackend;
      salonId?: string;
      copyId?: string;
      sourceTemplateId?: string;
      publishedVersion?: number;
    };
    setPublishBusy(false);
    if (data.ok && data.copy && data.backend && data.salonId) {
      setPublishVerification({
        copy: data.copy,
        backend: data.backend,
        salonId: data.salonId,
      });
      setPublishStatus(`Published to salon inventory — v${data.copy.publishedVersion}`);
    } else {
      setPublishStatus(data.error ?? "Publish failed.");
    }
  }

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
      subtitle="Inventory of finished invitation assets — browse, review, and publish to salons."
      activeStep="library"
      flowActions={
        <Link href={NAILS_TEMPLATE_BUILDER_ROUTE} className="vmb-admin-builder__header-link">
          Open Builder
        </Link>
      }
    >
      <div className="vmb-admin-builder-grid vmb-admin-builder-grid--two-col">
        <aside className="vmb-admin-builder-grid__list">
          <p className="vmb-admin-builder-grid__list-label">Library inventory</p>
          <p className="vmb-nails-library__count">
            {savedDrafts.length} asset{savedDrafts.length === 1 ? "" : "s"} in library
          </p>
          {savedDrafts.length === 0 ? (
            <p className="vmb-nails-library__empty">
              No assets saved yet.{" "}
              <Link href={NAILS_TEMPLATE_BUILDER_ROUTE} className="vmb-admin-builder__header-link">
                Open Builder
              </Link>{" "}
              to create library inventory.
            </p>
          ) : (
            <ul>
              {savedDrafts.map((row) => {
                const assetPricing = resolveAdminDefaultInvitationPackageWithPricing(row.templateId)?.pricing;
                return (
                <li key={row.templateId}>
                  <button
                    type="button"
                    className={`vmb-admin-builder-grid__type${selected?.templateId === row.templateId ? " vmb-admin-builder-grid__type--active" : ""}`}
                    onClick={() => setSelectedTemplateId(row.templateId)}
                  >
                    {row.displayName}
                    {assetPricing ? (
                      <span className="vmb-nails-library__asset-pricing">
                        Value {assetPricing.valueLabel} · Offer {assetPricing.priceLabel}
                      </span>
                    ) : null}
                    <span className="vmb-admin-builder-grid__override-dot" aria-label="In library" />
                  </button>
                </li>
              );
              })}
            </ul>
          )}
        </aside>

        <section className="vmb-admin-builder-grid__editor vmb-nails-library__detail">
          {selected && librarySnapshot ? (
            <>
              <h2 className="vmb-admin-builder__panel-title">{librarySnapshot.templateName}</h2>
              <p className="vmb-nails-library__status">Finished asset in master inventory.</p>

              <dl className="vmb-nails-library__meta vmb-nails-library__meta--compact">
                <div>
                  <dt>Template name</dt>
                  <dd>{librarySnapshot.templateName}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{formatSnapshotStatus(librarySnapshot)}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>v{librarySnapshot.version}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatSnapshotUpdatedAt(librarySnapshot)}</dd>
                </div>
              </dl>

              {selectedTemplate ? (
                <AdminDefaultPackageSummary
                  pkg={selectedTemplate.defaultPackage}
                  templateId={selectedTemplate.id}
                  serviceFallbackById={serviceFallbackById}
                  rewardFallbackById={optionFallbackById}
                  title="Admin default package (source)"
                />
              ) : null}

              {librarySnapshot?.valueLabel && librarySnapshot?.priceLabel ? (
                <dl className="vmb-nails-library__meta vmb-nails-library__meta--compact">
                  <div>
                    <dt>Value</dt>
                    <dd>{librarySnapshot.valueLabel}</dd>
                  </div>
                  {(librarySnapshot.savingsAmount ?? 0) > 0 ? (
                    <div>
                      <dt>Savings</dt>
                      <dd>${librarySnapshot.savingsAmount!.toLocaleString()}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Offer</dt>
                    <dd>{librarySnapshot.priceLabel}</dd>
                  </div>
                </dl>
              ) : null}

              <div className="vmb-admin-builder-grid__actions">
                <Link href={builderRouteForTemplate(selected.templateId)} className="taikos-opp-card__cta">
                  Edit in Builder
                </Link>
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  onClick={() => setReviewOpen(true)}
                >
                  Review Final Card
                </button>
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  disabled={publishBusy}
                  onClick={() => void handlePublishToSalons()}
                >
                  {publishBusy ? "Publishing…" : "Publish To Salons"}
                </button>
              </div>
              {publishVerification ? (
                <div className="vmb-nails-library__publish-verify" aria-live="polite">
                  <p className="vmb-nails-library__publish-verify-title">Publish verification</p>
                  <dl>
                    <div>
                      <dt>Salon</dt>
                      <dd>
                        {salonName || publishVerification.salonId} ({publishVerification.salonId})
                      </dd>
                    </div>
                    <div>
                      <dt>Copy</dt>
                      <dd>{publishVerification.copy.id}</dd>
                    </div>
                    <div>
                      <dt>Source template</dt>
                      <dd>{publishVerification.copy.sourceTemplateId}</dd>
                    </div>
                    <div>
                      <dt>Published version</dt>
                      <dd>v{publishVerification.copy.publishedVersion}</dd>
                    </div>
                    <div>
                      <dt>Backend</dt>
                      <dd>{publishVerification.backend}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
              {publishStatus ? <p className="vmb-admin-builder-grid__status">{publishStatus}</p> : null}
            </>
          ) : null}
        </section>
      </div>

      {librarySnapshot ? (
        <AdminSalonInviteReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          snapshot={librarySnapshot}
          tokenContext={tokenContext}
          serviceFallbackById={serviceFallbackById}
          rewardFallbackById={optionFallbackById}
        />
      ) : null}
    </AdminBuilderShell>
  );
}
