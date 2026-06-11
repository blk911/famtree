import type { Metadata } from "next";
import { Suspense } from "react";
import { VmbStartFlow } from "@/components/vmb/VmbStartFlow";

export const metadata: Metadata = {
  title: "Find The Money",
};

export default function VmbStartPage() {
  return (
    <Suspense fallback={null}>
      <VmbStartFlow />
    </Suspense>
  );
}
