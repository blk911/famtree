// app/(app)/admin/intelligence/transpo/page.tsx
// Transpo vertical landing — redirects to Source Ingest.

import { redirect } from "next/navigation";

export default function TranspoIntelligencePage() {
  redirect("/admin/intelligence/transpo/source-ingest");
}
