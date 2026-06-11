import type { Metadata } from "next";
import { VmbTodayClient } from "@/components/vmb/VmbTodayClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "Today",
};

export default async function VmbTodayPage() {
  const ctx = await loadVmbPageContext({});
  return <VmbTodayClient salonName={ctx.salonName} />;
}
