/**
 * Deb Dazzle lineage — fitness starter envelope plus sample Instagram proof cards.
 * Legacy names preserved for scripts and docs that grep `DEB_DAZZLE_*`.
 */

import { DEFAULT_SAMPLE_INSTAGRAM_PROOF_CARDS } from "@/lib/studios/studioProofCard";
import { FITNESS_STUDIO_TEMPLATE } from "@/lib/studio/templates/fitness-studio-template";

export const DEB_DAZZLE_STUDIO_TEMPLATE = {
  ...FITNESS_STUDIO_TEMPLATE,
  data: {
    ...FITNESS_STUDIO_TEMPLATE.data,
    proofCards: DEFAULT_SAMPLE_INSTAGRAM_PROOF_CARDS,
  },
} as const;

export type DebDazzleStudioTemplate = typeof DEB_DAZZLE_STUDIO_TEMPLATE;
