// lib/studios/styleseat/report-builder.ts
// Public report builder for StyleSeat market intelligence artifacts.

import type { StyleSeatIntelligenceReport, StyleSeatRunFile } from "./types";
import { buildStyleSeatIntelligenceReport } from "./intelligence";

export function buildStyleSeatMarketIntelligenceReport(runData: StyleSeatRunFile): StyleSeatIntelligenceReport {
  return buildStyleSeatIntelligenceReport(runData);
}
