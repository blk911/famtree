"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { TranspoProviderDossier } from "@/lib/intelligence/transpo/provider-dossiers/dossier-types";

type Props = {
  dossier: TranspoProviderDossier | null;
  open: boolean;
  onClose: () => void;
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, fontSize: 12, marginBottom: 8 }}>
      <span style={{ color: "#a8a29e", fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#44403c" }}>{value}</span>
    </div>
  );
}

export function ProviderDossierDrawer({ dossier, open, onClose }: Props) {
  if (!open || !dossier) return null;

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
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>{dossier.companyName}</h2>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#4338ca", background: "#eef2ff" }}>
              Contactability {dossier.contactabilityScore} ({dossier.contactabilityBand})
            </span>
          </div>
          <button type="button" onClick={onClose} style={{ border: "1px solid #e7e5e4", background: "#fafaf9", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>COMPANY OVERVIEW</div>
        <Row label="DOT" value={dossier.dotNumber ?? "—"} />
        <Row label="MC" value={dossier.mcNumber ?? "—"} />
        <Row label="Authority" value={dossier.authorityStatus ?? "—"} />

        <div style={{ marginTop: 14, fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>CONTACT</div>
        <Row label="Phone" value={dossier.phone ? <a href={`tel:${dossier.phone}`}>{dossier.phone}</a> : "—"} />
        <Row label="Email" value={dossier.email ? <a href={`mailto:${dossier.email}`}>{dossier.email}</a> : "—"} />
        <Row label="Website" value={dossier.website ? <a href={dossier.website} target="_blank" rel="noreferrer">{dossier.website}</a> : "—"} />

        <div style={{ marginTop: 14, fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>LOCATION</div>
        <Row label="Address" value={dossier.address ?? "—"} />
        <Row label="City" value={dossier.city ?? "—"} />
        <Row label="County" value={dossier.county ?? "—"} />
        <Row label="State" value={dossier.state ?? "—"} />

        <div style={{ marginTop: 14, fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>VERIFICATION</div>
        <Row label="Status" value={dossier.verificationStatus} />
        <Row label="Score" value={dossier.verificationScore ?? "—"} />
        <Row label="Google" value={dossier.googlePlaceId ? `${dossier.googleRating ?? "—"}★ (${dossier.googleReviewCount ?? 0} reviews)` : "—"} />

        <div style={{ marginTop: 14, fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>OPERATIONS</div>
        <Row label="Fleet" value={dossier.fleetSize ?? "—"} />
        <Row label="Drivers" value={dossier.driverCount ?? "—"} />
        <Row label="Categories" value={dossier.serviceCategories.join(", ")} />
        <Row label="Counties served" value={dossier.countiesServed.join(", ") || "—"} />
        <Row label="Payer signals" value={dossier.payerSignals.join("; ") || "—"} />
        <Row label="Years observed" value={dossier.yearsObserved ?? "—"} />
        <Row label="Sources" value={dossier.sourceCount} />

        <div style={{ marginTop: 14, fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>EVIDENCE TIMELINE</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: "#57534e" }}>
          {dossier.evidence.map((e, i) => (
            <li key={`${e.type}-${i}`}>
              <strong>{e.type}</strong> ({e.source}): {e.value}
              {e.sourceUrl ? <> — <a href={e.sourceUrl} target="_blank" rel="noreferrer">source</a></> : null}
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 16 }}>
          <Link href={`/admin/intelligence/transpo/service-deficits?county=${encodeURIComponent(dossier.county ?? "")}&state=${dossier.state ?? "CO"}`} style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>
            View service deficits for {dossier.county ?? "market"} →
          </Link>
        </div>
      </div>
    </div>
  );
}
