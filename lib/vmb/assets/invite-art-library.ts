import type { InviteArtAsset, InviteArtCategory, InviteArtMood } from "./invite-art-types";

type InviteArtSeed = {
  id: string;
  category: InviteArtCategory;
  title: string;
  pexelsId: number;
  photographer: string;
  sourceUrl: string;
  tags: string[];
  mood?: InviteArtMood;
  featured?: boolean;
};

function pexelsUrl(id: number, width = 900): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

function buildInviteArt(seed: InviteArtSeed): InviteArtAsset {
  return {
    id: seed.id,
    category: seed.category,
    title: seed.title,
    imageUrl: pexelsUrl(seed.pexelsId),
    thumbnailUrl: pexelsUrl(seed.pexelsId, 320),
    photographer: seed.photographer,
    sourceName: "Pexels",
    sourceUrl: seed.sourceUrl,
    tags: seed.tags,
    active: true,
    featured: seed.featured,
    mood: seed.mood,
  };
}

const SOURCES = {
  birthdayGift: {
    pexelsId: 5404193,
    photographer: "June",
    sourceUrl: "https://www.pexels.com/photo/birthday-card-present-and-flowers-5404193/",
  },
  invitationPetals: {
    pexelsId: 29612463,
    photographer: "M1nh Art",
    sourceUrl: "https://www.pexels.com/photo/elegant-wedding-invitation-with-petals-and-rings-29612463/",
  },
  thankYou: {
    pexelsId: 9988768,
    photographer: "Towfiqu barbhuiya",
    sourceUrl: "https://www.pexels.com/photo/thank-you-written-on-paper-9988768/",
  },
  calendarPins: {
    pexelsId: 9810172,
    photographer: "Towfiqu barbhuiya",
    sourceUrl: "https://www.pexels.com/photo/close-up-photo-of-red-pins-on-a-calendar-9810172/",
  },
  roseGift: {
    pexelsId: 13983694,
    photographer: "Boris Hamer",
    sourceUrl: "https://www.pexels.com/photo/a-valentine-s-gift-13983694/",
  },
  pinkRoses: {
    pexelsId: 1233440,
    photographer: "Irina Iriser",
    sourceUrl: "https://www.pexels.com/photo/bouquet-of-pink-roses-on-round-pink-box-1233440/",
  },
} satisfies Record<string, Pick<InviteArtSeed, "pexelsId" | "photographer" | "sourceUrl">>;

function seed(
  source: keyof typeof SOURCES,
  input: Omit<InviteArtSeed, "pexelsId" | "photographer" | "sourceUrl">,
): InviteArtSeed {
  return {
    ...input,
    ...SOURCES[source],
  };
}

const INVITE_ART_SEEDS: InviteArtSeed[] = [
  seed("birthdayGift", { id: "referral-invite-001", category: "referral_invite", title: "Gift referral invitation", tags: ["referral", "gift", "sharing", "warm"], mood: "friendly", featured: true }),
  seed("roseGift", { id: "referral-invite-002", category: "referral_invite", title: "Friendly referral gift", tags: ["referral", "friendship", "gift", "warm"], mood: "friendly" }),
  seed("thankYou", { id: "referral-invite-003", category: "referral_invite", title: "Referral thank-you note", tags: ["referral", "thank-you", "sharing", "note"], mood: "thankful" }),
  seed("pinkRoses", { id: "referral-invite-004", category: "referral_invite", title: "Warm flower referral", tags: ["referral", "flowers", "friendship", "gift"], mood: "soft" }),
  seed("invitationPetals", { id: "referral-invite-005", category: "referral_invite", title: "Elegant referral invite", tags: ["referral", "invitation", "sharing", "soft"], mood: "friendly" }),
  seed("birthdayGift", { id: "referral-invite-006", category: "referral_invite", title: "Wrapped referral surprise", tags: ["referral", "gift", "friend", "sharing"], mood: "celebration" }),
  seed("birthdayGift", { id: "birthday-card-001", category: "birthday_card", title: "Birthday card with flowers", tags: ["birthday", "flowers", "celebration", "gift"], mood: "celebration", featured: true }),
  seed("pinkRoses", { id: "birthday-card-002", category: "birthday_card", title: "Birthday roses", tags: ["birthday", "flowers", "celebration", "sparkle"], mood: "celebration" }),
  seed("roseGift", { id: "birthday-card-003", category: "birthday_card", title: "Birthday gift rose", tags: ["birthday", "gift", "celebration", "flowers"], mood: "celebration" }),
  seed("thankYou", { id: "birthday-card-004", category: "birthday_card", title: "Birthday note flatlay", tags: ["birthday", "card", "stationery", "flowers"], mood: "soft" }),
  seed("invitationPetals", { id: "birthday-card-005", category: "birthday_card", title: "Birthday invitation petals", tags: ["birthday", "invitation", "flowers", "celebration"], mood: "celebration" }),
  seed("birthdayGift", { id: "birthday-card-006", category: "birthday_card", title: "Birthday present detail", tags: ["birthday", "present", "gift", "card"], mood: "celebration" }),
  seed("calendarPins", { id: "open-slot-fill-001", category: "open_slot_fill", title: "Pinned open appointment", tags: ["calendar", "appointment", "availability", "open-slot"], mood: "urgent", featured: true }),
  seed("invitationPetals", { id: "open-slot-fill-002", category: "open_slot_fill", title: "Appointment invitation", tags: ["appointment", "invitation", "availability", "open-chair"], mood: "soft" }),
  seed("thankYou", { id: "open-slot-fill-003", category: "open_slot_fill", title: "Availability note", tags: ["appointment", "note", "availability", "calendar"], mood: "friendly" }),
  seed("calendarPins", { id: "open-slot-fill-004", category: "open_slot_fill", title: "Calendar availability reminder", tags: ["calendar", "open-chair", "appointment", "availability"], mood: "urgent" }),
  seed("roseGift", { id: "open-slot-fill-005", category: "open_slot_fill", title: "Last-minute gift opening", tags: ["appointment", "gift", "open-slot", "availability"], mood: "friendly" }),
  seed("invitationPetals", { id: "pcn-invite-001", category: "pcn_invite", title: "Private invitation with petals", tags: ["private", "vip", "envelope", "invitation"], mood: "private", featured: true }),
  seed("thankYou", { id: "pcn-invite-002", category: "pcn_invite", title: "Private client note", tags: ["private", "vip", "note", "invitation"], mood: "private" }),
  seed("pinkRoses", { id: "pcn-invite-003", category: "pcn_invite", title: "Soft luxury PCN invite", tags: ["private", "vip", "flowers", "luxury"], mood: "vip" }),
  seed("birthdayGift", { id: "pcn-invite-004", category: "pcn_invite", title: "Private gift invitation", tags: ["private", "vip", "gift", "invitation"], mood: "private" }),
  seed("invitationPetals", { id: "pcn-invite-005", category: "pcn_invite", title: "Elegant private client invite", tags: ["private", "envelope", "invitation", "soft"], mood: "private" }),
  seed("thankYou", { id: "refresh-card-001", category: "refresh_card", title: "Refresh note", tags: ["refresh", "maintenance", "fresh-look", "note"], mood: "soft", featured: true }),
  seed("pinkRoses", { id: "refresh-card-002", category: "refresh_card", title: "Fresh look flowers", tags: ["refresh", "flowers", "fresh-look", "maintenance"], mood: "soft" }),
  seed("birthdayGift", { id: "refresh-card-003", category: "refresh_card", title: "Refresh gift reminder", tags: ["refresh", "gift", "maintenance", "fresh-look"], mood: "friendly" }),
  seed("calendarPins", { id: "refresh-card-004", category: "refresh_card", title: "Refresh appointment calendar", tags: ["refresh", "calendar", "maintenance", "appointment"], mood: "urgent" }),
  seed("roseGift", { id: "refresh-card-005", category: "refresh_card", title: "Polished refresh moment", tags: ["refresh", "gift", "fresh-look", "flowers"], mood: "soft" }),
  seed("roseGift", { id: "reactivation-card-001", category: "reactivation_card", title: "Welcome back gift", tags: ["reactivation", "welcome-back", "gift", "warm"], mood: "friendly", featured: true }),
  seed("thankYou", { id: "reactivation-card-002", category: "reactivation_card", title: "Warm comeback note", tags: ["reactivation", "welcome-back", "note", "soft"], mood: "soft" }),
  seed("pinkRoses", { id: "reactivation-card-003", category: "reactivation_card", title: "Soft welcome back flowers", tags: ["reactivation", "welcome-back", "flowers", "warm"], mood: "friendly" }),
  seed("birthdayGift", { id: "reactivation-card-004", category: "reactivation_card", title: "Comeback surprise", tags: ["reactivation", "gift", "welcome-back", "client"], mood: "celebration" }),
  seed("invitationPetals", { id: "reactivation-card-005", category: "reactivation_card", title: "Elegant comeback invitation", tags: ["reactivation", "invitation", "welcome-back", "soft"], mood: "soft" }),
  seed("thankYou", { id: "vip-thank-you-001", category: "vip_thank_you", title: "VIP thank-you note", tags: ["thank-you", "vip", "gratitude", "premium"], mood: "thankful", featured: true }),
  seed("pinkRoses", { id: "vip-thank-you-002", category: "vip_thank_you", title: "VIP flower thank-you", tags: ["thank-you", "vip", "flowers", "luxury"], mood: "vip" }),
  seed("roseGift", { id: "vip-thank-you-003", category: "vip_thank_you", title: "VIP gift appreciation", tags: ["thank-you", "vip", "gift", "premium"], mood: "thankful" }),
  seed("invitationPetals", { id: "vip-thank-you-004", category: "vip_thank_you", title: "Premium thank-you invitation", tags: ["thank-you", "vip", "invitation", "private"], mood: "vip" }),
  seed("birthdayGift", { id: "vip-thank-you-005", category: "vip_thank_you", title: "Luxury client thank-you", tags: ["thank-you", "vip", "gift", "client"], mood: "thankful" }),
  seed("invitationPetals", { id: "first-visit-001", category: "first_visit", title: "First visit welcome invite", tags: ["first-visit", "welcome", "invitation", "fresh-start"], mood: "friendly", featured: true }),
  seed("pinkRoses", { id: "first-visit-002", category: "first_visit", title: "Welcome flowers", tags: ["first-visit", "welcome", "flowers", "fresh-start"], mood: "soft" }),
  seed("birthdayGift", { id: "first-visit-003", category: "first_visit", title: "First appointment gift", tags: ["first-visit", "gift", "welcome", "client"], mood: "celebration" }),
  seed("thankYou", { id: "first-visit-004", category: "first_visit", title: "Welcome note", tags: ["first-visit", "welcome", "note", "soft"], mood: "friendly" }),
  seed("roseGift", { id: "first-visit-005", category: "first_visit", title: "Fresh start rose gift", tags: ["first-visit", "fresh-start", "gift", "welcome"], mood: "soft" }),
  seed("invitationPetals", { id: "generic-invite-001", category: "generic_invite", title: "Elegant invitation flatlay", tags: ["generic", "invitation", "envelope", "flowers"], mood: "soft", featured: true }),
  seed("pinkRoses", { id: "generic-invite-002", category: "generic_invite", title: "Floral invitation art", tags: ["generic", "flowers", "invitation", "salon"], mood: "soft" }),
  seed("thankYou", { id: "generic-invite-003", category: "generic_invite", title: "Stationery invite note", tags: ["generic", "note", "invitation", "stationery"], mood: "friendly" }),
  seed("birthdayGift", { id: "generic-invite-004", category: "generic_invite", title: "Gift invite moment", tags: ["generic", "gift", "invitation", "flowers"], mood: "celebration" }),
  seed("roseGift", { id: "generic-invite-005", category: "generic_invite", title: "Soft rose invitation", tags: ["generic", "flowers", "gift", "invitation"], mood: "soft" }),
];

export const inviteArtLibrary: InviteArtAsset[] = INVITE_ART_SEEDS.map(buildInviteArt);

export function getActiveInviteArtAssets(category: InviteArtCategory): InviteArtAsset[] {
  const exact = inviteArtLibrary.filter((asset) => asset.active && asset.category === category);
  if (exact.length > 0) return exact;
  return inviteArtLibrary.filter((asset) => asset.active && asset.category === "generic_invite");
}

export function getInviteArtAssetById(assetId?: string | null): InviteArtAsset | undefined {
  if (!assetId) return undefined;
  return inviteArtLibrary.find((asset) => asset.active && asset.id === assetId);
}

export function getFallbackInviteArtAsset(): InviteArtAsset {
  return (
    inviteArtLibrary.find((asset) => asset.active && asset.category === "generic_invite" && asset.featured) ??
    inviteArtLibrary.find((asset) => asset.active && asset.category === "generic_invite") ??
    inviteArtLibrary[0]
  );
}

export function countInviteArtByCategory(): Record<InviteArtCategory, number> {
  const counts = {} as Record<InviteArtCategory, number>;
  for (const asset of inviteArtLibrary) {
    if (!asset.active) continue;
    counts[asset.category] = (counts[asset.category] ?? 0) + 1;
  }
  return counts;
}
