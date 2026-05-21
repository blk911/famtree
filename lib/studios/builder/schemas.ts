import { z } from "zod";
import {
  STUDIO_BUILDER_STEPS,
  STUDIO_DRAFT_STATUSES,
  STUDIO_SOURCE_TYPES,
  STUDIO_TEMPLATE_TYPES,
} from "@/types/studios/builder";

export const createDraftBodySchema = z.object({
  templateType: z.enum(STUDIO_TEMPLATE_TYPES),
  builderStep: z.enum(STUDIO_BUILDER_STEPS).optional(),
});

export const patchDraftBodySchema = z.object({
  templateType: z.enum(STUDIO_TEMPLATE_TYPES).optional(),
  status: z.enum(STUDIO_DRAFT_STATUSES).optional(),
  builderStep: z.enum(STUDIO_BUILDER_STEPS).optional(),
  linkedSpaceId: z.string().nullable().optional(),
});

export const addSourceBodySchema = z.object({
  sourceType: z.enum(STUDIO_SOURCE_TYPES),
  url: z.string().optional(),
  label: z.string().max(120).optional(),
  userNotes: z.string().max(2000).optional(),
});
