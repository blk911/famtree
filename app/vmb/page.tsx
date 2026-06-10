import type { Metadata } from "next";
import { VmbSalonsLanding } from "@/components/studios/salon/VmbSalonsLanding";

export const metadata: Metadata = {
  title: "VMB for Salons | More revenue from the clients you already have",
  description:
    "VMB works with your existing salon booking software to grow referrals, reactivations, and client-powered marketing. 30-day free trial. No monthly fee.",
};

export default function VmbLandingPage() {
  return <VmbSalonsLanding />;
}
