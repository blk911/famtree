import Link from "next/link";
import { HiddenMoneyReportPanel } from "@/components/studios/salon/HiddenMoneyReportPanel";
import { VMB_SAMPLE_HIDDEN_MONEY_REPORT } from "@/lib/vmb/sample-report";
import { STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

const ACCENT = "#9d174d";

type Props = {
  showDemoLink?: boolean;
};

export function VmbSampleResultsSection({ showDemoLink = true }: Props) {
  return (
    <section style={{ background: "#fff", borderTop: `1px solid ${STUDIOS_LINE}` }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "64px 24px" }}>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: ACCENT,
            textAlign: "center",
          }}
        >
          Sample Results
        </p>
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: "clamp(26px, 3.5vw, 36px)",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            textAlign: "center",
            color: STUDIOS_INK,
          }}
        >
          See What VMB Finds In A Real Salon Book
        </h2>
        <p
          style={{
            margin: "0 auto 28px",
            maxWidth: 620,
            textAlign: "center",
            fontSize: 16,
            lineHeight: 1.55,
            color: STUDIOS_MUTED,
          }}
        >
          Example GlossGenius export analysis — VIP clients, lapsed reactivations, bundles, and
          rebooking gaps surfaced from data you already have.
        </p>
        <HiddenMoneyReportPanel report={VMB_SAMPLE_HIDDEN_MONEY_REPORT} />
        {showDemoLink ? (
          <p style={{ marginTop: 24, textAlign: "center", fontSize: 14 }}>
            <Link
              href="/vmb/demo"
              style={{ color: ACCENT, fontWeight: 800, textDecoration: "none" }}
            >
              See full demo walkthrough →
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
