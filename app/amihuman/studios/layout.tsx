// app/amihuman/studios/layout.tsx
// Same marketing shell + concierge as /studios; AIH gateways use /amihuman/studios for funnel tracking.

import type { Metadata } from "next";
import { MemberBreadcrumb } from "@/components/studios/MemberBreadcrumb";
import { StudiosPublicMarketingShell } from "@/components/studios/StudiosPublicMarketingShell";
import { ConciergeStudiosMount } from "@/components/concierge/ConciergeStudiosMount";

export const metadata: Metadata = {
  title: "AIH Studios — Human-first spaces (Gateway)",
  description:
    "Explore AIH Studios through the public doorway — invite-based private studios, Gap U learning lab templates, and live demo pages.",
};

export default function AmihumanStudiosLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudiosPublicMarketingShell>
      <MemberBreadcrumb />
      {children}
      <ConciergeStudiosMount />
    </StudiosPublicMarketingShell>
  );
}
