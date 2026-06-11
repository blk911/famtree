import type { AiosResponse, GenerateAiosInput } from "@/lib/taikos/types";

/**
 * Placeholder OpenAI adapter — business logic must not depend on this.
 * Phase 2+: wire provider here; map model JSON → AiosResponse schema.
 */
export async function openaiAiosAdapter(_input: GenerateAiosInput): Promise<AiosResponse> {
  throw new Error(
    "OpenAI adapter not configured. Set AIOS_ADAPTER=mock or implement openaiAiosAdapter in Phase 2.",
  );
}
