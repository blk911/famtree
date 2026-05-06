"use client";

import {
  HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC,
  HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_THUMB_SRC,
  STUDIOS_COMMUNITY_CLIP_EXPECTED_PATH,
} from "@/lib/studios/studioIntroVideo";
import { StudioHeroVideoSlot } from "./StudioHeroVideoSlot";

/** Right-column hero clip — private-network Studios story (cinema same as owner intro). */
export function StudioHeroHaileyTestimonial({ foldImageUrl }: { foldImageUrl: string }) {
  return (
    <div className="relative flex min-h-0 w-full max-w-[280px] flex-col scroll-mt-24">
      <StudioHeroVideoSlot
        videoSrc={HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC}
        thumbSrc={HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_THUMB_SRC}
        foldImageUrl={foldImageUrl}
        modalTitle="Private network in Studios"
        overlayPrimary="Tap › · Your private network"
        overlaySecondary="Studios · community lens"
        expectedFileHint={STUDIOS_COMMUNITY_CLIP_EXPECTED_PATH}
        thumbPlayAriaLabel="Play private network in Studios clip"
        cinemaAriaLabel="Private network in Studios video playback"
      />
      <p className="mt-3 max-w-[280px] text-[11px] leading-snug text-stone-500">
        Community lens — shares how training lands for a real client.
      </p>
    </div>
  );
}
