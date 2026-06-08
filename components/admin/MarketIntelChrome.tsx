"use client";
// components/admin/MarketIntelChrome.tsx
// Unified Market Intel page chrome: workflow nav + vertical filters.

import { MarketIntelWorkflowNav } from "@/components/admin/MarketIntelNav";
import { MarketIntelVerticalFilters } from "@/components/admin/IntelligenceMarketNav";

type Props = {
  /** Hide vertical chips on Markets / Action Items pages when not relevant */
  showVerticalFilters?: boolean;
};

export function MarketIntelChrome({ showVerticalFilters = true }: Props) {
  return (
    <header className="mb-4 space-y-2.5 border-b border-stone-200 pb-3">
      <MarketIntelWorkflowNav />
      {showVerticalFilters ? <MarketIntelVerticalFilters /> : null}
    </header>
  );
}
