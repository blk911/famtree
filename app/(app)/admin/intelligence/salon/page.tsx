// app/(app)/admin/intelligence/salon/page.tsx
// Salon vertical landing — redirects to the Studio Assembler (main entry point
// for the existing Salon / Client-Centric Creator Intelligence tools).

import { redirect } from "next/navigation";

export default function SalonIntelligencePage() {
  redirect("/admin/studios/creator-lab");
}
