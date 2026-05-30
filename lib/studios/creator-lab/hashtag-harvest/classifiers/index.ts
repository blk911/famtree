// lib/studios/creator-lab/hashtag-harvest/classifiers/index.ts
// Vertical classifier router — dispatches to the right classifier by verticalKey.

import { classifyEducation } from "./education";
import { classifySalon }     from "./salon";
import type { VerticalClassification } from "./types";

export type { VerticalClassification };
export { SALON_PRIMARY_LABELS, SALON_SECONDARY_LABELS } from "./salon";
export { EDUCATION_HASHTAG_CLUSTERS, EDUCATION_HASHTAG_PRESET } from "./education";
export { SALON_HASHTAG_CLUSTERS, SALON_HASHTAG_PRESET } from "./salon";

/**
 * Classify a creator seed into the appropriate vertical type system.
 * Returns a VerticalClassification with primaryType, secondaryType, labels, and signals.
 *
 * @param verticalKey  - Which vertical this harvest is running under
 * @param hashtag      - The source hashtag (no #)
 * @param caption      - The Instagram post caption (first ~400 chars)
 * @param fullText     - Concatenated text: displayName + caption + hashtags + market + category hint
 */
export function classify(
  verticalKey: string,
  hashtag: string,
  caption: string,
  fullText: string,
): VerticalClassification {
  switch (verticalKey) {
    case "salon":
      return classifySalon(hashtag, caption, fullText);
    case "education":
    default:
      return classifyEducation(hashtag, caption);
  }
}
