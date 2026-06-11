import type { Metadata } from "next";
import { VmbPlaceholderPage } from "@/components/vmb/VmbPlaceholderPage";

export const metadata: Metadata = {
  title: "Settings",
};

export default function VmbSettingsPage() {
  return (
    <VmbPlaceholderPage
      title="Settings"
      description="Salon profile and workspace settings are coming soon."
    />
  );
}
