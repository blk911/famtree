import type { AiosContextPacket } from "@/lib/taikos/types";

/** Tool stub — exposes page context for future orchestration / model tool calls. */
export function getPageContextToolPayload(ctx: AiosContextPacket) {
  return {
    pageId: ctx.currentPage.pageId,
    title: ctx.currentPage.title,
    description: ctx.currentPage.description,
    actions: ctx.currentPage.availableActions,
  };
}
