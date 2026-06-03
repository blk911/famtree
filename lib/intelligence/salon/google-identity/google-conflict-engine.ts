// lib/intelligence/salon/google-identity/google-conflict-engine.ts

import type { GooglePlaceCandidate } from "./providers/types";
import type { GoogleIdentityProspectInput } from "./types";

export type GoogleIdentityConflictResult = {
  hasConflict: boolean;
  reasons: string[];
};

function tokenize(value: string | undefined | null): string[] {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function nameOverlap(a: string, b: string): number {
  const left = tokenize(a);
  const right = new Set(tokenize(b));
  if (left.length === 0) return 0;
  return left.filter((t) => right.has(t)).length / left.length;
}

export function normalizePhone(value: string | undefined | null): string {
  return (value ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
}

export function hostOf(url?: string | null): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  try {
    const u = raw.startsWith("http") ? raw : `https://${raw}`;
    return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function detectGoogleIdentityConflicts(
  prospect: GoogleIdentityProspectInput,
  primary: GooglePlaceCandidate | undefined,
  allCandidates: GooglePlaceCandidate[],
): GoogleIdentityConflictResult {
  const reasons: string[] = [];

  if (!primary) {
    return { hasConflict: false, reasons };
  }

  const prospectHost = hostOf(prospect.website);
  const googleHost = hostOf(primary.website);
  if (prospectHost && googleHost && prospectHost !== googleHost) {
    reasons.push(
      `Website domain mismatch: prospect ${prospectHost} vs Google ${googleHost}`,
    );
  }

  const prospectPhone = normalizePhone(prospect.phone);
  const googlePhone = normalizePhone(primary.phone);
  if (prospectPhone && googlePhone && prospectPhone !== googlePhone) {
    reasons.push("Phone number on prospect does not match Google Business listing.");
  }

  const overlap = nameOverlap(prospect.displayName ?? "", primary.name ?? "");
  if ((prospect.displayName ?? "").trim() && (primary.name ?? "").trim() && overlap < 0.25) {
    reasons.push(
      `Strong business name mismatch (${Math.round(overlap * 100)}% token overlap).`,
    );
  }

  if (allCandidates.length > 1) {
    const distinctNames = new Set(
      allCandidates.map((c) => (c.name ?? "").trim().toLowerCase()).filter(Boolean),
    );
    const distinctHosts = new Set(
      allCandidates.map((c) => hostOf(c.website)).filter(Boolean),
    );
    if (distinctNames.size > 1 || distinctHosts.size > 1) {
      reasons.push(
        `Multiple Google Business candidates (${allCandidates.length}) with differing names or websites.`,
      );
    }
  }

  return { hasConflict: reasons.length > 0, reasons };
}
