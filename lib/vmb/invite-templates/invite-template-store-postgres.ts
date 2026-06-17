import type { VmbInviteTemplate } from "./invite-template-types";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

type TemplateRow = {
  payload: unknown;
};

function parseTemplate(raw: unknown): VmbInviteTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const template = raw as VmbInviteTemplate;
  if (typeof template.id !== "string" || typeof template.categoryId !== "string") return null;
  if (typeof template.inviteType !== "string") return null;
  return template;
}

export async function listInviteTemplateOverridesPostgres(): Promise<VmbInviteTemplate[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];
  try {
    const rows = await prisma.$queryRaw<TemplateRow[]>`
      SELECT payload FROM vmb_invite_template
    `;
    return rows
      .map((row) => parseTemplate(row.payload))
      .filter((template): template is VmbInviteTemplate => Boolean(template));
  } catch {
    return [];
  }
}

export async function upsertInviteTemplatePostgres(
  template: VmbInviteTemplate,
): Promise<{ template: VmbInviteTemplate } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres required for invite template storage" };
  }
  try {
    await prisma.$executeRaw`
      INSERT INTO vmb_invite_template (id, category_id, payload, updated_at)
      VALUES (
        ${template.id},
        ${template.categoryId},
        ${JSON.stringify(template)}::jsonb,
        ${template.updatedAt}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;
    return { template };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save invite template" };
  }
}
