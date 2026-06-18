import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";
import { parseInviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import { templateKeysForPublishedCopy } from "@/lib/vmb/invites/published-copy-matching";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";

type SalonInviteCopyRow = {
  id: string;
  salon_id: string;
  source_template_id: string;
  published_version: number;
  payload: unknown;
  created_at: Date;
  updated_at: Date;
};

function isSalonInviteLocalCopy(item: unknown): item is SalonInviteLocalCopy {
  if (!item || typeof item !== "object") return false;
  const copy = item as SalonInviteLocalCopy;
  return (
    typeof copy.id === "string" &&
    typeof copy.salonId === "string" &&
    typeof copy.sourceTemplateId === "string" &&
    typeof copy.publishedVersion === "number" &&
    !!copy.snapshot
  );
}

function parseCopyPayload(raw: unknown): SalonInviteLocalCopy | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parseCopyPayload(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  if (!isSalonInviteLocalCopy(raw)) return undefined;
  const snapshot = parseInviteTemplateSnapshot(raw.snapshot);
  if (!snapshot) return undefined;
  return { ...raw, snapshot };
}

export async function listSalonInviteLocalCopiesPostgres(
  salonId: string,
): Promise<SalonInviteLocalCopy[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];

  try {
    const rows = await prisma.$queryRaw<SalonInviteCopyRow[]>`
      SELECT id, salon_id, source_template_id, published_version, payload, created_at, updated_at
      FROM vmb_salon_invite_copy
      WHERE salon_id = ${salonId.trim()}
      ORDER BY updated_at DESC
    `;
    return rows
      .map((row) => parseCopyPayload(row.payload))
      .filter((copy): copy is SalonInviteLocalCopy => !!copy);
  } catch {
    return [];
  }
}

export async function publishSalonInviteLocalCopyPostgres(
  salonId: string,
  copy: SalonInviteLocalCopy,
  replaceTemplateKeys: string[],
): Promise<{ copy: SalonInviteLocalCopy } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres storage backend unavailable" };
  }

  try {
    const existing = await listSalonInviteLocalCopiesPostgres(salonId);
    const deleteIds = existing
      .filter((row) =>
        templateKeysForPublishedCopy(row).some((key) => replaceTemplateKeys.includes(key)),
      )
      .map((row) => row.id);

    for (const id of deleteIds) {
      await prisma.$executeRaw`
        DELETE FROM vmb_salon_invite_copy WHERE id = ${id}
      `;
    }

    const payload = JSON.stringify(copy);
    await prisma.$executeRaw`
      INSERT INTO vmb_salon_invite_copy (
        id,
        salon_id,
        source_template_id,
        published_version,
        payload,
        created_at,
        updated_at
      )
      VALUES (
        ${copy.id},
        ${salonId.trim()},
        ${copy.sourceTemplateId},
        ${copy.publishedVersion},
        ${payload}::jsonb,
        ${copy.createdAt}::timestamptz,
        ${copy.updatedAt}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        source_template_id = EXCLUDED.source_template_id,
        published_version = EXCLUDED.published_version,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;

    return { copy };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function upsertSalonInviteLocalCopyPostgres(
  salonId: string,
  copy: SalonInviteLocalCopy,
): Promise<{ copy: SalonInviteLocalCopy } | { error: string }> {
  if ((await resolveVmbStorageBackend()) !== "postgres") {
    return { error: "Postgres storage backend unavailable" };
  }

  try {
    const payload = JSON.stringify(copy);
    await prisma.$executeRaw`
      INSERT INTO vmb_salon_invite_copy (
        id,
        salon_id,
        source_template_id,
        published_version,
        payload,
        created_at,
        updated_at
      )
      VALUES (
        ${copy.id},
        ${salonId.trim()},
        ${copy.sourceTemplateId},
        ${copy.publishedVersion},
        ${payload}::jsonb,
        ${copy.createdAt}::timestamptz,
        ${copy.updatedAt}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        source_template_id = EXCLUDED.source_template_id,
        published_version = EXCLUDED.published_version,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;

    return { copy };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function clearSalonInviteLocalCopiesPostgres(salonId: string): Promise<void> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return;
  try {
    await prisma.$executeRaw`
      DELETE FROM vmb_salon_invite_copy WHERE salon_id = ${salonId.trim()}
    `;
  } catch {
    // ignore cleanup failures in tests
  }
}
