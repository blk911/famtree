"use client";

import Link from "next/link";
import { AiosDraftBadge } from "@/components/taikos/drafts/AiosDraftBadge";
import { draftDetailHref } from "@/lib/taikos/drafts/draft-router";
import type { TaikosDraftListItem } from "@/lib/taikos/drafts/types";

type Props = {
  draft: TaikosDraftListItem;
  compact?: boolean;
};

export function AiosDraftCard({ draft, compact }: Props) {
  const href = draftDetailHref(draft.draftType, draft.draftId);
  const created = new Date(draft.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <article className={`aios-draft-card${compact ? " aios-draft-card--compact" : ""}`}>
      <div className="aios-draft-card__head">
        <h4 className="aios-draft-card__title">{draft.title}</h4>
        <AiosDraftBadge draftType={draft.draftType} status={draft.status} />
      </div>
      <p className="aios-draft-card__meta">
        {created}
        {draft.estimatedValue > 0 ? ` · +$${draft.estimatedValue.toLocaleString()}` : ""}
      </p>
      <Link href={href} className="aios-draft-card__view">
        View
      </Link>
    </article>
  );
}
