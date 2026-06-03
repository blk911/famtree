// Salon Google data source abstraction — swap implementations without touching match tiers.

export type GooglePlaceCandidate = {
  placeId: string;
  name?: string;
  formattedAddress?: string;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  rating?: number;
  reviewCount?: number;
  categories?: string[];
  permanentlyClosed?: boolean;
  businessStatus?: string;
};

export type GooglePlaceLookupInput = {
  displayName: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
};

export type GooglePlaceLookupResult = {
  connected: boolean;
  candidates: GooglePlaceCandidate[];
  notes: string[];
};

export interface SalonGoogleDataSource {
  readonly id: string;
  isConnected(): boolean;
  lookup(input: GooglePlaceLookupInput): Promise<GooglePlaceLookupResult>;
}
