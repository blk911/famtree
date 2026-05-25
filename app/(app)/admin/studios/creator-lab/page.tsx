"use client";

// app/(app)/admin/studios/creator-lab/page.tsx
// Studio Assembler Lab — internal AIH Studios tool.
// Admin enters a creator URL; system fetches, extracts, and enriches into a draft studio profile.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreatorLabEntry } from "@/lib/studios/creator-lab/types";

// ─── Styles ────────────────────────────────────────────────────────────────────

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

const badge = (status: string): React.CSSProperties => {
  const map: Record<string, { bg: string; color: string }> = {
    assembled:     { bg: "#dbeafe", color: "#1e40af" },
    pending_review: { bg: "#fef3c7", color: "#92400e" },
    approved:      { bg: "#d1fae5", color: "#065f46" },
    rejected:      { bg: "#fee2e2", color: "#991b1b" },
  };
  const { bg, color } = map[status] ?? { bg: "#f5f5f4", color: "#57534e" };
  return {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: bg,
    color,
    textTransform: "capitalize",
  };
};

const confidenceDot = (c: string): React.CSSProperties => ({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: c === "high" ? "#22c55e" : c === "medium" ? "#f59e0b" : "#ef4444",
  marginRight: 5,
  verticalAlign: "middle",
});

// ─── Platform chip ─────────────────────────────────────────────────────────────

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: "📸",
  etsy:      "🛍️",
  shopify:   "🏪",
  squarespace: "⬛",
  wix:       "🌐",
  bigcartel: "🎨",
  website:   "🌎",
  unknown:   "❓",
};

// ─── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({ entry }: { entry: CreatorLabEntry }) {
  return (
    <Link href={`/admin/studios/creator-lab/${entry.creatorId}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "white",
          border: "1px solid #ece9e3",
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          cursor: "pointer",
          transition: "box-shadow 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
      >
        {/* Platform icon */}
        <div style={{ fontSize: 28, flexShrink: 0, width: 44, textAlign: "center" }}>
          {PLATFORM_EMOJI[entry.platform] ?? "🌎"}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1c1917" }}>
              {entry.suggestedStudioName}
            </span>
            {entry.handle && (
              <span style={{ fontSize: 12, color: "#78716c" }}>{entry.handle}</span>
            )}
            <span style={badge(entry.status)}>{entry.status.replace("_", " ")}</span>
          </div>
          <div style={{ fontSize: 12, color: "#a8a29e", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span>
              <span style={confidenceDot(entry.confidence)} />
              {entry.confidence} confidence
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
              {entry.sourceUrl}
            </span>
            <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div style={{ color: "#a8a29e", fontSize: 18, flexShrink: 0 }}>→</div>
      </div>
    </Link>
  );
}

// ─── Progress step indicator ───────────────────────────────────────────────────

type Step = "idle" | "fetching" | "extracting" | "enriching" | "saving" | "done" | "error";

const STEP_LABELS: Record<Step, string> = {
  idle:       "",
  fetching:   "🌐 Fetching creator page…",
  extracting: "🔍 Extracting signals…",
  enriching:  "🤖 AI enrichment in progress…",
  saving:     "💾 Saving assembled studio…",
  done:       "✅ Assembly complete!",
  error:      "❌ Assembly failed",
};

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CreatorLabPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pastedContext, setPastedContext] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [entries, setEntries] = useState<CreatorLabEntry[] | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const busy = step !== "idle" && step !== "done" && step !== "error";

  // Load existing entries on first render
  const loadEntries = async () => {
    if (loadingEntries || entries !== null) return;
    setLoadingEntries(true);
    try {
      const res = await fetch("/api/admin/studios/creator-lab/list");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } catch {}
    setLoadingEntries(false);
  };

  // Kick off on mount via useEffect-equivalent approach
  if (entries === null && !loadingEntries) {
    loadEntries();
  }

  const handleAssemble = async () => {
    if (!url.trim() || busy) return;
    setErrorMsg(null);
    setStep("fetching");

    try {
      // Small UI delays so the user can see step progression
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
      await new Promise((r) => setTimeout(r, 600));
      router.push(`/admin/studios/creator-lab/${data.creatorId}`);
    } catch (e) {
      setStep("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px 60px" }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: "#78716c", marginBottom: 20 }}>
        <Link href="/admin/studios" style={{ fontWeight: 700, color: "#1c1917", textDecoration: "none" }}>
          ← Studio Management
        </Link>
        <span style={{ margin: "0 8px", color: "#d6d3d1" }}>|</span>
        <span>Creator Lab</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1c1917", margin: "0 0 8px" }}>
          🧪 Studio Assembler Lab
        </h1>
        <p style={{ fontSize: 15, color: "#78716c", margin: 0, lineHeight: 1.6 }}>
          Internal AIH Studios tool. Enter any creator URL — the system fetches public signals,
          extracts identity, products, and style, then runs AI enrichment to produce a reviewable
          draft studio profile.
        </p>
      </div>

      {/* Input card */}
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

        {/* Optional pasted context */}
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#78716c", display: "block", marginBottom: 6 }}>
            Paste profile info <span style={{ fontWeight: 400, color: "#a8a29e" }}>(optional — bio, follower count, captions, anything you can copy from the page)</span>
          </label>
          <textarea
            value={pastedContext}
            onChange={(e) => setPastedContext(e.target.value)}
            disabled={busy}
            placeholder={"ashleyraycushman\nASHLEY RAY\n241 posts · 105K followers\nHi I'm Ashley — artist, maker..."}
            rows={4}
            style={{
              ...inputStyle,
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: 13,
              lineHeight: 1.55,
              color: "#1c1917",
            }}
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

        {/* Supported sources hint */}
        <div style={{ marginTop: 14, fontSize: 12, color: "#a8a29e", display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["📸 Instagram", "🛍️ Etsy", "🏪 Shopify", "⬛ Squarespace", "🌎 Any public website"].map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </div>

      {/* Assembled studios list */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1c1917", margin: 0 }}>
            Assembled Studios
          </h2>
          <span style={{ fontSize: 12, color: "#a8a29e" }}>
            {entries === null ? "Loading…" : `${entries.length} total`}
          </span>
        </div>

        {loadingEntries && (
          <div style={{ color: "#a8a29e", fontSize: 14, padding: "24px 0" }}>Loading…</div>
        )}

        {entries !== null && entries.length === 0 && (
          <div style={{
            border: "2px dashed #e7e5e4",
            borderRadius: 12,
            padding: "40px 24px",
            textAlign: "center",
            color: "#a8a29e",
            fontSize: 14,
          }}>
            No studios assembled yet. Paste a creator URL above to get started.
          </div>
        )}

        {entries !== null && entries.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entries.map((e) => (
              <EntryCard key={e.creatorId} entry={e} />
            ))}
          </div>
        )}
      </div>

      {/* Internal notice */}
      <div style={{ marginTop: 40, fontSize: 12, color: "#d6d3d1", textAlign: "center" }}>
        Internal AIH Studios tool · Not visible to creators or members · Data stored locally in{" "}
        <code style={{ background: "#f5f5f4", padding: "1px 5px", borderRadius: 4 }}>
          runtime-data/studios/creator-lab/
        </code>
      </div>
    </div>
  );
}
