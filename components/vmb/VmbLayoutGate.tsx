"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { VmbDevRouteStrip } from "@/components/vmb/VmbDevRouteStrip";
import { VmbSalonShell } from "@/components/vmb/VmbSalonShell";
import { VmbSessionRestore } from "@/components/vmb/VmbSessionRestore";
import { VMB_THEME } from "@/lib/vmb/theme";

function SalonShellFallback({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: VMB_THEME.warmBg, color: VMB_THEME.ink }}>
      <main>{children}</main>
    </div>
  );
}

function VmbLayoutGateInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shell = (() => {
    if (pathname === "/vmb") {
      return children;
    }
    if (
      pathname === "/vmb/demo" ||
      pathname === "/vmb/login" ||
      pathname === "/vmb/start" ||
      pathname.startsWith("/vmb/start/") ||
      pathname.startsWith("/vmb/invite/")
    ) {
      return children;
    }
    return (
      <Suspense fallback={<SalonShellFallback>{children}</SalonShellFallback>}>
        <VmbSalonShell>{children}</VmbSalonShell>
      </Suspense>
    );
  })();

  return (
    <>
      <VmbSessionRestore />
      <Suspense fallback={null}>
        <VmbDevRouteStrip />
      </Suspense>
      {shell}
    </>
  );
}

export function VmbLayoutGate({ children }: { children: React.ReactNode }) {
  return <VmbLayoutGateInner>{children}</VmbLayoutGateInner>;
}
