import {
  HERO_PSN_BUSINESS,
  HERO_PSN_EDUCATION,
  HERO_PSN_INTRO,
} from "@/lib/studios/studioIntroVideo";
import type { StudioTemplateType } from "@/types/studios/builder";

export type StudioStackCardId =
  | "private-client-network"
  | "executive-work"
  | "family-learning";

export type StudioStackCardData = {
  id: StudioStackCardId;
  templateType: StudioTemplateType;
  title: string;
  subcopy: string;
  summary: string;
  /** Visual layer: back | middle | front */
  layer: "back" | "middle" | "front";
  accent: string;
  accentSoft: string;
  foldImageUrl: string;
  videoSrc?: string;
  thumbSrc?: string;
  /** Placeholders for future live signals */
  liveActivityLabel?: string | null;
  memberCountLabel?: string | null;
  announcementPreview?: string | null;
  exploreHref: string;
};

export const STUDIO_STACK_CARDS: readonly StudioStackCardData[] = [
  {
    id: "family-learning",
    layer: "back",
    templateType: "family-learning",
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
    exploreHref: "/studios/gap-u",
  },
  {
    id: "executive-work",
    layer: "middle",
    templateType: "executive-work",
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
    id: "private-client-network",
    layer: "front",
    templateType: "private-client-network",
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
] as const;

export function getStudioStackCard(id: StudioStackCardId): StudioStackCardData | undefined {
  return STUDIO_STACK_CARDS.find((c) => c.id === id);
}
