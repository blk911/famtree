"use client";

import {
  HERO_OS_TRIAD_CARDS,
  type HeroOsTriadCard,
} from "@/lib/studios/communityOsHeroCopy";
import { StudioHeroPlatformCard } from "./StudioHeroPlatformCard";

/** Three equal platform lenses — white-label community OS hero. */
export function StudioHeroTriad({
  cardIds,
}: {
  /** Subset for edit mode (center + right columns). */
  cardIds?: readonly HeroOsTriadCard["id"][];
}) {
  const cards = cardIds
    ? cardIds.map((id) => HERO_OS_TRIAD_CARDS.find((c) => c.id === id)).filter((c): c is HeroOsTriadCard => Boolean(c))
    : [...HERO_OS_TRIAD_CARDS];

  const colCount = cards.length;
  const gridClass =
    colCount === 1
      ? "grid-cols-1"
      : colCount === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-3";

  return (
    <div
      data-studio-hero-columns={String(colCount)}
      className={`grid w-full ${gridClass} md:items-stretch`}
    >
      {cards.map((card, index) => (
        <div
          key={card.id}
          className="flex min-h-0 flex-col border-b border-black/[0.06] px-5 py-6 last:border-b-0 md:border-b-0 md:border-r md:px-6 md:py-6 md:last:border-r-0"
        >
          <StudioHeroPlatformCard card={card} headingId={index === 0 ? "studio-public-heading" : undefined} />
        </div>
      ))}
    </div>
  );
}
