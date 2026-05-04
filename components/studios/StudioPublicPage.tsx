"use client";

import Link from "next/link";
import type { Provider, StudioOffer } from "@/types/studios";
import type { ApplyStudioIntro } from "@/lib/studios/applyPreview";
import type { StudioViewerRole } from "@/lib/studio/studioMode";
import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";

/** Single live renderer for `/studios/[slug]` — optional owner/admin edit chrome only. */
export function StudioPublicPage({
  provider,
  offers,
  storyIntro,
  accentHex,
  navItems,
  viewerRole,
  showEditControls,
  studioSlug,
}: {
  provider: Provider;
  offers: StudioOffer[];
  storyIntro: ApplyStudioIntro;
  accentHex?: string | null;
  navItems?: readonly { href: string; label: string }[];
  viewerRole: StudioViewerRole;
  showEditControls: boolean;
  studioSlug: string;
}) {
  const editHref = `/studios/start?from=${encodeURIComponent(studioSlug)}`;

  return (
    <div className="relative">
      {showEditControls ? (
        <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/90 bg-amber-50/98 px-4 py-2.5 backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950/90">
            Studio owner view · {viewerRole}
          </span>
          <Link
            href={editHref}
            className="rounded-full bg-stone-900 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm ring-1 ring-black/10 hover:bg-stone-800"
          >
            Edit Studio
          </Link>
        </div>
      ) : null}
      <TrainerStudioShell
        variant="live"
        provider={provider}
        offers={offers}
        accentHex={accentHex ?? undefined}
        liveStoryIntro={storyIntro}
        publicNav={navItems && navItems.length > 0 ? navItems : null}
      />
    </div>
  );
}
