"use client";

import { getStackProvider } from "@/lib/intelligence/salon/business-stack/provider-registry";
import type { SalonBusinessStack } from "@/lib/intelligence/salon/business-stack/types";

function labelFor(id?: string): string {
  if (!id) return "";
  return getStackProvider(id)?.label ?? id.replace(/_/g, " ");
}

type Props = {
  stack?: SalonBusinessStack | null;
  compact?: boolean;
};

export function BusinessStackChips({ stack, compact }: Props) {
  if (!stack) {
    return (
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#a8a29e",
          background: "#f5f5f4",
          borderRadius: 6,
          padding: "2px 6px",
        }}
      >
        Unknown
      </span>
    );
  }

  const chips: string[] = [];
  if (stack.primaryBookingProvider && stack.primaryPaymentProvider) {
    chips.push("Booking + Payments");
  } else if (stack.primaryBookingProvider) {
    chips.push(`Booking · ${labelFor(stack.primaryBookingProvider)}`);
  } else if (stack.primaryPaymentProvider) {
    chips.push(`Payment · ${labelFor(stack.primaryPaymentProvider)}`);
  }
  if (stack.websiteBuilder) chips.push(`Website · ${labelFor(stack.websiteBuilder)}`);
  if ((stack.marketingPixels?.length ?? 0) > 0) chips.push("Pixel");
  if (stack.checkInProvider) chips.push("Check-In");
  if (chips.length === 0) chips.push("Unknown");

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
      {chips.slice(0, compact ? 2 : 4).map((c) => (
        <span
          key={c}
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "#57534e",
            background: "#f5f5f4",
            border: "1px solid #e7e5e4",
            borderRadius: 6,
            padding: "2px 6px",
            whiteSpace: "nowrap",
          }}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

export function StackPaymentChip({ stack }: { stack?: SalonBusinessStack | null }) {
  const id = stack?.primaryPaymentProvider;
  if (!id) {
    return <span style={{ fontSize: 10, color: "#d6d3d1" }}>—</span>;
  }
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: "#1d4ed8",
        background: "#eff6ff",
        borderRadius: 6,
        padding: "2px 6px",
      }}
    >
      {labelFor(id)}
    </span>
  );
}

export function ImportCandidateChip({ stack }: { stack?: SalonBusinessStack | null }) {
  if (!stack) return <span style={{ fontSize: 10, color: "#d6d3d1" }}>—</span>;
  const yes = stack.importOpportunity;
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: yes ? "#15803d" : "#78716c",
        background: yes ? "#f0fdf4" : "#f5f5f4",
        border: `1px solid ${yes ? "#bbf7d0" : "#e7e5e4"}`,
        borderRadius: 6,
        padding: "2px 6px",
      }}
    >
      {yes ? "Yes" : "No"}
    </span>
  );
}
