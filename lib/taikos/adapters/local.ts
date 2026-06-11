import type { AiosResponse, GenerateAiosInput } from "@/lib/taikos/types";

/**
 * Placeholder local-model adapter for future on-device / self-hosted models.
 */
export async function localAiosAdapter(_input: GenerateAiosInput): Promise<AiosResponse> {
  throw new Error(
    "Local model adapter not configured. Set AIOS_ADAPTER=mock until local inference is wired.",
  );
}
