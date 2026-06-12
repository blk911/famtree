import { resolveBookLoadedState } from "@/lib/vmb/book-status";
import type { AiosContextPacket } from "@/lib/taikos/types";

/** Single source of truth for whether book ingest is available to tAIkOS surfaces. */
export function hasLoadedBookData(ctx: AiosContextPacket): boolean {
  return resolveBookLoadedState({
    hasRealBookData: ctx.hasRealBookData,
    clientSummary: ctx.clientSummary,
    codaSummary: ctx.codaSummary,
    analysisId: ctx.analysisId,
    recordCount: ctx.recordCount ?? ctx.clientSummary.totalClients,
  });
}
