import Link from "next/link";
import { MarketIntelNav } from "@/components/admin/MarketIntelNav";
import { MarketsCandidateTable } from "@/components/admin/markets/MarketsCandidateTable";
import type { MarketCandidatesArtifact } from "@/lib/markets/types";
import type { SolaMarketsHubStats } from "@/lib/operators/sources/sola/markets-hub-stats";

const card = {
  background: "white",
  borderRadius: "16px",
  border: "1px solid #ece9e3",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

type SourceCard = {
  title: string;
  subtitle: string;
  href: string;
  pipeline?: string;
  stats?: Array<{ label: string; value: string | number }>;
};

type Props = {
  solaStats: SolaMarketsHubStats;
  registry: MarketCandidatesArtifact | null;
};

function SourceMarketCard({ title, subtitle, href, pipeline, stats }: SourceCard) {
  return (
    <Link
      href={href}
      style={{
        ...card,
        display: "block",
        padding: "18px 20px",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{title}</div>
      <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 12px", lineHeight: 1.5 }}>{subtitle}</p>
      {pipeline ? (
        <p style={{ fontSize: 11, color: "#57534e", margin: "0 0 12px", lineHeight: 1.45 }}>{pipeline}</p>
      ) : null}
      {stats && stats.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: 8,
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#fafaf9",
                border: "1px solid #f0ede8",
                borderRadius: 10,
                padding: "8px 10px",
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 800, color: "#a8a29e", textTransform: "uppercase" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", marginTop: 2 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

export function MarketsHub({ solaStats, registry }: Props) {
  const solaRegistryCount = registry?.sources.sola?.count ?? 0;
  const ggenRegistryCount = registry?.sources.glossgenius?.count ?? 0;
  const ggenRegistryMeta = registry?.sources.glossgenius;

  const sources: SourceCard[] = [
    {
      title: "Sola",
      subtitle: "443 Colorado suite operators",
      href: "/admin/markets/sola",
      pipeline: "Sola → resolver import → review → export targets",
      stats: solaStats.available
        ? [
            { label: "Total", value: solaStats.total },
            { label: "Live verified", value: solaStats.liveVerified },
            { label: "Avg acquire", value: solaStats.avgAcquisition },
            { label: "Reviewed", value: solaStats.reviewedCount },
          ]
        : [{ label: "Status", value: "Import missing" }],
    },
    {
      title: "GG Seed Discovery",
      subtitle: "GGseed discovery from business names and public search",
      href: "/admin/studios/ggen-discovery",
      pipeline: "Seed text → GlossGenius probe → prospect promotion",
      stats:
        ggenRegistryCount > 0
          ? [
              { label: "Registry", value: ggenRegistryCount },
              {
                label: "Imported",
                value: new Date(ggenRegistryMeta!.lastImportedAt).toLocaleDateString(),
              },
            ]
          : [{ label: "Registry", value: ggenRegistryCount }],
    },
    {
      title: "StyleSeat",
      subtitle: "StyleSeat operator discovery and market intelligence runs",
      href: "/admin/studios/styleseat",
      pipeline: "Market crawl → resolver → prospect persistence",
    },
    {
      title: "Instagram",
      subtitle: "Hashtag harvest and IG stub resolver for salon operators",
      href: "/admin/studios/creator-lab/ig-stubs",
      pipeline: "Hashtag harvest → IG resolver → prospects",
    },
  ];

  return (
    <div style={{ padding: "28px 20px 60px", maxWidth: 1320, margin: "0 auto" }}>
      <MarketIntelNav />

      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Markets</h1>
      <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 8px", lineHeight: 1.55 }}>
        Unified operator registry across market sources. Source cards link to harvest/detail tools;
        the table below is the primary workbench.
      </p>
      {registry ? (
        <p style={{ fontSize: 12, color: "#57534e", margin: "0 0 24px" }}>
          Registry: {registry.total} candidates · generated {new Date(registry.generatedAt).toLocaleString()}
          {solaRegistryCount > 0 ? ` · Sola: ${solaRegistryCount}` : null}
          {ggenRegistryCount > 0 ? ` · GlossGenius: ${ggenRegistryCount}` : null}
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "#b45309", margin: "0 0 24px" }}>
          No unified registry yet. Run <code>npm run build:markets</code>.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
          marginBottom: 8,
        }}
      >
        {sources.map((source) => (
          <SourceMarketCard key={source.href} {...source} />
        ))}
      </div>

      {registry && registry.candidates.length > 0 ? (
        <MarketsCandidateTable candidates={registry.candidates} />
      ) : null}
    </div>
  );
}
