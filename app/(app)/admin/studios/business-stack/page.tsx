"use client";

import { useEffect, useState, useMemo } from "react";
import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";
import { SalonStorageBadge } from "@/components/admin/intelligence/salon/SalonStorageBadge";
import { SalonProspectDrawer } from "@/components/admin/intelligence/salon/SalonProspectDrawer";
import { getStackProvider } from "@/lib/intelligence/salon/business-stack/provider-registry";
import type { SalonBusinessStack } from "@/lib/intelligence/salon/business-stack/types";

type StackRow = SalonBusinessStack & { handle?: string; name?: string };

type BackfillResult = {
  checked: number;
  stacksCreated: number;
  bookingProvidersFound: number;
  paymentProvidersFound: number;
  checkInProvidersFound: number;
  errors: string[];
  sample: Array<{ handle: string; booking?: string; payment?: string; checkIn?: string }>;
};

function providerLabel(id?: string): string {
  if (!id) return "—";
  return getStackProvider(id)?.label ?? id;
}

export default function BusinessStackPage() {
  const [stacks, setStacks] = useState<StackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [onlyUnknown, setOnlyUnknown] = useState(true);
  const [crawlWebsite, setCrawlWebsite] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  async function loadStacks() {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/admin/intelligence/salon/business-stack?limit=300",
        { cache: "no-store" },
      );
      const json = await res.json();
      if (json.ok) setStacks(json.stacks ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStacks();
  }, []);

  const stats = useMemo(() => {
    let booking = 0;
    let payment = 0;
    let checkIn = 0;
    let website = 0;
    let importOp = 0;
    let mature = 0;
    for (const s of stacks) {
      if (s.primaryBookingProvider) booking++;
      if (s.primaryPaymentProvider) payment++;
      if (s.checkInProvider) checkIn++;
      if (s.websiteBuilder) website++;
      if (s.importOpportunity) importOp++;
      if (s.operationalMaturity === "high") mature++;
    }
    return { booking, payment, checkIn, website, importOp, mature };
  }, [stacks]);

  async function runBackfill() {
    if (crawlWebsite) {
      const ok = window.confirm(
        "Website crawl fetches public homepages (8s timeout). Continue?",
      );
      if (!ok) return;
    }
    setBackfillLoading(true);
    setBackfillError(null);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/intelligence/salon/business-stack/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, onlyUnknown, crawlWebsite }),
      });
      const json = await res.json();
      if (!json.ok) {
        setBackfillError(json.detail ?? json.error ?? "Backfill failed");
        return;
      }
      setBackfillResult(json);
      await loadStacks();
    } catch (e) {
      setBackfillError(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setBackfillLoading(false);
    }
  }

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 10,
    fontWeight: 700,
    color: "#78716c",
    borderBottom: "1px solid #e7e5e4",
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: 11,
    color: "#57534e",
    borderBottom: "1px solid #f5f5f4",
    verticalAlign: "top",
  };

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1200, margin: "0 auto" }}>
      <CreatorIntelligenceNav current="business-stack" />
      <IntelligenceFeatureHeader
        title="Business Stack Intelligence"
        description="Detect booking, payment, website, review, marketing, and check-in systems from public salon links."
        config={salonConfig}
      />
      <SalonStorageBadge />

      <div
        style={{
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#44403c", marginBottom: 10 }}>
          Resolve recent prospects
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={50}>Limit 50</option>
            <option value={100}>Limit 100</option>
            <option value={250}>Limit 250</option>
          </select>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={onlyUnknown}
              onChange={(e) => setOnlyUnknown(e.target.checked)}
            />
            Only unknown / low-confidence booking
          </label>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={crawlWebsite}
              onChange={(e) => setCrawlWebsite(e.target.checked)}
            />
            Crawl website homepage
          </label>
          <button
            type="button"
            onClick={runBackfill}
            disabled={backfillLoading}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              background: "#9d174d",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: backfillLoading ? "wait" : "pointer",
            }}
          >
            {backfillLoading ? "Running…" : "Run backfill"}
          </button>
        </div>
        {backfillError ? (
          <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c" }}>{backfillError}</div>
        ) : null}
        {backfillResult ? (
          <div style={{ marginTop: 12, fontSize: 11, color: "#57534e" }}>
            Checked {backfillResult.checked} · stacks {backfillResult.stacksCreated} · booking{" "}
            {backfillResult.bookingProvidersFound} · payment{" "}
            {backfillResult.paymentProvidersFound} · check-in{" "}
            {backfillResult.checkInProvidersFound}
            {backfillResult.errors.length > 0 ? (
              <div style={{ color: "#b45309", marginTop: 6 }}>
                Errors: {backfillResult.errors.slice(0, 3).join("; ")}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          ["Prospects checked", backfillResult?.checked ?? stacks.length],
          ["Booking providers", stats.booking],
          ["Payment providers", stats.payment],
          ["Check-in providers", stats.checkIn],
          ["Website builders", stats.website],
          ["Import opportunities", stats.importOp],
          ["Mature stacks", stats.mature],
        ].map(([label, val]) => (
          <div
            key={label}
            style={{
              background: "#fafaf9",
              border: "1px solid #e7e5e4",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e" }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1c1917" }}>{val}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "#78716c" }}>Loading…</div>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  "Prospect",
                  "Booking",
                  "Payments",
                  "Website Builder",
                  "Check-In",
                  "Reviews",
                  "Marketing",
                  "Stack Score",
                  "Maturity",
                  "Updated",
                ].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stacks.map((s) => (
                <tr
                  key={s.prospectId}
                  onClick={() => s.prospectId && setDrawerId(s.prospectId)}
                  style={{ cursor: s.prospectId ? "pointer" : "default" }}
                >
                  <td style={tdStyle}>
                    <strong>@{s.handle ?? s.instagramHandle ?? "—"}</strong>
                    {s.name ? (
                      <div style={{ fontSize: 10, color: "#78716c" }}>{s.name}</div>
                    ) : null}
                  </td>
                  <td style={tdStyle}>{providerLabel(s.primaryBookingProvider)}</td>
                  <td style={tdStyle}>{providerLabel(s.primaryPaymentProvider)}</td>
                  <td style={tdStyle}>{providerLabel(s.websiteBuilder)}</td>
                  <td style={tdStyle}>{providerLabel(s.checkInProvider)}</td>
                  <td style={tdStyle}>
                    {(s.reviewPresence ?? []).map(providerLabel).join(", ") || "—"}
                  </td>
                  <td style={tdStyle}>
                    {(s.marketingPixels ?? []).join(", ") || "—"}
                  </td>
                  <td style={tdStyle}>{s.stackCompletenessScore}</td>
                  <td style={tdStyle}>{s.operationalMaturity}</td>
                  <td style={tdStyle}>
                    {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stacks.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#78716c" }}>
              No stacks stored yet — run backfill to fingerprint prospects.
            </div>
          ) : null}
        </div>
      )}

      <SalonProspectDrawer
        prospectId={drawerId}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
      />
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e7e5e4",
  background: "#fff",
};
