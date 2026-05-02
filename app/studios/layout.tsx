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
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0a14 0%, #0f1024 40%, #1a0e2e 100%)",
      color: "white",
    }}>
      {/* Conditional breadcrumb — only renders for logged-in AIH members */}
      <MemberBreadcrumb />

      {children}
    </div>
  );
}
