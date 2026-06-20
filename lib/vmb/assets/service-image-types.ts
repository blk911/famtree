export type ServicePhotoCategory =
  | "gel_manicure"
  | "builder_gel"
  | "structured_gel"
  | "gel_x"
  | "acrylic"
  | "pedicure"
  | "fill_refresh"
  | "nail_art"
  | "spa"
  | "waxing"
  | "lashes"
  | "brows"
  | "generic_salon";

export type ServiceImageSource =
  | "uploaded"
  | "locked_library"
  | "rotating_library"
  | "fallback";

export type ServicePhotoMood = "soft" | "clean" | "luxury" | "glam" | "spa" | "social" | "neutral";
export type ServicePhotoShotType = "hands" | "feet" | "tools" | "salon" | "client" | "lifestyle";
export type ServicePhotoNailLength = "short" | "medium" | "long";
export type ServicePhotoStyle = "natural" | "french" | "chrome" | "color" | "art" | "neutral";

export interface ServicePhotoAsset {
  id: string;
  category: ServicePhotoCategory;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  photographer?: string;
  sourceName?: "Unsplash" | "Pexels" | "Pixabay" | "VMB";
  sourceUrl?: string;
  tags: string[];
  active: boolean;
  featured?: boolean;
  mood?: ServicePhotoMood;
  shotType?: ServicePhotoShotType;
  nailLength?: ServicePhotoNailLength;
  style?: ServicePhotoStyle;
}

export interface ServiceImageInput {
  serviceId?: string;
  serviceSlug?: string;
  serviceName?: string;
  salonId?: string;
  uploadedImageUrl?: string | null;
  lockedLibraryAssetId?: string | null;
  selectedLibraryImageUrl?: string | null;
  date?: Date;
}

export interface ResolvedServiceImage {
  imageUrl: string;
  title: string;
  source: ServiceImageSource;
  assetId?: string;
  category?: ServicePhotoCategory;
  photographer?: string;
  sourceName?: string;
  sourceUrl?: string;
}
