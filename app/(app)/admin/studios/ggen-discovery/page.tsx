"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { BookingProviderPill } from "@/components/admin/intelligence/salon/BookingProviderPill";
import type { GgenDiscoveryRun, GgenSeedDiscoveryResult } from "@/lib/intelligence/salon/ggen-seed-discovery/types";

const PLACEHOLDER = `# One salon/beauty business per line
# Plain name, CSV, or pipe-delimited

Em Pearson Hair
Cherry Creek Curly Hairstylist, Hair, Denver, CO
Blended by Brandi | Hair | Denver | CO`;

type RunResponse = {
  ok: boolean;
  run?: GgenDiscoveryRun;
  storePath?: string;
  error?: string;
  detail?: string;
};

type PromoteResponse = {
  ok: boolean;
  promotedCount?: number;
  error?: string;
  detail?: string;
};

function confColor(n: number) {
  if (n >= 75) return "#15803d";
  if (n >= 50) return "#d97706";
  return "#78716c";
}

export default function GgenDiscoveryPage() {
  const [inputText, setInputText] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<GgenDiscoveryRun | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const lineCount = inputText
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#")).length;

  const results = run?.results ?? [];

  const stats = useMemo(() => {
    if (!run) return null;
    return {
      seeds: run.seedCount,
      found: run.foundCount,
      importCandidates: run.importCandidateCount,
    };
  }, [run]);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setRun(null);
    setSelected(new Set());
    try {
      const res = await fetch("/api/admin/intelligence/salon/ggen-discovery/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputText,
          category: category || undefined,
          city: city || undefined,
          state: state || undefined,
          maxSeeds: 100,
          enableSearch: true,
          matchProspects: true,
        }),
      });
      const data = (await res.json()) as RunResponse;
      if (!data.ok || !data.run) {
        setError(data.detail ?? data.error ?? "Discovery failed");
        return;
      }
      setRun(data.run);
      const autoSelect = new Set(
        data.run.results.filter((r) => r.importCandidate).map((r) => r.id),
      );
      setSelected(autoSelect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote(importCandidateOnly: boolean) {
    if (!run) return;
    setPromoting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/ggen-discovery/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.runId,
          resultIds: importCandidateOnly ? undefined : Array.from(selected),
          importCandidateOnly,
        }),
      });
      const data = (await res.json()) as PromoteResponse;
      if (!data.ok) {
        setError(data.detail ?? data.error ?? "Promote failed");
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("salon-prospects:refresh"));
      }
      alert(`Promoted ${data.promotedCount ?? 0} record(s) to prospects.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Promote failed");
    } finally {
      setPromoting(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setInputText((prev) => (prev ? `${prev}\n${text}` : text));
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #e7e5e4",
    borderRadius: 8,
    fontSize: 13,
    color: "#1c1917",
    background: "#fff",
    boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px 48px" }}>
      <IntelligenceMarketNav />
      <IntelligenceFeatureHeader
        title="GlossGenius Seed Discovery"
        description="Discover public GlossGenius booking pages from business names — candidate slug probes plus public search."
        config={salonConfig}
        showContext={false}
      />

      <div
        style={{
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 12 }}>
          SEED LIST
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={12}
          style={{ ...inputStyle, fontFamily: "monospace", resize: "vertical", marginBottom: 12 }}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept=".txt,.csv" style={{ display: "none" }} onChange={onFileChange} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid #e7e5e4",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Upload file
          </button>
          <span style={{ fontSize: 12, color: "#78716c" }}>{lineCount} businesses</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px", gap: 10, marginBottom: 14 }}>
          <input
            style={inputStyle}
            placeholder="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
          <button
            type="button"
            disabled={loading || lineCount === 0}
            onClick={handleRun}
            style={{
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 800,
              border: "none",
              borderRadius: 8,
              background: loading ? "#a8a29e" : "#9d174d",
              color: "#fff",
              cursor: loading || lineCount === 0 ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Running…" : "Run Discovery"}
          </button>
        </div>

        <p style={{ fontSize: 11, color: "#78716c", margin: 0 }}>
          Public URLs only: probes up to 8 <code>{`{slug}.glossgenius.com`}</code> candidates per name, then
          DuckDuckGo search (<code>site:glossgenius.com</code>). No private IG scraping.
        </p>
      </div>

      {error ? (
        <div style={{ marginBottom: 16, padding: 12, background: "#fef2f2", color: "#b91c1c", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      {stats ? (
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#57534e" }}>
            <strong>{stats.found}</strong> / {stats.seeds} GG found ·{" "}
            <strong>{stats.importCandidates}</strong> import candidates
          </span>
          <button
            type="button"
            disabled={promoting}
            onClick={() => handlePromote(true)}
            style={{
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid #15803d",
              borderRadius: 8,
              background: "#f0fdf4",
              color: "#15803d",
              cursor: promoting ? "wait" : "pointer",
            }}
          >
            Promote import candidates
          </button>
          <button
            type="button"
            disabled={promoting || selected.size === 0}
            onClick={() => handlePromote(false)}
            style={{
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid #e7e5e4",
              borderRadius: 8,
              background: "#fff",
              cursor: promoting || selected.size === 0 ? "not-allowed" : "pointer",
            }}
          >
            Promote selected ({selected.size})
          </button>
          <Link href="/admin/studios/import-candidates" style={{ fontSize: 12, color: "#9d174d" }}>
            View Import Candidates →
          </Link>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#fafaf9", borderBottom: "1px solid #e7e5e4" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", width: 28 }} />
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Name</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Category</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>GG URL</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Conf</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Source</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Evidence</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Match</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Import</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <ResultRow
                  key={r.id}
                  row={r}
                  selected={selected.has(r.id)}
                  onToggle={() => toggleRow(r.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function ResultRow({
  row,
  selected,
  onToggle,
}: {
  row: GgenSeedDiscoveryResult;
  selected: boolean;
  onToggle: () => void;
}) {
  const td: React.CSSProperties = {
    padding: "8px 10px",
    borderBottom: "1px solid #f5f5f4",
    verticalAlign: "top",
    color: "#57534e",
  };

  return (
    <tr>
      <td style={td}>
        {row.found ? (
          <input type="checkbox" checked={selected} onChange={onToggle} />
        ) : null}
      </td>
      <td style={{ ...td, fontWeight: 600, color: "#1c1917" }}>{row.businessName}</td>
      <td style={td}>{row.category ?? "—"}</td>
      <td style={td}>
        {row.bookingUrl ? (
          <a href={row.bookingUrl} target="_blank" rel="noreferrer" style={{ color: "#9d174d" }}>
            {row.bookingUrl.replace(/^https?:\/\//, "").slice(0, 40)}
          </a>
        ) : (
          <span style={{ color: "#a8a29e" }}>—</span>
        )}
      </td>
      <td style={{ ...td, color: confColor(row.confidence), fontWeight: 700 }}>
        {row.found ? row.confidence : "—"}
      </td>
      <td style={td}>{row.discoverySource ?? "—"}</td>
      <td style={{ ...td, maxWidth: 200 }}>
        <span title={row.evidence.join("; ")}>
          {(row.evidence[0] ?? "—").slice(0, 60)}
        </span>
      </td>
      <td style={td}>
        {row.matchedProspectHandles.length > 0
          ? row.matchedProspectHandles.map((h) => `@${h.replace(/^@/, "")}`).join(", ")
          : "—"}
      </td>
      <td style={td}>
        {row.importCandidate ? <BookingProviderPill provider="glossgenius" /> : "—"}
      </td>
    </tr>
  );
}
