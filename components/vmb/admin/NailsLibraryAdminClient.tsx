"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { AdminSalonInviteReviewModal } from "@/components/vmb/admin/AdminSalonInviteReviewModal";
import { useNailTemplateInventory } from "@/components/vmb/admin/useNailTemplateInventory";
import {
  builderRouteForTemplate,
  NAILS_TEMPLATE_BUILDER_ROUTE,
} from "@/lib/vmb/admin/nail-template-routes";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";
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
  const [publishBusy, setPublishBusy] = useState(false);

  const savedDrafts = useMemo(() => drafts.filter((row) => row.saved), [drafts]);

  const selected = useMemo(
    () => savedDrafts.find((row) => row.templateId === selectedTemplateId) ?? savedDrafts[0] ?? null,
    [savedDrafts, selectedTemplateId],
  );

  const librarySnapshot = selected?.librarySnapshot ?? null;

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
    const res = await fetch("/api/vmb/invite-library/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selected.templateId }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      copy?: { id: string; publishedVersion: number };
    };
    setPublishBusy(false);
    if (data.ok && data.copy) {
      setPublishStatus(
        `Published to salon inventory — v${data.copy.publishedVersion} (${data.copy.id}).`,
      );
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
              {savedDrafts.map((row) => (
                <li key={row.templateId}>
                  <button
                    type="button"
                    className={`vmb-admin-builder-grid__type${selected?.templateId === row.templateId ? " vmb-admin-builder-grid__type--active" : ""}`}
                    onClick={() => setSelectedTemplateId(row.templateId)}
                  >
                    {row.displayName}
                    <span className="vmb-admin-builder-grid__override-dot" aria-label="In library" />
                  </button>
                </li>
              ))}
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
