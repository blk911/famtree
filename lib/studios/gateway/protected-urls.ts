/** Studio / app URLs that imply account ownership or gated surfaces — intercept on public gateway. */
export function isProtectedStudiosHref(href: string): boolean {
  const raw = href.trim();
  if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return false;

  let pathWithQuery = raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const u = new URL(raw);
      pathWithQuery = `${u.pathname}${u.search}`;
    } catch {
      return false;
    }
  }

  const [pathOnly] = pathWithQuery.split("?");
  const path = pathOnly || "";

  if (path.startsWith("/login") || path.startsWith("/register")) return false;

  if (path.startsWith("/settings")) return true;
  if (path.startsWith("/dashboard")) return true;

  if (path === "/studios/create" || path.startsWith("/studios/create/")) return true;
  if (path === "/studios/start" || path.startsWith("/studios/start/")) return true;
  if (path === "/studios/drafts") return true;
  if (path === "/studios/my-studios") return true;
  if (path.startsWith("/studios/inbox")) return true;
  if (path.startsWith("/studios/apply")) return true;
  if (path.startsWith("/studios/template")) return true;

  return false;
}
