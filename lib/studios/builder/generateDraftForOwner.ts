import { prisma } from "@/lib/db/prisma";
import { generateStudioDraftContent } from "@/lib/studios/builder/generateDraft";
import { mapDraftFromDb } from "@/lib/studios/builder/mappers";
import { StudioBuilderError } from "@/lib/studios/builder/index";
import type { StudioDraftDTO } from "@/types/studios/builder";

export async function generateDraftForOwner(
  draftId: string,
  ownerUserId: string,
  stewardName?: string,
): Promise<StudioDraftDTO> {
  const row = await prisma.studioBuilderDraft.findFirst({
    where: { id: draftId, ownerUserId },
    include: { sources: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) {
    throw new StudioBuilderError("Draft not found.", "NOT_FOUND");
  }
  if (row.status === "published") {
    throw new StudioBuilderError("Published drafts cannot be regenerated.", "CONFLICT");
  }

  const draft = mapDraftFromDb(row);
  const content = generateStudioDraftContent({
    templateType: draft.templateType,
    sources: draft.sources ?? [],
    stewardName,
  });

  const updated = await prisma.studioBuilderDraft.update({
    where: { id: draftId },
    data: {
      content: content as object,
      builderStep: "review_draft",
      version: { increment: 1 },
    },
    include: { sources: { orderBy: { createdAt: "asc" } } },
  });

  return mapDraftFromDb(updated);
}
