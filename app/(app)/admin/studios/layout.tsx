import type { ReactNode } from "react";
import { MarketIntelPageShell } from "@/components/admin/MarketIntelPageShell";

type Props = {
  children: ReactNode;
};

/** Unified gutters for all /admin/studios discovery tool pages. */
export default function AdminStudiosLayout({ children }: Props) {
  return <MarketIntelPageShell>{children}</MarketIntelPageShell>;
}
