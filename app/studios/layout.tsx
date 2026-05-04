// app/studios/layout.tsx
// PUBLIC route — outside (app) auth group.
// Anyone can visit. Members see "Return to AIH" breadcrumb at top.

import type { Metadata } from "next";
import { MemberBreadcrumb } from "@/components/studios/MemberBreadcrumb";

/** Standard Studios surface background — `public/uploads/STUDIO BKGRND.jpg` only under `/studios/*`. */
const STUDIOS_PAGE_BG_URL = "/uploads/STUDIO%20BKGRND.jpg";

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
          radial-gradient(ellipse 120% 80% at 50% 0%, rgba(250, 249, 246, 0.72), rgba(245, 242, 235, 0.55)),
          linear-gradient(165deg, rgba(250, 249, 246, 0.45) 0%, rgba(239, 233, 223, 0.38) 100%),
          url(${STUDIOS_PAGE_BG_URL})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        color: "#262626",
      }}
    >
      <MemberBreadcrumb />
      {children}
    </div>
  );
}
