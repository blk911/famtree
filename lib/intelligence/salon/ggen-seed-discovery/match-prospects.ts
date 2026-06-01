// lib/intelligence/salon/ggen-seed-discovery/match-prospects.ts

import { filterProspects } from "@/lib/studios/prospects/store";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { normalizeBusinessName } from "./parse";

function tokenSet(name: string): Set<string> {
  return new Set(
    normalizeBusinessName(name)
      .split(" ")
      .filter((w) => w.length > 2),
  );
}

function nameScore(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  ta.forEach((t) => {
    if (tb.has(t)) overlap++;
  });
  const denom = Math.max(ta.size, tb.size);
  return overlap / denom;
}

function locationMatch(
  prospect: ProspectRecord,
  city?: string | null,
  state?: string | null,
): boolean {
  const loc = (prospect.identity.locationGuess ?? "").toLowerCase();
  if (!loc) return true;
  if (city && loc.includes(city.toLowerCase())) return true;
  if (state && loc.includes(state.toLowerCase())) return true;
  return !city && !state;
}

export type ProspectMatch = {
  prospectId: string;
  handle: string;
  name: string;
  score: number;
};

export async function matchSalonProspectsForSeed(input: {
  businessName: string;
  city?: string | null;
  state?: string | null;
  limit?: number;
}): Promise<ProspectMatch[]> {
  const prospects = await filterProspects({ vertical: "salon" });
  const scored: ProspectMatch[] = [];

  for (const p of prospects) {
    const names = [
      p.identity.name,
      p.source.sourceDisplayName,
      p.identity.handle.replace(/^@/, ""),
    ].filter(Boolean) as string[];

    let best = 0;
    for (const n of names) {
      best = Math.max(best, nameScore(input.businessName, n));
      if (normalizeBusinessName(n) === normalizeBusinessName(input.businessName)) {
        best = 1;
      }
    }

    if (best < 0.45) continue;
    if (!locationMatch(p, input.city, input.state)) continue;

    scored.push({
      prospectId: p.prospectId,
      handle: p.identity.handle,
      name: p.identity.name,
      score: best,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, input.limit ?? 5);
}
