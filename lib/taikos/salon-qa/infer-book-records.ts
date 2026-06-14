import type { VmbBookAnalysisResult, VmbBookOpportunity } from "@/types/vmb/book-analysis";
import type { VmbBookRecord } from "@/types/vmb/provider-ingest";

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function parseDaysAgo(summary: string): number | null {
  const match = summary.match(/(\d+)\s+days?\s+ago/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseVisitCount(summary: string): number | null {
  const match = summary.match(/(\d+)\s+visits?/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseService(summary: string): string | undefined {
  const match = summary.match(/Service "([^"]+)"/i);
  return match?.[1];
}

function approximateLastVisit(daysAgo: number, generatedAt: string): string {
  const base = Date.parse(generatedAt);
  const ref = Number.isNaN(base) ? Date.now() : base;
  const d = new Date(ref - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function mergeOpportunity(record: VmbBookRecord, opp: VmbBookOpportunity, generatedAt: string): void {
  record.amountSpent = Math.max(record.amountSpent ?? 0, opp.estimatedValue);
  const days = parseDaysAgo(opp.summary);
  if (days !== null) {
    record.lastVisitDate = approximateLastVisit(days, generatedAt);
  }
  const visits = parseVisitCount(opp.summary);
  if (visits !== null) record.visitCount = Math.max(record.visitCount ?? 0, visits);
  const service = parseService(opp.summary);
  if (service) record.serviceName = service;
}

/** Best-effort records from analysis when raw CSV is unavailable. */
export function inferBookRecordsFromAnalysis(analysis: VmbBookAnalysisResult): VmbBookRecord[] {
  const byName = new Map<string, VmbBookRecord>();
  const generatedAt = analysis.generatedAt;

  const allOpps = [
    ...analysis.reactivationTargets,
    ...analysis.referralOpportunities,
    ...analysis.giftOpportunities,
  ];

  for (const opp of allOpps) {
    const key = opp.clientName.trim().toLowerCase();
    if (!key) continue;
    const existing =
      byName.get(key) ??
      ({
        id: `inferred-${slug(opp.clientName)}`,
        clientName: opp.clientName.trim(),
        visitCount: 0,
        amountSpent: 0,
      } satisfies VmbBookRecord);
    mergeOpportunity(existing, opp, generatedAt);
    byName.set(key, existing);
  }

  return Array.from(byName.values());
}

export function mergeBookRecords(primary: VmbBookRecord[], fallback: VmbBookRecord[]): VmbBookRecord[] {
  if (primary.length >= fallback.length) return primary;
  const byName = new Map(primary.map((r) => [r.clientName.trim().toLowerCase(), r]));
  for (const row of fallback) {
    const key = row.clientName.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, row);
  }
  return Array.from(byName.values());
}
