"use client";

import type { Provider, StudioOffer } from "@/types/studios";
import type { ApplyStudioIntro } from "@/lib/studios/applyPreview";
import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";

/** Single live renderer for `/studios/[slug]` — optional owner/admin inline edit (same layout as visitors). */
export function StudioPublicPage({
  provider,
  offers,
  storyIntro,
  accentHex,
  navItems,
  showEditControls,
  studioSlug,
}: {
  provider: Provider;
  offers: StudioOffer[];
  storyIntro: ApplyStudioIntro;
  accentHex?: string | null;
  navItems?: readonly { href: string; label: string }[];
  showEditControls: boolean;
  studioSlug: string;
}) {
  return (
    <TrainerStudioShell
      variant="live"
      provider={provider}
      offers={offers}
      accentHex={accentHex ?? undefined}
      liveStoryIntro={storyIntro}
      publicNav={navItems && navItems.length > 0 ? navItems : null}
      inlineEdit={showEditControls}
      studioSlug={studioSlug}
    />
  );
}
