"use client";

import { useEffect, useCallback, useState } from "react";
import { BookingProviderPill } from "./BookingProviderPill";
import { BookingProviderSourceChip } from "./BookingProviderSourceChip";
import type { ProspectRecord } from "@/lib/studios/prospects/types";

type DetailResponse = {
  ok: boolean;
  prospect?: ProspectRecord;
  providerDetection?: {
    providerLabel?: string;
    bookingProviderSource?: string;
    glossGeniusStatusLabel?: string;
    linkTrailUrlsScanned?: string[];
    evidence?: string[];
    bestUrl?: string;
    linkInBioUrl?: string;
    bioUrl?: string;
    linkInBioPageFetched?: boolean;
  };
  linkTrail?: {
    bioUrl?: string;
    bestUrl?: string;
    linkInBioUrl?: string;
    linkTrailUrlsScanned?: string[];
    linkInBioPageFetched?: boolean;
  };
  opportunity?: {
    tags?: string[];
    recommendedPlay?: string | null;
    importCandidate?: boolean;
    score?: number | null;
    relationshipLabel?: string | null;
  };
  notes?: {
    reasonLabel?: string;
    glossGeniusStatus?: string;
    ggResolverStatus?: string;
    ggResolverReason?: string;
    ggCheckedUrls?: string[];
    noUrl?: boolean;
    noProvider?: boolean;
  };
  sourceLinks?: {
    instagram?: string;
    booking?: string;
    linkInBio?: string;
    website?: string;
  };
};

type Props = {
  prospectId: string | null;
  open: boolean;
  onClose: () => void;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#44403c", lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

function ExternalLink({ href, label }: { href?: string | null; label?: string }) {
  if (!href) return <span>Not available</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#0284c7" }}>
      {label ?? href}
    </a>
  );
}

function na(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "Not available";
  return String(value);
}

export function SalonProspectDrawer({ prospectId, open, onClose }: Props) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!prospectId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/intelligence/salon/prospects/${encodeURIComponent(prospectId)}/detail`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as DetailResponse;
      if (json.ok) setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [prospectId]);

  useEffect(() => {
    if (open && prospectId) load();
    if (!open) setData(null);
  }, [open, prospectId, load]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const p = data?.prospect;
  const pd = data?.providerDetection;
  const lt = data?.linkTrail;

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(28,25,23,0.35)",
          zIndex: 90,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          background: "#fafaf9",
          borderLeft: "1px solid #e7e5e4",
          zIndex: 91,
          overflowY: "auto",
          padding: "20px 18px 32px",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917" }}>
              @{p?.identity.handle ?? prospectId}
            </div>
            <div style={{ fontSize: 13, color: "#57534e" }}>{p?.identity.name ?? "Not available"}</div>
            <div style={{ fontSize: 11, color: "#78716c", marginTop: 4 }}>
              {na(p?.identity.locationGuess)} · Score {na(p?.overallOpportunityScore)}
            </div>
            {data?.opportunity?.importCandidate ? (
              <span
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  fontSize: 10,
                  fontWeight: 800,
                  background: "#ecfdf5",
                  color: "#166534",
                  padding: "3px 8px",
                  borderRadius: 20,
                }}
              >
                Import Candidate
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #e7e5e4",
              background: "#fff",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Close
          </button>
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: "#78716c" }}>Loading…</div>
        ) : !p ? (
          <div style={{ fontSize: 12, color: "#78716c" }}>Not available</div>
        ) : (
          <>
            <section style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
                INSTAGRAM IDENTITY
              </div>
              <Row label="Username">@{p.identity.handle}</Row>
              <Row label="Display name">{na(p.identity.name)}</Row>
              <Row label="Category">{na(p.identity.categoryGuess)}</Row>
              <Row label="Profile URL">
                <ExternalLink href={data?.sourceLinks?.instagram} />
              </Row>
            </section>

            <section style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
                LINK TRAIL
              </div>
              <Row label="Bio URL"><ExternalLink href={lt?.bioUrl} /></Row>
              <Row label="Best URL"><ExternalLink href={lt?.bestUrl} /></Row>
              <Row label="Link-in-bio URL"><ExternalLink href={lt?.linkInBioUrl} /></Row>
              <Row label="Link-in-bio fetched">{lt?.linkInBioPageFetched ? "Yes" : "No"}</Row>
              <Row label="Scanned URLs">
                {(lt?.linkTrailUrlsScanned ?? []).length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {(lt?.linkTrailUrlsScanned ?? []).slice(0, 12).map((u) => (
                      <li key={u} style={{ fontSize: 11 }}>
                        <ExternalLink href={u} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  "Not available"
                )}
              </Row>
            </section>

            <section style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
                BOOKING PROVIDER
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                <BookingProviderPill
                  provider={p.bookingProvider}
                  label={p.bookingProviderLabel}
                  bookingUrl={p.bookingUrl}
                  showImportChip
                />
                <BookingProviderSourceChip prospect={p} />
              </div>
              <Row label="Confidence">{na(p.bookingProviderConfidence)}</Row>
              <Row label="Booking URL"><ExternalLink href={p.bookingUrl} /></Row>
              <Row label="Evidence">
                {(p.bookingProviderEvidence ?? []).length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {(p.bookingProviderEvidence ?? []).map((e) => (
                      <li key={e} style={{ fontSize: 11 }}>{e}</li>
                    ))}
                  </ul>
                ) : (
                  "Not available"
                )}
              </Row>
              <Row label="GlossGenius status">{na(pd?.glossGeniusStatusLabel ?? data?.notes?.glossGeniusStatus)}</Row>
            </section>

            <section style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
                GG RESOLVER
              </div>
              <Row label="GG Resolver Status">{na(p.ggResolverStatus ?? data?.notes?.ggResolverStatus)}</Row>
              <Row label="Reason">{na(p.ggResolverReason ?? data?.notes?.ggResolverReason)}</Row>
              <Row label="Checked URLs">
                {((p.ggCheckedUrls ?? data?.notes?.ggCheckedUrls) ?? []).length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {((p.ggCheckedUrls ?? data?.notes?.ggCheckedUrls) ?? []).slice(0, 20).map((u) => (
                      <li key={u} style={{ fontSize: 11 }}>
                        <ExternalLink href={u} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  "Not available"
                )}
              </Row>
            </section>

            <section style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
                OPPORTUNITY
              </div>
              <Row label="Tags">
                {(data?.opportunity?.tags ?? []).length > 0
                  ? (data?.opportunity?.tags ?? []).join(", ")
                  : "Not available"}
              </Row>
              <Row label="Recommended play">{na(data?.opportunity?.recommendedPlay)}</Row>
              <Row label="Relationship">{na(data?.opportunity?.relationshipLabel)}</Row>
            </section>

            <section style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
                NOTES / DIAGNOSTICS
              </div>
              <Row label="Detection">{na(data?.notes?.reasonLabel)}</Row>
              <Row label="No URL">{data?.notes?.noUrl ? "Yes" : "No"}</Row>
              <Row label="No provider">{data?.notes?.noProvider ? "Yes" : "No"}</Row>
              <Row label="GG checked URLs">
                {(data?.notes?.ggCheckedUrls ?? []).length > 0
                  ? (data?.notes?.ggCheckedUrls ?? []).join(", ")
                  : "Not available"}
              </Row>
            </section>

            <section>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
                SOURCE LINKS
              </div>
              <Row label="Instagram"><ExternalLink href={data?.sourceLinks?.instagram} /></Row>
              <Row label="Booking"><ExternalLink href={data?.sourceLinks?.booking} /></Row>
              <Row label="Link-in-bio"><ExternalLink href={data?.sourceLinks?.linkInBio} /></Row>
              <Row label="Website"><ExternalLink href={data?.sourceLinks?.website} /></Row>
            </section>
          </>
        )}
      </aside>
    </>
  );
}
