import type { Metadata } from "next";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { SalonStudioStartContent } from "@/components/studios/salon/SalonStudioStartContent";

export const metadata: Metadata = {
  title: "Salon studio template | AIH Studios",
  description:
    "Canonical salon studio layout duplicate — same shell as published studios; customize next.",
};

export default async function SalonStudioTemplatePage() {
  return (
    <>
      <SalonStudioStartContent />
      <StudiosFooter />
    </>
  );
}
