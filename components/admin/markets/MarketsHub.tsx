import Link from "next/link";
import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import { MarketIntelPageShell } from "@/components/admin/MarketIntelPageShell";
import { MarketsCandidateTable } from "@/components/admin/markets/MarketsCandidateTable";
import type { MarketCandidatesArtifact } from "@/lib/markets/types";
import type { SolaMarketsHubStats } from "@/lib/operators/sources/sola/markets-hub-stats";

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
      className="block rounded-xl border border-stone-200 bg-white p-3.5 text-inherit no-underline shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-1 text-sm font-extrabold text-stone-900">{title}</div>
      <p className="m-0 mb-2 text-xs leading-snug text-stone-500">{subtitle}</p>
      {pipeline ? (
        <p className="m-0 mb-2 text-[11px] leading-snug text-stone-600">{pipeline}</p>
      ) : null}
      {stats && stats.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-stone-100 bg-stone-50 px-2 py-1.5"
            >
              <div className="text-[9px] font-extrabold uppercase text-stone-400">{stat.label}</div>
              <div className="mt-0.5 text-base font-extrabold text-stone-900">{stat.value}</div>
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
    <MarketIntelPageShell>
      <MarketIntelChrome showVerticalFilters={false} showDiscoveryFlow={false} />

      <h1 className="m-0 mb-1 text-xl font-extrabold text-stone-900 sm:text-[22px]">Markets</h1>
      <p className="m-0 mb-2 text-sm leading-snug text-stone-500">
        Unified operator registry across market sources. Source cards link to harvest/detail tools;
        the table below is the primary workbench.
      </p>
      {registry ? (
        <p className="mb-4 text-xs text-stone-600">
          Registry: {registry.total} candidates · generated {new Date(registry.generatedAt).toLocaleString()}
          {solaRegistryCount > 0 ? ` · Sola: ${solaRegistryCount}` : null}
          {ggenRegistryCount > 0 ? ` · GlossGenius: ${ggenRegistryCount}` : null}
        </p>
      ) : (
        <p className="mb-4 text-xs text-amber-700">
          No unified registry yet. Run <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">npm run build:markets</code>.
        </p>
      )}

      <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sources.map((source) => (
          <SourceMarketCard key={source.href} {...source} />
        ))}
      </div>

      {registry && registry.candidates.length > 0 ? (
        <MarketsCandidateTable candidates={registry.candidates} />
      ) : null}
    </MarketIntelPageShell>
  );
}
