"use client";

import { OperatingSection } from "@/components/vmb/dashboard/OperatingSection";
import type { StandardOffer } from "@/lib/vmb/operating-system/types";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  offers: StandardOffer[];
};

export function StandardOffersSection({ offers }: Props) {
  return (
    <OperatingSection
      title="Standard Offers"
      subtitle="Building blocks for future campaigns — edit coming soon."
    >
      <div style={{ display: "grid", gap: 10 }}>
        {offers.map((offer) => (
          <div
            key={offer.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              padding: "14px 14px",
              borderRadius: 12,
              border: `1px solid ${VMB_THEME.line}`,
              background: VMB_THEME.warmBg,
            }}
          >
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>{offer.name}</p>
              <p style={{ margin: 0, fontSize: 13, color: VMB_THEME.muted }}>{offer.suggestedUse}</p>
            </div>
            <span
              aria-hidden
              title="Edit coming soon"
              style={{ fontSize: 16, color: VMB_THEME.muted, opacity: 0.45, lineHeight: 1 }}
            >
              ✎
            </span>
          </div>
        ))}
      </div>
    </OperatingSection>
  );
}
