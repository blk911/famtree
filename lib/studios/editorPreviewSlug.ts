import type { User } from "@prisma/client";

/** Slug for studio preview URL when editor Preview button is enabled (tenant or owned studio). */
export function getEditorPreviewSlug(
  user: (Pick<User, "tenantId"> & { studiosOwned?: readonly { slug: string }[] }) | null,
): string | null {
  if (!user) return null;
  const owned = user.studiosOwned?.[0]?.slug?.trim();
  const tid = user.tenantId?.trim();
  return tid || owned || null;
}
