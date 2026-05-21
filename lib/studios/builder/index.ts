/**
 * Studio Builder service contracts (Agent 94).
 * Persistence via Prisma — used by API routes in Agent 96+.
 */

import { prisma } from "@/lib/db/prisma";
import { buildDefaultDraftContent } from "@/lib/studios/builder/defaultDrafts";
import { mapDraftFromDb, mapSourceFromDb } from "@/lib/studios/builder/mappers";
import { isStudioTemplateType } from "@/lib/studios/builder/templates";
import { validateStudioSourceUrl, isStudioSourceType } from "@/lib/studios/builder/validateSourceUrl";
import type {
  CreateStudioDraftDTO,
  CreateStudioSourceInputDTO,
  PatchStudioDraftDTO,
  StudioDraftDTO,
  StudioSourceInputDTO,
} from "@/types/studios/builder";
import type { Prisma } from "@prisma/client";

export {
  STUDIO_BUILDER_TEMPLATES,
  getStudioBuilderTemplate,
  isStudioTemplateType,
} from "@/lib/studios/builder/templates";
export { buildDefaultDraftContent } from "@/lib/studios/builder/defaultDrafts";
export { validateStudioSourceUrl, isStudioSourceType } from "@/lib/studios/builder/validateSourceUrl";
export { mapDraftFromDb, mapSourceFromDb } from "@/lib/studios/builder/mappers";

const draftInclude = { sources: { orderBy: { createdAt: "asc" as const } } };

export class StudioBuilderError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION" | "CONFLICT",
  ) {
    super(message);
    this.name = "StudioBuilderError";
  }
}

/** Create a new builder draft for the steward. */
export async function createStudioBuilderDraft(
  ownerUserId: string,
  input: CreateStudioDraftDTO,
  stewardName?: string,
): Promise<StudioDraftDTO> {
  if (!isStudioTemplateType(input.templateType)) {
    throw new StudioBuilderError("Invalid template type.", "VALIDATION");
  }

  const content = buildDefaultDraftContent(input.templateType, stewardName);
  const row = await prisma.studioBuilderDraft.create({
    data: {
      ownerUserId,
      templateType: input.templateType,
      builderStep: input.builderStep ?? "choose_template",
      content: content as unknown as Prisma.InputJsonValue,
    },
    include: draftInclude,
  });

  return mapDraftFromDb(row);
}

/** Load draft if owned by user. */
export async function getStudioBuilderDraftForOwner(
  draftId: string,
  ownerUserId: string,
): Promise<StudioDraftDTO> {
  const row = await prisma.studioBuilderDraft.findFirst({
    where: { id: draftId, ownerUserId },
    include: draftInclude,
  });
  if (!row) {
    throw new StudioBuilderError("Draft not found.", "NOT_FOUND");
  }
  return mapDraftFromDb(row);
}

/** Patch draft metadata and/or content JSON. */
export async function patchStudioBuilderDraft(
  draftId: string,
  ownerUserId: string,
  patch: PatchStudioDraftDTO,
): Promise<StudioDraftDTO> {
  const existing = await prisma.studioBuilderDraft.findFirst({
    where: { id: draftId, ownerUserId },
  });
  if (!existing) {
    throw new StudioBuilderError("Draft not found.", "NOT_FOUND");
  }
  if (existing.status === "published") {
    throw new StudioBuilderError("Published drafts cannot be edited.", "CONFLICT");
  }

  if (patch.templateType && !isStudioTemplateType(patch.templateType)) {
    throw new StudioBuilderError("Invalid template type.", "VALIDATION");
  }

  let contentUpdate: Prisma.InputJsonValue | undefined;
  if (patch.content !== undefined) {
    const current = mapDraftFromDb(existing).content;
    const merged =
      patch.content && "identity" in patch.content && "hero" in patch.content
        ? patch.content
        : { ...current, ...patch.content };
    contentUpdate = merged as unknown as Prisma.InputJsonValue;
  }

  const row = await prisma.studioBuilderDraft.update({
    where: { id: draftId },
    data: {
      templateType: patch.templateType,
      status: patch.status,
      builderStep: patch.builderStep,
      linkedSpaceId: patch.linkedSpaceId,
      content: contentUpdate,
      version: contentUpdate ? { increment: 1 } : undefined,
    },
    include: draftInclude,
  });

  return mapDraftFromDb(row);
}

/** Append a source link to a draft. */
export async function addStudioBuilderSource(
  draftId: string,
  ownerUserId: string,
  input: CreateStudioSourceInputDTO,
): Promise<StudioSourceInputDTO> {
  const draft = await prisma.studioBuilderDraft.findFirst({
    where: { id: draftId, ownerUserId },
  });
  if (!draft) {
    throw new StudioBuilderError("Draft not found.", "NOT_FOUND");
  }
  if (draft.status === "published") {
    throw new StudioBuilderError("Cannot add sources to a published draft.", "CONFLICT");
  }
  if (!isStudioSourceType(input.sourceType)) {
    throw new StudioBuilderError("Invalid source type.", "VALIDATION");
  }

  const urlCheck = validateStudioSourceUrl(input.sourceType, input.url);
  if (!urlCheck.ok) {
    throw new StudioBuilderError(urlCheck.error, "VALIDATION");
  }

  const row = await prisma.studioBuilderSource.create({
    data: {
      draftId,
      sourceType: input.sourceType,
      url: urlCheck.normalizedUrl || null,
      label: input.label?.trim() || null,
      userNotes: input.userNotes?.trim() || null,
      status: "pending",
    },
  });

  return mapSourceFromDb(row);
}

/** Remove a source from a draft (owner-scoped). */
export async function removeStudioBuilderSource(
  draftId: string,
  ownerUserId: string,
  sourceId: string,
): Promise<void> {
  const draft = await prisma.studioBuilderDraft.findFirst({
    where: { id: draftId, ownerUserId },
  });
  if (!draft) {
    throw new StudioBuilderError("Draft not found.", "NOT_FOUND");
  }

  const source = await prisma.studioBuilderSource.findFirst({
    where: { id: sourceId, draftId },
  });
  if (!source) {
    throw new StudioBuilderError("Source not found.", "NOT_FOUND");
  }

  await prisma.studioBuilderSource.delete({ where: { id: sourceId } });
}

/** List drafts for owner (newest first). */
export async function listStudioBuilderDraftsForOwner(
  ownerUserId: string,
): Promise<StudioDraftDTO[]> {
  const rows = await prisma.studioBuilderDraft.findMany({
    where: { ownerUserId },
    orderBy: { updatedAt: "desc" },
    include: draftInclude,
  });
  return rows.map(mapDraftFromDb);
}
