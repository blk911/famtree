"use client";

import { usePathname } from "next/navigation";
import { VmbSalonShell } from "@/components/vmb/VmbSalonShell";
import { VmbStartShell } from "@/components/vmb/VmbStartShell";

export function VmbLayoutGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/vmb") {
    return <>{children}</>;
  }
  if (pathname === "/vmb/start" || pathname.startsWith("/vmb/start/")) {
    return <VmbStartShell>{children}</VmbStartShell>;
  }
  return <VmbSalonShell>{children}</VmbSalonShell>;
}
