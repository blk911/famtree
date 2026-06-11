import type { Metadata } from "next";
import { VmbActivityClient } from "@/components/vmb/VmbActivityClient";

export const metadata: Metadata = {
  title: "Activity",
};

export default function VmbActivityPage() {
  return <VmbActivityClient />;
}
