import { prisma } from "@/lib/db/prisma";
import { mapDraftFromDb } from "@/lib/studios/builder/mappers";
import type { StudioDraftContentDTO } from "@/types/studios/builder";

export async function loadPublishedStudioContent(
  studioId: string,
): Promise<{ content: StudioDraftContentDTO; templateType: string; trustUnitId: string | null } | null> {
  const draft = await prisma.studioBuilderDraft.findFirst({
    where: { publishedStudioId: studioId, status: "published" },
    include: { sources: true },
  });
  if (!draft) return null;
  const mapped = mapDraftFromDb(draft);
  return {
    content: mapped.content,
    templateType: mapped.templateType,
    trustUnitId: draft.linkedSpaceId,
  };
}
