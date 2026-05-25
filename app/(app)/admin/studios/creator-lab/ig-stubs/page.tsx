"use client";
// app/(app)/admin/studios/creator-lab/ig-stubs/page.tsx
// IG Stub Resolver — given IG handles + display names, find public booking/store profiles.

import { useState } from "react";
import { parseSeeds } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { LabStepper } from "@/components/studios/creator-lab/LabStepper";
import type {
  ResolveMode,
  ResolveResponse,
  ResolveErrorResponse,
  StubResolutionResult,
  ResolvedProfile,
} from "@/lib/studios/creator-lab/ig-stubs/types";

// ─── Colour helpers ───────────────────────────────────────────────────────────

function confidenceColor(score: number): string {
  if (score >= 65) return "#16a34a"; // green
  if (score >= 35) return "#d97706"; // amber
  return "#dc2626";                  // red
}

function statusBadge(status: StubResolutionResult["status"]): { label: string; bg: string; fg: string } {
  switch (status) {
    case "resolved":   return { label: "Resolved",   bg: "#dcfce7", fg: "#15803d" };
    case "partial":    return { label: "Partial",    bg: "#fef3c7", fg: "#b45309" };
    case "unresolved": return { label: "No match",   bg: "#fee2e2", fg: "#b91c1c" };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidencePip({ score }: { score: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontWeight: 700,
        fontSize: 13,
        color: confidenceColor(score),
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: confidenceColor(score),
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {score}
    </span>
  );
}

function ProfileCard({ profile, handle }: { profile: ResolvedProfile; handle: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#78716c",
            background: "#f5f5f4",
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {profile.platform}
        </span>
        <ConfidencePip score={profile.confidenceScore} />
        <a
          href={profile.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            color: "#0284c7",
            textDecoration: "none",
            maxWidth: 320,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {profile.url}
        </a>
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "#78716c",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          {expanded ? "▲ less" : "▼ more"}
        </button>
      </div>

      {/* Key fields */}
      <div style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#57534e" }}>
        {profile.detectedName && (
          <span><strong>Name:</strong> {profile.detectedName}</span>
        )}
        {profile.detectedLocation && (
          <span><strong>Location:</strong> {profile.detectedLocation}</span>
        )}
        {profile.detectedServices.length > 0 && (
          <span><strong>Services:</strong> {profile.detectedServices.slice(0, 5).join(", ")}</span>
        )}
        {profile.detectedPrices.length > 0 && (
          <span><strong>Pricing:</strong> {profile.detectedPrices.slice(0, 4).join(" · ")}</span>
        )}
      </div>

      {/* Match reason */}
      <div style={{ marginTop: 6, fontSize: 11, color: "#a8a29e" }}>
        {profile.matchReason}
      </div>

      {/* Expanded: evidence + social links */}
      {expanded && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid #f5f5f4",
          }}
        >
          {profile.evidenceSnippets.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#78716c", marginBottom: 4 }}>
                EVIDENCE
              </div>
              {profile.evidenceSnippets.map((e, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    color: "#57534e",
                    background: "#fafaf9",
                    border: "1px solid #e7e5e4",
                    borderRadius: 6,
                    padding: "4px 8px",
                    marginBottom: 4,
                    fontFamily: "monospace",
                  }}
                >
                  {e}
                </div>
              ))}
            </div>
          )}
          {profile.detectedSocialLinks.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#78716c", marginBottom: 4 }}>
                SOCIAL LINKS ON PAGE
              </div>
              {profile.detectedSocialLinks.map((l, i) => (
                <a
                  key={i}
                  href={l}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", fontSize: 11, color: "#0284c7", marginBottom: 2 }}
                >
                  {l}
                </a>
              ))}
            </div>
          )}
          {profile.extractedDescription && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#78716c", fontStyle: "italic" }}>
              "{profile.extractedDescription.slice(0, 200)}"
            </div>
          )}
          {/* Quick assemble button */}
          <div style={{ marginTop: 10 }}>
            <a
              href={`/admin/studios/creator-lab?url=${encodeURIComponent(profile.url)}`}
              style={{
                display: "inline-block",
                fontSize: 11,
                fontWeight: 700,
                color: "#9d174d",
                textDecoration: "none",
                letterSpacing: "0.05em",
              }}
            >
              ASSEMBLE THIS PROFILE →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function SeedResultBlock({ result }: { result: StubResolutionResult }) {
  const badge = statusBadge(result.status);

  return (
    <div
      style={{
        background: "#fafaf9",
        border: "1px solid #e7e5e4",
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 16,
      }}
    >
      {/* Seed header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, fontSize: 16, color: "#1c1917" }}>
          @{result.seed.handle}
        </span>
        <span style={{ fontSize: 14, color: "#78716c" }}>{result.seed.displayName}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: badge.bg,
            color: badge.fg,
            borderRadius: 20,
            padding: "2px 10px",
            marginLeft: "auto",
          }}
        >
          {badge.label}
        </span>
      </div>

      {result.resolvedProfiles.length === 0 ? (
        <div style={{ fontSize: 13, color: "#a8a29e", fontStyle: "italic", padding: "8px 0" }}>
          No public profiles found for this handle. Try Deep Research Mode or assemble manually via the Creator Lab.
        </div>
      ) : (
        <>
          {result.bestMatch && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#78716c",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              BEST MATCH
            </div>
          )}
          {result.resolvedProfiles.map((p, i) => (
            <ProfileCard key={i} profile={p} handle={result.seed.handle} />
          ))}
        </>
      )}
    </div>
  );
}

// ─── Summary table row ────────────────────────────────────────────────────────

function SummaryTable({ results }: { results: StubResolutionResult[] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 24 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f5f5f4" }}>
            {["Handle", "Display Name", "Best URL", "Platform", "Services", "Location", "Confidence", "Status"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    color: "#78716c",
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    borderBottom: "1px solid #e7e5e4",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h.toUpperCase()}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const b = r.bestMatch;
            const badge = statusBadge(r.status);
            return (
              <tr
                key={i}
                style={{
                  borderBottom: "1px solid #f5f5f4",
                  background: i % 2 === 0 ? "#fff" : "#fafaf9",
                }}
              >
                <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1c1917" }}>
                  @{r.seed.handle}
                </td>
                <td style={{ padding: "8px 12px", color: "#57534e" }}>{r.seed.displayName}</td>
                <td style={{ padding: "8px 12px", maxWidth: 200 }}>
                  {b ? (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#0284c7",
                        textDecoration: "none",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 200,
                      }}
                    >
                      {b.url}
                    </a>
                  ) : (
                    <span style={{ color: "#a8a29e" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "8px 12px", color: "#57534e" }}>
                  {b?.platform ?? "—"}
                </td>
                <td style={{ padding: "8px 12px", color: "#57534e" }}>
                  {b?.detectedServices.slice(0, 2).join(", ") || "—"}
                </td>
                <td style={{ padding: "8px 12px", color: "#57534e" }}>
                  {b?.detectedLocation ?? "—"}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  {b ? <ConfidencePip score={b.confidenceScore} /> : <span style={{ color: "#a8a29e" }}>—</span>}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: badge.bg,
                      color: badge.fg,
                      borderRadius: 20,
                      padding: "2px 8px",
                    }}
                  >
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IgStubsPage() {
  const [seedText, setSeedText] = useState("");
  const [mode, setMode] = useState<ResolveMode>("fast");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StubResolutionResult[] | null>(null);
  const [processedAt, setProcessedAt] = useState<string | null>(null);
  const [usedMode, setUsedMode] = useState<ResolveMode | null>(null);

  const parsedSeeds = parseSeeds(seedText);

  async function handleResolve() {
    if (parsedSeeds.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/admin/studios/creator-lab/ig-stubs/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seeds: parsedSeeds, mode }),
      });

      const data: ResolveResponse | ResolveErrorResponse = await res.json();

      if (!data.ok) {
        const detail = (data as ResolveErrorResponse).detail
          ? ` — ${(data as ResolveErrorResponse).detail}`
          : "";
        setError(`${(data as ResolveErrorResponse).error}${detail}`);
        return;
      }

      const ok = data as ResolveResponse;
      setResults(ok.results);
      setProcessedAt(ok.processedAt);
      setUsedMode(ok.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResults(null);
    setError(null);
    setProcessedAt(null);
    setUsedMode(null);
  }

  const resolved   = results?.filter((r) => r.status === "resolved").length ?? 0;
  const partial    = results?.filter((r) => r.status === "partial").length ?? 0;
  const unresolved = results?.filter((r) => r.status === "unresolved").length ?? 0;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <a
            href="/admin/studios/creator-lab"
            style={{ fontSize: 12, color: "#9d174d", textDecoration: "none", fontWeight: 700 }}
          >
            ← Creator Lab
          </a>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: 0 }}>
          IG Stub Resolver
        </h1>
        <p style={{ fontSize: 14, color: "#78716c", margin: "6px 0 0" }}>
          Given Instagram handles + display names, find public booking pages, stores, and link-in-bio profiles.
          Fast Mode tests URL patterns directly. Deep Research Mode adds AI identity analysis + web search.
        </p>
      </div>

      {/* Step nav */}
      <LabStepper active={1} />

      {/* Input form — hidden when results showing */}
      {!results && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e5e4",
            borderRadius: 18,
            padding: "24px 24px",
            marginBottom: 24,
          }}
        >
          {/* Mode toggle */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#78716c",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              RESOLVER MODE
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["fast", "deep"] as ResolveMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 20,
                    border: "2px solid",
                    borderColor: mode === m ? "#9d174d" : "#e7e5e4",
                    background: mode === m ? "#9d174d" : "#fff",
                    color: mode === m ? "#fff" : "#57534e",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {m === "fast" ? "⚡ Fast Resolver" : "🔬 Deep Research"}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 6 }}>
              {mode === "fast"
                ? "Tests ~15 URL patterns per handle. Typically resolves in 5–15 seconds. No AI spend."
                : "Fetches pages + runs AI identity analysis + DuckDuckGo search. 30–60s. Requires OPENAI_API_KEY. Max 5 seeds."}
            </div>
          </div>

          {/* Seed textarea */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="seeds"
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#78716c",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              SEEDS — ONE PER LINE
            </label>
            <textarea
              id="seeds"
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              placeholder={`@ashleyraycushman | Ashley Ray\n@tiffany5280 | Tiffany Smith\nglossqueen | Gloss Queen Studio`}
              rows={8}
              style={{
                width: "100%",
                border: "1px solid #e7e5e4",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "monospace",
                color: "#1c1917",
                background: "#fafaf9",
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 4 }}>
              Format: <code>@handle | Display Name</code> — the pipe and display name are optional.
              {parsedSeeds.length > 0 && (
                <span style={{ color: "#15803d", fontWeight: 700, marginLeft: 8 }}>
                  ✓ {parsedSeeds.length} seed{parsedSeeds.length !== 1 ? "s" : ""} parsed
                </span>
              )}
            </div>
          </div>

          {/* Preview parsed seeds */}
          {parsedSeeds.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {parsedSeeds.map((s, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    background: "#f5f5f4",
                    border: "1px solid #e7e5e4",
                    borderRadius: 20,
                    padding: "3px 10px",
                    color: "#57534e",
                  }}
                >
                  @{s.handle}
                  {s.displayName !== s.handle && (
                    <span style={{ color: "#a8a29e" }}> · {s.displayName}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                color: "#b91c1c",
                marginBottom: 14,
              }}
            >
              ❌ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleResolve}
            disabled={loading || parsedSeeds.length === 0}
            style={{
              padding: "11px 28px",
              borderRadius: 20,
              border: "none",
              background: loading || parsedSeeds.length === 0 ? "#d6d3d1" : "#9d174d",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              cursor: loading || parsedSeeds.length === 0 ? "not-allowed" : "pointer",
              letterSpacing: "0.03em",
            }}
          >
            {loading
              ? mode === "deep"
                ? "🔬 Researching… (this takes up to 60s)"
                : "⚡ Resolving…"
              : `Resolve ${parsedSeeds.length > 0 ? parsedSeeds.length : ""} Stub${parsedSeeds.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Stats bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleReset}
              style={{
                fontSize: 12,
                color: "#9d174d",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                padding: 0,
              }}
            >
              ← New search
            </button>
            <div style={{ fontSize: 13, color: "#78716c" }}>
              {usedMode === "deep" ? "🔬 Deep Research" : "⚡ Fast Resolver"} ·{" "}
              {results.length} seed{results.length !== 1 ? "s" : ""}
            </div>
            <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
              {resolved > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>
                  ✓ {resolved} resolved
                </span>
              )}
              {partial > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#b45309" }}>
                  ◑ {partial} partial
                </span>
              )}
              {unresolved > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>
                  ✕ {unresolved} no match
                </span>
              )}
            </div>
          </div>

          {/* Summary table */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#78716c",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              REVIEW TABLE
            </div>
            <SummaryTable results={results} />
          </div>

          {/* Per-seed detail cards */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#78716c",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              PROFILE CARDS
            </div>
            {results.map((r, i) => (
              <SeedResultBlock key={i} result={r} />
            ))}
          </div>

          {/* Footer note */}
          {processedAt && (
            <div style={{ fontSize: 11, color: "#d6d3d1", marginTop: 16, textAlign: "right" }}>
              Processed {new Date(processedAt).toLocaleString()}
            </div>
          )}
        </>
      )}

      {/* Legend */}
      {!results && (
        <div
          style={{
            background: "#fafaf9",
            border: "1px solid #e7e5e4",
            borderRadius: 12,
            padding: "14px 18px",
            fontSize: 12,
            color: "#78716c",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#57534e" }}>Confidence scoring</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 24px" }}>
            <span>+35 exact handle in URL</span>
            <span>+15 service/category match</span>
            <span>+30 Instagram backlink found</span>
            <span>+15 city / location signal</span>
            <span>+25 display name on page</span>
            <span style={{ color: "#dc2626" }}>−40 conflicting identity</span>
          </div>
          <div style={{ marginTop: 8, color: "#a8a29e" }}>
            ≥ 65 = resolved · 35–64 = partial · &lt; 35 = unresolved
          </div>
        </div>
      )}
    </div>
  );
}
