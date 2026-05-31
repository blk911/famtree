// lib/intelligence/transpo/verification-postgres-store.ts
// Postgres implementation of the Transpo carrier verification store (table:
// transpo_carrier_verification). Upserts by carrier_id (unique index) so each
// carrier holds a single, latest verification row. Routed in from
// verification-store.ts when DATABASE_URL is set.

import { prisma } from "./db";
import type {
  TranspoCarrierVerification,
  TranspoVerificationProvider,
  TranspoVerificationStatus,
  TranspoAddressType,
  TranspoWebsiteSignal,
  TranspoWebsiteFetchStatus,
} from "./verification-types";

type GoogleMatchedBy = TranspoCarrierVerification["googleMatchedBy"];

interface DbVerificationRow {
  id: string;
  carrier_id: string | null;
  carrier_key: string | null;
  dot_number: string | null;
  company_name: string | null;
  city: string | null;
  state: string | null;
  google_found: boolean | null;
  google_rating: number | string | null;
  google_review_count: number | null;
  google_website: string | null;
  google_phone: string | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  google_address: string | null;
  google_business_name: string | null;
  google_category: string | null;
  google_match_confidence: number | string | null;
  google_matched_by: string | null;
  bbb_found: boolean | null;
  bbb_rating: string | null;
  bbb_complaint_count: number | null;
  facebook_found: boolean | null;
  facebook_url: string | null;
  state_entity_found: boolean | null;
  entity_status: string | null;
  formation_date: string | null;
  state_registry_provider: string | null;
  state_entity_name: string | null;
  state_entity_id: string | null;
  state_entity_url: string | null;
  entity_good_standing: boolean | null;
  entity_formation_date: string | null;
  entity_age_months: number | null;
  state_name_match_confidence: number | string | null;
  website_found: boolean | null;
  website_url: string | null;
  website_fetch_status: string | null;
  website_http_status: number | null;
  website_final_url: string | null;
  website_title: string | null;
  website_description: string | null;
  website_signals: unknown;
  website_pages_checked: unknown;
  website_extracted_phones: unknown;
  website_extracted_emails: unknown;
  website_hiring_found: boolean | null;
  website_owner_operator_found: boolean | null;
  website_quote_request_found: boolean | null;
  website_last_fetched_at: Date | string | null;
  address_type: string | null;
  verification_score: number | null;
  verification_status: string | null;
  notes: unknown;
  providers_checked: unknown;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

function parseJson<T>(col: unknown, fallback: T): T {
  if (col === null || col === undefined) return fallback;
  if (typeof col === "string") {
    try {
      return JSON.parse(col) as T;
    } catch {
      return fallback;
    }
  }
  return col as T;
}

function toIso(v: Date | string | null): string {
  if (!v) return new Date().toISOString();
  return v instanceof Date ? v.toISOString() : v;
}

function optNum(v: number | string | null): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function rowToVerification(row: DbVerificationRow): TranspoCarrierVerification {
  return {
    id: row.id,
    carrierId: row.carrier_id ?? "",
    carrierKey: row.carrier_key ?? "",
    dotNumber: row.dot_number ?? undefined,
    companyName: row.company_name ?? "(unnamed carrier)",
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    googleFound: row.google_found ?? undefined,
    googleRating: optNum(row.google_rating),
    googleReviewCount: row.google_review_count ?? undefined,
    googleWebsite: row.google_website ?? undefined,
    googlePhone: row.google_phone ?? undefined,
    googlePlaceId: row.google_place_id ?? undefined,
    googleMapsUrl: row.google_maps_url ?? undefined,
    googleAddress: row.google_address ?? undefined,
    googleBusinessName: row.google_business_name ?? undefined,
    googleCategory: row.google_category ?? undefined,
    googleMatchConfidence: optNum(row.google_match_confidence),
    googleMatchedBy: (row.google_matched_by ?? undefined) as GoogleMatchedBy,
    bbbFound: row.bbb_found ?? undefined,
    bbbRating: row.bbb_rating ?? undefined,
    bbbComplaintCount: row.bbb_complaint_count ?? undefined,
    facebookFound: row.facebook_found ?? undefined,
    facebookUrl: row.facebook_url ?? undefined,
    stateEntityFound: row.state_entity_found ?? undefined,
    entityStatus: row.entity_status ?? undefined,
    formationDate: row.formation_date ?? undefined,
    stateRegistryProvider: (row.state_registry_provider ?? undefined) as
      | TranspoCarrierVerification["stateRegistryProvider"],
    stateEntityName: row.state_entity_name ?? undefined,
    stateEntityId: row.state_entity_id ?? undefined,
    stateEntityUrl: row.state_entity_url ?? undefined,
    entityGoodStanding: row.entity_good_standing ?? undefined,
    entityFormationDate: row.entity_formation_date ?? undefined,
    entityAgeMonths: row.entity_age_months ?? undefined,
    stateNameMatchConfidence: optNum(row.state_name_match_confidence),
    websiteFound: row.website_found ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    websiteFetchStatus: (row.website_fetch_status ?? undefined) as TranspoWebsiteFetchStatus | undefined,
    websiteHttpStatus: row.website_http_status ?? undefined,
    websiteFinalUrl: row.website_final_url ?? undefined,
    websiteTitle: row.website_title ?? undefined,
    websiteDescription: row.website_description ?? undefined,
    websiteSignals: parseJson<TranspoWebsiteSignal[]>(row.website_signals, []),
    websitePagesChecked: parseJson<string[]>(row.website_pages_checked, []),
    websiteExtractedPhones: parseJson<string[]>(row.website_extracted_phones, []),
    websiteExtractedEmails: parseJson<string[]>(row.website_extracted_emails, []),
    websiteHiringFound: row.website_hiring_found ?? undefined,
    websiteOwnerOperatorFound: row.website_owner_operator_found ?? undefined,
    websiteQuoteRequestFound: row.website_quote_request_found ?? undefined,
    websiteLastFetchedAt: row.website_last_fetched_at ? toIso(row.website_last_fetched_at) : undefined,
    addressType: (row.address_type ?? undefined) as TranspoAddressType | undefined,
    verificationScore: row.verification_score ?? 0,
    verificationStatus: (row.verification_status ?? "placeholder") as TranspoVerificationStatus,
    notes: parseJson<string[]>(row.notes, []),
    providersChecked: parseJson<TranspoVerificationProvider[]>(row.providers_checked, []),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function readVerificationsPostgres(): Promise<TranspoCarrierVerification[]> {
  try {
    const rows = await prisma.$queryRaw<DbVerificationRow[]>`
      SELECT * FROM transpo_carrier_verification ORDER BY updated_at DESC
    `;
    return rows.map(rowToVerification);
  } catch {
    return [];
  }
}

/** Upsert verification rows by carrier_id. Returns null on success or an error. */
export async function writeVerificationsPostgres(
  items: TranspoCarrierVerification[],
): Promise<string | null> {
  try {
    for (const v of items) {
      await prisma.$executeRaw`
        INSERT INTO transpo_carrier_verification (
          id, carrier_id, carrier_key, dot_number, company_name, city, state,
          google_found, google_rating, google_review_count, google_website, google_phone,
          google_place_id, google_maps_url, google_address, google_business_name,
          google_category, google_match_confidence, google_matched_by,
          bbb_found, bbb_rating, bbb_complaint_count,
          facebook_found, facebook_url,
          state_entity_found, entity_status, formation_date,
          state_registry_provider, state_entity_name, state_entity_id, state_entity_url,
          entity_good_standing, entity_formation_date, entity_age_months, state_name_match_confidence,
          website_found, website_url,
          website_fetch_status, website_http_status, website_final_url,
          website_title, website_description, website_signals, website_pages_checked,
          website_extracted_phones, website_extracted_emails,
          website_hiring_found, website_owner_operator_found, website_quote_request_found,
          website_last_fetched_at,
          address_type,
          verification_score, verification_status, notes, providers_checked,
          created_at, updated_at
        ) VALUES (
          ${v.id},
          ${v.carrierId},
          ${v.carrierKey},
          ${v.dotNumber ?? null},
          ${v.companyName},
          ${v.city ?? null},
          ${v.state ?? null},
          ${v.googleFound ?? null},
          ${v.googleRating ?? null},
          ${v.googleReviewCount ?? null},
          ${v.googleWebsite ?? null},
          ${v.googlePhone ?? null},
          ${v.googlePlaceId ?? null},
          ${v.googleMapsUrl ?? null},
          ${v.googleAddress ?? null},
          ${v.googleBusinessName ?? null},
          ${v.googleCategory ?? null},
          ${v.googleMatchConfidence ?? null},
          ${v.googleMatchedBy ?? null},
          ${v.bbbFound ?? null},
          ${v.bbbRating ?? null},
          ${v.bbbComplaintCount ?? null},
          ${v.facebookFound ?? null},
          ${v.facebookUrl ?? null},
          ${v.stateEntityFound ?? null},
          ${v.entityStatus ?? null},
          ${v.formationDate ?? null},
          ${v.stateRegistryProvider ?? null},
          ${v.stateEntityName ?? null},
          ${v.stateEntityId ?? null},
          ${v.stateEntityUrl ?? null},
          ${v.entityGoodStanding ?? null},
          ${v.entityFormationDate ?? null},
          ${v.entityAgeMonths ?? null},
          ${v.stateNameMatchConfidence ?? null},
          ${v.websiteFound ?? null},
          ${v.websiteUrl ?? null},
          ${v.websiteFetchStatus ?? null},
          ${v.websiteHttpStatus ?? null},
          ${v.websiteFinalUrl ?? null},
          ${v.websiteTitle ?? null},
          ${v.websiteDescription ?? null},
          ${JSON.stringify(v.websiteSignals ?? [])}::jsonb,
          ${JSON.stringify(v.websitePagesChecked ?? [])}::jsonb,
          ${JSON.stringify(v.websiteExtractedPhones ?? [])}::jsonb,
          ${JSON.stringify(v.websiteExtractedEmails ?? [])}::jsonb,
          ${v.websiteHiringFound ?? null},
          ${v.websiteOwnerOperatorFound ?? null},
          ${v.websiteQuoteRequestFound ?? null},
          ${v.websiteLastFetchedAt ? new Date(v.websiteLastFetchedAt) : null},
          ${v.addressType ?? null},
          ${v.verificationScore ?? 0},
          ${v.verificationStatus},
          ${JSON.stringify(v.notes ?? [])}::jsonb,
          ${JSON.stringify(v.providersChecked ?? [])}::jsonb,
          ${v.createdAt ? new Date(v.createdAt) : new Date()},
          ${v.updatedAt ? new Date(v.updatedAt) : new Date()}
        )
        ON CONFLICT (carrier_id) DO UPDATE SET
          carrier_key         = EXCLUDED.carrier_key,
          dot_number          = EXCLUDED.dot_number,
          company_name        = EXCLUDED.company_name,
          city                = EXCLUDED.city,
          state               = EXCLUDED.state,
          google_found        = EXCLUDED.google_found,
          google_rating       = EXCLUDED.google_rating,
          google_review_count = EXCLUDED.google_review_count,
          google_website      = EXCLUDED.google_website,
          google_phone        = EXCLUDED.google_phone,
          google_place_id        = EXCLUDED.google_place_id,
          google_maps_url        = EXCLUDED.google_maps_url,
          google_address         = EXCLUDED.google_address,
          google_business_name   = EXCLUDED.google_business_name,
          google_category        = EXCLUDED.google_category,
          google_match_confidence = EXCLUDED.google_match_confidence,
          google_matched_by      = EXCLUDED.google_matched_by,
          bbb_found           = EXCLUDED.bbb_found,
          bbb_rating          = EXCLUDED.bbb_rating,
          bbb_complaint_count = EXCLUDED.bbb_complaint_count,
          facebook_found      = EXCLUDED.facebook_found,
          facebook_url        = EXCLUDED.facebook_url,
          state_entity_found  = EXCLUDED.state_entity_found,
          entity_status       = EXCLUDED.entity_status,
          formation_date      = EXCLUDED.formation_date,
          state_registry_provider     = EXCLUDED.state_registry_provider,
          state_entity_name           = EXCLUDED.state_entity_name,
          state_entity_id             = EXCLUDED.state_entity_id,
          state_entity_url            = EXCLUDED.state_entity_url,
          entity_good_standing        = EXCLUDED.entity_good_standing,
          entity_formation_date       = EXCLUDED.entity_formation_date,
          entity_age_months           = EXCLUDED.entity_age_months,
          state_name_match_confidence = EXCLUDED.state_name_match_confidence,
          website_found       = EXCLUDED.website_found,
          website_url         = EXCLUDED.website_url,
          website_fetch_status        = EXCLUDED.website_fetch_status,
          website_http_status         = EXCLUDED.website_http_status,
          website_final_url           = EXCLUDED.website_final_url,
          website_title               = EXCLUDED.website_title,
          website_description         = EXCLUDED.website_description,
          website_signals             = EXCLUDED.website_signals,
          website_pages_checked       = EXCLUDED.website_pages_checked,
          website_extracted_phones    = EXCLUDED.website_extracted_phones,
          website_extracted_emails    = EXCLUDED.website_extracted_emails,
          website_hiring_found        = EXCLUDED.website_hiring_found,
          website_owner_operator_found = EXCLUDED.website_owner_operator_found,
          website_quote_request_found = EXCLUDED.website_quote_request_found,
          website_last_fetched_at     = EXCLUDED.website_last_fetched_at,
          address_type        = EXCLUDED.address_type,
          verification_score  = EXCLUDED.verification_score,
          verification_status = EXCLUDED.verification_status,
          notes               = EXCLUDED.notes,
          providers_checked   = EXCLUDED.providers_checked,
          updated_at          = EXCLUDED.updated_at
      `;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function countVerificationsPostgres(): Promise<number> {
  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM transpo_carrier_verification
    `;
    return Number(result[0]?.count ?? 0);
  } catch {
    return 0;
  }
}
