import { STUDIO_BUILDER_WIZARD_HREF } from "@/lib/studios/publishedSpaceBridge";

export { STUDIO_BUILDER_WIZARD_HREF };

export function studioBuilderHref(draftId?: string | null): string {
  if (draftId) return `${STUDIO_BUILDER_WIZARD_HREF}?draftId=${encodeURIComponent(draftId)}`;
  return STUDIO_BUILDER_WIZARD_HREF;
}
