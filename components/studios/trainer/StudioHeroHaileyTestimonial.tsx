"use client";

import { RIGHT_HERO_VIDEO } from "@/lib/studios/communityPlatformCopy";
import {
  HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC,
  HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_THUMB_SRC,
  STUDIOS_COMMUNITY_CLIP_EXPECTED_PATH,
} from "@/lib/studios/studioIntroVideo";
import { StudioHeroVideoSlot } from "./StudioHeroVideoSlot";

/** Right-column hero clip — why private communities matter (emotional / philosophical). */
export function StudioHeroHaileyTestimonial({ foldImageUrl }: { foldImageUrl: string }) {
  return (
    <div className="relative flex min-h-0 w-full max-w-[280px] flex-col scroll-mt-24">
      <StudioHeroVideoSlot
        videoSrc={HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC}
        thumbSrc={HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_THUMB_SRC}
        foldImageUrl={foldImageUrl}
        modalTitle={RIGHT_HERO_VIDEO.modalTitle}
        overlayPrimary={RIGHT_HERO_VIDEO.overlayPrimary}
        overlaySecondary={RIGHT_HERO_VIDEO.overlaySecondary}
        expectedFileHint={STUDIOS_COMMUNITY_CLIP_EXPECTED_PATH}
        thumbPlayAriaLabel={RIGHT_HERO_VIDEO.thumbPlayAriaLabel}
        cinemaAriaLabel={RIGHT_HERO_VIDEO.cinemaAriaLabel}
      />
      <p className="mt-3 max-w-[280px] text-[11px] leading-snug text-stone-500">{RIGHT_HERO_VIDEO.footer}</p>
    </div>
  );
}
