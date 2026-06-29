import type { Metadata } from "next";
import { VmbLanding } from "@/components/vmb/VmbLanding";

export const metadata: Metadata = {
  title: "VMB Salons | Salon growth and private client gifts",
  description: "The VMB Salons front door for salon owners, invited clients, onboarding, and discovery.",
};

export default function VmbSalonsPage() {
  return <VmbLanding />;
}
