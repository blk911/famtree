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
        backgroundColor: "#f3f1ec",
        backgroundImage: `
          radial-gradient(ellipse 100% 70% at 50% -15%, rgba(252, 228, 236, 0.55) 0%, transparent 52%),
          radial-gradient(ellipse 70% 45% at 100% 20%, rgba(214, 232, 255, 0.45) 0%, transparent 42%),
          radial-gradient(ellipse 55% 40% at 0% 75%, rgba(255, 236, 210, 0.42) 0%, transparent 48%),
          radial-gradient(ellipse 80% 50% at 50% 100%, rgba(224, 244, 236, 0.28) 0%, transparent 50%),
          linear-gradient(165deg, #faf9f6 0%, #f5f2eb 38%, #efe9df 72%, #f7f4ee 100%)
        `,
        backgroundAttachment: "fixed",
        color: "#262626",
      }}
    >
      <MemberBreadcrumb />
      {children}
    </div>
  );
}
