"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { CountyOpportunityDrawer } from "@/components/admin/intelligence/transpo/CountyOpportunityDrawer";
import { SERVICE_CATEGORY_LABELS, type TranspoServiceCategory } from "@/lib/intelligence/transpo/market-gaps/types";
import { OPPORTUNITY_TYPE_LABELS } from "@/lib/intelligence/transpo/network-formation/network-formation-types";
import type { CountyOpportunityDossier } from "@/lib/intelligence/transpo/opportunity-dossiers/county-opportunity-types";

function PlaySection({
  title,
  plays,
  onSelect,
}: {
  title: string;
  plays: CountyOpportunityDossier[];
  onSelect: (d: CountyOpportunityDossier) => void;
}) {
  if (plays.length === 0) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, margin: "0 0 12px" }}>{title}</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {plays.slice(0, 12).map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d)}
            style={{ textAlign: "left", border: "1px solid #e7e5e4", borderRadius: 10, padding: "10px 12px", background: "#fafaf9", cursor: "pointer" }}
          >
            <div style={{ fontWeight: 700, fontSize: 12, color: "#1c1917" }}>
              {d.county}, {d.state} — {SERVICE_CATEGORY_LABELS[d.serviceCategory as TranspoServiceCategory] ?? d.serviceCategory}
            </div>
            <div style={{ fontSize: 11, color: "#78716c", marginTop: 4 }}>
              {d.opportunityType ? OPPORTUNITY_TYPE_LABELS[d.opportunityType] : "—"} · actionability {d.actionabilityScore}
            </div>
            <div style={{ fontSize: 11, color: "#44403c", marginTop: 6, lineHeight: 1.5 }}>{d.firstMove ?? d.nearTermPlay}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TranspoNetworkPlaysPage() {
  const [dossiers, setDossiers] = useState<CountyOpportunityDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CountyOpportunityDossier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/opportunity-radar", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setDossiers(data.dossiers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const nextWeek = dossiers.filter((d) => d.timeHorizon === "next_week");
  const college = dossiers.filter((d) => d.opportunityType === "network_formation" || d.opportunityType === "workforce_pipeline");
  const partnership = dossiers.filter((d) => d.opportunityType === "provider_partnership");
  const rural = dossiers.filter((d) => d.opportunityType === "network_formation" && d.serviceCategory === "rural_transit");

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="network-plays" />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Network Plays</h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 680, lineHeight: 1.55 }}>
          Near-term trusted-network opportunities for underserved transport markets.
        </p>
        <Link href="/admin/intelligence/transpo/opportunity-radar" style={{ fontSize: 12, fontWeight: 700, color: "#4338ca", display: "inline-block", marginTop: 8 }}>
          Opportunity Radar →
        </Link>
      </div>

      {error ? <div style={{ marginBottom: 16, fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>{error}</div> : null}
      {loading ? <p style={{ fontSize: 12, color: "#78716c" }}>Loading…</p> : (
        <>
          <PlaySection title="Next Week Plays" plays={nextWeek} onSelect={setSelected} />
          <PlaySection title="College / Student Network Plays" plays={college} onSelect={setSelected} />
          <PlaySection title="Provider Partnership Plays" plays={partnership} onSelect={setSelected} />
          <PlaySection title="Rural Connector Plays" plays={rural} onSelect={setSelected} />
        </>
      )}

      <CountyOpportunityDrawer dossier={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}
