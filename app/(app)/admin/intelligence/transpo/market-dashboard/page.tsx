"use client";
// app/(app)/admin/intelligence/transpo/market-dashboard/page.tsx
// Transpo Market Dashboard — aggregates carriers, opportunities, and
// verification into a single market-intelligence view with filters and a
// top-opportunities feed. Reads the existing GET APIs client-side.

import { useCallback, useEffect, useMemo, useState } from "react";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import type { TranspoCarrierTarget } from "@/lib/intelligence/transpo/types";
import type { TranspoOpportunityRecord } from "@/lib/intelligence/transpo/opportunity-engine";
import type {
  TranspoCarrierVerification,
  TranspoCarrierReview,
  TranspoReviewStatus,
} from "@/lib/intelligence/transpo/verification-types";

export default function TranspoMarketDashboardPage() {
  const [carriers, setCarriers] = useState<TranspoCarrierTarget[]>([]);
  const [opportunities, setOpportunities] = useState<TranspoOpportunityRecord[]>([]);
  const [verifications, setVerifications] = useState<TranspoCarrierVerification[]>([]);
  const [reviews, setReviews] = useState<TranspoCarrierReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cRes, oRes, vRes, rRes] = await Promise.all([
          fetch("/api/admin/intelligence/transpo/carriers", { cache: "no-store" }),
          fetch("/api/admin/intelligence/transpo/opportunities", { cache: "no-store" }),
          fetch("/api/admin/intelligence/transpo/verification", { cache: "no-store" }),
          fetch("/api/admin/intelligence/transpo/reviews", { cache: "no-store" }),
        ]);
        const c = (await cRes.json()) as { ok: boolean; carriers?: TranspoCarrierTarget[]; error?: string };
        const o = (await oRes.json()) as { ok: boolean; opportunities?: TranspoOpportunityRecord[] };
        const v = (await vRes.json()) as { ok: boolean; verifications?: TranspoCarrierVerification[] };
        const r = (await rRes.json()) as { ok: boolean; reviews?: TranspoCarrierReview[] };
        if (!active) return;
        if (!c.ok) {
          setError(c.error ?? "Failed to load carriers");
        } else {
          setCarriers(c.carriers ?? []);
          setOpportunities(o.opportunities ?? []);
          setVerifications(v.verifications ?? []);
          setReviews(r.reviews ?? []);
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

  const states = useMemo(
    () => Array.from(new Set(carriers.map((c) => c.state).filter(Boolean))).sort() as string[],
    [carriers],
  );
  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          carriers
            .filter((c) => !stateFilter || c.state === stateFilter)
            .map((c) => c.city)
            .filter(Boolean),
        ),
      ).sort() as string[],
    [carriers, stateFilter],
  );

  const matchesFilter = useCallback(
    (c: { state?: string; city?: string }): boolean => {
      if (stateFilter && c.state !== stateFilter) return false;
      if (cityFilter && c.city !== cityFilter) return false;
      return true;
    },
    [stateFilter, cityFilter],
  );

  const fCarriers = useMemo(() => carriers.filter(matchesFilter), [carriers, matchesFilter]);
  const fOpps = useMemo(() => opportunities.filter(matchesFilter), [opportunities, matchesFilter]);
  const fVerifs = useMemo(() => verifications.filter(matchesFilter), [verifications, matchesFilter]);

  // Stats
  const totalCarriers = fCarriers.length;
  const verifiedCarriers = fVerifs.filter((v) => v.verificationStatus === "verified").length;
  const missingGoogle = fVerifs.filter((v) => v.googleFound === false).length;
  const missingWebsite = fCarriers.filter((c) => !(c.website ?? "").trim()).length;
  const smallFleets = fCarriers.filter((c) => (c.fleetSize ?? 0) >= 2 && (c.fleetSize ?? 0) <= 10).length;
  const singleTruck = fCarriers.filter((c) => c.fleetSize === 1).length;
  const avgOppScore = fOpps.length
    ? Math.round(fOpps.reduce((s, o) => s + o.score, 0) / fOpps.length)
    : 0;

  // Google enrichment stats
  const googleFound = fVerifs.filter((v) => v.googleFound === true).length;
  const googleLowConfidence = fVerifs.filter(
    (v) => v.googleFound === true && (v.googleMatchConfidence ?? 1) < 0.45,
  ).length;
  const googleWebsiteFound = fVerifs.filter((v) => (v.googleWebsite ?? "").trim()).length;
  const ratedVerifs = fVerifs.filter((v) => typeof v.googleRating === "number");
  const avgGoogleRating = ratedVerifs.length
    ? (ratedVerifs.reduce((s, v) => s + (v.googleRating ?? 0), 0) / ratedVerifs.length).toFixed(1)
    : "—";

  // Website crawl stats
  const sitesCrawled = fVerifs.filter(
    (v) => v.websiteFetchStatus === "fetched" || v.websiteFetchStatus === "partial",
  ).length;
  const hiringSignals = fVerifs.filter((v) => v.websiteHiringFound).length;
  const ownerOperatorSignals = fVerifs.filter((v) => v.websiteOwnerOperatorFound).length;
  const brokenOrParked = fVerifs.filter(
    (v) =>
      v.websiteFetchStatus === "failed" ||
      (v.websiteSignals ?? []).includes("broken_site") ||
      (v.websiteSignals ?? []).includes("parked_domain"),
  ).length;
  const sitesWithContact = fVerifs.filter(
    (v) =>
      (v.websiteSignals ?? []).includes("contact_page_found") ||
      (v.websiteExtractedPhones?.length ?? 0) > 0 ||
      (v.websiteExtractedEmails?.length ?? 0) > 0,
  ).length;

  // State registry stats
  const newEntities = fVerifs.filter(
    (v) => v.stateEntityFound === true && (v.entityAgeMonths ?? Infinity) <= 12,
  ).length;
  const goodStanding = fVerifs.filter((v) => v.entityGoodStanding === true).length;
  const stateRegistryNotFound = fVerifs.filter((v) => v.stateEntityFound === false).length;
  const entityCleanupOpps = fVerifs.filter(
    (v) =>
      (v.stateEntityFound === true && v.entityGoodStanding === false) ||
      v.stateEntityFound === false,
  ).length;

  // Review stats — count reviews whose carrier is in the filtered scope.
  const reviewCounts = useMemo(() => {
    const inScope = new Set(fCarriers.map((c) => c.id));
    const byStatus = new Map<TranspoReviewStatus, number>();
    let reviewedTotal = 0;
    for (const r of reviews) {
      if (!inScope.has(r.carrierId)) continue;
      reviewedTotal++;
      byStatus.set(r.reviewStatus, (byStatus.get(r.reviewStatus) ?? 0) + 1);
    }
    const get = (s: TranspoReviewStatus) => byStatus.get(s) ?? 0;
    // Unreviewed = carriers in scope with no (or "unreviewed") review row.
    const unreviewed = inScope.size - (reviewedTotal - get("unreviewed"));
    return {
      approved: get("approved"),
      needsVerification: get("needs_verification"),
      watchlist: get("watchlist"),
      rejected: get("rejected"),
      unreviewed: Math.max(0, unreviewed),
    };
  }, [reviews, fCarriers]);

  // Signal distribution
  const signalDist = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const o of fOpps) {
      for (const s of o.signals) {
        const prev = counts.get(s.id);
        if (prev) prev.count++;
        else counts.set(s.id, { label: s.label, count: 1 });
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [fOpps]);

  // Verification distribution
  const verifDist = useMemo(() => {
    const order = ["verified", "partial", "not_found", "placeholder", "error"];
    const counts = new Map<string, number>();
    for (const v of fVerifs) counts.set(v.verificationStatus, (counts.get(v.verificationStatus) ?? 0) + 1);
    return order.map((k) => ({ status: k, count: counts.get(k) ?? 0 }));
  }, [fVerifs]);

  // Market notes
  const marketNotes = useMemo(() => {
    const notes: string[] = [];
    const scope = [cityFilter, stateFilter].filter(Boolean).join(", ") || "All markets";
    notes.push(`${scope}: ${totalCarriers} carrier${totalCarriers === 1 ? "" : "s"} in master.`);
    const unverified = fVerifs.filter(
      (v) => v.verificationStatus === "not_found" || v.verificationStatus === "placeholder",
    ).length;
    const unscored = totalCarriers - fVerifs.length;
    if (fVerifs.length > 0) {
      notes.push(`${unverified} carrier${unverified === 1 ? "" : "s"} lack a verified public presence.`);
    }
    if (unscored > 0) {
      notes.push(`${unscored} carrier${unscored === 1 ? "" : "s"} not yet verified — run Verification.`);
    }
    if (singleTruck > 0) {
      notes.push(`${singleTruck} single-truck operator${singleTruck === 1 ? "" : "s"} are likely owner-led.`);
    }
    if (missingWebsite > 0) {
      notes.push(`${missingWebsite} carrier${missingWebsite === 1 ? "" : "s"} have no website on record.`);
    }
    return notes;
  }, [stateFilter, cityFilter, totalCarriers, fVerifs, singleTruck, missingWebsite]);

  const topOpps = fOpps.slice(0, 15);

  const card = (label: string, value: number | string) => (
    <div key={label} style={{
      flex: "1 1 150px",
      minWidth: 130,
      background: "#fff",
      border: "1px solid #e7e5e4",
      borderRadius: 12,
      padding: "12px 14px",
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#78716c" }}>{label}</div>
    </div>
  );

  const selectStyle: React.CSSProperties = {
    fontSize: 12,
    padding: "7px 10px",
    border: "1px solid #e7e5e4",
    borderRadius: 8,
    background: "#fff",
    color: "#1c1917",
  };
  const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 10px" };
  const panel: React.CSSProperties = {
    flex: "1 1 320px",
    minWidth: 280,
    background: "#fff",
    border: "1px solid #e7e5e4",
    borderRadius: 14,
    padding: "16px 18px",
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="market-dashboard" />

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Transpo Market Dashboard
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
          Carriers, opportunities, and verification rolled up into a single market view.
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#78716c" }}>Loading market data…</p>
      ) : error ? (
        <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px" }}>
          ✗ {error}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setCityFilter(""); }} style={selectStyle}>
              <option value="">All states</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={selectStyle}>
              <option value="">All cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {(stateFilter || cityFilter) && (
              <button
                type="button"
                onClick={() => { setStateFilter(""); setCityFilter(""); }}
                style={{ fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8, border: "1px solid #e7e5e4", background: "#fff", color: "#57534e", cursor: "pointer" }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Stat cards */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {card("Total carriers", totalCarriers)}
            {card("Verified carriers", verifiedCarriers)}
            {card("Google found", googleFound)}
            {card("Missing Google Business", missingGoogle)}
            {card("Low-confidence Google", googleLowConfidence)}
            {card("Google website found", googleWebsiteFound)}
            {card("Avg Google rating", avgGoogleRating)}
            {card("Sites crawled", sitesCrawled)}
            {card("Hiring signals", hiringSignals)}
            {card("Owner-operator signals", ownerOperatorSignals)}
            {card("Broken / parked sites", brokenOrParked)}
            {card("Sites with contact info", sitesWithContact)}
            {card("New entities", newEntities)}
            {card("Good standing", goodStanding)}
            {card("State registry not found", stateRegistryNotFound)}
            {card("Entity cleanup opportunities", entityCleanupOpps)}
            {card("Missing website", missingWebsite)}
            {card("Small fleets", smallFleets)}
            {card("Single-truck operators", singleTruck)}
            {card("Avg opportunity score", avgOppScore)}
          </div>

          {/* Review stats */}
          <h2 style={{ ...sectionTitle, marginTop: 4 }}>Human Review</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {card("Approved", reviewCounts.approved)}
            {card("Needs verification", reviewCounts.needsVerification)}
            {card("Watchlist", reviewCounts.watchlist)}
            {card("Rejected", reviewCounts.rejected)}
            {card("Unreviewed", reviewCounts.unreviewed)}
          </div>

          {/* Top opportunities */}
          <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0efed", background: "#fafaf9", fontWeight: 800, fontSize: 14, color: "#1c1917" }}>
              Top Opportunities
            </div>
            {topOpps.length === 0 ? (
              <div style={{ padding: "20px 16px", fontSize: 12, color: "#78716c" }}>
                No opportunities in scope. Promote carriers and run Opportunities scoring.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: "#78716c", borderBottom: "1px solid #e7e5e4", background: "#fafaf9" }}>
                      {["Company", "DOT", "Score", "Recommended Play", "Signals"].map((h) => (
                        <th key={h} style={{ padding: "9px 12px", fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topOpps.map((o) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
                        <td style={{ padding: "9px 12px" }}>{o.companyName}</td>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>{o.dotNumber ?? "—"}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 800 }}>{o.score}</td>
                        <td style={{ padding: "9px 12px", fontSize: 11, color: "#44403c", maxWidth: 280 }}>{o.recommendedPlay}</td>
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 320 }}>
                            {o.signals.map((s) => (
                              <span key={s.id} style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 20,
                                color: "#3730a3",
                                background: "#eef2ff",
                                border: "1px solid #c7d2fe",
                                whiteSpace: "nowrap",
                              }}>
                                {s.label}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Distributions + notes */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={panel}>
              <h2 style={sectionTitle}>Signal Distribution</h2>
              {signalDist.length === 0 ? (
                <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>No signals in scope.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {signalDist.map((s) => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#44403c" }}>
                      <span>{s.label}</span>
                      <strong>{s.count}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={panel}>
              <h2 style={sectionTitle}>Verification Distribution</h2>
              <div style={{ display: "grid", gap: 6 }}>
                {verifDist.map((v) => (
                  <div key={v.status} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#44403c" }}>
                    <span>{v.status}</span>
                    <strong>{v.count}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={panel}>
              <h2 style={sectionTitle}>Market Notes</h2>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#44403c", lineHeight: 1.7 }}>
                {marketNotes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
