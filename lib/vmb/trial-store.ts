import crypto from "crypto";
import type { CreateVmbTrialLeadInput, VmbTrialLead } from "@/types/vmb/trial";
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

export async function createVmbTrialLead(
  input: CreateVmbTrialLeadInput,
): Promise<{ lead: VmbTrialLead } | { error: string }> {
  const salonName = input.salonName?.trim();
  const ownerName = input.ownerName?.trim();
  const email = input.email?.trim().toLowerCase();

  if (!salonName) return { error: "salonName is required" };
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

  const existing = await listVmbTrialLeads();
  existing.unshift(lead);
  const err = await writeJsonArray(getVmbTrialsFile(), existing);
  if (err) return { error: err };
  return { lead };
}

export async function listVmbTrialLeads(): Promise<VmbTrialLead[]> {
  return readJsonArray(getVmbTrialsFile(), isTrialLead);
}

export async function getVmbTrialLead(id: string): Promise<VmbTrialLead | undefined> {
  const leads = await listVmbTrialLeads();
  return leads.find((l) => l.id === id);
}
