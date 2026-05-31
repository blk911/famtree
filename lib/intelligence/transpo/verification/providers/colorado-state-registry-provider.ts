// lib/intelligence/transpo/verification/providers/colorado-state-registry-provider.ts
// Colorado Secretary of State business-entity verification via the public
// Socrata dataset (data.colorado.gov, resource 4ykn-tg5h — "Business Entities
// in Colorado", no API key). Matches a carrier's legal name to a CO entity and
// surfaces status / formation / age signals. CO-only. Never throws.

import type { TranspoCarrierTarget } from "../../types";
import type { TranspoCarrierVerification } from "../../verification-types";

const SOCRATA_URL = "https://data.colorado.gov/resource/4ykn-tg5h.json";
const ENTITY_DETAIL = "https://www.sos.state.co.us/biz/BusinessEntityDetail.do?entityId=";
const TIMEOUT_MS = 8000;
const SELECT =
  "entityid,entityname,entitystatus,jurisdictonofformation,entitytype,entityformdate,principalcity,principalstate";

type CoEntityRow = {
  entityid?: string;
  entityname?: string;
  entitystatus?: string;
  jurisdictonofformation?: string;
  entitytype?: string;
  entityformdate?: string;
  principalcity?: string;
  principalstate?: string;
};

// ── Name normalization & matching ───────────────────────────────────────────────

const SUFFIX_RE =
  /\b(llc|l\.l\.c\.|inc|inc\.|incorporated|corp|corp\.|corporation|co|co\.|ltd|ltd\.|lp|llp|pllc|company|trucking|transport|transportation|logistics|carriers?|enterprises?)\b/gi;

function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(name: string): string[] {
  return normalizeName(name)
    .replace(SUFFIX_RE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 1);
}

/** Fraction of carrier name tokens present in the candidate name (0–1). */
function nameConfidence(carrierName: string, candidateName: string): number {
  const a = tokens(carrierName);
  const b = new Set(tokens(candidateName));
  if (a.length === 0) return 0;
  const hits = a.filter((t) => b.has(t)).length;
  return hits / a.length;
}

function escapeSoql(value: string): string {
  return value.replace(/'/g, "''");
}

function isGoodStanding(status: string | undefined): boolean {
  return (status ?? "").trim().toLowerCase().includes("good standing");
}

function isInactiveStatus(status: string | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase();
  return (
    s.includes("delinquent") ||
    s.includes("dissolved") ||
    s.includes("withdrawn") ||
    s.includes("revoked") ||
    s.includes("expired") ||
    s.includes("noncompliant")
  );
}

function monthsSince(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  const months = (Date.now() - t) / (1000 * 60 * 60 * 24 * 30.44);
  return months < 0 ? 0 : Math.round(months);
}

function formationIso(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString().slice(0, 10);
}

// ── Fetch ──────────────────────────────────────────────────────────────────────

async function fetchRows(where: string): Promise<{ ok: boolean; rows: CoEntityRow[]; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url =
      `${SOCRATA_URL}?$select=${encodeURIComponent(SELECT)}` +
      `&$where=${encodeURIComponent(where)}&$limit=20`;
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "AIH-Transpo-Verification/1.0", Accept: "application/json" },
    });
    if (!res.ok) return { ok: false, rows: [], error: `HTTP ${res.status}` };
    const data = (await res.json()) as CoEntityRow[];
    return { ok: true, rows: Array.isArray(data) ? data : [] };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "request timed out" : e.message) : String(e);
    return { ok: false, rows: [], error: msg };
  } finally {
    clearTimeout(timer);
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export async function verifyColoradoStateRegistry(
  carrier: TranspoCarrierTarget,
): Promise<Partial<TranspoCarrierVerification>> {
  if ((carrier.state ?? "").trim().toUpperCase() !== "CO") {
    return { providersChecked: ["state_registry"] };
  }

  const name = (carrier.companyName ?? "").trim();
  if (!name) {
    return {
      stateRegistryProvider: "colorado_sos",
      stateEntityFound: undefined,
      notes: ["Colorado SOS lookup skipped — no company name on carrier."],
      providersChecked: ["state_registry"],
    };
  }

  try {
    const norm = normalizeName(name);
    // Primary: prefix match on the normalized name.
    let result = await fetchRows(`upper(entityname) like '${escapeSoql(norm)}%'`);
    // Fallback: contains-match on the most distinctive token.
    if (result.ok && result.rows.length === 0) {
      const tks = tokens(name);
      if (tks.length > 0) {
        const longest = tks.slice().sort((a, b) => b.length - a.length)[0];
        result = await fetchRows(`upper(entityname) like '%${escapeSoql(longest)}%'`);
      }
    }

    if (!result.ok) {
      return {
        stateRegistryProvider: "colorado_sos",
        stateEntityFound: false,
        notes: [`Colorado SOS lookup failed: ${result.error ?? "unknown error"}.`],
        providersChecked: ["state_registry"],
      };
    }

    if (result.rows.length === 0) {
      return {
        stateRegistryProvider: "colorado_sos",
        stateEntityFound: false,
        stateNameMatchConfidence: 0,
        notes: ["No Colorado SOS entity matched this carrier name."],
        providersChecked: ["state_registry"],
      };
    }

    // Score candidates by name confidence; prefer Good Standing among close ties.
    const scored = result.rows
      .map((row) => ({ row, confidence: nameConfidence(name, row.entityname ?? "") }))
      .sort((a, b) => {
        if (Math.abs(b.confidence - a.confidence) > 0.05) return b.confidence - a.confidence;
        return (isGoodStanding(b.row.entitystatus) ? 1 : 0) - (isGoodStanding(a.row.entitystatus) ? 1 : 0);
      });

    const best = scored[0];
    const confidence = Math.round(best.confidence * 100) / 100;

    // Below a minimal threshold we found rows but no reliable match.
    if (confidence < 0.5) {
      return {
        stateRegistryProvider: "colorado_sos",
        stateEntityFound: false,
        stateNameMatchConfidence: confidence,
        notes: [`Colorado SOS: closest match "${best.row.entityname}" below confidence threshold.`],
        providersChecked: ["state_registry"],
      };
    }

    const status = best.row.entitystatus;
    const formation = formationIso(best.row.entityformdate);
    const ageMonths = monthsSince(best.row.entityformdate);
    const goodStanding = isGoodStanding(status);

    const notes: string[] = [
      `Colorado SOS match: ${best.row.entityname} (${status ?? "status unknown"}, ${Math.round(
        confidence * 100,
      )}% name match).`,
    ];
    if (typeof ageMonths === "number" && ageMonths <= 12) {
      notes.push(`New Colorado entity — formed ~${ageMonths} month(s) ago.`);
    }
    if (isInactiveStatus(status)) notes.push(`Entity status flagged: ${status}.`);

    return {
      stateRegistryProvider: "colorado_sos",
      stateEntityFound: true,
      stateEntityName: best.row.entityname,
      stateEntityId: best.row.entityid,
      stateEntityUrl: best.row.entityid ? `${ENTITY_DETAIL}${best.row.entityid}` : undefined,
      entityStatus: status,
      entityGoodStanding: goodStanding,
      entityFormationDate: formation,
      formationDate: formation,
      entityAgeMonths: ageMonths,
      stateNameMatchConfidence: confidence,
      notes,
      providersChecked: ["state_registry"],
    };
  } catch (e) {
    return {
      stateRegistryProvider: "colorado_sos",
      stateEntityFound: false,
      notes: [`Colorado SOS lookup failed: ${e instanceof Error ? e.message : String(e)}.`],
      providersChecked: ["state_registry"],
    };
  }
}
