"use client";

import { useEffect, useCallback, useState } from "react";
import { BookingProviderPill } from "./BookingProviderPill";
import { BookingProviderSourceChip } from "./BookingProviderSourceChip";
import { AdvancedIntelligenceSection } from "./AdvancedIntelligenceSection";
import { bookingProviderForDisplay } from "@/lib/intelligence/salon/gg-booking-display";
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
    providerResolverReason?: string;
    providerDiscoveryDebug?: ProspectRecord["providerDiscoveryDebug"];
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

type PresencePayload = {
  identity?: {
    displayName?: string;
    extractedPersonName?: string;
    extractedBusinessName?: string;
    extractedKeywords?: string[];
    searchQueries?: string[];
    city?: string;
    state?: string;
  };
  results?: Array<{
    source: string;
    urlType: string;
    url: string;
    provider?: string;
    confidence: number;
    evidence?: string[];
  }>;
  bestProvider?: {
    provider: string;
    source: string;
    confidence: number;
    bookingUrl: string;
    evidence?: string[];
  };
  diagnostics?: { errors?: string[]; searchMessage?: string };
};

export function SalonProspectDrawer({ prospectId, open, onClose }: Props) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [presence, setPresence] = useState<PresencePayload | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!prospectId) return;
    setLoading(true);
    setPresence(null);
    try {
      const res = await fetch(
        `/api/admin/intelligence/salon/prospects/${encodeURIComponent(prospectId)}/detail`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as DetailResponse & { publicPresence?: PresencePayload };
      if (json.ok) {
        setData(json);
        if (json.publicPresence) setPresence(json.publicPresence);
      }
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
  const bookingDisplay = p ? bookingProviderForDisplay(p) : null;

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
            {p?.identity.locationGuess ? (
              <div style={{ fontSize: 11, color: "#78716c", marginTop: 4 }}>
                {p.identity.locationGuess}
              </div>
            ) : null}
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
                  provider={bookingDisplay?.bookingProvider}
                  label={bookingDisplay?.bookingProviderLabel}
                  bookingUrl={bookingDisplay?.bookingUrl}
                  showImportChip={Boolean(bookingDisplay?.bookingProvider)}
                />
                <BookingProviderSourceChip prospect={p} />
              </div>
              <Row label="Confidence">{na(p.bookingProviderConfidence)}</Row>
              <Row label="Booking URL"><ExternalLink href={bookingDisplay?.bookingUrl ?? p.bookingUrl} /></Row>
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
                GG VALIDATION
              </div>
              <Row label="Status">{na(p.ggValidationStatus ?? "not_attempted")}</Row>
              <Row label="Validated URL"><ExternalLink href={p.ggValidatedUrl} /></Row>
              <Row label="Final URL"><ExternalLink href={p.ggValidatedUrl ?? p.bookingUrl} /></Row>
              <Row label="Candidate URLs checked">
                {(p.ggCandidateUrls ?? p.ggCheckedUrls ?? []).length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {(p.ggCandidateUrls ?? p.ggCheckedUrls ?? []).slice(0, 12).map((u) => (
                      <li key={u} style={{ fontSize: 11 }}>
                        <ExternalLink href={u} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  "Not available"
                )}
              </Row>
              <Row label="Reason">
                {na(p.ggResolverReason ?? p.providerResolverReason)}
              </Row>
              {p.bookingProvider === "glossgenius" &&
              p.ggValidationStatus &&
              p.ggValidationStatus !== "confirmed_client_page" ? (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "#b45309",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  GlossGenius is not shown as confirmed provider — status is{" "}
                  <strong>{p.ggValidationStatus}</strong>. Candidates remain in diagnostics only.
                </div>
              ) : null}
            </section>

            {presence ? (
              <section style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
                  PUBLIC PRESENCE
                </div>
                {presence.identity ? (
                  <>
                    <Row label="Person name">{na(presence.identity.extractedPersonName)}</Row>
                    <Row label="Business name">{na(presence.identity.extractedBusinessName)}</Row>
                    <Row label="Keywords">
                      {(presence.identity.extractedKeywords ?? []).join(", ") || "Not available"}
                    </Row>
                    <Row label="Search queries">
                      {(presence.identity.searchQueries ?? []).length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {(presence.identity.searchQueries ?? []).map((q) => (
                            <li key={q} style={{ fontSize: 11 }}>{q}</li>
                          ))}
                        </ul>
                      ) : (
                        "Not available"
                      )}
                    </Row>
                  </>
                ) : null}
                {presence.bestProvider ? (
                  <>
                    <Row label="Best provider">{na(presence.bestProvider.provider)}</Row>
                    <Row label="Source">{na(presence.bestProvider.source)}</Row>
                    <Row label="Confidence">{na(presence.bestProvider.confidence)}</Row>
                    <Row label="Booking URL">
                      <ExternalLink href={presence.bestProvider.bookingUrl} />
                    </Row>
                  </>
                ) : (
                  <Row label="Provider decision">
                    {p.bookingProvider
                      ? `${p.bookingProvider} (${p.bookingProviderSource ?? "unknown"})`
                      : "No provider"}
                  </Row>
                )}
                <Row label="Presence URLs">
                  {(presence.results ?? []).length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {(presence.results ?? []).slice(0, 12).map((r) => (
                        <li key={`${r.source}-${r.url}`} style={{ fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: "#78716c" }}>{r.urlType}</span> ·{" "}
                          <ExternalLink href={r.url} label={r.url.slice(0, 40)} />
                          {r.provider ? ` · ${r.provider}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "Not available"
                  )}
                </Row>
                {(presence.diagnostics?.errors ?? []).length > 0 ? (
                  <Row label="Errors">{(presence.diagnostics?.errors ?? []).join("; ")}</Row>
                ) : null}
              </section>
            ) : null}

            <section style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.06em", marginBottom: 8 }}>
                PROVIDER DISCOVERY DEBUG
              </div>
              {(() => {
                const dbg =
                  p.providerDiscoveryDebug ?? data?.notes?.providerDiscoveryDebug;
                const scanned = [
                  ...(dbg?.directUrlsScanned ?? []),
                  ...(dbg?.linkTrailUrlsScanned ?? lt?.linkTrailUrlsScanned ?? []),
                ];
                const uniqueScanned = Array.from(new Set(scanned));
                return (
                  <>
                    <Row label="URLs scanned">
                      {uniqueScanned.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {uniqueScanned.slice(0, 15).map((u) => (
                            <li key={u} style={{ fontSize: 11 }}>
                              <ExternalLink href={u} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "Not available"
                      )}
                    </Row>
                    <Row label="Link-in-bio fetched?">
                      {dbg?.linkInBioFetched ?? lt?.linkInBioPageFetched ? "Yes" : "No"}
                    </Row>
                    <Row label="Detection source">
                      {dbg?.providerDetectedFromDirect
                        ? "Direct URL"
                        : dbg?.providerDetectedFromLinkTrail
                          ? "Link trail"
                          : p.bookingProviderSource
                            ? na(p.bookingProviderSource)
                            : "Not available"}
                    </Row>
                    <Row label="GG checked URLs">
                      {((dbg?.ggCheckedUrls ?? p.ggCheckedUrls ?? data?.notes?.ggCheckedUrls) ?? [])
                        .length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {(dbg?.ggCheckedUrls ?? p.ggCheckedUrls ?? [])
                            .slice(0, 12)
                            .map((u) => (
                              <li key={u} style={{ fontSize: 11 }}>
                                <ExternalLink href={u} />
                              </li>
                            ))}
                        </ul>
                      ) : (
                        "Not available"
                      )}
                    </Row>
                    <Row label="Reason">
                      {na(
                        p.providerResolverReason ??
                          dbg?.providerResolverReason ??
                          p.ggResolverReason,
                      )}
                    </Row>
                    <Row label="GG resolver status">
                      {na(p.ggResolverStatus ?? data?.notes?.ggResolverStatus)}
                    </Row>
                  </>
                );
              })()}
            </section>

            <AdvancedIntelligenceSection
              prospect={p}
              recommendedPlay={data?.opportunity?.recommendedPlay}
              opportunityNotes={(p.classificationNotes ?? []).join(" · ") || undefined}
            />

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
