// lib/studios/creator-lab/schema.ts
// Zod schemas for the Studio Assembler lab.

import { z } from "zod";

export const AssembleRequestSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .refine(
      (v) => {
        try {
          const u = new URL(v.startsWith("http") ? v : `https://${v}`);
          return !!u.hostname;
        } catch {
          return false;
        }
      },
      { message: "Must be a valid URL" }
    ),
});

export const ProductSignalSchema = z.object({
  title: z.string(),
  price: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  pageUrl: z.string().nullable(),
});

export const CollectionSignalSchema = z.object({
  name: z.string(),
  itemCount: z.number().nullable(),
  description: z.string().nullable(),
});

export const EventSignalSchema = z.object({
  title: z.string(),
  date: z.string().nullable(),
  location: z.string().nullable(),
  url: z.string().nullable(),
});

export const CreatorSignalSetSchema = z.object({
  creatorName: z.string().nullable(),
  handle: z.string().nullable(),
  bioCandidates: z.array(z.string()),
  externalLinks: z.array(z.string()),
  imageUrls: z.array(z.string()),
  productSignals: z.array(ProductSignalSchema),
  collectionSignals: z.array(CollectionSignalSchema),
  eventSignals: z.array(EventSignalSchema),
  commissionSignals: z.array(z.string()),
  classWorkshopSignals: z.array(z.string()),
  socialTextSignals: z.array(z.string()),
  evidence: z.array(z.string()),
});

export const CreatorSourceSchema = z.object({
  sourceUrl: z.string(),
  normalizedUrl: z.string(),
  platform: z.enum(["instagram", "etsy", "shopify", "squarespace", "wix", "bigcartel", "website", "unknown"]),
  fetchedAt: z.string(),
  httpStatus: z.number(),
  htmlLength: z.number(),
  htmlText: z.string(),
  links: z.array(z.string()),
  imageUrls: z.array(z.string()),
  rawTextBlocks: z.array(z.string()),
});

export const AssembledCreatorStudioSchema = z.object({
  creatorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(["assembled", "pending_review", "approved", "rejected"]),
  source: CreatorSourceSchema,
  signals: CreatorSignalSetSchema,
  identity: z.object({
    name: z.string(),
    handle: z.string().nullable(),
    locationGuess: z.string().nullable(),
    shortBio: z.string(),
    longBio: z.string(),
  }),
  styleProfile: z.object({
    aesthetic: z.array(z.string()),
    medium: z.array(z.string()),
    priceRange: z.enum(["budget", "mid", "premium", "luxury"]).nullable(),
    audienceGuess: z.array(z.string()),
    tags: z.array(z.string()),
  }),
  monetization: z.object({
    primaryModel: z.enum(["products", "services", "hybrid", "community"]).nullable(),
    signals: z.array(z.string()),
    opportunities: z.array(z.string()),
  }),
  collections: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      estimatedItemCount: z.number().nullable(),
      representativeImageUrl: z.string().nullable(),
    })
  ),
  vertical: z.enum(["artist", "maker", "tutor", "fitness_trainer", "instructor", "local_expert", "service_creator", "unknown"]),
  suggestedStudioName: z.string(),
  suggestedTagline: z.string(),
  suggestedCategories: z.array(z.string()),
  suggestedHeroImageUrl: z.string().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  reviewNotes: z.array(z.string()),
  adminNotes: z.string(),
});
