import {
  STUDIO_TESTIMONY_FEEDBACK_1_SRC,
  STUDIO_TESTIMONY_FEEDBACK_2_SRC,
  STUDIO_TESTIMONY_FEEDBACK_3_SRC,
  STUDIO_TESTIMONY_FEEDBACK_4_SRC,
} from "@/lib/studios/studioIntroVideo";

export type StudioProofCardSource = "template" | "member";

export type StudioInstagramProofCardCategory =
  | "client-moment"
  | "testimonial"
  | "transformation"
  | "group"
  | "community"
  | "performance"
  | "recovery";

const KNOWN_CATEGORIES: readonly StudioInstagramProofCardCategory[] = [
  "client-moment",
  "testimonial",
  "transformation",
  "group",
  "community",
  "performance",
  "recovery",
];

export type StudioInstagramProofCard = {
  id: string;
  type: "instagram";
  source: StudioProofCardSource;
  isSample: boolean;
  name: string;
  quote: string;
  instagramUrl: string;
  imageUrl?: string;
  /** Optional `/uploads/...` MP4 — thumbnail + modal in Private Client Feedback cards. */
  testimonyVideoUrl?: string;
  category: StudioInstagramProofCardCategory;
};

/** Default sample rows for Deb / neutral starters (`deb-dazzle-template`, fitness, neutral). */
export const DEFAULT_SAMPLE_INSTAGRAM_PROOF_CARDS: StudioInstagramProofCard[] = [
  {
    id: "sample-proof-1",
    type: "instagram",
    source: "template",
    isSample: true,
    category: "client-moment",
    name: "Lauren T.",
    quote: "I finally understood what to work on between sessions.",
    instagramUrl: "https://instagram.com/",
    testimonyVideoUrl: STUDIO_TESTIMONY_FEEDBACK_1_SRC,
  },
  {
    id: "sample-proof-2",
    type: "instagram",
    source: "template",
    isSample: true,
    category: "community",
    name: "Brandon R.",
    quote: "The evening group gave me structure, accountability, and a reason to show up.",
    instagramUrl: "https://instagram.com/",
    testimonyVideoUrl: STUDIO_TESTIMONY_FEEDBACK_2_SRC,
  },
  {
    id: "sample-proof-3",
    type: "instagram",
    source: "template",
    isSample: true,
    category: "performance",
    name: "Jordan P.",
    quote: "My body feels stronger, more balanced, and better prepared for golf.",
    instagramUrl: "https://instagram.com/",
    testimonyVideoUrl: STUDIO_TESTIMONY_FEEDBACK_3_SRC,
  },
  {
    id: "sample-proof-4",
    type: "instagram",
    source: "template",
    isSample: true,
    category: "recovery",
    name: "Marshall",
    quote: "The recovery work changed how my runs felt within two weeks.",
    instagramUrl: "https://instagram.com/",
    testimonyVideoUrl: STUDIO_TESTIMONY_FEEDBACK_4_SRC,
  },
];

export function isValidInstagramProofUrl(url: string): boolean {
  const t = url.trim();
  return /^https:\/\/(www\.)?instagram\.com(\/.*)?$/i.test(t);
}

export function sanitizeProofCard(raw: unknown): StudioInstagramProofCard {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_SAMPLE_INSTAGRAM_PROOF_CARDS[0],
      id: "sanitized-fallback",
    };
  }
  const o = raw as Record<string, unknown>;
  const imageRaw = o.imageUrl;
  const imageUrl = typeof imageRaw === "string" && imageRaw.trim().length > 0 ? imageRaw.trim() : undefined;
  const testimonyRaw = o.testimonyVideoUrl;
  const testimonyVideoUrl =
    typeof testimonyRaw === "string" && testimonyRaw.trim().length > 0 ? testimonyRaw.trim() : undefined;
  const cat = o.category;
  const category: StudioInstagramProofCardCategory =
    typeof cat === "string" && (KNOWN_CATEGORIES as readonly string[]).includes(cat)
      ? (cat as StudioInstagramProofCardCategory)
      : "client-moment";

  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : `proof-${Date.now()}`,
    type: "instagram",
    source: o.source === "member" ? "member" : "template",
    isSample: Boolean(o.isSample),
    name: typeof o.name === "string" ? o.name : "",
    quote: typeof o.quote === "string" ? o.quote : "",
    instagramUrl: typeof o.instagramUrl === "string" ? o.instagramUrl.trim() : "",
    imageUrl,
    testimonyVideoUrl,
    category,
  };
}

export function proofCardsFromTemplate(raw: unknown): StudioInstagramProofCard[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeProofCard);
}
