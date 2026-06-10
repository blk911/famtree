import type { Metadata } from "next";
import { VmbStartFlow } from "@/components/vmb/VmbStartFlow";

export const metadata: Metadata = {
  title: "Find the gold in your book",
};

export default function VmbStartPage() {
  return <VmbStartFlow />;
}
