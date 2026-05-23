import {
  HERO_PSN_BUSINESS,
  HERO_PSN_EDUCATION,
  HERO_PSN_INTRO,
} from "@/lib/studios/studioIntroVideo";
import type { StudioTemplateType } from "@/types/studios/builder";

export type StudioStackCardId =
  | "private-client-network"
  | "executive-work"
  | "family-learning"
  | "gap-u";

export type StudioStackCardData = {
  id: StudioStackCardId;
  templateType: StudioTemplateType;
  /** Short label for carousel thumbnail / modal eyebrow */
  videoLabel: string;
  title: string;
  subcopy: string;
  summary: string;
  accent: string;
  accentSoft: string;
  foldImageUrl: string;
  videoSrc?: string;
  thumbSrc?: string;
  liveActivityLabel?: string | null;
  memberCountLabel?: string | null;
  announcementPreview?: string | null;
  exploreHref: string;
  /** Primary hero CTA links to exploreHref instead of preview-first behavior */
  preferLiveHeroCta?: boolean;
};

/**
 * Hero carousel order: Private Client → Executive → Family & Learning → Gap U.
 */
export const FEATURED_STUDIO_VIDEO_CARDS: readonly StudioStackCardData[] = [
  {
    id: "private-client-network",
    templateType: "private-client-network",
    videoLabel: "Client Network tour",
    title: "Private Client Network",
    subcopy: "For trainers, salons, wellness, and trusted client communities.",
    summary:
      "Your clients in one private Studio — relationship-first access, not anonymous marketplace traffic.",
    accent: "#b45309",
    accentSoft: "#fffbeb",
    foldImageUrl:
      "https://images.unsplash.com/photo-1560066984-138d983ef2e8?auto=format&fit=crop&w=800&q=75",
    videoSrc: HERO_PSN_BUSINESS.videoSrc,
    thumbSrc: HERO_PSN_BUSINESS.thumbSrc,
    liveActivityLabel: "Updates today",
    memberCountLabel: null,
    announcementPreview: "New member welcome thread",
    exploreHref: "#studios-live",
  },
  {
    id: "executive-work",
    templateType: "executive-work",
    videoLabel: "Executive preview",
    title: "Executive Strategy Space",
    subcopy: "Private communication for focused teams and leadership groups.",
    summary:
      "Confidential member network for leadership peers — invite-only access and governed messaging.",
    accent: "#44403c",
    accentSoft: "#f5f5f4",
    foldImageUrl:
      "https://images.unsplash.com/photo-1521737852567-6949f5f9f967?auto=format&fit=crop&w=800&q=75",
    videoSrc: HERO_PSN_INTRO.videoSrc,
    thumbSrc: HERO_PSN_INTRO.thumbSrc,
    liveActivityLabel: null,
    memberCountLabel: null,
    announcementPreview: "Strategy brief · members only",
    exploreHref: "#studios-live",
  },
  {
    id: "family-learning",
    templateType: "family-learning",
    videoLabel: "Learning Space clip",
    title: "Family & Learning Space",
    subcopy: "Safe coordination for families, tutoring, and modern learning communities.",
    summary:
      "A private learning Studio for parents, tutors, and cohorts — updates and coordination without public social noise.",
    accent: "#9d174d",
    accentSoft: "#fdf2f8",
    foldImageUrl:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=75",
    videoSrc: HERO_PSN_EDUCATION.videoSrc,
    thumbSrc: HERO_PSN_EDUCATION.thumbSrc,
    liveActivityLabel: null,
    memberCountLabel: null,
    announcementPreview: "Parent update · schedule posted",
    exploreHref: "#studios-live",
  },
  {
    id: "gap-u",
    templateType: "gap-u-learning-lab",
    videoLabel: "Gap U Studio",
    title: "Gap U",
    subcopy:
      "Future learning flagship — homeschool pods, invention labs, human mentors, stewarded Spaces.",
    summary:
      "High-school graduation onward: private pathways for families, tutors, and capability labs without public-feed chaos.",
    accent: "#9d174d",
    accentSoft: "#fdf2f8",
    foldImageUrl:
      "https://images.unsplash.com/photo-1581094794329-c8112cde6e61?auto=format&fit=crop&w=800&q=75",
    videoSrc: HERO_PSN_EDUCATION.videoSrc,
    thumbSrc: HERO_PSN_EDUCATION.thumbSrc,
    liveActivityLabel: null,
    memberCountLabel: null,
    announcementPreview: "Future learning · flagship Studio",
    exploreHref: "/studios/gap-u",
    preferLiveHeroCta: true,
  },
] as const;

/** @deprecated Prefer FEATURED_STUDIO_VIDEO_CARDS */
export const STUDIO_STACK_CARDS = FEATURED_STUDIO_VIDEO_CARDS;

const CARD_LOOKUP: Record<StudioStackCardId, StudioStackCardData> = FEATURED_STUDIO_VIDEO_CARDS.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<StudioStackCardId, StudioStackCardData>,
);

export function getStudioStackCard(id: StudioStackCardId): StudioStackCardData | undefined {
  return CARD_LOOKUP[id];
}
