import type { Metadata } from "next";
import { VmbShell } from "@/components/vmb/VmbShell";

export const metadata: Metadata = {
  title: {
    template: "%s | VMB",
    default: "VMB — Grow from the clients you already have",
  },
  description:
    "VMB helps salons discover trusted relationships, unlock referrals, and grow revenue from the clients you already have.",
};

export default function VmbLayout({ children }: { children: React.ReactNode }) {
  return <VmbShell>{children}</VmbShell>;
}
