// lib/studios/creator-lab/hashtag-harvest/classifiers/education.ts
// Education vertical classifier — wraps the existing inferEducationType /
// inferAudienceType logic into the shared VerticalClassification interface.

import {
  inferEducationType,
  inferAudienceType,
  EDUCATION_TYPE_LABELS,
  AUDIENCE_TYPE_LABELS,
  EDUCATION_HASHTAG_CLUSTERS,
  EDUCATION_HASHTAG_PRESET,
} from "../education-config";
import type { VerticalClassification } from "./types";

export { EDUCATION_HASHTAG_CLUSTERS, EDUCATION_HASHTAG_PRESET };

export function classifyEducation(
  hashtag: string,
  caption: string,
): VerticalClassification {
  const primaryType  = inferEducationType(hashtag, caption);
  const secondaryType = inferAudienceType(hashtag, caption);
  const primaryLabel  = EDUCATION_TYPE_LABELS[primaryType]  ?? primaryType;
  const secondaryLabel = AUDIENCE_TYPE_LABELS[secondaryType] ?? secondaryType;

  const signals: string[] = [];
  if (primaryType  !== "unknown") signals.push(`edu_type:${primaryType}`);
  if (secondaryType !== "unknown") signals.push(`audience:${secondaryType}`);

  return { primaryType, secondaryType, primaryLabel, secondaryLabel, signals };
}
