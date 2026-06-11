import type { Metadata } from "next";
import { VmbGoalsCenterClient } from "@/components/vmb/VmbGoalsCenterClient";

export const metadata: Metadata = {
  title: "Goals",
};

export default function VmbGoalsPage() {
  return <VmbGoalsCenterClient />;
}
