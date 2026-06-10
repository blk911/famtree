import type { Metadata } from "next";
import { VmbStartFlow } from "@/components/vmb/VmbStartFlow";

export const metadata: Metadata = {
  title: "Find The Money",
};

export default function VmbStartPage() {
  return <VmbStartFlow />;
}
