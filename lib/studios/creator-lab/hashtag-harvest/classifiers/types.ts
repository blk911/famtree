// lib/studios/creator-lab/hashtag-harvest/classifiers/types.ts
// Shared output type for all vertical classifiers.

export interface VerticalClassification {
  /** Vertical-specific primary label (e.g. "tutor", "nails", "carrier") */
  primaryType: string;
  /** Vertical-specific secondary label (e.g. "educator", "operator", "owner-operator") */
  secondaryType: string;
  /** Human-readable label for primaryType, for display */
  primaryLabel: string;
  /** Human-readable label for secondaryType, for display */
  secondaryLabel: string;
  /** Signals that drove the classification (debug / evidence trail) */
  signals: string[];
}
