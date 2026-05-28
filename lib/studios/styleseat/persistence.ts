import { listProspects, updateProspect, upsertProspect } from "@/lib/studios/prospects/store";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { operatorToUpsertInput, type StyleSeatHarvestContext } from "./normalize";
import type {
  StyleSeatOperator,
  StyleSeatProspectPersistenceAuditEntry,
  StyleSeatProspectPersistenceAuditSummary,
} from "./types";

function styleSeatUrlFor(operator: StyleSeatOperator): string {
  return operator.styleseatUrl || operator.sourceUrl || "";
}

function findExistingProspect(operator: StyleSeatOperator, prospects: ProspectRecord[]): ProspectRecord | null {
  const url = styleSeatUrlFor(operator);
  const slug = operator.slug?.toLowerCase();
  return prospects.find((prospect) => {
    const urlMatch = !!url && (
      prospect.bestMatch?.url === url ||
      prospect.allMatchedUrls.some((matched) => matched.url === url)
    );
    const handleMatch = !!slug && prospect.identity.handle.toLowerCase() === slug;
    return urlMatch || handleMatch;
  }) ?? null;
}

function validationErrorsFor(operator: StyleSeatOperator): string[] {
  const errors: string[] = [];
  if (!operator.name?.trim()) errors.push("missing_name");
  if (!styleSeatUrlFor(operator)) errors.push("missing_profile_url");
  if (![operator.city, operator.state].filter(Boolean).join(", ").trim()) errors.push("missing_market");
  if (operator.categories.length === 0 && operator.services.length === 0 && operator.specialties.length === 0) {
    errors.push("missing_category_or_services");
  }
  return errors;
}

function summarize(entries: StyleSeatProspectPersistenceAuditEntry[]): StyleSeatProspectPersistenceAuditSummary {
  const skipCounts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.skippedReason) skipCounts.set(entry.skippedReason, (skipCounts.get(entry.skippedReason) ?? 0) + 1);
  }
  return {
    attempted: entries.filter((entry) => entry.attemptedSave).length,
    created: entries.filter((entry) => entry.saved && !entry.matchedExistingProspectId).length,
    updated: entries.filter((entry) => entry.saved && !!entry.matchedExistingProspectId).length,
    skipped: entries.filter((entry) => !!entry.skippedReason).length,
    failed: entries.filter((entry) => entry.attemptedSave && !entry.saved && !entry.skippedReason).length,
    topSkipReasons: Array.from(skipCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}

export interface StyleSeatPersistenceResult {
  audit: StyleSeatProspectPersistenceAuditEntry[];
  summary: StyleSeatProspectPersistenceAuditSummary;
  prospects: Array<{ prospectId: string; handle: string | null; name: string }>;
  saveErrors: Array<{ handle: string; sourceHashtag: string; platform: null; message: string }>;
  savedHandles: string[];
}

export async function persistStyleSeatDiscoveries(
  operators: StyleSeatOperator[],
  ctx: StyleSeatHarvestContext,
): Promise<StyleSeatPersistenceResult> {
  const existingBefore = await listProspects();
  const audit: StyleSeatProspectPersistenceAuditEntry[] = [];
  const prospects: StyleSeatPersistenceResult["prospects"] = [];
  const saveErrors: StyleSeatPersistenceResult["saveErrors"] = [];
  const savedHandles: string[] = [];

  for (const operator of operators) {
    const validationErrors = validationErrorsFor(operator);
    const category = operator.categories[0] ?? operator.services[0]?.name ?? operator.specialties[0] ?? null;
    const baseEntry = {
      name: operator.name,
      profileUrl: styleSeatUrlFor(operator) || null,
      city: [operator.city, operator.state].filter(Boolean).join(", ") || null,
      category,
      validationErrors,
      resolverStatus: "not_resolved" as const,
    };

    if (validationErrors.length > 0) {
      audit.push({
        ...baseEntry,
        attemptedSave: false,
        saved: false,
        skippedReason: validationErrors.join(","),
        prospectId: null,
        matchedExistingProspectId: null,
      });
      continue;
    }

    const matchedExisting = findExistingProspect(operator, existingBefore);
    try {
      const input = operatorToUpsertInput(operator, null, [], ctx);
      const saved = await upsertProspect(input);
      if (!matchedExisting) {
        await updateProspect(saved.prospectId, {
          status: "styleseat_discovered",
          notes: "verificationState=discovered; igStatus=unresolved",
        });
      }
      prospects.push({
        prospectId: saved.prospectId,
        handle: saved.identity.handle,
        name: saved.identity.name,
      });
      savedHandles.push(saved.identity.handle);
      audit.push({
        ...baseEntry,
        attemptedSave: true,
        saved: true,
        skippedReason: null,
        prospectId: saved.prospectId,
        matchedExistingProspectId: matchedExisting?.prospectId ?? null,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      saveErrors.push({
        handle: operator.slug || operator.name,
        sourceHashtag: operator.categories[0] ?? "beauty",
        platform: null,
        message,
      });
      audit.push({
        ...baseEntry,
        attemptedSave: true,
        saved: false,
        skippedReason: null,
        prospectId: null,
        matchedExistingProspectId: matchedExisting?.prospectId ?? null,
      });
    }
  }

  return {
    audit,
    summary: summarize(audit),
    prospects,
    saveErrors,
    savedHandles,
  };
}
