// lib/studios/prospects/match-prospect.ts
// Future registration-attempt matching helper.
// NOT wired to registration flow yet — foundation only.

import type { ProspectRecord } from "./types";

export interface MatchInput {
  handle?: string;
  displayName?: string;
  email?: string;
  name?: string;
  url?: string;
}

export interface ProspectMatch {
  prospect: ProspectRecord;
  confidence: number;   // 0–100
  matchedOn: string[];  // which fields triggered the match
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Given a set of input signals, return prospect records that likely match.
 * Sorted by confidence descending.
 *
 * Scoring:
 *   +50  exact handle match
 *   +40  URL match (bestMatch or allMatchedUrls)
 *   +30  name/displayName overlap
 *   +20  email local-part overlaps handle
 */
export function matchProspect(
  prospects: ProspectRecord[],
  input: MatchInput,
): ProspectMatch[] {
  const results: ProspectMatch[] = [];

  for (const prospect of prospects) {
    let score = 0;
    const matchedOn: string[] = [];

    // Handle exact match
    if (input.handle) {
      const a = normalize(input.handle);
      const b = normalize(prospect.identity.handle);
      if (a.length > 2 && a === b) {
        score += 50;
        matchedOn.push("handle");
      }
    }

    // URL match
    if (input.url) {
      const u = input.url.toLowerCase();
      const hitBest = prospect.bestMatch?.url.toLowerCase() === u;
      const hitAll = prospect.allMatchedUrls.some((m) => m.url.toLowerCase() === u);
      if (hitBest || hitAll) {
        score += 40;
        matchedOn.push("url");
      }
    }

    // Name / displayName overlap
    const inputName = normalize(input.name ?? input.displayName ?? "");
    if (inputName.length > 3) {
      const prospectName = normalize(prospect.identity.name);
      if (prospectName.includes(inputName) || inputName.includes(prospectName)) {
        score += 30;
        matchedOn.push("name");
      }
    }

    // Email local-part overlap with handle
    if (input.email) {
      const localPart = normalize(input.email.split("@")[0]);
      const handle = normalize(prospect.identity.handle);
      if (localPart.length > 3 && (handle.includes(localPart) || localPart.includes(handle))) {
        score += 20;
        matchedOn.push("email-handle");
      }
    }

    if (score > 0) {
      results.push({ prospect, confidence: Math.min(100, score), matchedOn });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
