import crypto from "crypto";
import type { CreateVmbTrialLeadInput, VmbTrialLead } from "@/types/vmb/trial";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed } from "@/lib/vmb/storage-policy";
import { getVmbTrialLeadPostgres, saveVmbTrialLeadPostgres } from "@/lib/vmb/trial-store-postgres";
import { getVmbTrialsFile } from "./paths";
import { readJsonArray, writeJsonArray } from "./runtime-json-store";

function generateTrialId(): string {
  return `vmb-trial-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function isTrialLead(item: unknown): item is VmbTrialLead {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as VmbTrialLead).id === "string" &&
    typeof (item as VmbTrialLead).salonName === "string" &&
    typeof (item as VmbTrialLead).ownerName === "string" &&
    typeof (item as VmbTrialLead).email === "string"
  );
}

async function listVmbTrialLeadsJson(): Promise<VmbTrialLead[]> {
  return readJsonArray(getVmbTrialsFile(), isTrialLead);
}

export async function createVmbTrialLead(
  input: CreateVmbTrialLeadInput,
): Promise<{ lead: VmbTrialLead } | { error: string }> {
  const salonName = input.salonName?.trim() || "Your Salon";
  const ownerName = input.ownerName?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!ownerName) return { error: "ownerName is required" };
  if (!email) return { error: "email is required" };

  const lead: VmbTrialLead = {
    id: generateTrialId(),
    salonName,
    ownerName,
    email,
    phone: input.phone?.trim() || undefined,
    providerPlatform: input.providerPlatform,
    createdAt: new Date().toISOString(),
  };

  const writable = await assertVmbWritableBackend();
  if (!writable.ok) return { error: writable.error };

  if (writable.backend === "postgres") {
    const err = await saveVmbTrialLeadPostgres(lead);
    if (err) return { error: err };
    if (vmbJsonFallbackAllowed()) {
      const existing = await listVmbTrialLeadsJson();
      existing.unshift(lead);
      await writeJsonArray(getVmbTrialsFile(), existing);
    }
    return { lead };
  }

  const existing = await listVmbTrialLeadsJson();
  existing.unshift(lead);
  const err = await writeJsonArray(getVmbTrialsFile(), existing);
  if (err) return { error: err };
  return { lead };
}

export async function listVmbTrialLeads(): Promise<VmbTrialLead[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    try {
      const { prisma } = await import("@/lib/vmb/db");
      const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
        SELECT payload FROM vmb_trial_lead ORDER BY created_at DESC
      `;
      return rows
        .map((row) => (isTrialLead(row.payload) ? row.payload : undefined))
        .filter((l): l is VmbTrialLead => !!l);
    } catch {
      return [];
    }
  }
  return listVmbTrialLeadsJson();
}

export async function getVmbTrialLead(id: string): Promise<VmbTrialLead | undefined> {
  const trimmed = id.trim();
  if (!trimmed) return undefined;

  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return getVmbTrialLeadPostgres(trimmed);
  }
  const all = await listVmbTrialLeadsJson();
  return all.find((t) => t.id === trimmed);
}
