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
        modalTitle="Client testimony"
        badgeLabel="Testimony 1"
        overlayPrimary="Tap › · Hear the story"
        overlaySecondary="Studios · client voice"
        expectedFileHint={STUDIOS_COMMUNITY_CLIP_EXPECTED_PATH}
        thumbPlayAriaLabel="Play client testimony clip"
        cinemaAriaLabel="Client testimony video playback"
      />
      <p className="mt-3 max-w-[280px] text-[11px] leading-snug text-stone-500">
        Short clip — placeholder thumb from the video; more testimony tiles can follow.
      </p>
    </div>
  );
}
