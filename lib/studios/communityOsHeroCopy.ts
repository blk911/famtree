/**
 * Agent 90/91 — White-label community OS hero triad.
 * Three lenses on the same platform; only audience, imagery, and messaging differ.
 */

import {
  HERO_PSN_BUSINESS,
  HERO_PSN_EDUCATION,
  HERO_PSN_INTRO,
} from "@/lib/studios/studioIntroVideo";

/** Decorative stills — video placeholder ambience only (Unsplash). */
export const HERO_OS_FOLD_IMAGES = {
  studioNetwork:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=75",
  clientNetwork:
    "https://images.unsplash.com/photo-1560066984-138d983ef2e8?auto=format&fit=crop&w=800&q=75",
  familyLearning:
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=75",
} as const;

export type HeroOsTriadCard = {
  id: "studio-network" | "client-network" | "family-learning";
  eyebrow: string;
  title: string;
  /** One or more outcome-driven lines under the title. */
  subcopy: readonly string[];
  benefits: readonly string[];
  foldImageUrl: string;
  video: {
    videoSrc: string;
    thumbSrc: string;
    modalTitle: string;
    overlayPrimary: string;
    overlaySecondary: string;
    expectedFileHint: string;
    thumbPlayAriaLabel: string;
    cinemaAriaLabel: string;
  };
};

export const HERO_OS_TRIAD_CARDS: readonly HeroOsTriadCard[] = [
  {
    id: "studio-network",
    eyebrow: "Private member network",
    title: "Private Studio Network",
    subcopy: [
      "Your people. Your updates. Your private network.",
      "Focused communication without public social media chaos.",
    ],
    benefits: [
      "Invite-only member access",
      "Videos, updates, and announcements in one place",
      "Organize events, schedules, and resources",
      "Build stronger engagement through trusted connection",
    ],
    foldImageUrl: HERO_OS_FOLD_IMAGES.studioNetwork,
    video: {
      videoSrc: HERO_PSN_INTRO.videoSrc,
      thumbSrc: HERO_PSN_INTRO.thumbSrc,
      modalTitle: "Private Studio Network",
      overlayPrimary: "Tap › · Private member network",
      overlaySecondary: "Invite-only · your people",
      expectedFileHint: HERO_PSN_INTRO.expectedFileHint,
      thumbPlayAriaLabel: "Play Private Studio Network overview",
      cinemaAriaLabel: "Private Studio Network video playback",
    },
  },
  {
    id: "client-network",
    eyebrow: "Private client community",
    title: "Private Client Network",
    subcopy: ["Turn trusted client relationships into a focused private community."],
    benefits: [
      "Updates and announcements",
      "Bookings and shared resources",
      "Direct client communication",
      "Member-only offers",
      "Referrals and engagement",
    ],
    foldImageUrl: HERO_OS_FOLD_IMAGES.clientNetwork,
    video: {
      videoSrc: HERO_PSN_BUSINESS.videoSrc,
      thumbSrc: HERO_PSN_BUSINESS.thumbSrc,
      modalTitle: "Private Client Network",
      overlayPrimary: "Tap › · Private client community",
      overlaySecondary: "Trusted relationships · one place",
      expectedFileHint: HERO_PSN_BUSINESS.expectedFileHint,
      thumbPlayAriaLabel: "Play Private Client Network overview",
      cinemaAriaLabel: "Private Client Network video playback",
    },
  },
  {
    id: "family-learning",
    eyebrow: "Trusted family spaces",
    title: "Family & Learning Spaces",
    subcopy: ["Focused communication for families, students, and trusted groups."],
    benefits: [
      "Family-safe communication",
      "Announcements and events",
      "Shared learning resources",
      "Parent coordination",
      "Private updates and group messaging",
    ],
    foldImageUrl: HERO_OS_FOLD_IMAGES.familyLearning,
    video: {
      videoSrc: HERO_PSN_EDUCATION.videoSrc,
      thumbSrc: HERO_PSN_EDUCATION.thumbSrc,
      modalTitle: "Family & Learning Spaces",
      overlayPrimary: "Tap › · Trusted family spaces",
      overlaySecondary: "Safe groups · private updates",
      expectedFileHint: HERO_PSN_EDUCATION.expectedFileHint,
      thumbPlayAriaLabel: "Play Family and Learning Spaces overview",
      cinemaAriaLabel: "Family and Learning Spaces video playback",
    },
  },
] as const;

export function heroOsCardById(id: HeroOsTriadCard["id"]): HeroOsTriadCard {
  return HERO_OS_TRIAD_CARDS.find((c) => c.id === id) ?? HERO_OS_TRIAD_CARDS[0];
}
