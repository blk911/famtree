import type { Metadata } from "next";
import Link from "next/link";
import { HiddenMoneyReportPanel } from "@/components/studios/salon/HiddenMoneyReportPanel";
import { VMB_SAMPLE_HIDDEN_MONEY_REPORT } from "@/lib/vmb/sample-report";
import { STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

const ACCENT = "#9d174d";
const WARM_BG = "#faf8f5";

export const metadata: Metadata = {
  title: "How VMB Works | Salon revenue discovery demo",
  description:
    "See how VMB analyzes your existing salon book to surface VIP clients, lapsed reactivations, and hidden revenue opportunities.",
};

const DEMO_STEPS = [
  {
    title: "Connect",
    body: "Export clients, appointments, or payments from GlossGenius, Vagaro, Square, or CSV.",
  },
  {
    title: "Activate",
    body: "VMB maps your export and identifies campaign-ready opportunities in your book.",
  },
  {
    title: "Grow",
    body: "New appointments and referrals flow back through your existing booking software.",
  },
] as const;

export default function VmbDemoPage() {
  return (
    <div style={{ background: WARM_BG, color: STUDIOS_INK, minHeight: "100vh" }}>
      <header
        style={{
          borderBottom: `1px solid ${STUDIOS_LINE}`,
          background: "#fff",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Link href="/vmb" style={{ fontSize: 13, fontWeight: 700, color: STUDIOS_MUTED }}>
            ← VMB for Salons
          </Link>
          <Link
            href="/vmb#vmb-trial"
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#fff",
              background: ACCENT,
              padding: "10px 18px",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Start Free Trial
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 72px" }}>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: ACCENT,
          }}
        >
          See How VMB Works
        </p>
        <h1
          style={{
            margin: "0 0 16px",
            fontSize: "clamp(30px, 4.5vw, 44px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          Revenue Discovery From The Clients You Already Have
        </h1>
        <p style={{ margin: "0 0 36px", fontSize: 17, lineHeight: 1.55, color: STUDIOS_MUTED, maxWidth: 680 }}>
          VMB layers on top of your current booking system. Upload an owner-approved export and
          see the kind of hidden money report a real salon book produces.
        </p>

        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          style={{ marginBottom: 40 }}
        >
          {DEMO_STEPS.map((step, i) => (
            <div
              key={step.title}
              style={{
                padding: "20px 18px",
                borderRadius: 14,
                background: "#fff",
                border: `1px solid ${STUDIOS_LINE}`,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: ACCENT, marginBottom: 8 }}>
                Step {i + 1}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: STUDIOS_MUTED }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <HiddenMoneyReportPanel
          report={VMB_SAMPLE_HIDDEN_MONEY_REPORT}
          title="Sample Hidden Money Report (GlossGenius)"
        />

        <div
          style={{
            marginTop: 40,
            padding: "28px 24px",
            borderRadius: 18,
            background: "#fdf2f8",
            border: `2px solid ${ACCENT}`,
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 900 }}>
            Ready to analyze your book?
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 15, color: STUDIOS_MUTED }}>
            30-day free trial · No monthly fee · Keep your current salon software
          </p>
          <Link
            href="/vmb#vmb-trial"
            style={{
              display: "inline-block",
              fontSize: 15,
              fontWeight: 800,
              color: "#fff",
              background: ACCENT,
              padding: "14px 24px",
              borderRadius: 12,
              textDecoration: "none",
            }}
          >
            Start My 30-Day Trial
          </Link>
        </div>
      </main>
    </div>
  );
}
