// lib/intelligence/salon/business-stack/stack-store.ts

import { promises as fs } from "fs";
import path from "path";
import type { SalonBusinessStack } from "./types";
import { prisma, resolveSalonStackBackend } from "./db";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/salon-business-stack"
  : path.resolve(process.cwd(), "runtime-data", "intelligence", "salon", "business-stack");

const STACKS_FILE = path.join(DATA_DIR, "stacks.json");

type JsonStore = { stacks: SalonBusinessStack[] };

async function ensureJsonDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonStore(): Promise<JsonStore> {
  try {
    const raw = await fs.readFile(STACKS_FILE, "utf8");
    return JSON.parse(raw) as JsonStore;
  } catch {
    return { stacks: [] };
  }
}

async function writeJsonStore(store: JsonStore): Promise<void> {
  await ensureJsonDir();
  await fs.writeFile(STACKS_FILE, JSON.stringify(store, null, 2), "utf8");
}

function rowToStack(row: {
  prospect_id: string;
  instagram_handle: string | null;
  signals: unknown;
  primary_booking_provider: string | null;
  primary_payment_provider: string | null;
  website_builder: string | null;
  review_presence: unknown;
  marketing_pixels: unknown;
  check_in_provider: string | null;
  stack_completeness_score: number | null;
  operational_maturity: string | null;
  import_opportunity: boolean | null;
  notes: unknown;
  updated_at: Date | string;
}): SalonBusinessStack {
  return {
    prospectId: row.prospect_id,
    instagramHandle: row.instagram_handle ?? undefined,
    signals: parseJson(row.signals, []),
    primaryBookingProvider: row.primary_booking_provider ?? undefined,
    primaryPaymentProvider: row.primary_payment_provider ?? undefined,
    websiteBuilder: row.website_builder ?? undefined,
    reviewPresence: parseJson(row.review_presence, []),
    marketingPixels: parseJson(row.marketing_pixels, []),
    checkInProvider: row.check_in_provider ?? undefined,
    stackCompletenessScore: Number(row.stack_completeness_score ?? 0),
    operationalMaturity: (row.operational_maturity as SalonBusinessStack["operationalMaturity"]) ?? "low",
    importOpportunity: Boolean(row.import_opportunity),
    notes: parseJson(row.notes, []),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (Array.isArray(raw) || (raw && typeof raw === "object")) return raw as T;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export async function upsertBusinessStack(stack: SalonBusinessStack): Promise<void> {
  const backend = await resolveSalonStackBackend();
  const prospectId = stack.prospectId;
  if (!prospectId) return;

  if (backend === "postgres") {
    await prisma.$executeRaw`
      INSERT INTO salon_business_stack (
        prospect_id, instagram_handle, signals,
        primary_booking_provider, primary_payment_provider, website_builder,
        review_presence, marketing_pixels, check_in_provider,
        stack_completeness_score, operational_maturity, import_opportunity,
        notes, updated_at
      ) VALUES (
        ${prospectId},
        ${stack.instagramHandle ?? null},
        ${JSON.stringify(stack.signals)}::jsonb,
        ${stack.primaryBookingProvider ?? null},
        ${stack.primaryPaymentProvider ?? null},
        ${stack.websiteBuilder ?? null},
        ${JSON.stringify(stack.reviewPresence ?? [])}::jsonb,
        ${JSON.stringify(stack.marketingPixels ?? [])}::jsonb,
        ${stack.checkInProvider ?? null},
        ${stack.stackCompletenessScore},
        ${stack.operationalMaturity},
        ${stack.importOpportunity},
        ${JSON.stringify(stack.notes ?? [])}::jsonb,
        ${stack.updatedAt}::timestamptz
      )
      ON CONFLICT (prospect_id) DO UPDATE SET
        instagram_handle = EXCLUDED.instagram_handle,
        signals = EXCLUDED.signals,
        primary_booking_provider = EXCLUDED.primary_booking_provider,
        primary_payment_provider = EXCLUDED.primary_payment_provider,
        website_builder = EXCLUDED.website_builder,
        review_presence = EXCLUDED.review_presence,
        marketing_pixels = EXCLUDED.marketing_pixels,
        check_in_provider = EXCLUDED.check_in_provider,
        stack_completeness_score = EXCLUDED.stack_completeness_score,
        operational_maturity = EXCLUDED.operational_maturity,
        import_opportunity = EXCLUDED.import_opportunity,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `;
    return;
  }

  const store = await readJsonStore();
  const idx = store.stacks.findIndex((s) => s.prospectId === prospectId);
  if (idx >= 0) store.stacks[idx] = stack;
  else store.stacks.push(stack);
  store.stacks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await writeJsonStore(store);
}

export async function getBusinessStack(
  prospectId: string,
): Promise<SalonBusinessStack | null> {
  const backend = await resolveSalonStackBackend();
  if (backend === "postgres") {
    try {
      const rows = await prisma.$queryRaw<
        Array<{
          prospect_id: string;
          instagram_handle: string | null;
          signals: unknown;
          primary_booking_provider: string | null;
          primary_payment_provider: string | null;
          website_builder: string | null;
          review_presence: unknown;
          marketing_pixels: unknown;
          check_in_provider: string | null;
          stack_completeness_score: number | null;
          operational_maturity: string | null;
          import_opportunity: boolean | null;
          notes: unknown;
          updated_at: Date;
        }>
      >`
        SELECT * FROM salon_business_stack WHERE prospect_id = ${prospectId}
      `;
      return rows[0] ? rowToStack(rows[0]) : null;
    } catch {
      return null;
    }
  }

  const store = await readJsonStore();
  return store.stacks.find((s) => s.prospectId === prospectId) ?? null;
}

export async function listBusinessStacks(options?: {
  limit?: number;
  prospectId?: string;
}): Promise<SalonBusinessStack[]> {
  const limit = options?.limit ?? 200;
  const backend = await resolveSalonStackBackend();

  if (backend === "postgres") {
    try {
      if (options?.prospectId) {
        const one = await getBusinessStack(options.prospectId);
        return one ? [one] : [];
      }
      const rows = await prisma.$queryRaw<
        Array<{
          prospect_id: string;
          instagram_handle: string | null;
          signals: unknown;
          primary_booking_provider: string | null;
          primary_payment_provider: string | null;
          website_builder: string | null;
          review_presence: unknown;
          marketing_pixels: unknown;
          check_in_provider: string | null;
          stack_completeness_score: number | null;
          operational_maturity: string | null;
          import_opportunity: boolean | null;
          notes: unknown;
          updated_at: Date;
        }>
      >`
        SELECT * FROM salon_business_stack
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;
      return rows.map(rowToStack);
    } catch {
      return [];
    }
  }

  const store = await readJsonStore();
  let list = store.stacks;
  if (options?.prospectId) {
    list = list.filter((s) => s.prospectId === options.prospectId);
  }
  return list.slice(0, limit);
}
