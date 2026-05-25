"use client";
// app/(app)/admin/studios/prospects/page.tsx
// Creator Prospect Directory — admin-only sales/opportunity intelligence.
// NOT member-facing. NOT public.

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import type {
  ProspectRecord,
  ProspectStatus,
  ProspectListResponse,
} from "@/lib/studios/prospects/types";
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUS_COLORS,
} from "@/lib/studios/prospects/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "name" | "handle" | "category" | "platform" | "confidence" | "status" | "createdAt";

interface Filters {
  status: ProspectStatus | "all";
  platform: string;
  category: string;
  minConfidence: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceColor(score: number) {
  if (score >= 65) return "#16a34a";
  if (score >= 35) return "#d97706";
  return "#dc2626";
}

function StatusBadge({ status }: { status: ProspectStatus }) {
  const c = PROSPECT_STATUS_COLORS[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      background: c.bg, color: c.fg,
      borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {PROSPECT_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Expanded row detail ──────────────────────────────────────────────────────

function ProspectDetail({
  prospect,
  onSaved,
}: {
  prospect: ProspectRecord;
  onSaved: (updated: ProspectRecord) => void;
}) {
  const [status, setStatus] = useState<ProspectStatus>(prospect.status);
  const [notes, setNotes] = useState(prospect.notes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/studios/prospects/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.prospectId, status, notes }),
      });
      const data = await res.json();
      if (data.ok) {
        onSaved(data.prospect);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "16px 20px 20px", background: "#fafaf9", borderTop: "1px solid #f0ede8" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Left: match data */}
        <div>
          {/* All matched URLs */}
          {prospect.allMatchedUrls.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 6 }}>
                MATCHED URLS
              </div>
              {prospect.allMatchedUrls.map((u, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, background: "#f5f5f4", color: "#78716c",
                    borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap",
                  }}>{u.platform}</span>
                  <a href={u.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "#0284c7", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                    {u.url}
                  </a>
                  <span style={{ fontSize: 10, color: confidenceColor(u.confidence), fontWeight: 700, flexShrink: 0 }}>
                    {u.confidence}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Evidence */}
          {prospect.evidence.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 6 }}>
                EVIDENCE
              </div>
              {prospect.evidence.slice(0, 5).map((e, i) => (
                <div key={i} style={{
                  fontSize: 11, color: "#57534e", background: "#fff", border: "1px solid #e7e5e4",
                  borderRadius: 6, padding: "4px 8px", marginBottom: 3, fontFamily: "monospace",
                }}>
                  {e}
                </div>
              ))}
            </div>
          )}

          {/* Confidence breakdown */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 6 }}>
              CONFIDENCE BREAKDOWN
            </div>
            {[
              ["Identity match", prospect.confidence.identityMatch],
              ["Booking match", prospect.confidence.bookingMatch],
              ["Category match", prospect.confidence.categoryMatch],
              ["Location match", prospect.confidence.locationMatch],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#78716c", width: 110 }}>{label}</span>
                <div style={{ flex: 1, height: 4, background: "#f0ede8", borderRadius: 2 }}>
                  <div style={{ width: `${val}%`, height: "100%", background: confidenceColor(Number(val)), borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: confidenceColor(Number(val)), width: 26, textAlign: "right" }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: source info + status + notes */}
        <div>
          {/* Source */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 6 }}>
              SOURCE
            </div>
            <div style={{ fontSize: 11, color: "#57534e", lineHeight: 1.8 }}>
              <div><strong>Batch:</strong> {prospect.source.batchId}</div>
              <div><strong>Seed:</strong> @{prospect.source.sourceHandle} · {prospect.source.sourceDisplayName}</div>
              <div><strong>Added:</strong> {new Date(prospect.createdAt).toLocaleDateString()}</div>
              {prospect.updatedAt !== prospect.createdAt && (
                <div><strong>Updated:</strong> {new Date(prospect.updatedAt).toLocaleDateString()}</div>
              )}
            </div>
          </div>

          {/* Services */}
          {prospect.services.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 6 }}>
                SERVICES
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {prospect.services.map((s) => (
                  <span key={s} style={{
                    fontSize: 10, background: "#f0fdf4", color: "#15803d",
                    borderRadius: 20, padding: "2px 8px", border: "1px solid #bbf7d0",
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Status selector */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 6 }}>
              STATUS
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProspectStatus)}
              style={{
                width: "100%", padding: "6px 10px", border: "1px solid #e7e5e4",
                borderRadius: 8, fontSize: 12, background: "#fff", color: "#1c1917",
              }}
            >
              {(Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[]).map((s) => (
                <option key={s} value={s}>{PROSPECT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 6 }}>
              NOTES
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add admin notes…"
              style={{
                width: "100%", padding: "6px 10px", border: "1px solid #e7e5e4",
                borderRadius: 8, fontSize: 12, fontFamily: "inherit", resize: "vertical",
                background: "#fff", color: "#1c1917", boxSizing: "border-box",
              }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "7px 18px", borderRadius: 8, border: "none",
              background: saved ? "#15803d" : "#1c1917", color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saved ? "✓ Saved" : saving ? "Saving…" : "Save"}
          </button>

          {/* Assemble link */}
          {prospect.bestMatch && (
            <div style={{ marginTop: 12 }}>
              <a
                href={`/admin/studios/creator-lab?url=${encodeURIComponent(prospect.bestMatch.url)}`}
                style={{ fontSize: 11, fontWeight: 700, color: "#9d174d", textDecoration: "none" }}
              >
                Assemble in Studio Assembler →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<ProspectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<Filters>({
    status: "all", platform: "all", category: "all", minConfidence: 0,
  });

  useEffect(() => {
    fetch("/api/admin/studios/prospects/list")
      .then((r) => r.json())
      .then((data: ProspectListResponse) => {
        if (data.ok) setProspects(data.prospects);
      })
      .finally(() => setLoading(false));
  }, []);

  // Derive filter options from data
  const platforms = useMemo(() =>
    Array.from(new Set(prospects.map((p) => p.bestMatch?.platform).filter(Boolean) as string[])).sort(),
    [prospects]
  );
  const categories = useMemo(() =>
    Array.from(new Set(prospects.map((p) => p.identity.categoryGuess).filter(Boolean) as string[])).sort(),
    [prospects]
  );

  // Filter + sort
  const visible = useMemo(() => {
    let rows = [...prospects];

    if (filters.status !== "all") rows = rows.filter((p) => p.status === filters.status);
    if (filters.platform !== "all") rows = rows.filter((p) => p.bestMatch?.platform === filters.platform);
    if (filters.category !== "all") rows = rows.filter((p) => p.identity.categoryGuess === filters.category);
    if (filters.minConfidence > 0) rows = rows.filter((p) => p.confidence.overall >= filters.minConfidence);

    rows.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "name":       av = a.identity.name;              bv = b.identity.name; break;
        case "handle":     av = a.identity.handle;            bv = b.identity.handle; break;
        case "category":   av = a.identity.categoryGuess ?? ""; bv = b.identity.categoryGuess ?? ""; break;
        case "platform":   av = a.bestMatch?.platform ?? "";  bv = b.bestMatch?.platform ?? ""; break;
        case "confidence": av = a.confidence.overall;         bv = b.confidence.overall; break;
        case "status":     av = a.status;                     bv = b.status; break;
        case "createdAt":  av = a.createdAt;                  bv = b.createdAt; break;
      }
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [prospects, filters, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span style={{ color: "#d6d3d1" }}> ↕</span>;
    return <span style={{ color: "#9d174d" }}>{sortDir === "asc" ? " ↑" : " ↓"}</span>;
  }

  function handleProspectSaved(updated: ProspectRecord) {
    setProspects((prev) => prev.map((p) => p.prospectId === updated.prospectId ? updated : p));
  }

  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "8px 12px", fontSize: 10, fontWeight: 700,
    color: "#78716c", letterSpacing: "0.07em", borderBottom: "1px solid #e7e5e4",
    whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
    background: "#f9f9f8",
  };

  const tdStyle: React.CSSProperties = {
    padding: "9px 12px", fontSize: 12, color: "#57534e",
    borderBottom: "1px solid #f5f5f4", verticalAlign: "middle",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>

      <CreatorIntelligenceNav current="prospects" />

      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Prospects
        </h1>
        <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>
          Admin-only opportunity intelligence from Creator Intelligence resolver runs.
        </p>
      </div>

      {/* Stats row */}
      {!loading && (
        <div style={{ display: "flex", gap: 16, margin: "16px 0", flexWrap: "wrap" }}>
          {[
            { label: "Total", val: prospects.length, color: "#1c1917" },
            { label: "New", val: prospects.filter((p) => p.status === "new").length, color: "#78716c" },
            { label: "Good Fit", val: prospects.filter((p) => p.status === "good_fit").length, color: "#15803d" },
            { label: "Contacted", val: prospects.filter((p) => p.status === "contacted").length, color: "#166534" },
            { label: "Converted", val: prospects.filter((p) => p.status === "converted").length, color: "#9d174d" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10,
              padding: "8px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 10, color: "#a8a29e", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16,
        background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "12px 14px",
      }}>
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ProspectStatus | "all" }))}
          style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #e7e5e4", borderRadius: 6, color: "#57534e" }}>
          <option value="all">All statuses</option>
          {(Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[]).map((s) => (
            <option key={s} value={s}>{PROSPECT_STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select value={filters.platform} onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}
          style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #e7e5e4", borderRadius: 6, color: "#57534e" }}>
          <option value="all">All platforms</option>
          {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #e7e5e4", borderRadius: 6, color: "#57534e" }}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filters.minConfidence} onChange={(e) => setFilters((f) => ({ ...f, minConfidence: Number(e.target.value) }))}
          style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #e7e5e4", borderRadius: 6, color: "#57534e" }}>
          <option value={0}>Any confidence</option>
          <option value={30}>≥ 30</option>
          <option value={50}>≥ 50</option>
          <option value={65}>≥ 65</option>
        </select>

        {(filters.status !== "all" || filters.platform !== "all" || filters.category !== "all" || filters.minConfidence > 0) && (
          <button onClick={() => setFilters({ status: "all", platform: "all", category: "all", minConfidence: 0 })}
            style={{ fontSize: 11, color: "#9d174d", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Clear filters
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: 12, color: "#a8a29e", alignSelf: "center" }}>
          {visible.length} of {prospects.length}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#a8a29e", fontSize: 14 }}>
          Loading prospects…
        </div>
      ) : visible.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 0", color: "#a8a29e", fontSize: 14,
          background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14,
        }}>
          {prospects.length === 0
            ? "No prospects yet — run the IG Stub Resolver to generate records."
            : "No prospects match the current filters."}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {([
                  ["name",       "Name"],
                  ["handle",     "Handle"],
                  ["category",   "Category"],
                  ["platform",   "Platform"],
                  [null,         "Best URL"],
                  [null,         "Location"],
                  [null,         "Services"],
                  ["confidence", "Conf."],
                  ["status",     "Status"],
                ] as [SortKey | null, string][]).map(([key, label]) => (
                  <th key={label} style={thStyle}
                    onClick={() => key && toggleSort(key)}>
                    {label}{key && sortIcon(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const isExpanded = expandedId === p.prospectId;
                return (
                  <>
                    <tr
                      key={p.prospectId}
                      onClick={() => setExpandedId(isExpanded ? null : p.prospectId)}
                      style={{
                        cursor: "pointer",
                        background: isExpanded ? "#fdf2f8" : "transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700, color: "#1c1917" }}>
                        {p.identity.name}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>
                        @{p.identity.handle}
                      </td>
                      <td style={tdStyle}>{p.identity.categoryGuess ?? <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={tdStyle}>
                        {p.bestMatch ? (
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#f5f5f4", color: "#78716c", borderRadius: 4, padding: "2px 6px" }}>
                            {p.bestMatch.platform}
                          </span>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 180 }}>
                        {p.bestMatch ? (
                          <a href={p.bestMatch.url} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "#0284c7", textDecoration: "none", fontSize: 11, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.bestMatch.url}
                          </a>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={tdStyle}>{p.identity.locationGuess ?? <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={{ ...tdStyle, maxWidth: 140 }}>
                        <span style={{ fontSize: 11, color: "#78716c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {p.services.slice(0, 2).join(", ") || <span style={{ color: "#d6d3d1" }}>—</span>}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: confidenceColor(p.confidence.overall) }}>
                          {p.confidence.overall}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${p.prospectId}-detail`}>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <ProspectDetail
                            prospect={p}
                            onSaved={handleProspectSaved}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: "#d6d3d1", textAlign: "right" }}>
        Admin only · Not visible to members or creators
      </div>
    </div>
  );
}
