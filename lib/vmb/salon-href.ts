import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";

/** Routes that carry ?analysis= when an active analysis exists. */
export const VMB_ANALYSIS_ROUTES = new Set([
  "/vmb/dashboard",
  "/vmb/clients",
  "/vmb/network",
  "/vmb/invites",
  "/vmb/appointments",
  "/vmb/offers",
  "/vmb/history",
]);

/**
 * Build a salon app href with consistent analysis preservation rules.
 * - Book refresh: /vmb/start?mode=refresh (no analysis param)
 * - Settings: no analysis param required
 * - Other app routes: append ?analysis={id} when available
 */
export function buildVmbSalonHref(route: string, activeAnalysisId?: string): string {
  const trimmedRoute = route.trim();
  if (!trimmedRoute) return "/vmb/dashboard";

  if (trimmedRoute.startsWith("/vmb/start")) {
    return trimmedRoute;
  }

  const [path] = trimmedRoute.split("?");
  if (path === "/vmb/settings") {
    return "/vmb/settings";
  }

  const id = activeAnalysisId?.trim();
  if (id && VMB_ANALYSIS_ROUTES.has(path)) {
    return appendVmbAnalysisQuery(path, id);
  }

  return path;
}

/** Dashboard → Invites handoff with section focus. */
export function buildVmbInviteSectionHref(
  analysisId: string,
  section: string,
): string {
  const base = buildVmbSalonHref("/vmb/invites", analysisId);
  const [path, query = ""] = base.split("?");
  const params = new URLSearchParams(query);
  params.set("section", section.trim());
  return `${path}?${params.toString()}`;
}
