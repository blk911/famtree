"use client";
// components/studios/creator-lab/HarvestForm.tsx
// Salon-only hashtag harvest form (vertical is set by top nav, not in-page).

import { useState, useEffect } from "react";
import Link from "next/link";
import { parseHashtags } from "@/lib/studios/creator-lab/hashtag-harvest/normalize-creators";
import {
  SALON_HASHTAG_CLUSTERS,
  SALON_HASHTAG_PRESET,
} from "@/lib/studios/creator-lab/hashtag-harvest/classifiers/salon";
import { DEFAULT_MAX_POSTS_PER_HASHTAG } from "@/lib/studios/creator-lab/hashtag-harvest/limits";
import type { HarvestRunRequest } from "@/lib/studios/creator-lab/hashtag-harvest/types";
import type { ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";

const SALON_VERTICAL_KEY = "salon";

const PROGRESS_MSGS = [
  "Connecting to Apify…",
  "Harvesting hashtag posts…",
  "Extracting creator signals…",
  "Running resolver pipeline…",
  "Matching booking profiles…",
  "Upserting prospect records…",
  "Finalising run…",
];

export interface HarvestFormProps {
  onSubmit: (params: HarvestRunRequest) => void;
  loading: boolean;
  error: string | null;
}

export function HarvestForm({ onSubmit, loading, error }: HarvestFormProps) {
  const [hashtagText,    setHashtagText]    = useState("");
  const [market,         setMarket]         = useState("");
  const [category,       setCategory]       = useState("");
  const [maxPerHashtag,  setMaxPerHashtag]  = useState(DEFAULT_MAX_POSTS_PER_HASHTAG);
  const [mode,           setMode]           = useState<ResolveMode>("fast");
  const [runGgOnAll,     setRunGgOnAll]     = useState(false);
  const [runPublicDiscovery, setRunPublicDiscovery] = useState(false);
  const [presetOpen,     setPresetOpen]     = useState(false);
  const [progressIdx,    setProgressIdx]    = useState(0);

  useEffect(() => {
    if (!loading) { setProgressIdx(0); return; }
    const interval = setInterval(
      () => setProgressIdx((i) => (i + 1) % PROGRESS_MSGS.length),
      4000,
    );
    return () => clearInterval(interval);
  }, [loading]);

  const parsedHashtags = parseHashtags(hashtagText);
  const presetText     = SALON_HASHTAG_PRESET.map((h) => `#${h}`).join("\n");

  function handleSubmit() {
    if (parsedHashtags.length === 0 || loading) return;
    onSubmit({
      hashtags: parsedHashtags,
      market,
      category,
      maxPerHashtag,
      mode,
      verticalKey: SALON_VERTICAL_KEY,
      runGgOnAllDeduped: runGgOnAll,
      runPublicDiscovery,
    });
  }

  function handleClear() {
    setHashtagText("");
    setMarket("");
    setCategory("");
    setMaxPerHashtag(DEFAULT_MAX_POSTS_PER_HASHTAG);
    setMode("fast");
    setRunGgOnAll(false);
    setRunPublicDiscovery(false);
    setPresetOpen(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #e7e5e4", borderRadius: 8,
    fontSize: 13, color: "#1c1917", background: "#fff", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 16, padding: "24px", marginBottom: 24 }}>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            HASHTAGS — ONE PER LINE OR COMMA-SEPARATED
          </label>
          <textarea
            value={hashtagText}
            onChange={(e) => setHashtagText(e.target.value)}
            rows={5}
            placeholder={"#hairstylist\n#nailtech\n#esthetician\n#salonsuite\n#behindthechair"}
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
              💈 Salon Harvest Presets {presetOpen ? "▲" : "▼"}
            </button>

            {presetOpen && (
              <div style={{ marginTop: 8, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", marginBottom: 10 }}>
                  {SALON_HASHTAG_PRESET.length} hashtags across {Object.keys(SALON_HASHTAG_CLUSTERS).length} clusters
                </div>
                {Object.entries(SALON_HASHTAG_CLUSTERS).map(([cluster, tags]) => (
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
                    Load All {SALON_HASHTAG_PRESET.length} Tags
                  </button>
                  <span style={{ fontSize: 11, color: "#a8a29e", alignSelf: "center" }}>
                    Replaces current textarea content
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            MARKET / CITY
          </label>
          <input
            type="text" value={market} onChange={(e) => setMarket(e.target.value)}
            placeholder="Denver, CO" style={inputStyle} disabled={loading}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            CATEGORY HINT
          </label>
          <input
            type="text" value={category} onChange={(e) => setCategory(e.target.value)}
            placeholder="Hair, Nails, Esthetics…" style={inputStyle} disabled={loading}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#78716c", letterSpacing: "0.07em", marginBottom: 6 }}>
            MAX POSTS PER HASHTAG
          </label>
          <select
            value={maxPerHashtag} onChange={(e) => setMaxPerHashtag(Number(e.target.value))}
            style={{ ...inputStyle }} disabled={loading}
          >
            {[25, 50, 75, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

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

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 12,
              color: "#44403c",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={runGgOnAll}
              onChange={(e) => setRunGgOnAll(e.target.checked)}
              disabled={loading}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Enrich with booking platforms</strong>
              <span style={{ display: "block", fontSize: 11, color: "#a8a29e", marginTop: 2 }}>
                Find GlossGenius and booking signals for harvested creators.
              </span>
            </span>
          </label>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 12,
              color: "#44403c",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={runPublicDiscovery}
              onChange={(e) => setRunPublicDiscovery(e.target.checked)}
              disabled={loading}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Enrich with public business data</strong>
              <span style={{ display: "block", fontSize: 11, color: "#a8a29e", marginTop: 2 }}>
                Find websites, Google presence, and business stack signals.
              </span>
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
          ❌ {error}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#f5f5f4", borderRadius: 8, fontSize: 13, color: "#57534e" }}>
          <span style={{ marginRight: 8 }}>⏳</span>{PROGRESS_MSGS[progressIdx]}
          <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
            This can take 30–90 seconds. Apify is harvesting hashtag posts, then the resolver is matching booking profiles.
          </div>
        </div>
      )}

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
