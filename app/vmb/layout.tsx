import type { Metadata } from "next";
import { VmbLayoutGate } from "@/components/vmb/VmbLayoutGate";

export const metadata: Metadata = {
  title: {
    template: "%s | VMB",
    default: "VMB — Grow from the clients you already have",
  },
  description:
    "VMB helps salons discover trusted relationships, unlock referrals, and grow revenue from the clients you already have.",
};

export default function VmbLayout({ children }: { children: React.ReactNode }) {
  return <VmbLayoutGate>{children}</VmbLayoutGate>;
}
