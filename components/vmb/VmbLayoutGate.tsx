"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { VmbSalonShell } from "@/components/vmb/VmbSalonShell";
import { VMB_THEME } from "@/lib/vmb/theme";

function SalonShellFallback({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: VMB_THEME.warmBg, color: VMB_THEME.ink }}>
      <main>{children}</main>
    </div>
  );
}

export function VmbLayoutGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/vmb") {
    return <>{children}</>;
  }
  if (pathname === "/vmb/start" || pathname.startsWith("/vmb/start/")) {
    return <>{children}</>;
  }
  return (
    <Suspense fallback={<SalonShellFallback>{children}</SalonShellFallback>}>
      <VmbSalonShell>{children}</VmbSalonShell>
    </Suspense>
  );
}
