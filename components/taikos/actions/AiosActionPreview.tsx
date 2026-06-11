"use client";

import Link from "next/link";
import { InlineDeliverablePreview } from "@/components/taikos/workflow/InlineDeliverablePreview";
import { actionTypeCreatesDraft } from "@/lib/taikos/drafts/draft-router";
import type { TaikosActionPreviewResult } from "@/lib/taikos/actions/types";

type Props = {
  preview: TaikosActionPreviewResult;
  confirming?: boolean;
  confirmedMessage?: string | null;
  draftId?: string | null;
  draftHref?: string | null;
  draftReviewHint?: string | null;
  queueMessage?: string | null;
  queued?: boolean;
  onConfirm: () => void;
  onEnqueue?: () => void;
  onSkipQueue?: () => void;
  onCancel: () => void;
};

export function AiosActionPreview({
  preview,
  confirming,
  confirmedMessage,
  draftId,
  draftHref,
  draftReviewHint,
  queueMessage,
  queued,
  onConfirm,
  onEnqueue,
  onSkipQueue,
  onCancel,
}: Props) {
  const canQueue = !!draftId && actionTypeCreatesDraft(preview.action.type);

  return (
    <section className="aios-action-preview" aria-label="Action preview">
      <header className="aios-action-preview__head">
        <p className="aios-action-preview__eyebrow">Recommended action</p>
        <h3 className="aios-action-preview__title">{preview.action.label}</h3>
        <p className="aios-action-preview__desc">{preview.action.description}</p>
      </header>

      <InlineDeliverablePreview deliverable={preview.deliverable} />

      {confirmedMessage ? (
        <div className="aios-action-preview__recorded-wrap" role="status">
          <p className="aios-action-preview__recorded">{confirmedMessage}</p>
          {draftReviewHint ? <p className="aios-action-preview__hint">{draftReviewHint}</p> : null}

          {!queued && canQueue ? (
            <div className="taikos-inline-workflow__actions">
              <button type="button" className="taikos-opp-card__cta" onClick={onEnqueue}>
                Add To Queue
              </button>
              <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--secondary" onClick={onSkipQueue}>
                Skip For Now
              </button>
            </div>
          ) : null}

          {queueMessage ? <p className="aios-action-preview__recorded">{queueMessage}</p> : null}

          {draftHref ? (
            <Link href={draftHref} className="aios-action-preview__view-draft">
              View Draft
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="taikos-inline-workflow__actions">
          <button
            type="button"
            className="taikos-opp-card__cta"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Saving…" : "Approve"}
          </button>
          <button
            type="button"
            className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
            onClick={onCancel}
            disabled={confirming}
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}
