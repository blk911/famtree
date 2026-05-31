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
} from "./verification-types";

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
  bbb_found: boolean | null;
  bbb_rating: string | null;
  bbb_complaint_count: number | null;
  facebook_found: boolean | null;
  facebook_url: string | null;
  state_entity_found: boolean | null;
  entity_status: string | null;
  formation_date: string | null;
  website_found: boolean | null;
  website_url: string | null;
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
    bbbFound: row.bbb_found ?? undefined,
    bbbRating: row.bbb_rating ?? undefined,
    bbbComplaintCount: row.bbb_complaint_count ?? undefined,
    facebookFound: row.facebook_found ?? undefined,
    facebookUrl: row.facebook_url ?? undefined,
    stateEntityFound: row.state_entity_found ?? undefined,
    entityStatus: row.entity_status ?? undefined,
    formationDate: row.formation_date ?? undefined,
    websiteFound: row.website_found ?? undefined,
    websiteUrl: row.website_url ?? undefined,
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
          bbb_found, bbb_rating, bbb_complaint_count,
          facebook_found, facebook_url,
          state_entity_found, entity_status, formation_date,
          website_found, website_url, address_type,
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
          ${v.bbbFound ?? null},
          ${v.bbbRating ?? null},
          ${v.bbbComplaintCount ?? null},
          ${v.facebookFound ?? null},
          ${v.facebookUrl ?? null},
          ${v.stateEntityFound ?? null},
          ${v.entityStatus ?? null},
          ${v.formationDate ?? null},
          ${v.websiteFound ?? null},
          ${v.websiteUrl ?? null},
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
          bbb_found           = EXCLUDED.bbb_found,
          bbb_rating          = EXCLUDED.bbb_rating,
          bbb_complaint_count = EXCLUDED.bbb_complaint_count,
          facebook_found      = EXCLUDED.facebook_found,
          facebook_url        = EXCLUDED.facebook_url,
          state_entity_found  = EXCLUDED.state_entity_found,
          entity_status       = EXCLUDED.entity_status,
          formation_date      = EXCLUDED.formation_date,
          website_found       = EXCLUDED.website_found,
          website_url         = EXCLUDED.website_url,
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
