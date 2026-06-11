import type { AiosAdapterId, AiosResponse, GenerateAiosInput } from "@/lib/taikos/types";
import { localAiosAdapter } from "./local";
import { mockAiosAdapter } from "./mock";
import { openaiAiosAdapter } from "./openai";

export function resolveAiosAdapterId(): AiosAdapterId {
  const env = process.env.AIOS_ADAPTER?.trim().toLowerCase();
  if (env === "openai") return "openai";
  if (env === "local") return "local";
  return "mock";
}

export async function generateAiosResponse(input: GenerateAiosInput): Promise<AiosResponse> {
  const adapter = resolveAiosAdapterId();
  switch (adapter) {
    case "openai":
      return openaiAiosAdapter(input);
    case "local":
      return localAiosAdapter(input);
    case "mock":
    default:
      return mockAiosAdapter(input);
  }
}
