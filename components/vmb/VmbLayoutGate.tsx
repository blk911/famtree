"use client";

import { usePathname } from "next/navigation";
import { VmbShell } from "@/components/vmb/VmbShell";

export function VmbLayoutGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/vmb") {
    return <>{children}</>;
  }
  return <VmbShell>{children}</VmbShell>;
}
