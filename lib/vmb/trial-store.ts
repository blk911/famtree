import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { VmbTrialLead, VmbTrialRecord, VmbTrialSignupInput } from "./types";
import { getVmbTrialsDir } from "./paths";
import { readTrialImportRuns } from "./trial-import-store";

const TRIALS_FILE = "trials.v1.json";

function generateTrialId(): string {
  return `vmb-trial-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

async function readAllLeads(): Promise<VmbTrialLead[]> {
  const dir = getVmbTrialsDir();
  const filePath = path.join(dir, TRIALS_FILE);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is VmbTrialLead =>
        !!r &&
        typeof r === "object" &&
        typeof (r as VmbTrialLead).id === "string" &&
        typeof (r as VmbTrialLead).email === "string",
    );
  } catch {
    return [];
  }
}

async function writeAllLeads(leads: VmbTrialLead[]): Promise<string | null> {
  const dir = getVmbTrialsDir();
  const filePath = path.join(dir, TRIALS_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(leads, null, 2), "utf8");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function createVmbTrialLead(
  input: VmbTrialSignupInput,
): Promise<{ lead: VmbTrialLead } | { error: string }> {
  const lead: VmbTrialLead = {
    id: generateTrialId(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    salonName: input.salonName.trim(),
    providerPlatform: input.providerPlatform.trim(),
    createdAt: new Date().toISOString(),
  };

  const existing = await readAllLeads();
  existing.unshift(lead);
  const err = await writeAllLeads(existing);
  if (err) return { error: err };
  return { lead };
}

export async function getVmbTrialLead(id: string): Promise<VmbTrialLead | undefined> {
  const leads = await readAllLeads();
  return leads.find((l) => l.id === id);
}

export async function getVmbTrialRecord(id: string): Promise<VmbTrialRecord | undefined> {
  const lead = await getVmbTrialLead(id);
  if (!lead) return undefined;
  const importRuns = await readTrialImportRuns(id);
  return { ...lead, importRuns };
}
