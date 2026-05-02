// app/(app)/admin/studios/page.tsx
// Admin shell for managing AIH Studios
// TODO(studios:auth): replace any local check with the existing requireAdmin() guard

import type { CSSProperties } from "react";
import {
  MOCK_PROVIDERS,
  MOCK_REQUESTS,
  getStudiosOverview,
} from "@/lib/studios/mockStudios";
import {
  PROVIDER_CATEGORY_LABELS,
} from "@/types/studios";
import { Building2, Plus, Sprout, Inbox } from "lucide-react";

const card = {
  background: "white",
  borderRadius: "16px",
  border: "1px solid #ece9e3",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  overflow: "hidden" as const,
};

const REQUEST_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending_review:  { bg: "#fef3c7", color: "#92400e", label: "Pending review" },
  approved_trial:  { bg: "#dbeafe", color: "#1e40af", label: "Trial approved" },
  member:          { bg: "#d1fae5", color: "#065f46", label: "Member" },
  external:        { bg: "#f3f4f6", color: "#374151", label: "External" },
  archived:        { bg: "#f5f5f4", color: "#78716c", label: "Archived" },
  blocked:         { bg: "#fee2e2", color: "#991b1b", label: "Blocked" },
};

export default function AdminStudiosPage() {
  const overview = getStudiosOverview();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1c1917", marginBottom: "6px" }}>
            🏛️ Studio Management
          </h1>
          <p style={{ fontSize: "16px", color: "#78716c" }}>
            AIH Studios admin — providers, requests, directory.
          </p>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button style={btn("primary")}>
            <Plus style={{ width: "15px", height: "15px" }} /> Add Provider
          </button>
          <button style={btn("secondary")}>
            <Sprout style={{ width: "15px", height: "15px" }} /> Seed Directory
          </button>
          <button style={btn("secondary")}>
            <Inbox style={{ width: "15px", height: "15px" }} /> Review Requests
          </button>
        </div>
      </div>

      {/* Overview stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        {[
          { label: "Total Studios",      value: overview.totalStudios,      color: "#6366f1", emoji: "🏛️" },
          { label: "Claimed Studios",    value: overview.claimedStudios,    color: "#10b981", emoji: "✓" },
          { label: "Pending Requests",   value: overview.pendingRequests,   color: "#f59e0b", emoji: "⏳" },
          { label: "Active Providers",   value: overview.activeProviders,   color: "#e96c50", emoji: "👥" },
        ].map(({ label, value, color, emoji }) => (
          <div key={label} style={{ ...card, padding: "20px", borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>{emoji}</div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "#1c1917", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "13px", color: "#78716c", marginTop: "4px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Provider Directory */}
      <div style={card}>
        <div style={sectionHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={iconWrap("#ede9fe", "#6366f1")}>
              <Building2 style={{ width: "16px", height: "16px" }} />
            </div>
            <span style={{ fontSize: "16px", fontWeight: 600, color: "#1c1917" }}>Provider Directory</span>
          </div>
          <span style={{ fontSize: "12px", color: "#a8a29e" }}>{MOCK_PROVIDERS.length} providers</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafaf9" }}>
              <th style={th}>Provider</th>
              <th style={th}>Category</th>
              <th style={th}>Location</th>
              <th style={th}>Claimed</th>
              <th style={th}>Active</th>
              <th style={{ ...th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PROVIDERS.map((p, i) => (
              <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f5f4f0" }}>
                <td style={td}>
                  <div style={{ fontWeight: 500, color: "#1c1917" }}>{p.displayName}</div>
                  {p.serviceType && <div style={{ fontSize: "12px", color: "#a8a29e" }}>{p.serviceType}</div>}
                </td>
                <td style={td}>{PROVIDER_CATEGORY_LABELS[p.category]}</td>
                <td style={td}>{p.locationLabel ?? "—"}</td>
                <td style={td}>
                  {p.claimed
                    ? <span style={pill("#d1fae5", "#065f46")}>Claimed</span>
                    : <span style={pill("#fef3c7", "#92400e")}>Unclaimed</span>}
                </td>
                <td style={td}>
                  {p.active
                    ? <span style={pill("#d1fae5", "#065f46")}>Active</span>
                    : <span style={pill("#f5f5f4", "#78716c")}>Inactive</span>}
                </td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button style={linkBtn}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Studio Requests */}
      <div style={card}>
        <div style={sectionHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={iconWrap("#fef3c7", "#d97706")}>
              <Inbox style={{ width: "16px", height: "16px" }} />
            </div>
            <span style={{ fontSize: "16px", fontWeight: 600, color: "#1c1917" }}>Studio Requests</span>
          </div>
          <span style={{ fontSize: "12px", color: "#a8a29e" }}>{MOCK_REQUESTS.length} requests</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafaf9" }}>
              <th style={th}>Applicant</th>
              <th style={th}>Provider</th>
              <th style={th}>Offer</th>
              <th style={th}>Status</th>
              <th style={th}>Created</th>
              <th style={{ ...th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_REQUESTS.map((r, i) => {
              const provider = MOCK_PROVIDERS.find(p => p.id === r.providerId);
              const status = REQUEST_STATUS_STYLE[r.status];
              return (
                <tr key={r.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f5f4f0" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 500, color: "#1c1917" }}>{r.applicantName}</div>
                    <div style={{ fontSize: "12px", color: "#a8a29e" }}>{r.applicantEmail}</div>
                  </td>
                  <td style={td}>{provider?.displayName ?? "—"}</td>
                  <td style={td}>{r.offerId ?? "—"}</td>
                  <td style={td}>
                    <span style={pill(status.bg, status.color)}>{status.label}</span>
                  </td>
                  <td style={td}>
                    {r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button style={linkBtn}>Review</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div style={{
        background: "linear-gradient(135deg,#1a1a2e,#0f3460)",
        borderRadius: "14px", padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
      }}>
        <div>
          <p style={{ fontWeight: 700, color: "white", fontSize: "15px", marginBottom: "4px" }}>
            🛠 Studios is in scaffolding phase
          </p>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
            Mock data shown. Stripe, video upload, and database wiring are deferred.
            Search code for <code style={{ background:"rgba(255,255,255,0.1)", padding:"2px 6px", borderRadius:"4px" }}>TODO(studios:</code> for next steps.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────
const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid #f5f4f0",
  background: "#fafaf9",
};

const th: CSSProperties = {
  padding: "12px 20px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: 600,
  color: "#78716c",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const td: CSSProperties = {
  padding: "14px 20px",
  fontSize: "14px",
  color: "#44403c",
};

const linkBtn: CSSProperties = {
  background: "none",
  border: "none",
  color: "#6366f1",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  padding: "4px 8px",
};

function btn(variant: "primary" | "secondary"): CSSProperties {
  if (variant === "primary") {
    return {
      display: "inline-flex", alignItems: "center", gap: "7px",
      padding: "10px 18px", fontSize: "14px", fontWeight: 600,
      background: "linear-gradient(135deg,#1a1a2e,#0f3460)",
      color: "white", border: "none", borderRadius: "10px", cursor: "pointer",
    };
  }
  return {
    display: "inline-flex", alignItems: "center", gap: "7px",
    padding: "10px 18px", fontSize: "14px", fontWeight: 500,
    background: "white", color: "#44403c",
    border: "1px solid #ece9e3", borderRadius: "10px", cursor: "pointer",
  };
}

function pill(bg: string, color: string): CSSProperties {
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    background: bg,
    color: color,
  };
}

function iconWrap(bg: string, color: string): CSSProperties {
  return {
    width: "32px", height: "32px",
    borderRadius: "8px",
    background: bg,
    color: color,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
