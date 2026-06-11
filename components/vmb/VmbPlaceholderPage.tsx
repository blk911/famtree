"use client";

import Link from "next/link";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";
import { buildVmbSalonHref } from "@/lib/vmb/salon-href";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbPageContext } from "@/lib/vmb/load-vmb-page-context";

type Props = {
  title: string;
  purpose: string;
  context?: Pick<VmbPageContext, "salonName" | "hasSession" | "hasCompletedFirstIngest" | "refreshDue" | "activeAnalysisId">;
};

export function VmbPlaceholderPage({ title, purpose, context }: Props) {
  const activeAnalysisId = useVmbActiveAnalysis(context?.activeAnalysisId);
  const homeHref = buildVmbSalonHref("/vmb/dashboard", activeAnalysisId);
  const salonName = context?.salonName ?? "Your Salon";

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 72px" }}>
      <h1
        style={{
          margin: "0 0 10px",
          fontSize: "clamp(24px, 4vw, 30px)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h1>
      <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.55, color: VMB_THEME.muted }}>
        {purpose}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 14, color: VMB_THEME.ink, fontWeight: 600 }}>
        {salonName}
      </p>
      {context?.hasSession ? (
        <p style={{ margin: "0 0 20px", fontSize: 13, color: VMB_THEME.muted, lineHeight: 1.5 }}>
          {context.hasCompletedFirstIngest
            ? "Your latest book analysis is connected to this workspace."
            : "Complete your first book ingest to unlock this page."}
          {context.refreshDue ? " · Book refresh is due." : null}
        </p>
      ) : (
        <p style={{ margin: "0 0 20px", fontSize: 13, color: VMB_THEME.muted }}>
          Sign in via Find The Money to connect your salon workspace.
        </p>
      )}
      <p style={{ margin: "0 0 24px", fontSize: 15, lineHeight: 1.55, color: VMB_THEME.muted }}>
        Coming soon — this will use your latest book analysis.
      </p>
      <Link
        href={homeHref}
        style={{
          display: "inline-block",
          fontSize: 14,
          fontWeight: 700,
          color: VMB_THEME.accent,
          textDecoration: "none",
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
