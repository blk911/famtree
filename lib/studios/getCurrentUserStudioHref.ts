// lib/studios/getCurrentUserStudioHref.ts
// Logged-in studio owners: primary nav target for "AIH Studios".

export type StudioNavUserInput = {
  studioSlug?: string | null;
  tenantId?: string | null;
  studioId?: string | null;
  studiosOwned?: readonly { slug: string }[] | null;
};

/**
 * Authenticated app shell: send users to their **owned** published studio when one exists.
 * Otherwise `/studios/start` (neutral template builder).
 *
 * `tenantId` is not used for routing — it was conflating demo personas (e.g. deb-dazzle) with
 * members who were wired for modeling. Only `studios.ownerId` determines a live public slug.
 */
export function getCurrentUserStudioHref(user: StudioNavUserInput | null | undefined): string {
  if (!user) return "/studios";

  const ownedSlug = user.studiosOwned?.[0]?.slug?.trim();
  if (ownedSlug) return `/studios/${ownedSlug}`;

  return "/studios/start";
}

export function isStudiosPrimaryNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href.startsWith("/studios/") && href !== "/studios/start" && pathname.startsWith(`${href}/`)) return true;
  if (
    href === "/studios/start" &&
    (pathname === "/studios/start" ||
      pathname.startsWith("/studios/start/") ||
      pathname === "/studios/template/salon" ||
      pathname.startsWith("/studios/template/salon/") ||
      pathname === "/studios/apply" ||
      pathname.startsWith("/studios/apply/"))
  ) {
    return true;
  }
  return false;
}
