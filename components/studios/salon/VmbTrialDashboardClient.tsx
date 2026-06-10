"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { VmbSalonImportPanel } from "@/components/studios/salon/VmbSalonImportPanel";
import type { VmbTrialLead } from "@/types/vmb/trial";
import { STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

const ACCENT = "#9d174d";
const WARM_BG = "#faf8f5";

const FLOW_STEPS = [
  "Find the gold in your book",
  "Choose provider",
  "Provider ingest / upload",
  "Run analysis",
  "View hidden money report",
] as const;

type Props = {
  trialId: string;
};

export function VmbTrialDashboardClient({ trialId }: Props) {
  const [record, setRecord] = useState<VmbTrialLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const loadTrial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vmb/trial?id=${encodeURIComponent(trialId)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok: boolean;
        data?: VmbTrialLead;
        error?: string;
      };
      if (!data.ok || !data.data) {
        setError(data.error ?? "Trial not found");
        setRecord(null);
        return;
      }
      setRecord(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trial");
    } finally {
      setLoading(false);
    }
  }, [trialId]);

  useEffect(() => {
    loadTrial();
  }, [loadTrial]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: STUDIOS_MUTED, fontSize: 15 }}>
        Loading your trial dashboard…
      </div>
    );
  }

  if (error || !record) {
    return (
      <div style={{ maxWidth: 520, margin: "48px auto", padding: "0 24px", textAlign: "center" }}>
        <p style={{ color: "#b91c1c", marginBottom: 16 }}>{error ?? "Trial session not found."}</p>
        <Link href="/vmb#vmb-trial" style={{ color: ACCENT, fontWeight: 800 }}>
          Start a new 30-day trial →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: WARM_BG, minHeight: "100vh", color: STUDIOS_INK }}>
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
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: ACCENT,
              }}
            >
              VMB 30-Day Trial
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{record.salonName}</div>
          </div>
          <Link href="/vmb" style={{ fontSize: 13, fontWeight: 700, color: STUDIOS_MUTED }}>
            ← Back to VMB
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 64px" }}>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "clamp(28px, 4vw, 38px)",
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          Find the gold in your book
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: 16, lineHeight: 1.55, color: STUDIOS_MUTED }}>
          Upload your owner-approved export. VMB analyzes your existing client book for revenue you
          can activate — no software change required.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 32,
          }}
        >
          {FLOW_STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveStep(i)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${i === activeStep ? ACCENT : STUDIOS_LINE}`,
                background: i === activeStep ? "#fdf2f8" : "#fff",
                color: i === activeStep ? ACCENT : STUDIOS_MUTED,
                cursor: "pointer",
              }}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <VmbSalonImportPanel
          trialId={trialId}
          defaultProvider={normalizeProvider(record.providerPlatform)}
          onAnalyzed={() => {
            setActiveStep(4);
            loadTrial();
          }}
        />

        <p
          style={{
            marginTop: 32,
            fontSize: 12,
            color: STUDIOS_MUTED,
            lineHeight: 1.5,
            maxWidth: 640,
          }}
        >
          Owner-approved exports only. Your data generates this salon&apos;s report and is not sold
          or reused. Questions?{" "}
          <a href={`mailto:support@amihuman.net?subject=VMB Trial — ${record.salonName}`}>
            Contact support
          </a>
        </p>
      </main>
    </div>
  );
}

function normalizeProvider(raw?: string): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v.includes("gloss")) return "glossgenius";
  if (v.includes("vagaro")) return "vagaro";
  if (v.includes("square")) return "square";
  if (v.includes("fresha")) return "fresha";
  if (v.includes("boulevard") || v.includes("blvd")) return "unknown";
  if (v.includes("mangomint")) return "unknown";
  return v || "glossgenius";
}
