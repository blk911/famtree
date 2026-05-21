import type { User } from "@prisma/client";

/** Slug for live preview only when the user owns a persisted Studio row (not tenant_id demo wiring). */
export function getEditorPreviewSlug(
  user: (Pick<User, "tenantId"> & { studiosOwned?: readonly { slug: string }[] }) | null,
): string | null {
  if (!user) return null;
  return user.studiosOwned?.[0]?.slug?.trim() || null;
}
