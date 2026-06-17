export const NAILS_TEMPLATE_BUILDER_ROUTE = "/admin/invites/builder";
export const NAILS_LIBRARY_ROUTE = "/admin/invites/library";

export function builderRouteForTemplate(templateId: string): string {
  return `${NAILS_TEMPLATE_BUILDER_ROUTE}?template=${encodeURIComponent(templateId)}`;
}

export function libraryRouteForTemplate(templateId: string): string {
  return `${NAILS_LIBRARY_ROUTE}?template=${encodeURIComponent(templateId)}`;
}
