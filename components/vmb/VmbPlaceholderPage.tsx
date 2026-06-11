"use client";

import Link from "next/link";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";
import { buildVmbSalonHref } from "@/lib/vmb/salon-href";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  title: string;
};

export function VmbPlaceholderPage({ title }: Props) {
  const activeAnalysisId = useVmbActiveAnalysis();
  const homeHref = buildVmbSalonHref("/vmb/dashboard", activeAnalysisId);

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
