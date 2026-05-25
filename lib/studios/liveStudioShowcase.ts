/** Curated ecosystem cards — “Live studio pages” showcase (marketing only). */

import { GAP_U_CARD_THUMB_SRC } from "@/lib/studios/gapu/gapuStudioConfig";

export type LiveStudioShowcaseCard = {
  id: string;
  /** Card 1 (Gap U) — slightly elevated treatment on the landing grid */
  featured: boolean;
  categoryLabel: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
};

export const LIVE_STUDIO_SHOWCASE_CARDS: readonly LiveStudioShowcaseCard[] = [
  {
    id: "gap-u",
    featured: true,
    categoryLabel: "FLAGSHIP LEARNING STUDIO",
    title: "Curiosity Lab",
    subtitle: "Future learning • homeschool pods • invention labs • invite-only learning communities",
    ctaLabel: "Explore Gap U →",
    href: "/studios/gap-u",
    imageSrc: GAP_U_CARD_THUMB_SRC,
    imageAlt: "Gap U learning lab flagship — invite-only future learning workspace",
  },
  {
    id: "education",
    featured: false,
    categoryLabel: "EDUCATION",
    title: "Learning & Family Studio",
    subtitle: "Tutors • learning pods • parent communities • private education networks",
    ctaLabel: "View Studio →",
    href: "/studios/learning-family-studio",
    imageSrc:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "Family and collaborators learning together indoors",
  },
  {
    id: "coach",
    featured: false,
    categoryLabel: "TRAIN • COACH • CONSULT",
    title: "Private Client Studio",
    subtitle: "Coaches • trainers • wellness • consultants • trusted client communities",
    ctaLabel: "View Studio →",
    href: "/studios/private-client-studio",
    imageSrc:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "Coach supporting an athlete outdoors",
  },
  {
    id: "executive",
    featured: false,
    categoryLabel: "PRIVATE BUSINESS",
    title: "Executive & Strategy Space",
    subtitle: "Leadership groups • founder rooms • strategic communities • private collaboration",
    ctaLabel: "View Studio →",
    href: "/studios/executive-strategy-space",
    imageSrc:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "Leadership team in focused discussion",
  },
];
