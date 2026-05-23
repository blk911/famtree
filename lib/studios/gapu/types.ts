/**
 * Gap U live content shapes — swap mock arrays for API payloads later.
 */

export type GapUContentSource = "mock" | "live";

export type GapUPathway = {
  id: string;
  /** Short label shown above the card title, e.g. “Pillar 1”. */
  pillarLabel: string;
  title: string;
  lede: string;
  bullets: string[];
  ctaLabel: string;
  /** In-app route under `/studios/gap-u/*` — keep users in the Studio surface. */
  href: string;
};

export type GapUAnnouncement = {
  id: string;
  postedAt: string;
  title: string;
  body: string;
  audience: "all" | "parents" | "tutors" | "members";
};

export type GapUEvent = {
  id: string;
  startsAt: string;
  title: string;
  location: string;
  description: string;
  access: "members" | "invite";
};

export type GapUResource = {
  id: string;
  title: string;
  type: "guide" | "schedule" | "lab" | "policy";
  description: string;
};

export type GapUStudioLiveContent = {
  source: GapUContentSource;
  version: number;
  updatedAt: string;
  hero: {
    eyebrow: string;
    headline: string;
    subcopy: string[];
  };
  pathways: GapUPathway[];
  roadmapPreview: {
    title: string;
    intro: string;
  };
  whyPrivate: {
    title: string;
    intro: string;
    points: Array<{ title: string; body: string }>;
  };
  announcements: GapUAnnouncement[];
  events: GapUEvent[];
  resources: GapUResource[];
};
