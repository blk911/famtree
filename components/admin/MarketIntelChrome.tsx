"use client";
// components/admin/MarketIntelChrome.tsx
// Unified Market Intel page chrome: workflow nav + vertical filters.

import { MarketIntelWorkflowNav } from "@/components/admin/MarketIntelNav";
import { MarketIntelVerticalFilters } from "@/components/admin/IntelligenceMarketNav";
import { DiscoveryFlowStrip } from "@/components/admin/intelligence/salon/DiscoveryFlowStrip";

type Props = {
  /** Hide vertical chips on Markets / Action Items pages when not relevant */
  showVerticalFilters?: boolean;
  /** Discovery sub-flow strip — hidden on Markets / Action Items */
  showDiscoveryFlow?: boolean;
};

export function MarketIntelChrome({
  showVerticalFilters = true,
  showDiscoveryFlow = false,
}: Props) {
  return (
    <header className="mb-4 space-y-2.5 border-b border-stone-200 pb-3">
      <MarketIntelWorkflowNav />
      {showVerticalFilters ? <MarketIntelVerticalFilters /> : null}
      {showDiscoveryFlow ? <DiscoveryFlowStrip /> : null}
    </header>
  );
}
