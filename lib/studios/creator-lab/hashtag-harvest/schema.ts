// lib/studios/creator-lab/hashtag-harvest/schema.ts
import { z } from "zod";
import {
  DEFAULT_MAX_POSTS_PER_HASHTAG,
  MAX_POSTS_PER_HASHTAG_LIMIT,
} from "./limits";

export const HarvestRunRequestSchema = z.object({
  hashtags: z
    .array(z.string().min(1).max(80))
    .min(1, "At least one hashtag required")
    .max(8, "Maximum 8 hashtags per run"),
  market: z.string().max(80).default(""),
  category: z.string().max(80).default(""),
  maxPerHashtag: z
    .number()
    .int()
    .min(1)
    .max(MAX_POSTS_PER_HASHTAG_LIMIT)
    .default(DEFAULT_MAX_POSTS_PER_HASHTAG),
  mode: z.enum(["fast", "deep"]).default("fast"),
  verticalKey: z.enum(["education", "salon", "transpo", "hcare", "labs"]).default("salon"),
  runGgOnAllDeduped: z.boolean().optional().default(false),
  ggMaxProbes: z.number().int().min(1).max(2000).optional(),
  runPublicDiscovery: z.boolean().optional().default(false),
});
