"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  /** Which client component mounted beneath this strip (dev trace). */
  componentMounted?: string;
};

function inferMountedComponent(pathname: string): string {
  if (pathname === "/vmb/today" || pathname.startsWith("/vmb/today/")) return "VmbTodayClient";
  if (pathname === "/vmb/start" || pathname.startsWith("/vmb/start/")) return "VmbStartFlow";
  if (pathname === "/vmb/clients" || pathname.startsWith("/vmb/clients/")) return "VmbClientsClient";
  if (pathname === "/vmb/dashboard" || pathname.startsWith("/vmb/dashboard/")) return "VmbDashboardClient";
  if (pathname === "/vmb/opportunities" || pathname.startsWith("/vmb/opportunities/")) {
    return "VmbOpportunitiesCenterClient";
  }
  if (pathname === "/vmb") return "VmbLanding";
  return "—";
}

/**
 * Dev-only route trace at the top of every VMB page.
 */
export function VmbDevRouteStrip({ componentMounted }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const analysis = searchParams.get("analysis")?.trim() ?? "";
  const [href, setHref] = useState("");
  const mounted = componentMounted ?? inferMountedComponent(pathname);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHref(window.location.href);
    console.error("[VMB-ROUTE]", {
      href: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      analysis: new URLSearchParams(window.location.search).get("analysis"),
      componentMounted: mounted,
    });
  }, [pathname, search, analysis, mounted]);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <pre
      className="vmb-dev-route-strip"
      style={{
        margin: 0,
        padding: "8px 12px",
        fontSize: 11,
        lineHeight: 1.45,
        background: "#1e1e1e",
        color: "#b5f4a5",
        borderBottom: "2px solid #444",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {[
        "CURRENT ROUTE:",
        `href: ${href || "—"}`,
        `pathname: ${pathname}`,
        `search: ${search ? `?${search}` : "(none)"}`,
        `analysis: ${analysis || "—"}`,
        `component mounted: ${mounted}`,
      ].join("\n")}
    </pre>
  );
}
