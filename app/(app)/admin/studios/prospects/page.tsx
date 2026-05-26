"use client";
// app/(app)/admin/studios/prospects/page.tsx
// Discovered Entities Under Review — education-first prospect repository.
// Admin-only. NOT member-facing.

import { useState, useEffect, useMemo } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import type { ProspectRecord, ProspectStatus, ProspectListResponse } from "@/lib/studios/prospects/types";
import { PROSPECT_STATUS_LABELS, PROSPECT_STATUS_COLORS } from "@/lib/studios/prospects/types";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_COLORS,
  EDUCATION_TYPE_LABELS,
  AUDIENCE_TYPE_LABELS,
  ARCHIVE_REASONS,
} from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { ValidationStatus, EducationType, AudienceType } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confColor(n: number) {
  if (n >= 65) return "#16a34a";
  if (n >= 35) return "#d97706";
  return "#dc2626";
}

function ValidationBadge({ vs }: { vs: ValidationStatus | undefined }) {
  const status = vs ?? "new";
  const c = VALIDATION_STATUS_COLORS[status] ?? { bg: "#f5f5f4", fg: "#78716c" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      background: c.bg, color: c.fg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {VALIDATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function StatusBadge({ status }: { status: ProspectStatus }) {
  const c = PROSPECT_STATUS_COLORS[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      background: c.bg, color: c.fg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {PROSPECT_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Expanded detail ──────────────────────────────────────────────────────────

function ProspectDetail({ prospect, onSaved }: {
  prospect: ProspectRecord;
  onSaved: (updated: ProspectRecord) => void;
}) {
  const [status, setStatus]           = useState<ProspectStatus>(prospect.status);
  const [vs, setVs]                   = useState<ValidationStatus>(prospect.validationStatus ?? "new");
  const [archiveReason, setArchiveReason] = useState(prospect.archiveReason ?? "");
  const [notes, setNotes]             = useState(prospect.notes);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/studios/prospects/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId: prospect.prospectId,
          status,
          validationStatus: vs,
          notes,
          archiveReason: vs === "archive" ? archiveReason : null,
        }),
      });
      const data = await res.json();
      if (data.ok) { onSaved(data.prospect); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally { setSaving(false); }
  }

  const sel: React.CSSProperties = {
    width: "100%", padding: "6px 10px", border: "1px solid #e7e5e4",
    borderRadius: 8, fontSize: 12, background: "#fff", color: "#1c1917",
  };

  return (
    <div style={{ padding: "16px 20px 20px", background: "#fafaf9", borderTop: "1px solid #f0ede8" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Left */}
        <div>
          {/* Source path */}
          {prospect.sourcePath && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 4 }}>SOURCE PATH</div>
              <div style={{ fontSize: 11, color: "#78716c", fontFamily: "monospace", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 6, padding: "5px 9px" }}>
                {prospect.sourcePath}
              </div>
            </div>
          )}

          {/* Education tags */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {prospect.educationType && (
              <span style={{ fontSize: 10, background: "#ede9fe", color: "#6d28d9", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                {EDUCATION_TYPE_LABELS[prospect.educationType] ?? prospect.educationType}
              </span>
            )}
            {prospect.audienceType && (
              <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                {AUDIENCE_TYPE_LABELS[prospect.audienceType] ?? prospect.audienceType}
              </span>
            )}
            {prospect.sourceHashtag && (
              <span style={{ fontSize: 10, background: "#fce7f3", color: "#9d174d", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                #{prospect.sourceHashtag}
              </span>
            )}
          </div>

          {/* Matched URLs */}
          {prospect.allMatchedUrls.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>MATCHED URLS</div>
              {prospect.allMatchedUrls.map((u, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, background: "#f5f5f4", color: "#78716c", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>{u.platform}</span>
                  <a href={u.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "#0284c7", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                    {u.url}
                  </a>
                  <span style={{ fontSize: 10, color: confColor(u.confidence), fontWeight: 700, flexShrink: 0 }}>{u.confidence}</span>
                </div>
              ))}
            </div>
          )}

          {/* Evidence */}
          {prospect.evidence.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>EVIDENCE</div>
              {prospect.evidence.slice(0, 6).map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: "#57534e", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 5, padding: "3px 8px", marginBottom: 2, fontFamily: "monospace" }}>
                  {e}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right */}
        <div>
          {/* Validation status */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>VALIDATION STATUS</div>
            <select value={vs} onChange={(e) => setVs(e.target.value as ValidationStatus)} style={sel}>
              {(Object.keys(VALIDATION_STATUS_LABELS) as ValidationStatus[]).map((s) => (
                <option key={s} value={s}>{VALIDATION_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Archive reason */}
          {vs === "archive" && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>ARCHIVE REASON</div>
              <select value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} style={sel}>
                <option value="">Select reason…</option>
                {ARCHIVE_REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          )}

          {/* CRM status */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>CRM STATUS</div>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProspectStatus)} style={sel}>
              {(Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[]).map((s) => (
                <option key={s} value={s}>{PROSPECT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 5 }}>NOTES</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Add admin notes…"
              style={{ ...sel, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: saved ? "#15803d" : "#1c1917", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saved ? "✓ Saved" : saving ? "Saving…" : "Save"}
          </button>

          {prospect.bestMatch && (
            <div style={{ marginTop: 10 }}>
              <a href={`/admin/studios/creator-lab?url=${encodeURIComponent(prospect.bestMatch.url)}`}
                style={{ fontSize: 11, fontWeight: 700, color: "#9d174d", textDecoration: "none" }}>
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

type SortKey = "name" | "handle" | "educationType" | "platform" | "confidence" | "validationStatus" | "createdAt";

export default function ProspectsPage() {
  const [prospects, setProspects]   = useState<ProspectRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey]       = useState<SortKey>("createdAt");
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("desc");

  // Filters
  const [fValidation, setFValidation]     = useState<ValidationStatus | "all">("all");
  const [fEducationType, setFEducationType] = useState<EducationType | "all">("all");
  const [fAudienceType, setFAudienceType] = useState<AudienceType | "all">("all");
  const [fHashtag, setFHashtag]           = useState("all");
  const [fPlatform, setFPlatform]         = useState("all");
  const [fMinConf, setFMinConf]           = useState(0);

  useEffect(() => {
    fetch("/api/admin/studios/prospects/list")
      .then(async (r) => {
        const data = await r.json() as ProspectListResponse | { ok: false; error: string; detail?: string };
        if (data.ok) {
          setProspects((data as ProspectListResponse).prospects);
        } else {
          const err = data as { ok: false; error: string; detail?: string };
          setFetchError(`${err.error}${err.detail ? ` — ${err.detail}` : ""}`);
          console.error("[prospects/page] list error:", err);
        }
      })
      .catch((e) => setFetchError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Derive filter options
  const hashtags  = useMemo(() => Array.from(new Set(prospects.map((p) => p.sourceHashtag).filter(Boolean) as string[])).sort(), [prospects]);
  const platforms = useMemo(() => Array.from(new Set(prospects.map((p) => p.bestMatch?.platform).filter(Boolean) as string[])).sort(), [prospects]);

  const visible = useMemo(() => {
    let rows = [...prospects];
    if (fValidation   !== "all") rows = rows.filter((p) => (p.validationStatus ?? "new") === fValidation);
    if (fEducationType !== "all") rows = rows.filter((p) => p.educationType === fEducationType);
    if (fAudienceType  !== "all") rows = rows.filter((p) => p.audienceType  === fAudienceType);
    if (fHashtag       !== "all") rows = rows.filter((p) => p.sourceHashtag === fHashtag);
    if (fPlatform      !== "all") rows = rows.filter((p) => p.bestMatch?.platform === fPlatform);
    if (fMinConf        > 0)      rows = rows.filter((p) => p.confidence.overall >= fMinConf);

    rows.sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      switch (sortKey) {
        case "name":             av = a.identity.name;              bv = b.identity.name; break;
        case "handle":           av = a.identity.handle;            bv = b.identity.handle; break;
        case "educationType":    av = a.educationType ?? "";        bv = b.educationType ?? ""; break;
        case "platform":         av = a.bestMatch?.platform ?? "";  bv = b.bestMatch?.platform ?? ""; break;
        case "confidence":       av = a.confidence.overall;         bv = b.confidence.overall; break;
        case "validationStatus": av = a.validationStatus ?? "new";  bv = b.validationStatus ?? "new"; break;
        case "createdAt":        av = a.createdAt;                  bv = b.createdAt; break;
      }
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [prospects, fValidation, fEducationType, fAudienceType, fHashtag, fPlatform, fMinConf, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "confidence" ? "desc" : "asc"); }
  }
  function si(key: SortKey) {
    if (sortKey !== key) return <span style={{ color: "#d6d3d1" }}> ↕</span>;
    return <span style={{ color: "#9d174d" }}>{sortDir === "asc" ? " ↑" : " ↓"}</span>;
  }

  function clearFilters() {
    setFValidation("all"); setFEducationType("all"); setFAudienceType("all");
    setFHashtag("all"); setFPlatform("all"); setFMinConf(0);
  }
  const hasFilters = fValidation !== "all" || fEducationType !== "all" || fAudienceType !== "all" || fHashtag !== "all" || fPlatform !== "all" || fMinConf > 0;

  const thS: React.CSSProperties = {
    textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 700,
    color: "#78716c", letterSpacing: "0.07em", borderBottom: "1px solid #e7e5e4",
    whiteSpace: "nowrap", cursor: "pointer", userSelect: "none", background: "#f9f9f8",
  };
  const tdS: React.CSSProperties = {
    padding: "8px 10px", fontSize: 12, color: "#57534e",
    borderBottom: "1px solid #f5f5f4", verticalAlign: "middle",
  };
  const selS: React.CSSProperties = {
    fontSize: 11, padding: "4px 7px", border: "1px solid #e7e5e4",
    borderRadius: 6, color: "#57534e", background: "#fff",
  };

  // Stats
  const total       = prospects.length;
  const priority    = prospects.filter((p) => p.validationStatus === "priority").length;
  const edRelevant  = prospects.filter((p) => p.validationStatus === "education_relevant").length;
  const needsReview = prospects.filter((p) => (p.validationStatus ?? "new") === "needs_review").length;
  const archived    = prospects.filter((p) => p.validationStatus === "archive").length;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <CreatorIntelligenceNav current="prospects" />

      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Discovered Entities Under Review
        </h1>
        <p style={{ fontSize: 12, color: "#a8a29e", margin: 0, maxWidth: 680, lineHeight: 1.5 }}>
          Prospects are not sales-ready leads. This is the working repository for discovered education accounts — tutors, microschools, parent communities, curriculum sellers, and related entities. Validate, enrich, score, activate, or archive from here.
        </p>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: "flex", gap: 10, margin: "16px 0", flexWrap: "wrap" }}>
          {[
            { label: "Total",             val: total,       color: "#1c1917" },
            { label: "Priority",          val: priority,    color: "#15803d" },
            { label: "Education Relevant",val: edRelevant,  color: "#6d28d9" },
            { label: "Needs Review",      val: needsReview, color: "#b45309" },
            { label: "Archived",          val: archived,    color: "#a8a29e" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 9, color: "#a8a29e", fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Fetch error */}
      {fetchError && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
          ❌ Failed to load prospects: {fetchError}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "10px 12px", alignItems: "center" }}>
        <select value={fValidation} onChange={(e) => setFValidation(e.target.value as ValidationStatus | "all")} style={selS}>
          <option value="all">All validation</option>
          {(Object.keys(VALIDATION_STATUS_LABELS) as ValidationStatus[]).map((s) => (
            <option key={s} value={s}>{VALIDATION_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={fEducationType} onChange={(e) => setFEducationType(e.target.value as EducationType | "all")} style={selS}>
          <option value="all">All ed. types</option>
          {(Object.keys(EDUCATION_TYPE_LABELS) as EducationType[]).map((s) => (
            <option key={s} value={s}>{EDUCATION_TYPE_LABELS[s]}</option>
          ))}
        </select>
        <select value={fAudienceType} onChange={(e) => setFAudienceType(e.target.value as AudienceType | "all")} style={selS}>
          <option value="all">All audiences</option>
          {(Object.keys(AUDIENCE_TYPE_LABELS) as AudienceType[]).map((s) => (
            <option key={s} value={s}>{AUDIENCE_TYPE_LABELS[s]}</option>
          ))}
        </select>
        <select value={fHashtag} onChange={(e) => setFHashtag(e.target.value)} style={selS}>
          <option value="all">All hashtags</option>
          {hashtags.map((h) => <option key={h} value={h}>#{h}</option>)}
        </select>
        <select value={fPlatform} onChange={(e) => setFPlatform(e.target.value)} style={selS}>
          <option value="all">All platforms</option>
          {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={fMinConf} onChange={(e) => setFMinConf(Number(e.target.value))} style={selS}>
          <option value={0}>Any confidence</option>
          <option value={30}>≥ 30</option>
          <option value={50}>≥ 50</option>
          <option value={65}>≥ 65</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters} style={{ fontSize: 11, color: "#9d174d", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Clear
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#a8a29e" }}>{visible.length} of {total}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#a8a29e" }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#a8a29e", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, fontSize: 13 }}>
          {total === 0 ? "No prospects yet — run Hashtag Harvest to start discovering education creators." : "No prospects match the current filters."}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {([
                  ["handle",          "@Handle"],
                  ["name",            "Name"],
                  [null,              "Source #"],
                  ["educationType",   "Ed. Type"],
                  [null,              "Audience"],
                  ["platform",        "Platform"],
                  [null,              "Best URL"],
                  [null,              "Location"],
                  ["confidence",      "Conf."],
                  ["validationStatus","Status"],
                ] as [SortKey | null, string][]).map(([key, label]) => (
                  <th key={label} style={thS} onClick={() => key && toggleSort(key)}>
                    {label}{key && si(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const isExpanded = expandedId === p.prospectId;
                return (
                  <>
                    <tr key={p.prospectId}
                      onClick={() => setExpandedId(isExpanded ? null : p.prospectId)}
                      style={{ cursor: "pointer", background: isExpanded ? "#fdf2f8" : "transparent" }}>
                      <td style={{ ...tdS, fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1c1917" }}>
                        <a href={`https://instagram.com/${p.identity.handle}`} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()} style={{ color: "#1c1917", textDecoration: "none" }}>
                          @{p.identity.handle}
                        </a>
                      </td>
                      <td style={tdS}>{p.identity.name !== p.identity.handle ? p.identity.name : <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={{ ...tdS, fontSize: 10, color: "#9d174d" }}>
                        {p.sourceHashtag ? `#${p.sourceHashtag}` : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={tdS}>
                        {p.educationType ? (
                          <span style={{ fontSize: 10, background: "#ede9fe", color: "#6d28d9", borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>
                            {EDUCATION_TYPE_LABELS[p.educationType] ?? p.educationType}
                          </span>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={tdS}>
                        {p.audienceType ? (
                          <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", borderRadius: 20, padding: "2px 7px", fontWeight: 700 }}>
                            {AUDIENCE_TYPE_LABELS[p.audienceType] ?? p.audienceType}
                          </span>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={tdS}>
                        {p.bestMatch ? (
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#f5f5f4", color: "#78716c", borderRadius: 4, padding: "2px 6px" }}>
                            {p.bestMatch.platform}
                          </span>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={{ ...tdS, maxWidth: 160 }}>
                        {p.bestMatch ? (
                          <a href={p.bestMatch.url} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "#0284c7", textDecoration: "none", fontSize: 11, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.bestMatch.url}
                          </a>
                        ) : <span style={{ color: "#d6d3d1" }}>—</span>}
                      </td>
                      <td style={tdS}>{p.identity.locationGuess ?? <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={tdS}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: confColor(p.confidence.overall) }}>
                          {p.confidence.overall || <span style={{ color: "#d6d3d1" }}>—</span>}
                        </span>
                      </td>
                      <td style={tdS}>
                        <ValidationBadge vs={p.validationStatus} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${p.prospectId}-detail`}>
                        <td colSpan={10} style={{ padding: 0 }}>
                          <ProspectDetail prospect={p} onSaved={(updated) => setProspects((prev) => prev.map((x) => x.prospectId === updated.prospectId ? updated : x))} />
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
        Education vertical · Admin only · Archive does not delete
      </div>
    </div>
  );
}
