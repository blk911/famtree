"use client";

import type { ReactNode } from "react";
import { NetworkPageLayout } from "@/components/context-rail";
import type { NetworkRailProps } from "@/components/context-rail";

export function TreePageClient({
  children,
  rail,
}: {
  children: ReactNode;
  rail: NetworkRailProps;
}) {
  return <NetworkPageLayout rail={rail}>{children}</NetworkPageLayout>;
}
