// app/studios/layout.tsx
// PUBLIC route — outside (app) auth group.
// Anyone can visit. Members see "Return to AIH" breadcrumb at top.

import type { Metadata } from "next";
import { MemberBreadcrumb } from "@/components/studios/MemberBreadcrumb";

export const metadata: Metadata = {
  title: "AIH Studios — Run Your Training Business Like a Network",
  description:
    "Studios gives trainers, recovery pros, and wellness providers a private way to connect with clients, manage access, and grow through trusted relationships.",
};

export default function StudiosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(ellipse 120% 80% at 50% -20%, rgba(252, 228, 236, 0.45) 0%, transparent 55%),
          radial-gradient(ellipse 80% 50% at 100% 50%, rgba(230, 240, 255, 0.35) 0%, transparent 45%),
          radial-gradient(ellipse 60% 40% at 0% 80%, rgba(255, 245, 230, 0.5) 0%, transparent 50%),
          linear-gradient(180deg, #fdfcfa 0%, #f7f5f1 45%, #faf8f4 100%)
        `,
        color: "#262626",
      }}
    >
      <MemberBreadcrumb />
      {children}
    </div>
  );
}
