"use client";

// app/(app)/admin/studios/creator-lab/page.tsx
// Studio Assembler — internal Creator Intelligence tool.
// Renders assembled result inline — no redirect, no storage dependency.

import { useState, useEffect } from "react";
import Link from "next/link";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import type { AssembledCreatorStudio } from "@/lib/studios/creator-lab/types";

// ─── Shared primitives ────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "white",
  borderRadius: 16,
  border: "1px solid #ece9e3",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  padding: "24px 28px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  border: "1px solid #d6d3d1",
  borderRadius: 10,
  fontSize: 15,
  color: "#1c1917",
  background: "white",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 28px",
  background: "#1c1917",
  color: "white",
  border: "none",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  background: "#a8a29e",
  cursor: "not-allowed",
};

const chip = (text: string, bg = "#f5f5f4", color = "#57534e") => (
  <span key={text} style={{
    display: "inline-block", padding: "3px 10px", borderRadius: 20,
    fontSize: 12, fontWeight: 500, background: bg, color,
    margin: "2px 4px 2px 0",
  }}>{text}</span>
);

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "#22c55e", medium: "#f59e0b", low: "#ef4444",
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: "📸", etsy: "🛍️", shopify: "🏪",
  squarespace: "⬛", wix: "🌐", bigcartel: "🎨",
  website: "🌎", unknown: "❓",
};

// ─── Inline result view ───────────────────────────────────────────────────────

function AssembledResult({ studio, onReset }: { studio: AssembledCreatorStudio; onReset: () => void }) {
  const { identity, styleProfile, monetization, collections, signals } = studio;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{PLATFORM_EMOJI[studio.source.platform]}</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1c1917" }}>
              {studio.suggestedStudioName}
            </h2>
            {identity.handle && <div style={{ fontSize: 13, color: "#78716c" }}>{identity.handle}</div>}
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: "#f5f5f4", color: "#57534e",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: CONFIDENCE_COLOR[studio.confidence], display: "inline-block" }} />
            {studio.confidence} confidence
          </span>
        </div>
        <button onClick={onReset} style={{ ...btnPrimary, padding: "8px 18px", fontSize: 13, background: "#f5f5f4", color: "#1c1917" }}>
          ← New assembly
        </button>
      </div>

      {/* Review notes */}
      {studio.reviewNotes.length > 0 && (
        <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10 }}>
          {studio.reviewNotes.map((n, i) => (
            <div key={i} style={{ fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>{n}</div>
          ))}
        </div>
      )}

      {/* Identity */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Identity</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {studio.suggestedHeroImageUrl && (
            <img src={studio.suggestedHeroImageUrl} alt="" style={{ width: 80, height: 80, borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "#f5f5f4" }} />
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, color: "#57534e", fontStyle: "italic", marginBottom: 8 }}>"{studio.suggestedTagline}"</div>
            <div style={{ marginBottom: 8 }}>
              {chip(studio.vertical.replace("_", " "), "#f0fdf4", "#166534")}
              {styleProfile.priceRange && chip(styleProfile.priceRange, "#fef9c3", "#713f12")}
              {studio.suggestedCategories.map(c => chip(c, "#ede9fe", "#5b21b6"))}
            </div>
            {identity.locationGuess && <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>📍 {identity.locationGuess}</div>}
            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.65 }}>{identity.shortBio}</div>
          </div>
        </div>
        {identity.longBio && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
            {identity.longBio}
          </div>
        )}
      </div>

      {/* Style + Monetization side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Style</div>
          {styleProfile.aesthetic.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#a8a29e", marginBottom: 4 }}>Aesthetic</div>
              <div>{styleProfile.aesthetic.map(a => chip(a, "#fce7f3", "#9d174d"))}</div>
            </div>
          )}
          {styleProfile.medium.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#a8a29e", marginBottom: 4 }}>Medium</div>
              <div>{styleProfile.medium.map(m => chip(m, "#e0f2fe", "#075985"))}</div>
            </div>
          )}
          {styleProfile.audienceGuess.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#a8a29e", marginBottom: 4 }}>Audience</div>
              <div>{styleProfile.audienceGuess.map(a => chip(a, "#f0fdf4", "#166534"))}</div>
            </div>
          )}
          {styleProfile.tags.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "#a8a29e", marginBottom: 4 }}>Tags</div>
              <div>{styleProfile.tags.map(t => chip(`#${t}`, "#f5f5f4", "#44403c"))}</div>
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Monetization</div>
          {monetization.primaryModel && (
            <div style={{ marginBottom: 10 }}>{chip(monetization.primaryModel, "#fef3c7", "#92400e")}</div>
          )}
          {monetization.opportunities.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#a8a29e", marginBottom: 4 }}>Opportunities</div>
              <ul style={{ margin: 0, padding: "0 0 0 16px", color: "#15803d", fontSize: 13, lineHeight: 1.8 }}>
                {monetization.opportunities.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
          {monetization.signals.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "#a8a29e", marginBottom: 4 }}>Signals</div>
              <ul style={{ margin: 0, padding: "0 0 0 16px", color: "#57534e", fontSize: 12, lineHeight: 1.8 }}>
                {monetization.signals.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Collections */}
      {collections.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Collections ({collections.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {collections.map((col, i) => (
              <div key={i} style={{ padding: "12px 14px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f0ede8" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#1c1917", marginBottom: 3 }}>{col.name}</div>
                <div style={{ fontSize: 12, color: "#78716c", lineHeight: 1.5 }}>{col.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signals summary */}
      <div style={{ ...card, borderLeft: "3px solid #e7e5e4" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Raw Signals</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "#57534e" }}>
          <span>📦 {signals.productSignals.length} products</span>
          <span>🗂 {signals.collectionSignals.length} collections</span>
          <span>📅 {signals.eventSignals.length} events</span>
          <span>🖼 {signals.imageUrls.length} images</span>
          <span>✍️ {signals.bioCandidates.length} bio candidates</span>
          {signals.commissionSignals.length > 0 && <span>🎨 commissions detected</span>}
          {signals.classWorkshopSignals.length > 0 && <span>🎓 classes detected</span>}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#a8a29e" }}>
          Source: <a href={studio.source.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8" }}>{studio.source.sourceUrl}</a>
          {" · "}{studio.source.platform}{" · "}fetched {new Date(studio.source.fetchedAt).toLocaleTimeString()}
        </div>
      </div>

    </div>
  );
}

// ─── Progress step indicator ───────────────────────────────────────────────────

type Step = "idle" | "fetching" | "extracting" | "enriching" | "saving" | "done" | "error";

const STEP_LABELS: Record<Step, string> = {
  idle:       "",
  fetching:   "🌐 Fetching creator page…",
  extracting: "🔍 Extracting signals…",
  enriching:  "🤖 AI enrichment in progress…",
  saving:     "💾 Finalising…",
  done:       "✅ Assembly complete!",
  error:      "❌ Assembly failed",
};

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CreatorLabPage() {
  const [url, setUrl] = useState("");
  const [pastedContext, setPastedContext] = useState("");

  // Pre-fill URL if arriving from the IG Stub Resolver via ?url=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("url");
    if (incoming) setUrl(decodeURIComponent(incoming));
  }, []);
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [assembledStudio, setAssembledStudio] = useState<AssembledCreatorStudio | null>(null);

  const busy = step !== "idle" && step !== "done" && step !== "error";

  const handleReset = () => {
    setAssembledStudio(null);
    setStep("idle");
    setErrorMsg(null);
  };

  const handleAssemble = async () => {
    if (!url.trim() || busy) return;
    setErrorMsg(null);
    setAssembledStudio(null);
    setStep("fetching");

    try {
      await new Promise((r) => setTimeout(r, 300));
      setStep("extracting");
      await new Promise((r) => setTimeout(r, 200));
      setStep("enriching");

      const res = await fetch("/api/admin/studios/creator-lab/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), pastedContext: pastedContext.trim() || undefined }),
      });

      setStep("saving");
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const detail = data.detail ? ` — ${data.detail}` : "";
        throw new Error(`${data.error ?? `HTTP ${res.status}`}${detail}`);
      }

      setStep("done");
      setAssembledStudio(data.studio);
    } catch (e) {
      setStep("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ maxWidth: 860, padding: "24px 20px 60px" }}>

      <CreatorIntelligenceNav current="assembler" />

      <IntelligenceFeatureHeader
        title="Studio Assembler"
        description="Enter any creator URL — the system fetches public signals, extracts identity, products, and style, then runs AI enrichment to produce a reviewable draft studio profile."
        config={salonConfig}
      />

      {/* Input card — hide after successful assembly */}
      {!assembledStudio && (
        <div style={{ ...card, marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#57534e", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Creator URL
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAssemble(); }}
              placeholder="https://instagram.com/handle  ·  https://shop.etsy.com/shop/name  ·  any public URL"
              style={inputStyle}
              disabled={busy}
              autoFocus
            />
            <button
              onClick={handleAssemble}
              disabled={!url.trim() || busy}
              style={!url.trim() || busy ? btnDisabled : btnPrimary}
            >
              {busy ? "Working…" : "Assemble →"}
            </button>
          </div>

          {/* No URL? Use the stub resolver */}
          <div style={{ marginTop: 8, textAlign: "right" }}>
            <Link
              href="/admin/studios/creator-lab/ig-stubs"
              style={{ fontSize: 12, color: "#9d174d", fontWeight: 700, textDecoration: "none" }}
            >
              Don't have a URL? Find one via IG handle →
            </Link>
          </div>

          {/* Optional pasted context */}
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#78716c", display: "block", marginBottom: 6 }}>
              Paste profile info{" "}
              <span style={{ fontWeight: 400, color: "#a8a29e" }}>
                (optional — bio, follower count, captions, anything you can copy from the page)
              </span>
            </label>
            <textarea
              value={pastedContext}
              onChange={(e) => setPastedContext(e.target.value)}
              disabled={busy}
              placeholder={"ashleyraycushman\nASHLEY RAY\n241 posts · 105K followers\nHi I'm Ashley — artist, maker..."}
              rows={4}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", fontSize: 13, lineHeight: 1.55 }}
            />
          </div>

          {/* Progress / status */}
          {step !== "idle" && (
            <div style={{ marginTop: 16, padding: "10px 14px", background: "#f5f5f4", borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: step === "error" ? "#dc2626" : "#1c1917", fontWeight: 500 }}>
                {STEP_LABELS[step]}
              </span>
              {errorMsg && (
                <div style={{ marginTop: 6, color: "#dc2626", fontSize: 12 }}>{errorMsg}</div>
              )}
            </div>
          )}

          {/* Supported sources */}
          <div style={{ marginTop: 14, fontSize: 12, color: "#a8a29e", display: "flex", gap: 12, flexWrap: "wrap" }}>
            {["📸 Instagram", "🛍️ Etsy", "🏪 Shopify", "⬛ Squarespace", "🌎 Any public website"].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Inline assembled result */}
      {assembledStudio && (
        <AssembledResult studio={assembledStudio} onReset={handleReset} />
      )}

      {/* Footer */}
      {!assembledStudio && (
        <div style={{ marginTop: 40, fontSize: 12, color: "#d6d3d1", textAlign: "center" }}>
          Internal AIH Studios tool · Not visible to creators or members
        </div>
      )}
    </div>
  );
}
