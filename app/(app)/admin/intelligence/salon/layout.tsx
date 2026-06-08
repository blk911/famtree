import type { ReactNode } from "react";
import { MarketIntelPageShell } from "@/components/admin/MarketIntelPageShell";

type Props = {
  children: ReactNode;
};

export default function SalonIntelligenceLayout({ children }: Props) {
  return <MarketIntelPageShell>{children}</MarketIntelPageShell>;
}
