"use client";

import type { StudioInstagramProofCard } from "@/lib/studios/studioProofCard";
import {
  STUDIO_TESTIMONY_FEEDBACK_1_EXPECTED_PATH,
  STUDIO_TESTIMONY_FEEDBACK_1_SRC,
  STUDIO_TESTIMONY_FEEDBACK_2_EXPECTED_PATH,
  STUDIO_TESTIMONY_FEEDBACK_2_SRC,
} from "@/lib/studios/studioIntroVideo";
import { STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";
import { StudioProofMiniVideo } from "@/components/studios/StudioProofMiniVideo";

export type StudioProofCardProps = {
  card: StudioInstagramProofCard;
  mode: "admin-template" | "builder" | "public";
  onEdit?: () => void;
  onReplace?: () => void;
  onDelete?: () => void;
};

function categoryLabel(category: string): string {
  return category.replace(/-/g, " ");
}

function testimonyExpectedHint(videoUrl: string): string {
  const normalized = videoUrl.trim();
  if (normalized === STUDIO_TESTIMONY_FEEDBACK_1_SRC) {
    return STUDIO_TESTIMONY_FEEDBACK_1_EXPECTED_PATH;
  }
  if (normalized === STUDIO_TESTIMONY_FEEDBACK_2_SRC) {
    return STUDIO_TESTIMONY_FEEDBACK_2_EXPECTED_PATH;
  }
  const tail = normalized.replace(/^\/uploads\//, "").split("?")[0] ?? "";
  try {
    return `public/uploads/${decodeURIComponent(tail)}`;
  } catch {
    return `public/uploads/${tail}`;
  }
}

export function StudioProofCard({ card, mode, onEdit, onReplace, onDelete }: StudioProofCardProps) {
  const showControls = mode === "admin-template";
  const showReplace = mode === "builder" && card.isSample;
  const showSampleBadge = card.isSample && (mode === "builder" || mode === "public");
  const showViewPost = Boolean(card.instagramUrl?.trim());

  const img = card.imageUrl?.trim();
  const testimony = card.testimonyVideoUrl?.trim();
  const testimonyThumb =
    testimony && !testimony.includes("#") ? `${testimony}#t=0.001` : testimony;

  const cardSurfaceInteractive = mode === "builder" || mode === "public";

  const handleCardActivate = () => {
    if (!cardSurfaceInteractive) return;
    // TODO: Open visitor message/action modal for sample proof cards.
    console.log("[studio proof card clicked]", card.id, card.category);
  };

  return (
    <article
      onClick={cardSurfaceInteractive ? handleCardActivate : undefined}
      className={`flex min-w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] ${
        cardSurfaceInteractive ? "cursor-pointer transition hover:shadow-[0_12px_36px_-14px_rgba(0,0,0,0.12)]" : ""
      }`}
      style={{ borderColor: STUDIOS_LINE }}
    >
      {img ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary creator URLs */}
          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: STUDIOS_MUTED }}>
            {categoryLabel(card.category)}
          </p>
          {showSampleBadge ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-200/90">
              Sample
            </span>
          ) : null}
        </div>

        <blockquote className="m-0 text-[15px] leading-relaxed" style={{ color: STUDIOS_INK }}>
          “{card.quote}”
        </blockquote>
        <p className="m-0 text-sm font-semibold" style={{ color: STUDIOS_INK }}>
          — {card.name}
        </p>

        {testimony && testimonyThumb ? (
          <div className="w-full" onClick={(e) => e.stopPropagation()}>
            <StudioProofMiniVideo
              videoSrc={testimony}
              thumbSrc={testimonyThumb}
              modalTitle={`${card.name} — testimony`}
              expectedFileHint={testimonyExpectedHint(testimony)}
              thumbAriaLabel={`Play ${card.name} testimony video`}
            />
          </div>
        ) : null}

        {showViewPost ? (
          <a
            href={card.instagramUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex text-sm font-semibold text-stone-900 underline decoration-stone-400 underline-offset-4 hover:text-stone-700"
            onClick={(e) => e.stopPropagation()}
          >
            View post ↗
          </a>
        ) : null}

        {showControls ? (
          <div className="mt-2 flex flex-wrap gap-2 border-t border-black/[0.06] pt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-800 hover:bg-stone-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-red-900 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        ) : null}

        {showReplace ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReplace?.();
            }}
            className="mt-2 rounded-full bg-stone-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white hover:bg-stone-800"
          >
            Replace with my post
          </button>
        ) : null}
      </div>
    </article>
  );
}
