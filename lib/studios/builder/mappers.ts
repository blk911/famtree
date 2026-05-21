import type { Prisma } from "@prisma/client";
import type {
  StudioDraftContentDTO,
  StudioDraftDTO,
  StudioSourceInputDTO,
} from "@/types/studios/builder";
import {
  STUDIO_BUILDER_STEPS,
  STUDIO_DRAFT_STATUSES,
  STUDIO_TEMPLATE_TYPES,
  type StudioBuilderStep,
  type StudioDraftStatus,
  type StudioSourceStatus,
  type StudioSourceType,
  type StudioTemplateType,
} from "@/types/studios/builder";
import { buildDefaultDraftContent } from "@/lib/studios/builder/defaultDrafts";

type DraftRow = {
  id: string;
  ownerUserId: string;
  templateType: string;
  status: string;
  builderStep: string;
  content: Prisma.JsonValue;
  version: number;
  linkedSpaceId: string | null;
  publishedStudioId: string | null;
  createdAt: Date;
  updatedAt: Date;
  sources?: SourceRow[];
};

type SourceRow = {
  id: string;
  draftId: string;
  sourceType: string;
  url: string | null;
  label: string | null;
  userNotes: string | null;
  status: string;
  extractedAt: Date | null;
  extractionConfidence: number | null;
  extractedData: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

function asTemplateType(value: string): StudioTemplateType {
  if ((STUDIO_TEMPLATE_TYPES as readonly string[]).includes(value)) {
    return value as StudioTemplateType;
  }
  return "private-studio-network";
}

function asDraftStatus(value: string): StudioDraftStatus {
  if ((STUDIO_DRAFT_STATUSES as readonly string[]).includes(value)) {
    return value as StudioDraftStatus;
  }
  return "draft";
}

function asBuilderStep(value: string): StudioBuilderStep {
  if ((STUDIO_BUILDER_STEPS as readonly string[]).includes(value)) {
    return value as StudioBuilderStep;
  }
  return "choose_template";
}

function parseContent(
  raw: Prisma.JsonValue,
  templateType: StudioTemplateType,
): StudioDraftContentDTO {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (obj.identity && obj.hero) {
      return raw as StudioDraftContentDTO;
    }
  }
  return buildDefaultDraftContent(templateType);
}

export function mapSourceFromDb(row: SourceRow): StudioSourceInputDTO {
  return {
    id: row.id,
    draftId: row.draftId,
    sourceType: row.sourceType as StudioSourceType,
    url: row.url,
    label: row.label,
    userNotes: row.userNotes,
    status: row.status as StudioSourceStatus,
    extractedAt: row.extractedAt?.toISOString() ?? null,
    extractionConfidence: row.extractionConfidence,
    extractedData:
      row.extractedData && typeof row.extractedData === "object"
        ? (row.extractedData as StudioSourceInputDTO["extractedData"])
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapDraftFromDb(row: DraftRow): StudioDraftDTO {
  const templateType = asTemplateType(row.templateType);
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    templateType,
    status: asDraftStatus(row.status),
    builderStep: asBuilderStep(row.builderStep),
    content: parseContent(row.content, templateType),
    version: row.version,
    linkedSpaceId: row.linkedSpaceId,
    publishedStudioId: row.publishedStudioId,
    sources: row.sources?.map(mapSourceFromDb),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
