"use client";

import { bookingProviderSourceLabel } from "@/lib/intelligence/salon/provider-source-labels";
import type { ProspectRecord } from "@/lib/studios/prospects/types";

type Props = {
  prospect: Pick<ProspectRecord, "bookingProviderSource" | "bookingProviderEvidence">;
};

export function BookingProviderSourceChip({ prospect }: Props) {
  const label = bookingProviderSourceLabel(prospect);
  if (!label) return null;

  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        background: "#f5f5f4",
        color: "#57534e",
        borderRadius: 4,
        padding: "1px 5px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
