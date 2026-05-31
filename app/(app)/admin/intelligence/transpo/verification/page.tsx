"use client";
// app/(app)/admin/intelligence/transpo/verification/page.tsx
// Carrier Verification — validate carrier public presence before market
// outreach. Reads GET /api/admin/intelligence/transpo/verification and runs
// batches via POST.

import { Fragment, useEffect, useState, useCallback } from "react";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceSubNav } from "@/components/admin/IntelligenceSubNav";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import type {
  TranspoCarrierVerification,
  TranspoVerificationStatus,
} from "@/lib/intelligence/transpo/verification-types";

type Storage = { backend: "postgres" | "json"; durable?: boolean; path?: string; ephemeral?: boolean };

const STATUS_COLORS: Record<TranspoVerificationStatus, { fg: string; bg: string; bd: string }> = {
  verified: { fg: "#166534", bg: "#dcfce7", bd: "#bbf7d0" },
  partial: { fg: "#92400e", bg: "#fef3c7", bd: "#fde68a" },
  not_found: { fg: "#991b1b", bg: "#fef2f2", bd: "#fecaca" },
  placeholder: { fg: "#57534e", bg: "#f5f5f4", bd: "#e7e5e4" },
  error: { fg: "#991b1b", bg: "#fef2f2", bd: "#fecaca" },
};

function YesNo({ value }: { value?: boolean }) {
  if (value === true) return <span style={{ color: "#166534", fontWeight: 700 }}>Yes</span>;
  if (value === false) return <span style={{ color: "#a8a29e" }}>No</span>;
  return <span style={{ color: "#d6d3d1" }}>—</span>;
}

export default function TranspoVerificationPage() {
  const [verifications, setVerifications] = useState<TranspoCarrierVerification[]>([]);
  const [storage, setStorage] = useState<Storage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [runMsg, setRunMsg] = useState("");
  const [runErr, setRunErr] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/intelligence/transpo/verification", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        verifications?: TranspoCarrierVerification[];
        storage?: Storage;
        error?: string;
      };
      if (data.storage) setStorage(data.storage);
      if (data.ok && Array.isArray(data.verifications)) setVerifications(data.verifications);
      else setError(data.error ?? "Failed to load verifications");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runVerification(mode: "all" | "missing_only", limit?: number) {
    setBusy(true);
    setRunMsg("");
    setRunErr("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ mode, ...(limit ? { limit } : {}) }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        verified?: number;
        created?: number;
        updated?: number;
        verificationCount?: number;
        note?: string;
        error?: string;
        detail?: string;
        debug?: { persistError?: string; carrierCount?: number };
      };
      if (data.ok) {
        const base = `Verified ${data.verified ?? 0} carrier(s): ${data.created ?? 0} created, ${data.updated ?? 0} updated. Total: ${data.verificationCount ?? 0}.`;
        setRunMsg(data.note ? `${base} ${data.note}` : base);
        await load();
      } else {
        const hints: string[] = [];
        if (typeof data.debug?.carrierCount === "number") hints.push(`carriers: ${data.debug.carrierCount}`);
        if (data.debug?.persistError) hints.push(`persist: ${data.debug.persistError}`);
        if (data.detail) hints.push(data.detail);
        const baseErr = data.error ?? "Verification failed";
        setRunErr(hints.length ? `${baseErr} (${hints.join(" · ")})` : baseErr);
      }
    } catch (e) {
      setRunErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const total = verifications.length;
  const verified = verifications.filter((v) => v.verificationStatus === "verified").length;
  const partial = verifications.filter((v) => v.verificationStatus === "partial").length;
  const notFound = verifications.filter((v) => v.verificationStatus === "not_found").length;
  const avgScore = total
    ? Math.round(verifications.reduce((s, v) => s + (v.verificationScore ?? 0), 0) / total)
    : 0;

  const hd: React.CSSProperties = { padding: "9px 12px", fontWeight: 700, whiteSpace: "nowrap", textAlign: "left" };
  const cd: React.CSSProperties = { padding: "9px 12px", color: "#1c1917", verticalAlign: "top" };

  const btn = (label: string, onClick: () => void): React.ReactNode => (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "7px 14px",
        borderRadius: 8,
        border: "1px solid #c7d2fe",
        background: busy ? "#e0e7ff" : "#eef2ff",
        color: "#3730a3",
        cursor: busy ? "not-allowed" : "pointer",
      }}
    >
      {busy ? "Working…" : label}
    </button>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 60px" }}>
      <IntelligenceMarketNav />
      <IntelligenceSubNav config={transpoConfig} currentTool="verification" />

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Carrier Verification
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
          Validate carrier public presence before market outreach.
        </p>
        {storage && (
          <p style={{ fontSize: 11, color: "#a8a29e", margin: "6px 0 0" }}>
            Storage:{" "}
            <strong style={{ color: "#78716c" }}>
              {storage.backend === "postgres" ? "Postgres durable" : "runtime JSON fallback"}
            </strong>
            {storage.ephemeral ? " · ephemeral (/tmp)" : ""}
          </p>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { label: "Carriers verified", value: total },
          { label: "Verified", value: verified },
          { label: "Partial", value: partial },
          { label: "Not found", value: notFound },
          { label: "Avg score", value: avgScore },
        ].map((s) => (
          <div key={s.label} style={{
            flex: "1 1 140px",
            minWidth: 120,
            background: "#fff",
            border: "1px solid #e7e5e4",
            borderRadius: 12,
            padding: "12px 14px",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#78716c" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {btn("Verify Missing", () => runVerification("missing_only"))}
        {btn("Verify First 25", () => runVerification("all", 25))}
        {btn("Verify All Visible", () => runVerification("all"))}
        {runMsg && <span style={{ fontSize: 11, color: "#3730a3", fontWeight: 700 }}>✓ {runMsg}</span>}
        {runErr && <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>✗ {runErr}</span>}
      </div>

      <div style={{
        fontSize: 11,
        color: "#92400e",
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 16,
      }}>
        ⚠ Some verification providers are placeholders until API credentials are connected
        (Google Business, BBB, Facebook, state registry). Website and address signals are live.
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#78716c" }}>Loading verifications…</p>
      ) : error ? (
        <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px" }}>
          ✗ {error}
        </div>
      ) : verifications.length === 0 ? (
        <div style={{
          fontSize: 13,
          color: "#78716c",
          background: "#f9f9f8",
          border: "1px solid #ede9e4",
          borderRadius: 12,
          padding: "28px 24px",
          textAlign: "center",
        }}>
          <div style={{ fontWeight: 700, color: "#44403c", marginBottom: 4 }}>No verifications yet</div>
          Use <strong>Verify Missing</strong> or <strong>Verify First 25</strong> to validate carriers
          from the Carrier Master.
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "#78716c", borderBottom: "1px solid #e7e5e4", background: "#fafaf9" }}>
                  {["Company", "DOT", "City", "State", "Score", "Status", "Google", "Website", "BBB", "Facebook", "Address Type"].map((h) => (
                    <th key={h} style={hd}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {verifications.map((v) => {
                  const sc = STATUS_COLORS[v.verificationStatus] ?? STATUS_COLORS.placeholder;
                  const notes = (v.notes ?? []).join(" · ");
                  return (
                    <Fragment key={v.id}>
                      <tr style={{ borderTop: "1px solid #f0efed" }}>
                        <td style={{ ...cd, paddingBottom: 4 }}>{v.companyName}</td>
                        <td style={{ ...cd, paddingBottom: 4, whiteSpace: "nowrap" }}>{v.dotNumber ?? "—"}</td>
                        <td style={{ ...cd, paddingBottom: 4 }}>{v.city ?? "—"}</td>
                        <td style={{ ...cd, paddingBottom: 4 }}>{v.state ?? "—"}</td>
                        <td style={{ ...cd, paddingBottom: 4, fontWeight: 800 }}>{v.verificationScore}</td>
                        <td style={{ ...cd, paddingBottom: 4 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 20,
                            color: sc.fg,
                            background: sc.bg,
                            border: `1px solid ${sc.bd}`,
                            whiteSpace: "nowrap",
                          }}>
                            {v.verificationStatus}
                          </span>
                        </td>
                        <td style={{ ...cd, paddingBottom: 4 }}><YesNo value={v.googleFound} /></td>
                        <td style={{ ...cd, paddingBottom: 4 }}><YesNo value={v.websiteFound} /></td>
                        <td style={{ ...cd, paddingBottom: 4 }}><YesNo value={v.bbbFound} /></td>
                        <td style={{ ...cd, paddingBottom: 4 }}><YesNo value={v.facebookFound} /></td>
                        <td style={{ ...cd, paddingBottom: 4, whiteSpace: "nowrap" }}>{v.addressType ?? "—"}</td>
                      </tr>
                      {/* Second line: notes span the full width so the row stays readable. */}
                      <tr style={{ borderBottom: "1px solid #f0efed" }}>
                        <td colSpan={11} style={{ padding: "0 12px 9px", fontSize: 11, color: "#78716c", lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 700, color: "#a8a29e", marginRight: 6 }}>Notes:</span>
                          {notes || "—"}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
