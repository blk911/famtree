import type { VmbTrialLead } from "@/types/vmb/trial";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

function isTrialLead(item: unknown): item is VmbTrialLead {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as VmbTrialLead).id === "string" &&
    typeof (item as VmbTrialLead).email === "string"
  );
}

function parsePayload(raw: unknown): VmbTrialLead | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parsePayload(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  return isTrialLead(raw) ? raw : undefined;
}

type TrialRow = { payload: unknown };

export async function getVmbTrialLeadPostgres(id: string): Promise<VmbTrialLead | undefined> {
  const backend = await resolveVmbStorageBackend();
  if (backend !== "postgres") return undefined;

  try {
    const rows = await prisma.$queryRaw<TrialRow[]>`
      SELECT payload FROM vmb_trial_lead WHERE trial_id = ${id.trim()} LIMIT 1
    `;
    return parsePayload(rows[0]?.payload);
  } catch {
    return undefined;
  }
}

export async function saveVmbTrialLeadPostgres(lead: VmbTrialLead): Promise<string | null> {
  try {
    const backend = await resolveVmbStorageBackend();
    if (backend !== "postgres") return "Postgres backend unavailable";

    await prisma.$executeRaw`
      INSERT INTO vmb_trial_lead (trial_id, payload, updated_at)
      VALUES (${lead.id}, ${JSON.stringify(lead)}::jsonb, now())
      ON CONFLICT (trial_id) DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = now()
    `;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
