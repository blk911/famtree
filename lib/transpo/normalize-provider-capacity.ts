// lib/transpo/normalize-provider-capacity.ts

import type { ProviderCapacity, RawProviderCountyAssignment } from "./provider-types";

const HCPF_SOURCE_URL = "https://hcpf.colorado.gov/nemtlist";

function normalizeProviderToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function makeProviderKey(providerName: string): string {
  return `transpo:provider:${normalizeProviderToken(providerName)}`;
}

export function calculateFootprintScore(countyCount: number): number {
  if (countyCount <= 0) return 0;
  if (countyCount === 1) return 10;
  if (countyCount <= 5) return 25;
  if (countyCount <= 10) return 50;
  if (countyCount <= 20) return 75;
  return 100;
}

export function calculateCountyCapacityScore(providerCount: number): number {
  if (providerCount <= 0) return 0;
  if (providerCount === 1) return 20;
  if (providerCount <= 3) return 40;
  if (providerCount <= 6) return 60;
  if (providerCount <= 10) return 80;
  return 100;
}

export function classifyProviderFootprint(countyCount: number): "local" | "regional" | "statewide" {
  if (countyCount <= 3) return "local";
  if (countyCount <= 15) return "regional";
  return "statewide";
}

function pickPhone(existing: string | undefined, next: string | undefined): string | undefined {
  if (!next?.trim()) return existing;
  if (!existing?.trim()) return next.trim();
  if (existing.includes(next) || next.includes(existing)) return existing;
  return existing;
}

export function aggregateProvidersFromAssignments(
  records: RawProviderCountyAssignment[],
  options: {
    sourceProvider: string;
    sourceUrl?: string;
    now?: Date;
  },
): ProviderCapacity[] {
  const grouped = new Map<
    string,
    {
      providerName: string;
      phone?: string;
      counties: Set<string>;
    }
  >();

  for (const row of records) {
    const providerName = row.providerName.trim();
    const county = row.county.trim().replace(/\s+county$/i, "");
    if (!providerName || !county) continue;

    const key = normalizeProviderToken(providerName);
    const existing = grouped.get(key) ?? {
      providerName,
      counties: new Set<string>(),
    };
    existing.counties.add(county);
    existing.phone = pickPhone(existing.phone, row.phone);
    grouped.set(key, existing);
  }

  const iso = (options.now ?? new Date()).toISOString();
  const providers: ProviderCapacity[] = [];

  for (const entry of Array.from(grouped.values())) {
    const countiesServed = Array.from(entry.counties).sort((a, b) => a.localeCompare(b));
    const countyCount = countiesServed.length;

    providers.push(
      normalizeProvider({
        providerName: entry.providerName,
        phone: entry.phone,
        countiesServed,
        sourceProvider: options.sourceProvider,
        sourceUrl: options.sourceUrl ?? HCPF_SOURCE_URL,
        createdAt: iso,
        updatedAt: iso,
      }),
    );
  }

  return providers.sort((a, b) => a.providerName.localeCompare(b.providerName));
}

export function normalizeProvider(input: {
  providerName: string;
  phone?: string;
  website?: string;
  countiesServed: string[];
  sourceProvider: string;
  sourceUrl?: string;
  activeMedicaidProvider?: boolean;
  notes?: string[];
  createdAt?: string;
  updatedAt?: string;
}): ProviderCapacity {
  const countiesServed = Array.from(
    new Set(input.countiesServed.map((c) => c.trim().replace(/\s+county$/i, ""))),
  ).sort((a, b) => a.localeCompare(b));
  const countyCount = countiesServed.length;
  const iso = new Date().toISOString();

  let confidence = 70;
  if (input.sourceProvider === "hcpf_nemt_list") confidence = 85;
  if (input.phone) confidence = Math.min(95, confidence + 5);

  return {
    providerKey: makeProviderKey(input.providerName),
    providerName: input.providerName.trim(),
    phone: input.phone?.trim() || undefined,
    website: input.website?.trim() || undefined,
    activeMedicaidProvider: input.activeMedicaidProvider ?? true,
    countiesServed,
    countyCount,
    sourceProvider: input.sourceProvider,
    sourceUrl: input.sourceUrl ?? HCPF_SOURCE_URL,
    footprintScore: calculateFootprintScore(countyCount),
    confidence,
    notes: input.notes,
    createdAt: input.createdAt ?? iso,
    updatedAt: input.updatedAt ?? iso,
  };
}
