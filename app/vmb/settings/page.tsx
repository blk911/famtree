import type { Metadata } from "next";
import { VmbPlaceholderPage } from "@/components/vmb/VmbPlaceholderPage";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function VmbSettingsPage() {
  const ctx = await loadVmbPageContext();
  return (
    <VmbPlaceholderPage
      title="Settings"
      purpose="Salon profile and workspace preferences."
      context={ctx}
    />
  );
}
