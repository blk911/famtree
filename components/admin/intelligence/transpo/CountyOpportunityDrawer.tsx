"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PromoteToActionQueueButton } from "@/components/admin/intelligence/transpo/PromoteToActionQueueButton";
import { SERVICE_CATEGORY_LABELS, type TranspoServiceCategory } from "@/lib/intelligence/transpo/market-gaps/types";
import type { CountyOpportunityDossier } from "@/lib/intelligence/transpo/opportunity-dossiers/county-opportunity-types";

type Props = {
  dossier: CountyOpportunityDossier | null;
  open: boolean;
  onClose: () => void;
  onSelectProvider?: (providerId: string) => void;
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, fontSize: 12, marginBottom: 8 }}>
      <span style={{ color: "#a8a29e", fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#44403c" }}>{value}</span>
    </div>
  );
}

const BAND_STYLE: Record<string, { fg: string; bg: string }> = {
  immediate: { fg: "#991b1b", bg: "#fef2f2" },
  priority: { fg: "#9a3412", bg: "#ffedd5" },
  investigate: { fg: "#92400e", bg: "#fef3c7" },
  watch: { fg: "#57534e", bg: "#f5f5f4" },
};

export function CountyOpportunityDrawer({ dossier, open, onClose, onSelectProvider }: Props) {
  if (!open || !dossier) return null;
  const band = BAND_STYLE[dossier.actionabilityBand] ?? BAND_STYLE.watch;
  const svc = dossier.serviceCategory as TranspoServiceCategory;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 450, background: "rgba(28,25,23,0.45)", display: "flex", justifyContent: "flex-end" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(560px, 100vw)", height: "100%", background: "#fff", borderLeft: "1px solid #e7e5e4", overflow: "auto", padding: "20px 22px 40px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>{dossier.county}, {dossier.state}</h2>
            <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 6px" }}>{SERVICE_CATEGORY_LABELS[svc] ?? dossier.serviceCategory}</p>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: band.fg, background: band.bg }}>
              Actionability {dossier.actionabilityScore} ({dossier.actionabilityBand})
            </span>
          </div>
          <button type="button" onClick={onClose} style={{ border: "1px solid #e7e5e4", background: "#fafaf9", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>COUNTY OVERVIEW</div>
        <Row label="Population" value={dossier.population?.toLocaleString() ?? "—"} />
        <Row label="Seniors" value={dossier.seniors?.toLocaleString() ?? "—"} />
        <Row label="Veterans" value={dossier.veterans?.toLocaleString() ?? "—"} />
        <Row label="Medicaid est." value={dossier.medicaidPopulation?.toLocaleString() ?? "—"} />
        <Row label="Rurality" value={dossier.rurality ?? "—"} />

        <div style={{ marginTop: 14, fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>DEFICITS & CONFIDENCE</div>
        <Row label="Gap score" value={dossier.deficitScore} />
        <Row label="Confidence" value={dossier.confidenceScore} />
        <Row label="Payer presence" value={dossier.payerPresenceScore} />
        <Row label="Providers" value={dossier.providerCount} />
        <Row label="Recommended play" value={dossier.recommendedPlay} />

        <div style={{ marginTop: 14, fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>PAYERS</div>
        {dossier.payers.length === 0 ? <p style={{ fontSize: 12, color: "#78716c" }}>No payer records matched.</p> : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {dossier.payers.map((p) => <li key={p.name}>{p.name} ({p.sourceStatus})</li>)}
          </ul>
        )}
        {dossier.brokerName ? <Row label="Broker" value={dossier.brokerName} /> : null}

        <div style={{ marginTop: 14, fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>PROVIDERS</div>
        {dossier.providers.length === 0 ? (
          <p style={{ fontSize: 12, color: "#b91c1c" }}>Zero providers in dossier — red-dot market.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {dossier.providers.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => onSelectProvider?.(p.providerId)}
                style={{ textAlign: "left", border: "1px solid #e7e5e4", borderRadius: 8, padding: "8px 10px", background: "#fafaf9", cursor: "pointer" }}
              >
                <div style={{ fontWeight: 700, fontSize: 12 }}>{p.companyName}</div>
                <div style={{ fontSize: 11, color: "#78716c" }}>Contactability {p.contactabilityScore} · {p.phone ?? "no phone"}</div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>EVIDENCE</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: "#57534e" }}>
          {dossier.evidence.slice(0, 12).map((e) => <li key={e}>{e}</li>)}
        </ul>

        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <PromoteToActionQueueButton
            county={dossier.county}
            state={dossier.state}
            serviceCategory={dossier.serviceCategory}
            countyOpportunityId={dossier.id}
          />
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <Link href={`/admin/intelligence/transpo/provider-dossiers?county=${encodeURIComponent(dossier.county)}&state=${dossier.state}`} style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>
            All providers →
          </Link>
          <Link href="/admin/intelligence/transpo/service-deficits" style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>
            Service deficits →
          </Link>
        </div>
      </div>
    </div>
  );
}
