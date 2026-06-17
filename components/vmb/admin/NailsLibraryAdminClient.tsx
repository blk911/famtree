"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { AdminSalonInviteReviewModal } from "@/components/vmb/admin/AdminSalonInviteReviewModal";
import { useNailTemplateInventory } from "@/components/vmb/admin/useNailTemplateInventory";
import { buildDraftInviteSnapshot } from "@/lib/vmb/admin/nail-template-library";
import {
  builderRouteForTemplate,
  NAILS_TEMPLATE_BUILDER_ROUTE,
} from "@/lib/vmb/admin/nail-template-routes";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";
import {
  formatSnapshotStatus,
  formatSnapshotUpdatedAt,
  resolveSnapshotRewardLabels,
  resolveSnapshotServiceLabels,
} from "@/lib/vmb/invites/invite-template-snapshot";
import { createSalonLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";

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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);

  const selected = useMemo(
    () => drafts.find((row) => row.templateId === selectedTemplateId) ?? null,
    [drafts, selectedTemplateId],
  );

  const tokenContext = useMemo(
    () => ({
      ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
      salonName: salonName || INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
      providerName: ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
    }),
    [ownerName, salonName],
  );

  const librarySnapshot = useMemo(() => {
    if (!selected) return null;
    if (selected.librarySnapshot) return selected.librarySnapshot;
    return buildDraftInviteSnapshot(selected, {
      ownerName: ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
      salonName,
    });
  }, [ownerName, salonName, selected]);

  const previewServiceNames = useMemo(() => {
    if (!librarySnapshot) return [];
    return resolveSnapshotServiceLabels(librarySnapshot, serviceFallbackById);
  }, [librarySnapshot, serviceFallbackById]);

  const previewRewardLabels = useMemo(() => {
    if (!librarySnapshot) return [];
    return resolveSnapshotRewardLabels(librarySnapshot, optionFallbackById);
  }, [librarySnapshot, optionFallbackById]);

  const savedCount = drafts.filter((row) => row.saved).length;

  function handlePublishToSalons() {
    if (!librarySnapshot || !salonId || !selected?.saved) return;
    const copy = createSalonLocalCopy(librarySnapshot, salonId);
    setPublishStatus(
      `Prepared salon-local copy v${copy.publishedVersion} (${copy.id}). Persistence ships in a later phase.`,
    );
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
      subtitle="Master inventory — finished invitation assets ready to publish to salons."
      activeStep="library"
      flowActions={
        <Link href={NAILS_TEMPLATE_BUILDER_ROUTE} className="vmb-admin-builder__header-link">
          Open Template Builder
        </Link>
      }
    >
      <div className="vmb-admin-builder-grid vmb-admin-builder-grid--two-col">
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
          {selected && librarySnapshot ? (
            <>
              <h2 className="vmb-admin-builder__panel-title">{librarySnapshot.templateName}</h2>
              <p className="vmb-nails-library__status">
                {selected.saved
                  ? "Finished asset — in master inventory."
                  : "Not saved yet — edit in Template Builder to add to library."}
              </p>

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
                <div>
                  <dt>Headline</dt>
                  <dd>{librarySnapshot.headline}</dd>
                </div>
                <div>
                  <dt>CTA</dt>
                  <dd>{librarySnapshot.ctaLabel}</dd>
                </div>
                <div>
                  <dt>Services</dt>
                  <dd>
                    {previewServiceNames.length > 0 ? previewServiceNames.join(", ") : "None selected"}
                  </dd>
                </div>
                <div>
                  <dt>Rewards</dt>
                  <dd>
                    {previewRewardLabels.length > 0 ? previewRewardLabels.join(", ") : "None selected"}
                  </dd>
                </div>
                <div>
                  <dt>Available</dt>
                  <dd>{selected.active ? "Yes" : "No"}</dd>
                </div>
              </dl>

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
                  disabled={!selected.saved}
                  onClick={handlePublishToSalons}
                >
                  Publish To Salons
                </button>
              </div>
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
