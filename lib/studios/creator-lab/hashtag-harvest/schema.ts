// lib/studios/creator-lab/hashtag-harvest/schema.ts
import { z } from "zod";

export const HarvestRunRequestSchema = z.object({
  hashtags: z
    .array(z.string().min(1).max(80))
    .min(1, "At least one hashtag required")
    .max(8, "Maximum 8 hashtags per run"),
  market: z.string().max(80).default(""),
  category: z.string().max(80).default(""),
  maxPerHashtag: z.number().int().min(1).max(30).default(10),
  mode: z.enum(["fast", "deep"]).default("fast"),
  verticalKey: z.enum(["education", "salon", "transpo", "hcare", "labs"]).default("education"),
});
