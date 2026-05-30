"use client";
// components/studios/creator-lab/HarvestForm.tsx
// Isolated harvest form component — owns ALL form state.
// Parent mounts/unmounts it; incrementing the parent's key prop
// gives a guaranteed clean slate with no manual state clearing needed.

import { useState, useEffect } from "react";
import { parseHashtags } from "@/lib/studios/creator-lab/hashtag-harvest/normalize-creators";
import {
  EDUCATION_HASHTAG_CLUSTERS,
  EDUCATION_HASHTAG_PRESET,
} from "@/lib/studios/creator-lab/hashtag-harvest/classifiers/education";
import {
  SALON_HASHTAG_CLUSTERS,
  SALON_HASHTAG_PRESET,
} from "@/lib/studios/creator-lab/hashtag-harvest/classifiers/salon";
import type { HarvestRunRequest } from "@/lib/studios/creator-lab/hashtag-harvest/types";
import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";

// ─── Vertical definitions ─────────────────────────────────────────────────────

interface VerticalOption {
  key: string;
  label: string;
  icon: string;
  available: boolean;
  clusters: Record<string, string[]>;
  preset: string[];
  placeholderHashtags: string;
  placeholderMarket: string;
  placeholderCategory: string;
}

const VERTICAL_OPTIONS: VerticalOption[] = [
  {
    key: "education",
    label: "Education",
    icon: "🎓",
    available: true,
    clusters: EDUCATION_HASHTAG_CLUSTERS,
    preset: EDUCATION_HASHTAG_PRESET,
    placeholderHashtags: "#homeschool\n#homeschoolmom\n#microschool\n#mathtutor\n#dyslexia",
    placeholderMarket:   "Denver, CO",
    placeholderCategory: "Homeschool, Tutor, STEM…",
  },
  {
    key: "salon",
    label: "Salon / Client-Centric",
    icon: "💈",
    available: true,
    clusters: SALON_HASHTAG_CLUSTERS,
    preset: SALON_HASHTAG_PRESET,
    placeholderHashtags: "#hairstylist\n#nailtech\n#esthetician\n#salonsuite\n#behindthechair",
    placeholderMarket:   "Denver, CO",
    placeholderCategory: "Hair, Nails, Esthetics…",
  },
  {
    key: "transpo",
    label: "Transpo",
    icon: "🚛",
    available: false,
    clusters: {},
    preset: [],
    placeholderHashtags: "",
    placeholderMarket:   "",
    placeholderCategory: "",
  },
  {
    key: "hcare",
    label: "HCare",
    icon: "🏥",
    available: false,
    clusters: {},
    preset: [],
    placeholderHashtags: "",
    placeholderMarket:   "",
    placeholderCategory: "",
  },
  {
    key: "labs",
    label: "Labs",
    icon: "🔬",
    available: false,
    clusters: {},
    preset: [],
    placeholderHashtags: "",
    placeholderMarket:   "",
    placeholderCategory: "",
  },
];

const PROGRESS_MSGS = [
  "Connecting to Apify…",
  "Harvesting hashtag posts…",
  "Extracting creator signals…",
  "Running resolver pipeline…",
  "Matching booking profiles…",
  "Upserting prospect records…",
  "Finalising run…",
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface HarvestFormProps {
  onSubmit: (params: HarvestRunRequest) => void;
  loading: boolean;
  error: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HarvestForm({ onSubmit, loading, error }: HarvestFormProps) {
  // All form state lives here. Parent never touches it.
  const [verticalKey,    setVerticalKey]    = useState("education");
  const [hashtagText,    setHashtagText]    = useState("");
  const [market,         setMarket]         = useState("");
  const [category,       setCategory]       = useState("");
  const [maxPerHashtag,  setMaxPerHashtag]  = useState(10);
  const [mode,           setMode]           = useState<ResolveMode>("fast");
  const [presetOpen,     setPresetOpen]     = useState(false);
  const [progressIdx,    setProgressIdx]    = useState(0);

  // Advance progress ticker while loading (controlled entirely inside the form)
  useEffect(() => {
    if (!loading) { setProgressIdx(0); return; }
    const interval = setInterval(
      () => setProgressIdx((i) => (i + 1) % PROGRESS_MSGS.length),
      4000,
    );
    return () => clearInterval(interval);
  }, [loading]);

  const vertical       = VERTICAL_OPTIONS.find((v) => v.key === verticalKey) ?? VERTICAL_OPTIONS[0];
  const parsedHashtags = parseHashtags(hashtagText);
  const presetText     = vertical.preset.map((h) => `#${h}`).join("\n");

  function handleVerticalChange(key: string) {
    setVerticalKey(key);
    setHashtagText("");
    setPresetOpen(false);
  }

  function handleSubmit() {
    if (parsedHashtags.length === 0 || loading) return;
    onSubmit({ hashtags: parsedHashtags, market, category, maxPerHashtag, mode, verticalKey });
  }

  function handleClear() {
    setHashtagText("");
    setMarket("");
    setCategory("");
    setMaxPerHashtag(10);
    setMode("fast");
    setPresetOpen(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #e7e5e4", borderRadius: 8,
    fontSize: 13, color: "#1c1917", background: "#fff", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 16, padding: "24px", marginBottom: 24 }}>

      {/* Vertical selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 8 }}>
          VERTICAL — SELECT YOUR MARKET
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {VERTICAL_OPTIONS.map((v) => (
            <button
              key={v.key}
              type="button"
              disabled={!v.available || loading}
              onClick={() => handleVerticalChange(v.key)}
              style={{
                padding: "6px 14px", borderRadius: 20, border: "2px solid",
                borderColor: verticalKey === v.key ? "#1c1917" : "#e7e5e4",
                background:  verticalKey === v.key ? "#1c1917" : "#fff",
                color:       verticalKey === v.key ? "#fff" : v.available ? "#57534e" : "#d6d3d1",
                fontWeight: 700, fontSize: 12,
                cursor: v.available && !loading ? "pointer" : "not-allowed",
                opacity: v.available ? 1 : 0.45,
              }}
            >
              {v.icon} {v.label}{!v.available ? " (soon)" : ""}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Hashtags */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            HASHTAGS — ONE PER LINE OR COMMA-SEPARATED
          </label>
          <textarea
            value={hashtagText}
            onChange={(e) => setHashtagText(e.target.value)}
            rows={5}
            placeholder={vertical.placeholderHashtags}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            disabled={loading}
          />
          {parsedHashtags.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {parsedHashtags.map((h) => (
                <span key={h} style={{
                  fontSize: 10, background: "#fce7f3", color: "#9d174d",
                  borderRadius: 20, padding: "2px 8px", fontWeight: 700,
                }}>
                  #{h}
                </span>
              ))}
            </div>
          )}

          {/* Preset panel */}
          {vertical.preset.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setPresetOpen((v) => !v)}
                style={{
                  fontSize: 11, fontWeight: 700, color: "#6d28d9", background: "#ede9fe",
                  border: "1px solid #c4b5fd", borderRadius: 6, padding: "4px 12px",
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
                }}
              >
                {vertical.icon} Harvest Presets {presetOpen ? "▲" : "▼"}
              </button>

              {presetOpen && (
                <div style={{ marginTop: 8, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", marginBottom: 10 }}>
                    {vertical.preset.length} hashtags across {Object.keys(vertical.clusters).length} clusters
                  </div>
                  {Object.entries(vertical.clusters).map(([cluster, tags]) => (
                    <div key={cluster} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#a855f7", letterSpacing: "0.08em", marginBottom: 4 }}>
                        {cluster}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {tags.map((tag) => (
                          <span key={tag} style={{
                            fontSize: 10, background: "#ede9fe", color: "#7c3aed",
                            borderRadius: 20, padding: "1px 8px", fontWeight: 600,
                          }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => { setHashtagText(presetText); setPresetOpen(false); }}
                      style={{
                        padding: "6px 16px", borderRadius: 8, border: "none",
                        background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                      }}
                    >
                      Load All {vertical.preset.length} Tags
                    </button>
                    <span style={{ fontSize: 11, color: "#a8a29e", alignSelf: "center" }}>
                      Replaces current textarea content
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Market */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            MARKET / CITY
          </label>
          <input
            type="text" value={market} onChange={(e) => setMarket(e.target.value)}
            placeholder={vertical.placeholderMarket} style={inputStyle} disabled={loading}
          />
        </div>

        {/* Category hint */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            CATEGORY HINT
          </label>
          <input
            type="text" value={category} onChange={(e) => setCategory(e.target.value)}
            placeholder={vertical.placeholderCategory} style={inputStyle} disabled={loading}
          />
        </div>

        {/* Max per hashtag */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            MAX CREATORS PER HASHTAG
          </label>
          <select
            value={maxPerHashtag} onChange={(e) => setMaxPerHashtag(Number(e.target.value))}
            style={{ ...inputStyle }} disabled={loading}
          >
            {[5, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Resolver mode */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            RESOLVER MODE
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["fast", "deep"] as ResolveMode[]).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} disabled={loading}
                style={{
                  padding: "7px 16px", borderRadius: 20, border: "2px solid",
                  borderColor: mode === m ? "#9d174d" : "#e7e5e4",
                  background:  mode === m ? "#9d174d" : "#fff",
                  color:       mode === m ? "#fff" : "#57534e",
                  fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}
              >
                {m === "fast" ? "⚡ Fast" : "🔬 Deep Research"}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
            {mode === "fast"
              ? "URL pattern matching only. No AI spend."
              : "AI identity analysis on top candidates. Slower, higher accuracy."}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
          ❌ {error}
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#f5f5f4", borderRadius: 8, fontSize: 13, color: "#57534e" }}>
          <span style={{ marginRight: 8 }}>⏳</span>{PROGRESS_MSGS[progressIdx]}
          <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
            This can take 30–90 seconds. Apify is harvesting hashtag posts, then the resolver is matching booking profiles.
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
        <button
          onClick={handleSubmit}
          disabled={loading || parsedHashtags.length === 0}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: loading || parsedHashtags.length === 0 ? "#d6d3d1" : "#1c1917",
            color: "#fff", fontWeight: 800, fontSize: 14,
            cursor: loading || parsedHashtags.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? "Harvesting…"
            : `Harvest ${parsedHashtags.length > 0 ? parsedHashtags.length : ""} Hashtag${parsedHashtags.length !== 1 ? "s" : ""}`}
        </button>
        {(hashtagText || market || category) && !loading && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: "10px 16px", borderRadius: 10, border: "1px solid #e7e5e4",
              background: "#fff", color: "#78716c", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
