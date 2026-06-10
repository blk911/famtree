import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";

export type ClientPoolEntry = {
  clientName: string;
  visitCount: number;
  daysInactive: number | null;
  spendScore: number;
};

function parseDaysInactive(summary: string): number | null {
  const match = summary.match(/(\d+)\s+days?\s+ago/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseVisitCount(summary: string): number | null {
  const match = summary.match(/(\d+)\s+visits?/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function recencyScore(daysInactive: number | null): number {
  if (daysInactive === null) return 6;
  if (daysInactive < 30) return 10;
  if (daysInactive < 60) return 8;
  if (daysInactive < 90) return 5;
  return 2;
}

export function spendScoreFromValue(amount: number): number {
  return Math.min(10, Math.max(1, Math.round(amount / 25)));
}

export function extractClientPool(analysis: VmbBookAnalysisResult): ClientPoolEntry[] {
  const byName = new Map<string, ClientPoolEntry>();

  function upsert(clientName: string, patch: Partial<ClientPoolEntry>) {
    const key = clientName.trim().toLowerCase();
    const existing = byName.get(key) ?? {
      clientName: clientName.trim(),
      visitCount: 0,
      daysInactive: null,
      spendScore: 0,
    };
    byName.set(key, {
      clientName: existing.clientName,
      visitCount: Math.max(existing.visitCount, patch.visitCount ?? 0),
      daysInactive:
        patch.daysInactive !== undefined
          ? patch.daysInactive === null
            ? existing.daysInactive
            : existing.daysInactive === null
              ? patch.daysInactive
              : Math.min(existing.daysInactive, patch.daysInactive)
          : existing.daysInactive,
      spendScore: Math.max(existing.spendScore, patch.spendScore ?? 0),
    });
  }

  for (const opp of analysis.reactivationTargets) {
    upsert(opp.clientName, {
      daysInactive: parseDaysInactive(opp.summary),
      spendScore: spendScoreFromValue(opp.estimatedValue),
    });
  }

  for (const opp of analysis.referralOpportunities) {
    upsert(opp.clientName, {
      visitCount: parseVisitCount(opp.summary) ?? 3,
      daysInactive: 30,
      spendScore: spendScoreFromValue(opp.estimatedValue),
    });
  }

  for (const opp of analysis.giftOpportunities) {
    upsert(opp.clientName, {
      visitCount: 2,
      daysInactive: 45,
      spendScore: spendScoreFromValue(opp.estimatedValue),
    });
  }

  for (const intro of analysis.trustedProviderIntroOpportunities) {
    upsert(intro.clientName, {
      visitCount: 4,
      daysInactive: 20,
      spendScore: 6,
    });
  }

  return Array.from(byName.values());
}

export function scoreCandidate(entry: ClientPoolEntry): number {
  return entry.visitCount + recencyScore(entry.daysInactive) + entry.spendScore;
}
