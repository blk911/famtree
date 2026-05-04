// lib/studios/getCurrentUserStudioHref.ts
// Logged-in studio owners: primary nav target for "AIH Studios".

export type StudioNavUserInput = {
  studioSlug?: string | null;
  tenantId?: string | null;
  studioId?: string | null;
  studiosOwned?: readonly { slug: string }[] | null;
};

/**
 * Authenticated app shell: send owners to their public studio URL when we can resolve a slug.
 * No slug → onboarding-style entry (`/studios/start`).
 * Not used for anonymous visitors (they use `/studios` directly).
 */
export function getCurrentUserStudioHref(user: StudioNavUserInput | null | undefined): string {
  if (!user) return "/studios";

  const ownedSlug = user.studiosOwned?.[0]?.slug?.trim();
  const slug =
    (user.studioSlug && String(user.studioSlug).trim()) ||
    (user.tenantId && String(user.tenantId).trim()) ||
    (user.studioId && String(user.studioId).trim()) ||
    (ownedSlug && ownedSlug);

  if (slug) return `/studios/${slug}`;
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
