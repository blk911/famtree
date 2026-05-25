// app/(app)/admin/studios/creator-lab/[creatorId]/page.tsx
// AI Assembled Studio detail view — internal review page.
// Server component: loads JSON from disk, no client-side fetch.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCreatorStudio } from "@/lib/studios/creator-lab/store";
import type { AssembledCreatorStudio } from "@/lib/studios/creator-lab/types";

export const dynamic = "force-dynamic";

interface Props {
  params: { creatorId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const studio = await loadCreatorStudio(params.creatorId);
  return {
    title: studio ? `${studio.suggestedStudioName} — Creator Lab` : "Creator Lab",
  };
}

// ─── Style primitives ─────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "white",
  borderRadius: 16,
  border: "1px solid #ece9e3",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  padding: "24px 28px",
};

const section = (label: string) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
    {label}
  </div>
);

const chip = (text: string, color = "#f5f5f4", textColor = "#57534e") => (
  <span
    key={text}
    style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 500,
      background: color,
      color: textColor,
      margin: "2px 4px 2px 0",
    }}
  >
    {text}
  </span>
);

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  assembled:      { bg: "#dbeafe", color: "#1e40af" },
  pending_review: { bg: "#fef3c7", color: "#92400e" },
  approved:       { bg: "#d1fae5", color: "#065f46" },
  rejected:       { bg: "#fee2e2", color: "#991b1b" },
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "#22c55e", medium: "#f59e0b", low: "#ef4444",
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: "📸", etsy: "🛍️", shopify: "🏪",
  squarespace: "⬛", wix: "🌐", bigcartel: "🎨",
  website: "🌎", unknown: "❓",
};

// ─── Section components ───────────────────────────────────────────────────────

function IdentitySection({ studio }: { studio: AssembledCreatorStudio }) {
  const { identity, styleProfile, vertical } = studio;
  return (
    <div style={card}>
      {section("Identity")}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {/* Hero image */}
        {studio.suggestedHeroImageUrl && (
          <img
            src={studio.suggestedHeroImageUrl}
            alt={identity.name}
            style={{ width: 100, height: 100, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
            {studio.suggestedStudioName}
          </h2>
          <div style={{ fontSize: 14, color: "#78716c", marginBottom: 8 }}>
            {identity.handle && <span style={{ marginRight: 12 }}>{identity.handle}</span>}
            {identity.locationGuess && <span>📍 {identity.locationGuess}</span>}
          </div>
          <div style={{ fontSize: 13, color: "#57534e", fontStyle: "italic", marginBottom: 12 }}>
            "{studio.suggestedTagline}"
          </div>
          <div style={{ marginBottom: 8 }}>
            {chip(vertical.replace("_", " "), "#f0fdf4", "#166534")}
            {styleProfile.priceRange && chip(styleProfile.priceRange, "#fef9c3", "#713f12")}
          </div>
          <div style={{ fontSize: 14, color: "#57534e", lineHeight: 1.65 }}>
            {identity.shortBio}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: "14px 16px", background: "#f9fafb", borderRadius: 10, fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
        {identity.longBio}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>Categories</div>
        <div>{studio.suggestedCategories.map((c) => chip(c, "#ede9fe", "#5b21b6"))}</div>
      </div>
    </div>
  );
}

function StyleSection({ studio }: { studio: AssembledCreatorStudio }) {
  const { styleProfile } = studio;
  return (
    <div style={card}>
      {section("Style Profile")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>Aesthetic</div>
          <div>{styleProfile.aesthetic.map((a) => chip(a, "#fce7f3", "#9d174d"))}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>Medium / Materials</div>
          <div>{styleProfile.medium.map((m) => chip(m, "#e0f2fe", "#075985"))}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>Audience</div>
          <div>{styleProfile.audienceGuess.map((a) => chip(a, "#f0fdf4", "#166534"))}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>Tags</div>
          <div>{styleProfile.tags.map((t) => chip(`#${t}`, "#f5f5f4", "#44403c"))}</div>
        </div>
      </div>
    </div>
  );
}

function MonetizationSection({ studio }: { studio: AssembledCreatorStudio }) {
  const { monetization } = studio;
  return (
    <div style={card}>
      {section("Monetization")}
      {monetization.primaryModel && (
        <div style={{ marginBottom: 12 }}>
          {chip(monetization.primaryModel, "#fef3c7", "#92400e")}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>Observed Signals</div>
          <ul style={{ margin: 0, padding: "0 0 0 16px", color: "#57534e", fontSize: 13, lineHeight: 1.8 }}>
            {monetization.signals.map((s, i) => <li key={i}>{s}</li>)}
            {monetization.signals.length === 0 && <li style={{ color: "#a8a29e" }}>None detected</li>}
          </ul>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>Opportunities</div>
          <ul style={{ margin: 0, padding: "0 0 0 16px", color: "#15803d", fontSize: 13, lineHeight: 1.8 }}>
            {monetization.opportunities.map((o, i) => <li key={i}>{o}</li>)}
            {monetization.opportunities.length === 0 && <li style={{ color: "#a8a29e" }}>None identified</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CollectionsSection({ studio }: { studio: AssembledCreatorStudio }) {
  if (studio.collections.length === 0) return null;
  return (
    <div style={card}>
      {section(`Collections (${studio.collections.length})`)}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {studio.collections.map((col, i) => (
          <div
            key={i}
            style={{
              padding: "14px 16px",
              background: "#f9fafb",
              borderRadius: 10,
              border: "1px solid #f0ede8",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917", marginBottom: 4 }}>
              {col.name}
              {col.estimatedItemCount != null && (
                <span style={{ fontSize: 11, color: "#a8a29e", fontWeight: 400, marginLeft: 6 }}>
                  ~{col.estimatedItemCount}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#78716c", lineHeight: 1.5 }}>
              {col.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalsSection({ studio }: { studio: AssembledCreatorStudio }) {
  const { signals } = studio;
  const hasProducts = signals.productSignals.length > 0;
  const hasEvents = signals.eventSignals.length > 0;
  const hasCommissions = signals.commissionSignals.length > 0;
  const hasClasses = signals.classWorkshopSignals.length > 0;

  return (
    <div style={card}>
      {section("Raw Signals")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Products */}
        <div>
          <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>
            Products ({signals.productSignals.length})
          </div>
          {hasProducts ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {signals.productSignals.slice(0, 5).map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "#57534e", padding: "6px 10px", background: "#f9fafb", borderRadius: 6 }}>
                  <span style={{ fontWeight: 600 }}>{p.title.slice(0, 50)}</span>
                  {p.price && <span style={{ color: "#78716c", marginLeft: 6 }}>{p.price}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#a8a29e" }}>None detected</div>
          )}
        </div>

        {/* Bio candidates */}
        <div>
          <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>
            Bio Candidates ({signals.bioCandidates.length})
          </div>
          {signals.bioCandidates.slice(0, 3).map((b, i) => (
            <div key={i} style={{ fontSize: 12, color: "#57534e", padding: "6px 10px", background: "#f9fafb", borderRadius: 6, marginBottom: 4, lineHeight: 1.5 }}>
              {b.slice(0, 120)}{b.length > 120 ? "…" : ""}
            </div>
          ))}
        </div>

        {/* Events */}
        {hasEvents && (
          <div>
            <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>
              Events / Workshops ({signals.eventSignals.length})
            </div>
            {signals.eventSignals.slice(0, 3).map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: "#57534e", padding: "6px 10px", background: "#f9fafb", borderRadius: 6, marginBottom: 4 }}>
                {e.title.slice(0, 80)}
                {e.date && <span style={{ color: "#a8a29e", marginLeft: 6 }}>{e.date}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Commission / class signals */}
        {(hasCommissions || hasClasses) && (
          <div>
            <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>Commissions / Classes</div>
            {[...signals.commissionSignals.slice(0, 2), ...signals.classWorkshopSignals.slice(0, 2)].map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: "#57534e", padding: "6px 10px", background: "#f9fafb", borderRadius: 6, marginBottom: 4 }}>
                {s.slice(0, 100)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Images preview */}
      {signals.imageUrls.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 8 }}>
            Images detected ({signals.imageUrls.length})
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {signals.imageUrls.slice(0, 12).map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                style={{ width: 60, height: 60, borderRadius: 6, objectFit: "cover", border: "1px solid #ece9e3" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewPanel({ studio }: { studio: AssembledCreatorStudio }) {
  const sc = STATUS_COLORS[studio.status] ?? { bg: "#f5f5f4", color: "#57534e" };
  return (
    <div style={{ ...card, borderLeft: "4px solid #f59e0b" }}>
      {section("Review Panel")}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        {/* Status badge */}
        <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: sc.bg, color: sc.color }}>
          {studio.status.replace("_", " ").toUpperCase()}
        </span>
        {/* Confidence */}
        <span style={{ fontSize: 13, color: "#57534e", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            display: "inline-block", width: 10, height: 10, borderRadius: "50%",
            background: CONFIDENCE_COLOR[studio.confidence],
          }} />
          {studio.confidence} confidence
        </span>
        <span style={{ fontSize: 12, color: "#a8a29e" }}>
          Assembled {new Date(studio.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Review notes */}
      {studio.reviewNotes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>AI Review Notes</div>
          <ul style={{ margin: 0, padding: "0 0 0 16px", color: "#92400e", fontSize: 13, lineHeight: 1.8 }}>
            {studio.reviewNotes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}

      {/* Source info */}
      <div style={{ padding: "12px 14px", background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#57534e" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>{PLATFORM_EMOJI[studio.source.platform]} {studio.source.platform}</span>
          <span>·</span>
          <a href={studio.source.sourceUrl} target="_blank" rel="noopener noreferrer"
            style={{ color: "#1d4ed8", textDecoration: "underline", wordBreak: "break-all" }}>
            {studio.source.sourceUrl}
          </a>
          <span>·</span>
          <span>HTTP {studio.source.httpStatus}</span>
          <span>·</span>
          <span>{Math.round(studio.source.htmlLength / 1024)}KB fetched</span>
        </div>
      </div>

      {/* Action hint */}
      <div style={{ marginTop: 16, fontSize: 13, color: "#78716c" }}>
        This is a draft assembly. Review the profile above, then use admin actions to approve,
        reject, or queue for the public studio directory.
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default async function CreatorStudioDetailPage({ params }: Props) {
  const studio = await loadCreatorStudio(params.creatorId);
  if (!studio) notFound();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px 60px" }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: "#78716c", marginBottom: 20 }}>
        <Link href="/admin/studios" style={{ fontWeight: 700, color: "#1c1917", textDecoration: "none" }}>
          ← Studio Management
        </Link>
        <span style={{ margin: "0 8px", color: "#d6d3d1" }}>|</span>
        <Link href="/admin/studios/creator-lab" style={{ color: "#1c1917", textDecoration: "none" }}>
          Creator Lab
        </Link>
        <span style={{ margin: "0 8px", color: "#d6d3d1" }}>|</span>
        <span>{studio.suggestedStudioName}</span>
      </div>

      {/* Review panel first — flags visible above the fold */}
      <div style={{ marginBottom: 24 }}>
        <ReviewPanel studio={studio} />
      </div>

      {/* Identity */}
      <div style={{ marginBottom: 20 }}>
        <IdentitySection studio={studio} />
      </div>

      {/* Style */}
      <div style={{ marginBottom: 20 }}>
        <StyleSection studio={studio} />
      </div>

      {/* Monetization */}
      <div style={{ marginBottom: 20 }}>
        <MonetizationSection studio={studio} />
      </div>

      {/* Collections */}
      {studio.collections.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <CollectionsSection studio={studio} />
        </div>
      )}

      {/* Raw signals */}
      <div style={{ marginBottom: 20 }}>
        <SignalsSection studio={studio} />
      </div>

      {/* Internal footer */}
      <div style={{ marginTop: 32, fontSize: 12, color: "#d6d3d1", textAlign: "center" }}>
        Creator ID: <code style={{ background: "#f5f5f4", padding: "1px 5px", borderRadius: 4 }}>{studio.creatorId}</code>
        {" · "}
        Stored in <code style={{ background: "#f5f5f4", padding: "1px 5px", borderRadius: 4 }}>
          runtime-data/studios/creator-lab/{studio.creatorId}.json
        </code>
      </div>
    </div>
  );
}
