"use client";
// app/(app)/admin/intelligence/transpo/carriers/page.tsx
// Transpo Carrier Master — durable, de-duplicated carriers promoted from source
// runs. Read-only view of GET /api/admin/intelligence/transpo/carriers.

import { useEffect, useState } from "react";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceSubNav } from "@/components/admin/IntelligenceSubNav";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import { CarrierOpportunityDrawer } from "@/components/admin/intelligence/transpo/CarrierOpportunityDrawer";
import type { TranspoCarrierTarget } from "@/lib/intelligence/transpo/types";

export default function TranspoCarriersPage() {
  const [carriers, setCarriers] = useState<TranspoCarrierTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/intelligence/transpo/carriers");
        const data = (await res.json()) as {
          ok: boolean;
          carriers?: TranspoCarrierTarget[];
          error?: string;
        };
        if (!active) return;
        if (data.ok && Array.isArray(data.carriers)) {
          setCarriers(data.carriers);
        } else {
          setError(data.error ?? "Failed to load carriers");
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const headerCellStyle: React.CSSProperties = {
    padding: "9px 12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    textAlign: "left",
  };
  const cellStyle: React.CSSProperties = {
    padding: "9px 12px",
    color: "#1c1917",
    verticalAlign: "top",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <IntelligenceMarketNav />
      <IntelligenceSubNav config={transpoConfig} currentTool="carriers" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Carrier Master
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 600, lineHeight: 1.55 }}>
          Durable, de-duplicated carriers promoted from source runs. Identity is
          keyed by USDOT, then MC, then company + location.
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#78716c" }}>Loading carriers…</p>
      ) : error ? (
        <div style={{
          fontSize: 12,
          color: "#dc2626",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 10,
          padding: "12px 16px",
        }}>
          ✗ {error}
        </div>
      ) : carriers.length === 0 ? (
        <div style={{
          fontSize: 13,
          color: "#78716c",
          background: "#f9f9f8",
          border: "1px solid #ede9e4",
          borderRadius: 12,
          padding: "28px 24px",
          textAlign: "center",
        }}>
          <div style={{ fontWeight: 700, color: "#44403c", marginBottom: 4 }}>
            No carrier master records yet
          </div>
          Promote records from <strong>Source Runs</strong>.
        </div>
      ) : (
        <div style={{
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 14,
          overflow: "hidden",
        }}>
          <div style={{
            fontSize: 11,
            color: "#78716c",
            padding: "10px 14px",
            borderBottom: "1px solid #f0efed",
            background: "#fafaf9",
          }}>
            {carriers.length} carrier{carriers.length === 1 ? "" : "s"}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "#78716c", borderBottom: "1px solid #e7e5e4", background: "#fafaf9" }}>
                  {["Company", "DOT", "MC", "City", "State", "Fleet", "Drivers", "Authority", "Sources", "Updated"].map((h) => (
                    <th key={h} style={headerCellStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carriers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCarrierId(c.id)}
                    style={{ borderBottom: "1px solid #f5f5f4", cursor: "pointer" }}
                  >
                    <td style={{ ...cellStyle, fontWeight: 600, color: "#3730a3" }}>{c.companyName}</td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{c.dotNumber ?? "—"}</td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{c.mcNumber ?? "—"}</td>
                    <td style={cellStyle}>{c.city ?? "—"}</td>
                    <td style={cellStyle}>{c.state ?? "—"}</td>
                    <td style={cellStyle}>{c.fleetSize ?? "—"}</td>
                    <td style={cellStyle}>{c.driverCount ?? "—"}</td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{c.authorityStatus ?? "—"}</td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(c.sources ?? []).length === 0
                          ? "—"
                          : c.sources.map((s) => (
                              <span key={s} style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 20,
                                color: "#1e40af",
                                background: "#dbeafe",
                                border: "1px solid #bfdbfe",
                                whiteSpace: "nowrap",
                              }}>
                                {s}
                              </span>
                            ))}
                      </div>
                    </td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                      {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CarrierOpportunityDrawer
        carrierId={selectedCarrierId}
        open={selectedCarrierId !== null}
        onClose={() => setSelectedCarrierId(null)}
      />
    </div>
  );
}
