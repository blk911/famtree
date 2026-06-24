"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { AdminSalonInviteReviewModal } from "@/components/vmb/admin/AdminSalonInviteReviewModal";
import { SnapshotPreviewCard } from "@/components/vmb/admin/SnapshotPreviewCard";
import { useNailTemplateInventory } from "@/components/vmb/admin/useNailTemplateInventory";
import {
  builderRouteForTemplate,
  NAILS_TEMPLATE_BUILDER_ROUTE,
} from "@/lib/vmb/admin/nail-template-routes";
import { DEFAULT_NAIL_INVITE_TEMPLATES } from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";
import {
  normalizeSourceTemplateId,
  templateKeysForPublishedCopy,
} from "@/lib/vmb/invites/published-copy-matching";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import type { SalonInviteCopyBackend } from "@/lib/vmb/invites/salon-invite-local-copy-store";
import {
  formatSnapshotUpdatedAt,
  resolveSnapshotRewardLabels,
  resolveSnapshotServiceLabels,
} from "@/lib/vmb/invites/invite-template-snapshot";

type Props = {
  salonId?: string;
  targetSalonToken?: string;
  salonName: string;
  ownerName?: string;
  initialTemplateId?: string;
};

function displayTouchPointName(name: string): string {
  return name === "Private Client Network" ? "Private Client Invite" : name;
}

function formatPublishedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  }).format(date);
}

function publishedCopyForTemplate(
  copies: SalonInviteLocalCopy[],
  templateId: string | undefined,
): SalonInviteLocalCopy | null {
  const normalizedTemplateId = normalizeSourceTemplateId(templateId) ?? templateId;
  if (!normalizedTemplateId) return null;
  return (
    copies.find((copy) => templateKeysForPublishedCopy(copy).includes(normalizedTemplateId)) ?? null
  );
}

function mergePublishedCopy(
  copies: SalonInviteLocalCopy[],
  nextCopy: SalonInviteLocalCopy,
): SalonInviteLocalCopy[] {
  const nextKeys = templateKeysForPublishedCopy(nextCopy);
  return [
    nextCopy,
    ...copies.filter((copy) => {
      const keys = templateKeysForPublishedCopy(copy);
      return !keys.some((key) => nextKeys.includes(key));
    }),
  ];
}

export function NailsLibraryAdminClient({
  salonId,
  targetSalonToken,
  salonName,
  ownerName,
  initialTemplateId,
}: Props) {
  const { drafts, serviceFallbackById, optionFallbackById } = useNailTemplateInventory(
    salonId,
    targetSalonToken,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId ?? DEFAULT_NAIL_INVITE_TEMPLATES[0]!.id,
  );
  const [reviewOpen, setReviewOpen] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [publishedCopies, setPublishedCopies] = useState<SalonInviteLocalCopy[]>([]);
  const [publishBusy, setPublishBusy] = useState(false);

  const savedDrafts = useMemo(() => drafts.filter((row) => row.saved), [drafts]);

  const selected = useMemo(
    () => savedDrafts.find((row) => row.templateId === selectedTemplateId) ?? savedDrafts[0] ?? null,
    [savedDrafts, selectedTemplateId],
  );

  const librarySnapshot = selected?.librarySnapshot ?? null;

  const selectedPublishedCopy = useMemo(
    () => publishedCopyForTemplate(publishedCopies, selected?.templateId),
    [publishedCopies, selected?.templateId],
  );
  const selectedServices = useMemo(
    () => librarySnapshot
      ? resolveSnapshotServiceLabels(librarySnapshot, serviceFallbackById)
      : [],
    [librarySnapshot, serviceFallbackById],
  );
  const selectedRewards = useMemo(
    () => librarySnapshot
      ? resolveSnapshotRewardLabels(librarySnapshot, optionFallbackById)
      : [],
    [librarySnapshot, optionFallbackById],
  );

  useEffect(() => {
    setPublishStatus(null);
  }, [selectedTemplateId]);

  useEffect(() => {
    if (!salonId) return;
    let cancelled = false;
    async function loadPublishedCopies() {
      const query = targetSalonToken
        ? `?salonToken=${encodeURIComponent(targetSalonToken)}`
        : "";
      const res = await fetch(`/api/vmb/salon-invites${query}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; copies?: SalonInviteLocalCopy[] };
      if (!cancelled && data.ok && Array.isArray(data.copies)) {
        setPublishedCopies(data.copies);
      }
    }
    void loadPublishedCopies();
    return () => {
      cancelled = true;
    };
  }, [salonId, targetSalonToken]);

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
      body: JSON.stringify({ templateId: selected.templateId, salonToken: targetSalonToken }),
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
      setPublishedCopies((copies) => mergePublishedCopy(copies, data.copy!));
      setPublishStatus(null);
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
                const assetPricing = row.librarySnapshot;
                const rowPublishedCopy = publishedCopyForTemplate(publishedCopies, row.templateId);
                const isPublished = Boolean(rowPublishedCopy);
                return (
                <li key={row.templateId}>
                  <button
                    type="button"
                    className={`vmb-admin-builder-grid__type${selected?.templateId === row.templateId ? " vmb-admin-builder-grid__type--active" : ""}`}
                    onClick={() => setSelectedTemplateId(row.templateId)}
                  >
                    <span className="vmb-nails-library__asset-title">
                      {displayTouchPointName(row.displayName)}
                    </span>
                    {assetPricing?.valueLabel && assetPricing.priceLabel ? (
                      <span className="vmb-nails-library__asset-pricing">
                        Value {assetPricing.valueLabel} · Offer {assetPricing.priceLabel}
                      </span>
                    ) : null}
                    <span
                      className={`vmb-admin-builder-grid__override-dot${isPublished ? " vmb-admin-builder-grid__override-dot--published" : ""}`}
                      aria-label={isPublished ? "Published" : "In library"}
                    />
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
              <div className="vmb-nails-library__review-head">
                <div>
                  <p className="vmb-nails-library__eyebrow">Saved admin default</p>
                  <h2 className="vmb-admin-builder__panel-title">{displayTouchPointName(librarySnapshot.templateName)}</h2>
                  <p className="vmb-nails-library__status">
                    This frozen Library snapshot is what publishes into salon-owned invite copies.
                  </p>
                </div>
                <span className={selectedPublishedCopy ? "vmb-nails-library__pill vmb-nails-library__pill--published" : "vmb-nails-library__pill"}>
                  {selectedPublishedCopy
                    ? `Published ${formatPublishedDate(selectedPublishedCopy.createdAt)}`
                    : "In library"}
                </span>
              </div>

              <div className="vmb-nails-library__review-grid">
                <SnapshotPreviewCard
                  snapshot={librarySnapshot}
                  tokenContext={tokenContext}
                  serviceFallbackById={serviceFallbackById}
                  rewardFallbackById={optionFallbackById}
                  label="Default invite render"
                />
                <aside className="vmb-nails-library__summary-card">
                  <p className="vmb-nails-library__summary-title">Default package</p>
                  <dl className="vmb-nails-library__summary-list">
                    <div>
                      <dt>Touch point</dt>
                      <dd>{displayTouchPointName(librarySnapshot.templateName)}</dd>
                    </div>
                    <div>
                      <dt>Service</dt>
                      <dd>{selectedServices.join(" · ") || "No service selected"}</dd>
                    </div>
                    <div>
                      <dt>Level up with</dt>
                      <dd>{selectedRewards.join(" · ") || "No level-up selected"}</dd>
                    </div>
                    <div>
                      <dt>Value</dt>
                      <dd>{librarySnapshot.valueLabel ?? "—"}</dd>
                    </div>
                    {(librarySnapshot.savingsAmount ?? 0) > 0 ? (
                      <div>
                        <dt>Savings</dt>
                        <dd>${librarySnapshot.savingsAmount!.toLocaleString()}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Offer</dt>
                      <dd>{librarySnapshot.priceLabel ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Version</dt>
                      <dd>v{librarySnapshot.version} · Updated {formatSnapshotUpdatedAt(librarySnapshot)}</dd>
                    </div>
                  </dl>
                </aside>
              </div>

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
