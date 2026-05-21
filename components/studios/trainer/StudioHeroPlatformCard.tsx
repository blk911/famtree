"use client";

import type { HeroOsTriadCard } from "@/lib/studios/communityOsHeroCopy";
import { STUDIOS_INK } from "@/lib/studios/visual";
import { StudioHeroVideoSlot } from "./StudioHeroVideoSlot";

/** One hero triad column — shared premium layout for all three platform lenses. */
export function StudioHeroPlatformCard({
  card,
  headingId,
}: {
  card: HeroOsTriadCard;
  headingId?: string;
}) {
  return (
    <article className="flex h-full min-h-0 w-full flex-col">
      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">{card.eyebrow}</p>

      <div className="mt-3 w-full shrink-0">
        <StudioHeroVideoSlot
          fitParentWidth
          videoSrc={card.video.videoSrc}
          thumbSrc={card.video.thumbSrc}
          foldImageUrl={card.foldImageUrl}
          modalTitle={card.video.modalTitle}
          overlayPrimary={card.video.overlayPrimary}
          overlaySecondary={card.video.overlaySecondary}
          expectedFileHint={card.video.expectedFileHint}
          thumbPlayAriaLabel={card.video.thumbPlayAriaLabel}
          cinemaAriaLabel={card.video.cinemaAriaLabel}
        />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-0">
        <h2
          id={headingId}
          className="m-0 text-[1.35rem] font-bold leading-[1.15] tracking-[-0.02em] text-stone-900 md:text-[1.5rem]"
          style={{ color: STUDIOS_INK }}
        >
          {card.title}
        </h2>

        <div className="mt-2.5 space-y-1.5">
          {card.subcopy.map((line) => (
            <p
              key={line}
              className={`m-0 leading-snug text-stone-600 ${
                card.subcopy.length > 1 && line === card.subcopy[0]
                  ? "text-[15px] font-medium text-stone-700"
                  : "text-[14px]"
              }`}
            >
              {line}
            </p>
          ))}
        </div>

        <ul className="m-0 mt-3.5 flex list-none flex-col gap-2 p-0">
          {card.benefits.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[13px] leading-snug text-stone-600">
              <span className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-stone-400" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
