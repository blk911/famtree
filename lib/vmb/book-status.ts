export type BookLoadedStateInput = {
  hasRealBookData?: boolean;
  clientSummary?: { totalClients?: number };
  codaSummary?: { context?: { importedClientCount?: number } };
  analysisId?: string | null;
  clients?: unknown[];
  recordCount?: number;
};

/** Shared source of truth — Today, Clients, tAIkOS, and Process flows. */
export function resolveBookLoadedState(input: BookLoadedStateInput): boolean {
  return Boolean(
    input.hasRealBookData ||
      (input.clientSummary?.totalClients ?? 0) > 0 ||
      (input.codaSummary?.context?.importedClientCount ?? 0) > 0 ||
      !!input.analysisId?.trim() ||
      (input.clients?.length ?? 0) > 0 ||
      (input.recordCount ?? 0) > 0,
  );
}

export function importedClientCount(input: BookLoadedStateInput): number {
  return Math.max(
    input.clientSummary?.totalClients ?? 0,
    input.codaSummary?.context?.importedClientCount ?? 0,
    input.recordCount ?? 0,
    input.clients?.length ?? 0,
  );
}
