import type { Metadata } from "next";
import { VmbPlaceholderPage } from "@/components/vmb/VmbPlaceholderPage";

export const metadata: Metadata = {
  title: "Settings",
};

export default function VmbSettingsPage() {
  return <VmbPlaceholderPage title="Settings" />;
}
