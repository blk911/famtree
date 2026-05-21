import { prisma } from "@/lib/db/prisma";
import { mapDraftFromDb } from "@/lib/studios/builder/mappers";
import { StudioBuilderError } from "@/lib/studios/builder/index";
import { vaultSpaceTypeForTemplate } from "@/lib/studios/builder/templateVaultMap";
import { vaultSpaceTypeToAihMetaKind } from "@/lib/aihsafe/vault-space";
import type { StudioDraftDTO } from "@/types/studios/builder";
import { randomBytes } from "crypto";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "my-studio";
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (await prisma.studio.findUnique({ where: { slug }, select: { id: true } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export type PublishDraftResult = {
  draft: StudioDraftDTO;
  studioId: string;
  slug: string;
  trustUnitId: string;
  alreadyPublished: boolean;
};

export async function publishStudioBuilderDraft(
  draftId: string,
  ownerUserId: string,
): Promise<PublishDraftResult> {
  const row = await prisma.studioBuilderDraft.findFirst({
    where: { id: draftId, ownerUserId },
    include: { sources: { orderBy: { createdAt: "asc" } }, publishedStudio: true },
  });
  if (!row) {
    throw new StudioBuilderError("Draft not found.", "NOT_FOUND");
  }

  if (row.status === "published" && row.publishedStudioId && row.publishedStudio) {
    return {
      draft: mapDraftFromDb(row),
      studioId: row.publishedStudioId,
      slug: row.publishedStudio.slug,
      trustUnitId: row.linkedSpaceId ?? "",
      alreadyPublished: true,
    };
  }

  const draft = mapDraftFromDb(row);
  if (row.status !== "reviewed" && !draft.content.approvals.globalApproved) {
    throw new StudioBuilderError(
      "Mark draft as ready to publish before publishing.",
      "VALIDATION",
    );
  }

  const name = draft.content.identity.name.trim() || "My Studio";
  const baseSlug = slugify(draft.content.identity.slugSuggestion ?? name);
  const slug = await uniqueSlug(baseSlug);
  const vaultSpaceType = vaultSpaceTypeForTemplate(draft.templateType);
  const metaKind = vaultSpaceTypeToAihMetaKind(vaultSpaceType);

  const trustUnit = await prisma.trustUnit.create({
    data: {
      members: { create: [{ userId: ownerUserId }] },
      aihMeta: {
        create: {
          kind: metaKind,
          vaultSpaceType,
          name,
          description: draft.content.hero.subcopy[0] ?? null,
          defaultVisibilityScope: "trust_unit",
          maxMemberCount: 50,
        },
      },
    },
  });

  const studioId = `studio-${randomBytes(6).toString("hex")}`;

  await prisma.$transaction(async (tx) => {
    await tx.studio.create({
      data: {
        id: studioId,
        name,
        slug,
        ownerId: ownerUserId,
        tagline: draft.content.identity.tagline ?? draft.content.hero.subcopy[0] ?? null,
      },
    });

    await tx.studioBuilderDraft.update({
      where: { id: draftId },
      data: {
        status: "published",
        builderStep: "publish",
        linkedSpaceId: trustUnit.id,
        publishedStudioId: studioId,
        content: draft.content as object,
      },
    });
  });

  const updated = await prisma.studioBuilderDraft.findFirst({
    where: { id: draftId },
    include: { sources: { orderBy: { createdAt: "asc" } } },
  });

  return {
    draft: mapDraftFromDb(updated!),
    studioId,
    slug,
    trustUnitId: trustUnit.id,
    alreadyPublished: false,
  };
}
