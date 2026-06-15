import type { VmbCardTemplate } from "@/lib/vmb/card-templates/card-template-types";
import type { VmbOutreachTemplateType } from "@/lib/vmb/card-templates/card-template-types";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

type TemplateRow = {
  id: string;
  salon_id: string | null;
  type: string;
  name: string;
  payload: unknown;
  created_at: Date;
  updated_at: Date;
};

function isVmbCardTemplate(item: unknown): item is VmbCardTemplate {
  if (!item || typeof item !== "object") return false;
  const t = item as VmbCardTemplate;
  return (
    typeof t.id === "string" &&
    typeof t.type === "string" &&
    typeof t.name === "string" &&
    typeof t.messageTemplate === "string" &&
    typeof t.primaryCta === "string"
  );
}

function parsePayload(raw: unknown): VmbCardTemplate | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parsePayload(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  return isVmbCardTemplate(raw) ? raw : undefined;
}

function overrideId(salonId: string, type: VmbOutreachTemplateType): string {
  return `${salonId.trim()}-${type}`;
}

export async function listTemplateOverridesForSalonPostgres(
  salonId: string,
): Promise<VmbCardTemplate[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];

  try {
    const rows = await prisma.$queryRaw<TemplateRow[]>`
      SELECT id, salon_id, type, name, payload, created_at, updated_at
      FROM vmb_card_template
      WHERE salon_id = ${salonId.trim()}
      ORDER BY type ASC
    `;
    return rows
      .map((row) => parsePayload(row.payload))
      .filter((template): template is VmbCardTemplate => !!template);
  } catch {
    return [];
  }
}

export async function getTemplateOverrideForTypePostgres(
  salonId: string,
  type: VmbOutreachTemplateType,
): Promise<VmbCardTemplate | undefined> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return undefined;

  try {
    const rows = await prisma.$queryRaw<TemplateRow[]>`
      SELECT id, salon_id, type, name, payload, created_at, updated_at
      FROM vmb_card_template
      WHERE salon_id = ${salonId.trim()} AND type = ${type}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? parsePayload(row.payload) : undefined;
  } catch {
    return undefined;
  }
}

export async function upsertTemplateOverridePostgres(
  salonId: string,
  template: VmbCardTemplate,
): Promise<{ template: VmbCardTemplate } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for card template overrides" };
  }

  const id = overrideId(salonId, template.type);
  const now = new Date().toISOString();
  const payload: VmbCardTemplate = {
    ...template,
    id,
    salonId,
    isDefault: false,
    updatedAt: now,
    createdAt: template.createdAt || now,
  };

  try {
    await prisma.$executeRaw`
      INSERT INTO vmb_card_template (id, salon_id, type, name, payload, created_at, updated_at)
      VALUES (
        ${id},
        ${salonId.trim()},
        ${template.type},
        ${template.name},
        ${JSON.stringify(payload)}::jsonb,
        ${payload.createdAt}::timestamptz,
        ${now}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;
    return { template: payload };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save card template" };
  }
}

export async function deleteTemplateOverridePostgres(
  salonId: string,
  type: VmbOutreachTemplateType,
): Promise<{ ok: true } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for card template overrides" };
  }

  try {
    await prisma.$executeRaw`
      DELETE FROM vmb_card_template
      WHERE salon_id = ${salonId.trim()} AND type = ${type}
    `;
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to reset card template" };
  }
}

export async function deleteAllTemplateOverridesForSalonPostgres(
  salonId: string,
): Promise<void> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return;

  try {
    await prisma.$executeRaw`
      DELETE FROM vmb_card_template WHERE salon_id = ${salonId.trim()}
    `;
  } catch {
    // best effort for tests
  }
}
