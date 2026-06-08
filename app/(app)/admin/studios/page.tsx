// app/(app)/admin/studios/page.tsx
// Admin shell for managing AIH Studios
// TODO(studios:auth): replace any local check with the existing requireAdmin() guard

export const dynamic = "force-dynamic";

import type { CSSProperties } from "react";
import {
  MOCK_PROVIDERS,
  MOCK_REQUESTS,
  getStudiosOverview,
} from "@/lib/studios/mockStudios";
import {
  PROVIDER_CATEGORY_LABELS,
} from "@/types/studios";
import Link from "next/link";
import { Building2, Plus, Sprout, Inbox } from "lucide-react";
import { StudiosGatewayAccessRequestsSection } from "./StudiosGatewayAccessRequestsSection";
import { DiscoveryInputsSection } from "@/components/admin/intelligence/salon/DiscoveryInputsSection";
import { SalonPipelineOverview } from "./SalonPipelineOverview";
import { SalonClearRuntimeAction } from "@/components/admin/runtime/SalonClearRuntimeAction";

const card = {
  background: "white",
  borderRadius: "12px",
  border: "1px solid #e7e5e4",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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

export default async function AdminStudiosPage() {
  const overview = getStudiosOverview();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-end">
        <SalonClearRuntimeAction />
      </div>
      <SalonPipelineOverview />

      <DiscoveryInputsSection />

      <hr className="m-0 border-0 border-t border-stone-200" />

      <section className="space-y-3">
        <h2 className="m-0 text-lg font-extrabold text-stone-900">Studio Management</h2>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Studios", value: overview.totalStudios },
            { label: "Claimed", value: overview.claimedStudios },
            { label: "Pending", value: overview.pendingRequests },
            { label: "Active", value: overview.activeProviders },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm"
            >
              <span className="text-xs font-semibold text-stone-600">{label}</span>
              <span className="text-lg font-extrabold text-stone-900">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="mi-action-btn mi-action-btn--primary">
            <Plus className="h-3.5 w-3.5" /> Add Provider
          </button>
          <button type="button" className="mi-action-btn">
            <Sprout className="h-3.5 w-3.5" /> Seed Directory
          </button>
          <button type="button" className="mi-action-btn">
            <Inbox className="h-3.5 w-3.5" /> Review Requests
          </button>
          <Link href="/studios/inbox" prefetch={false} className="mi-action-btn no-underline">
            <Inbox className="h-3.5 w-3.5" /> Concierge Inbox
          </Link>
        </div>
      </section>

      <style>{`
        .mi-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #44403c;
          background: transparent;
          border: 1px solid #d6d3d1;
          border-radius: 8px;
          cursor: pointer;
        }
        .mi-action-btn--primary {
          color: #fff;
          background: linear-gradient(135deg,#1a1a2e,#0f3460);
          border: none;
          box-shadow: 0 1px 2px rgba(0,0,0,0.12);
        }
      `}</style>

      {/* Preset lab */}
      <Link
        href="/admin/studios/template"
        prefetch={false}
        style={{
          display: "block",
          textDecoration: "none",
          ...card,
          padding: "14px 16px",
          borderLeft: "4px solid #1c1917",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", marginBottom: 6 }}>
          Studio preset lab — Neutral (base) + Fitness
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "#57534e", lineHeight: 1.6 }}>
          Open the embedded builder preview: first tab is the <strong>neutral</strong> spine; fitness is the saved vertical.
          More categories show as disabled until their envelopes exist.
        </p>
        <span style={{ display: "inline-block", marginTop: 12, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
          Open preset lab →
        </span>
      </Link>

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
                <td style={td}>{PROVIDER_CATEGORY_LABELS[p.category] ?? p.category}</td>
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

      {/* Public gateway (/amihuman/studios) — Prisma-backed intake */}
      <StudiosGatewayAccessRequestsSection />

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
              const status =
                REQUEST_STATUS_STYLE[r.status] ??
                { bg: "#f3f4f6", color: "#374151", label: r.status };
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
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "7px 14px", fontSize: "13px", fontWeight: 600,
      background: "linear-gradient(135deg,#1a1a2e,#0f3460)",
      color: "white", border: "none", borderRadius: "8px", cursor: "pointer",
      boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
    };
  }
  return {
    display: "inline-flex", alignItems: "center", gap: "6px",
    padding: "7px 14px", fontSize: "13px", fontWeight: 500,
    background: "transparent", color: "#44403c",
    border: "1px solid #d6d3d1", borderRadius: "8px", cursor: "pointer",
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
