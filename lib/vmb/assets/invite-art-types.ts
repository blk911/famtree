export type InviteArtCategory =
  | "referral_invite"
  | "birthday_card"
  | "open_slot_fill"
  | "pcn_invite"
  | "refresh_card"
  | "reactivation_card"
  | "vip_thank_you"
  | "first_visit"
  | "generic_invite";

export type InviteArtMood =
  | "soft"
  | "celebration"
  | "vip"
  | "friendly"
  | "urgent"
  | "thankful"
  | "private";

export type InviteArtSourceName = "Unsplash" | "Pexels" | "Pixabay" | "VMB";

export type InviteArtSource =
  | "locked_invite_art"
  | "selected_invite_art"
  | "rotating_invite_art"
  | "generic_invite_fallback"
  | "service_photo_fallback";

export interface InviteArtAsset {
  id: string;
  category: InviteArtCategory;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  photographer?: string;
  sourceName?: InviteArtSourceName;
  sourceUrl?: string;
  tags: string[];
  active: boolean;
  featured?: boolean;
  mood?: InviteArtMood;
}

export interface InviteArtImageInput {
  templateType?: string;
  invitationType?: string;
  cardType?: string;
  serviceName?: string;
  salonId?: string;
  inviteId?: string;
  lockedInviteArtAssetId?: string | null;
  selectedInviteArtUrl?: string | null;
  date?: Date;
}

export interface ResolvedInviteArtImage {
  imageUrl: string;
  title: string;
  source: InviteArtSource;
  assetId?: string;
  category?: InviteArtCategory;
  photographer?: string;
  sourceName?: InviteArtSourceName;
  sourceUrl?: string;
}
