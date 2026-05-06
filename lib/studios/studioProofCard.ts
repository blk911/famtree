export type StudioProofCardSource = "template" | "member";

export type StudioInstagramProofCardCategory =
  | "client-moment"
  | "testimonial"
  | "transformation"
  | "group";

/** Clean link-card only — no Instagram embed payload. */
export type StudioInstagramProofCard = {
  id: string;
  type: "instagram";
  source: StudioProofCardSource;
  isSample: boolean;
  name: string;
  quote: string;
  instagramUrl: string;
  imageUrl?: string;
  category: StudioInstagramProofCardCategory;
};

/** Default sample row for Deb / neutral starters — matches studio template seed. */
export const DEFAULT_SAMPLE_INSTAGRAM_PROOF_CARDS: StudioInstagramProofCard[] = [
  {
    id: "sample-proof-1",
    type: "instagram",
    source: "template",
    isSample: true,
    name: "Lauren T.",
    quote: "I finally understood what to work on between sessions.",
    instagramUrl: "https://instagram.com/",
    imageUrl: "",
    category: "client-moment",
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
  const cat = o.category;
  const category: StudioInstagramProofCardCategory =
    cat === "testimonial" || cat === "transformation" || cat === "group" || cat === "client-moment"
      ? cat
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
    category,
  };
}

export function proofCardsFromTemplate(raw: unknown): StudioInstagramProofCard[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeProofCard);
}
