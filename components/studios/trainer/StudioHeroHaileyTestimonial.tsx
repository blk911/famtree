"use client";

import {
  HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC,
  HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_THUMB_SRC,
} from "@/lib/studios/studioIntroVideo";
import { StudioHeroVideoSlot } from "./StudioHeroVideoSlot";

/** Hailey HeyGen community testimonial — same cinema flow as owner intro (hero third column). */
export function StudioHeroHaileyTestimonial({ foldImageUrl }: { foldImageUrl: string }) {
  return (
    <div className="relative flex min-h-0 w-full max-w-[280px] flex-col scroll-mt-24">
      <StudioHeroVideoSlot
        videoSrc={HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC}
        thumbSrc={HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_THUMB_SRC}
        foldImageUrl={foldImageUrl}
        modalTitle="Community testimonial"
        overlayPrimary="Tap › · Hailey's story"
        overlaySecondary="HeyGen · community voice"
        expectedFileHint="public/uploads/Hailey's Community Testimonial_720p_caption.mp4"
        thumbPlayAriaLabel="Play Hailey community testimonial"
        cinemaAriaLabel="Hailey community testimonial playback"
      />
      <p className="mt-3 max-w-[280px] text-[11px] leading-snug text-stone-500">
        Community lens — shares how training lands for a real client.
      </p>
    </div>
  );
}
