"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { VmbCard } from "@/components/vmb/VmbCard";
import { VMB_SAMPLE_BOOK_TEXT } from "@/lib/vmb/sample-book";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbProviderPlatform } from "@/types/vmb/trial";

const PROVIDERS: { id: VmbProviderPlatform; label: string }[] = [
  { id: "glossgenius", label: "GlossGenius" },
  { id: "vagaro", label: "Vagaro" },
  { id: "square", label: "Square" },
  { id: "fresha", label: "Fresha" },
  { id: "sola", label: "Sola" },
  { id: "other", label: "Other" },
];

export function VmbStartFlow() {
  const [salonName, setSalonName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<VmbProviderPlatform | "">("");
  const [bookText, setBookText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VmbBookAnalysisResult | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleRunAnalysis() {
    setBusy(true);
    setError(null);
    setAnalysis(null);
    setWarnings([]);

    try {
      if (!salonName.trim() || !ownerName.trim() || !email.trim()) {
        setError("Salon name, your name, and email are required.");
        return;
      }
      if (!provider) {
        setError("Choose your booking provider.");
        return;
      }
      if (!bookText.trim()) {
        setError("Paste your client book or use the sample book.");
        return;
      }

      const trialRes = await fetch("/api/vmb/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonName: salonName.trim(),
          ownerName: ownerName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          providerPlatform: provider,
        }),
      });
      const trialJson = (await trialRes.json()) as {
        ok: boolean;
        data?: { id: string };
        error?: string;
      };
      if (!trialJson.ok || !trialJson.data?.id) {
        setError(trialJson.error ?? "Could not start trial.");
        return;
      }

      const analyzeRes = await fetch("/api/vmb/analyze-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trialId: trialJson.data.id,
          salonName: salonName.trim(),
          providerPlatform: provider,
          inputText: bookText,
        }),
      });
      const analyzeJson = (await analyzeRes.json()) as {
        ok: boolean;
        data?: { analysis: VmbBookAnalysisResult; warnings: string[] };
        error?: string;
      };
      if (!analyzeJson.ok || !analyzeJson.data?.analysis) {
        setError(analyzeJson.error ?? "Analysis failed.");
        return;
      }

      setAnalysis(analyzeJson.data.analysis);
      setWarnings(analyzeJson.data.warnings ?? []);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>
      <VmbCard padding="lg">
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Let&apos;s Find The Gold In Your Book
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: 15, lineHeight: 1.6, color: VMB_THEME.muted }}>
          Tell us about your salon, choose your booking platform, and paste your client export.
          VMB surfaces reactivation, referral, gift, and trusted-provider opportunities.
        </p>

        <div style={{ display: "grid", gap: 24 }}>
          <section>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700 }}>Your salon</p>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                placeholder="Salon name"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                style={fieldStyle}
              />
              <input
                placeholder="Your name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                style={fieldStyle}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={fieldStyle}
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={fieldStyle}
              />
            </div>
          </section>

          <section>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700 }}>
              Booking provider
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${provider === p.id ? VMB_THEME.accent : VMB_THEME.line}`,
                    background: provider === p.id ? VMB_THEME.accentSoft : "#fff",
                    fontSize: 15,
                    fontWeight: provider === p.id ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Client book</p>
              <button
                type="button"
                onClick={() => setBookText(VMB_SAMPLE_BOOK_TEXT)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: VMB_THEME.accent,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Use Sample Book
              </button>
            </div>
            <textarea
              value={bookText}
              onChange={(e) => setBookText(e.target.value)}
              placeholder="Paste CSV or pipe-separated rows — one client per line"
              rows={10}
              style={{
                ...fieldStyle,
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.45,
              }}
            />
            <p style={{ margin: "8px 0 0", fontSize: 12, color: VMB_THEME.muted }}>
              CSV headers or pipe format: Name | email | phone | service | date | amount
            </p>
          </section>

          {error ? (
            <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{error}</p>
          ) : null}

          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={busy}
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              border: "none",
              background: VMB_THEME.accent,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.85 : 1,
            }}
          >
            {busy ? "Analyzing your book…" : "Run Analysis"}
          </button>

          {analysis ? (
            <div
              style={{
                padding: "20px 18px",
                borderRadius: 14,
                background: VMB_THEME.accentSoft,
                border: `1px solid ${VMB_THEME.accentMuted}`,
              }}
            >
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: VMB_THEME.accent,
                }}
              >
                Analysis complete
              </p>
              <ul style={{ margin: "0 0 16px", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                <li style={{ fontSize: 16, fontWeight: 600 }}>
                  {analysis.reactivationTargets.length} Reactivation Targets
                </li>
                <li style={{ fontSize: 16, fontWeight: 600 }}>
                  {analysis.referralOpportunities.length} Referral Opportunities
                </li>
                <li style={{ fontSize: 16, fontWeight: 600 }}>
                  {analysis.giftOpportunities.length} Gift Opportunities
                </li>
                <li style={{ fontSize: 16, fontWeight: 600 }}>
                  {analysis.trustedProviderIntroOpportunities.length} Trusted Provider Intros
                </li>
              </ul>
              <p style={{ margin: "0 0 16px", fontSize: 15, color: VMB_THEME.muted }}>
                Estimated Recoverable Revenue:{" "}
                <strong style={{ color: VMB_THEME.ink, fontSize: 22 }}>
                  ${analysis.estimatedRecoverableRevenue.toLocaleString()}
                </strong>
              </p>
              {warnings.length > 0 ? (
                <p style={{ margin: "0 0 12px", fontSize: 12, color: VMB_THEME.muted }}>
                  {warnings.slice(0, 3).join(" · ")}
                </p>
              ) : null}
              <Link
                href={`/vmb/dashboard?analysis=${encodeURIComponent(analysis.analysisId)}`}
                style={{
                  display: "inline-block",
                  fontSize: 14,
                  fontWeight: 700,
                  color: VMB_THEME.accent,
                  textDecoration: "none",
                }}
              >
                View your dashboard →
              </Link>
            </div>
          ) : null}
        </div>
      </VmbCard>
    </div>
  );
}

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.1)",
  fontSize: 15,
  boxSizing: "border-box",
};
