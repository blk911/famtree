"use client";
// components/admin/intelligence/salon/ProviderDetectionDetail.tsx

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import {
  analyzeProspectProviderDetection,
  type ProspectProviderDetectionDiagnostics,
} from "@/lib/intelligence/salon/provider-detection-diagnostics";
import { BookingProviderPill } from "./BookingProviderPill";

type Props = {
  prospect: ProspectRecord;
  /** compact = table hover card; panel = expanded detail block */
  variant?: "compact" | "panel";
  diagnostics?: ProspectProviderDetectionDiagnostics;
};

function UrlLine({ label, url }: { label: string; url?: string }) {
  if (!url) {
    return (
      <div style={{ fontSize: 10, color: "#a8a29e" }}>
        <strong>{label}:</strong> —
      </div>
    );
  }
  return (
    <div style={{ fontSize: 10, color: "#57534e", lineHeight: 1.45 }}>
      <strong>{label}:</strong>{" "}
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#0284c7" }}>
        {url}
      </a>
    </div>
  );
}

export function ProviderDetectionDetail({
  prospect,
  variant = "panel",
  diagnostics: diagnosticsProp,
}: Props) {
  const d = diagnosticsProp ?? analyzeProspectProviderDetection(prospect);
  const isCompact = variant === "compact";

  const boxStyle: React.CSSProperties = isCompact
    ? {
        maxWidth: 360,
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        fontSize: 10,
        lineHeight: 1.45,
      }
    : {
        background: "#fafaf9",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        padding: "12px 14px",
        marginTop: 8,
      };

  return (
    <div style={boxStyle}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
        PROVIDER DETECTION
      </div>
      <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {d.outcome === "detected" ? (
          <BookingProviderPill
            provider={d.provider}
            label={d.providerLabel}
            bookingUrl={d.bestUrl}
            sourceHint={
              d.provider === "glossgenius" && d.bookingProviderSource === "handle_derived"
                ? "(Handle Match)"
                : null
            }
            showImportChip
          />
        ) : (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#b45309" }}>{d.reasonLabel}</span>
        )}
      </div>
      <UrlLine label="Bio (IG profile)" url={d.bioUrl} />
      <UrlLine label="Best URL" url={d.bestUrl} />
      <UrlLine label="Link-in-bio URL" url={d.linkInBioUrl} />
      <div style={{ fontSize: 10, color: "#57534e", marginTop: 4 }}>
        <strong>Link-in-bio fetched:</strong> {d.linkInBioPageFetched ? "Yes" : "No"}
      </div>
      <div style={{ fontSize: 10, color: "#57534e", marginTop: 4 }}>
        <strong>GlossGenius:</strong>{" "}
        <span style={{ fontWeight: 700, color: d.glossGeniusStatus === "gg_not_found" ? "#b45309" : "#15803d" }}>
          {d.glossGeniusStatusLabel}
        </span>
      </div>
      {d.linkTrailUrlsScanned.length > 0 ? (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#78716c", marginBottom: 3 }}>
            Link trail scanned ({d.linkTrailUrlsScanned.length})
          </div>
          <div style={{ maxHeight: isCompact ? 80 : 120, overflowY: "auto" }}>
            {d.linkTrailUrlsScanned.slice(0, isCompact ? 6 : 12).map((url) => (
              <div key={url} style={{ fontSize: 9, fontFamily: "monospace", marginBottom: 2 }}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#0284c7" }}>
                  {url}
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {d.evidence.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: "#78716c" }}>
          <strong>Evidence:</strong>
          {d.evidence.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      )}
      {d.bioUrl && (
        <div style={{ marginTop: 6, fontSize: 9, color: "#a8a29e" }}>
          IG bio external URL is not scraped; detection uses resolver candidates and matched URLs only.
        </div>
      )}
    </div>
  );
}
