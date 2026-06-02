// lib/intelligence/salon/qualified-operator/list.ts

import { filterProspects } from "@/lib/studios/prospects/store";
import { enrichProspectBookingIfMissing } from "../booking-from-trail";
import { listBusinessStacks } from "../business-stack/stack-store";
import { bookingProviderIdToStackId } from "../business-stack/provider-registry";
import { scoreQualifiedOperator } from "./engine";
import type { QualifiedOperatorResult, QualificationStatus } from "./types";

export type QualifiedOperatorListOptions = {
  limit?: number;
  status?: QualificationStatus | "all";
  provider?: string;
  category?: string;
};

export type QualifiedOperatorListSummary = {
  total: number;
  campaign_ready: number;
  qualified: number;
  needs_enrichment: number;
  prospect_only: number;
  rejected: number;
};

export async function listQualifiedOperators(
  options?: QualifiedOperatorListOptions,
): Promise<{
  operators: QualifiedOperatorResult[];
  summary: QualifiedOperatorListSummary;
}> {
  const limit = Math.min(500, Math.max(1, options?.limit ?? 500));

  let prospects = (await filterProspects({ vertical: "salon" })).map((p) =>
    enrichProspectBookingIfMissing(p),
  );

  const stacks = await listBusinessStacks({ limit: 500 });
  const stackById = new Map(stacks.map((s) => [s.prospectId, s]));

  let operators = prospects.map((p) =>
    scoreQualifiedOperator({
      prospect: p,
      stack: stackById.get(p.prospectId) ?? null,
    }),
  );

  if (options?.status && options.status !== "all") {
    operators = operators.filter((o) => o.qualificationStatus === options.status);
  }

  if (options?.provider && options.provider !== "all") {
    const want = options.provider.toLowerCase();
    const stackBooking = bookingProviderIdToStackId(want) ?? want;
    operators = operators.filter((o) => {
      const stack = stackById.get(o.prospectId);
      if (stack?.primaryBookingProvider === stackBooking) return true;
      return (o.bookingProvider ?? "unknown").toLowerCase() === want;
    });
  }

  if (options?.category && options.category !== "all") {
    const want = options.category.toLowerCase();
    operators = operators.filter(
      (o) => (o.businessCategory ?? "").toLowerCase() === want,
    );
  }

  operators.sort((a, b) => {
    if (b.qualifiedOperatorScore !== a.qualifiedOperatorScore) {
      return b.qualifiedOperatorScore - a.qualifiedOperatorScore;
    }
    return a.instagramHandle.localeCompare(b.instagramHandle);
  });

  operators = operators.slice(0, limit);

  const allScored = prospects.map((p) =>
    scoreQualifiedOperator({
      prospect: p,
      stack: stackById.get(p.prospectId) ?? null,
    }),
  );

  const summary: QualifiedOperatorListSummary = {
    total: allScored.length,
    campaign_ready: allScored.filter((o) => o.qualificationStatus === "campaign_ready").length,
    qualified: allScored.filter((o) => o.qualificationStatus === "qualified").length,
    needs_enrichment: allScored.filter((o) => o.qualificationStatus === "needs_enrichment").length,
    prospect_only: allScored.filter((o) => o.qualificationStatus === "prospect_only").length,
    rejected: allScored.filter((o) => o.qualificationStatus === "rejected").length,
  };

  return { operators, summary };
}

export function getQualifiedOperatorForProspect(
  prospect: Parameters<typeof scoreQualifiedOperator>[0]["prospect"],
  stack?: Parameters<typeof scoreQualifiedOperator>[0]["stack"],
): QualifiedOperatorResult {
  return scoreQualifiedOperator({ prospect, stack });
}
