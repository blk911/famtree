import crypto from "crypto";
import type {
  CreateTrustedIntroInput,
  TrustedProviderIntroRequest,
} from "@/types/vmb/trusted-circle";
import { getVmbTrustedIntroFile } from "../paths";
import { readJsonArray, writeJsonArray } from "../runtime-json-store";
import { buildTrustedIntroMessage } from "./build-intro-message";

function isIntroRequest(item: unknown): item is TrustedProviderIntroRequest {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TrustedProviderIntroRequest).requestId === "string"
  );
}

export async function createTrustedIntroRequest(
  input: CreateTrustedIntroInput,
): Promise<{ request: TrustedProviderIntroRequest } | { error: string }> {
  const clientName = input.clientName?.trim();
  const requestedCategory = input.requestedCategory?.trim();
  if (!clientName) return { error: "clientName is required" };
  if (!requestedCategory) return { error: "requestedCategory is required" };

  const salonName = input.salonName?.trim() || "Your salon";
  const messageDraft = buildTrustedIntroMessage({
    salonName,
    clientName,
    providerCategory: requestedCategory,
    providerName: input.providerName,
  });

  const request: TrustedProviderIntroRequest = {
    requestId: `intro-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    trialId: input.trialId?.trim(),
    analysisId: input.analysisId?.trim(),
    salonName: input.salonName,
    clientName,
    clientEmail: input.clientEmail?.trim(),
    clientPhone: input.clientPhone?.trim(),
    requestedCategory,
    providerName: input.providerName?.trim(),
    providerEmail: input.providerEmail?.trim(),
    providerPhone: input.providerPhone?.trim(),
    messageDraft,
    status: "draft",
    createdAt: new Date().toISOString(),
  };

  const all = await listTrustedIntroRequests();
  all.unshift(request);
  const err = await writeJsonArray(getVmbTrustedIntroFile(), all);
  if (err) return { error: err };
  return { request };
}

export async function listTrustedIntroRequests(): Promise<TrustedProviderIntroRequest[]> {
  return readJsonArray(getVmbTrustedIntroFile(), isIntroRequest);
}

export async function listTrustedIntroRequestsForTrial(
  trialId: string,
): Promise<TrustedProviderIntroRequest[]> {
  const all = await listTrustedIntroRequests();
  return all.filter((r) => r.trialId === trialId);
}
