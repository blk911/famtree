"use client";

import Link from "next/link";
import { AiosConfirmGate } from "@/components/taikos/actions/AiosConfirmGate";
import { AiosDeliverableCard } from "@/components/taikos/actions/AiosDeliverableCard";
import type { TaikosActionPreviewResult } from "@/lib/taikos/actions/types";

type Props = {
  preview: TaikosActionPreviewResult;
  confirming?: boolean;
  confirmedMessage?: string | null;
  draftHref?: string | null;
  draftReviewHint?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AiosActionPreview({
  preview,
  confirming,
  confirmedMessage,
  draftHref,
  draftReviewHint,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <section className="aios-action-preview" aria-label="Action preview">
      <header className="aios-action-preview__head">
        <p className="aios-action-preview__eyebrow">Recommended action</p>
        <h3 className="aios-action-preview__title">{preview.action.label}</h3>
        <p className="aios-action-preview__desc">{preview.action.description}</p>
      </header>

      <AiosDeliverableCard deliverable={preview.deliverable} />

      {confirmedMessage ? (
        <div className="aios-action-preview__recorded-wrap" role="status">
          <p className="aios-action-preview__recorded">{confirmedMessage}</p>
          {draftReviewHint ? (
            <p className="aios-action-preview__hint">{draftReviewHint}</p>
          ) : null}
          {draftHref ? (
            <Link href={draftHref} className="aios-action-preview__view-draft">
              View Draft
            </Link>
          ) : null}
        </div>
      ) : (
        <AiosConfirmGate
          actionType={preview.action.type}
          confirming={confirming}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </section>
  );
}
