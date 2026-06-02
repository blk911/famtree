// lib/intelligence/salon/business-stack/provider-audit.ts

import { filterProspects } from "@/lib/studios/prospects/store";
import { isGgValidationConfirmed } from "../glossgenius-page-validator";
import { SALON_STACK_PROVIDERS, getStackProvider } from "./provider-registry";
import { listBusinessStacks } from "./stack-store";
import type { SalonStackSignalSource } from "./types";

const AUDIT_PROVIDER_IDS = [
  "glossgenius",
  "vagaro",
  "square_appointments",
  "square",
  "booksy",
  "fresha",
  "styleseat",
  "gocheckin",
  "clover",
  "stripe",
  "paypal",
  "squarespace",
  "wix",
  "shopify",
  "google_business",
  "yelp",
  "bbb",
  "meta_pixel",
  "google_analytics",
] as const;

export type ProviderAuditRow = {
  providerId: string;
  label: string;
  category: string;
  count: number;
  directUrlCount: number;
  linkInBioCount: number;
  websiteCrawlCount: number;
  averageConfidence: number;
  sampleUrl?: string;
  sampleProspects: string[];
};

export type ProviderAuditReport = {
  ok: true;
  totalStacks: number;
  totalSignals: number;
  prospectsWithSignals: number;
  providers: ProviderAuditRow[];
};

function sourceBucket(source: SalonStackSignalSource): "direct" | "link" | "crawl" | "other" {
  if (source === "direct_url") return "direct";
  if (source === "link_in_bio") return "link";
  if (source === "website_html" || source === "website_link") return "crawl";
  return "other";
}

export async function buildProviderAuditReport(options?: {
  limit?: number;
  providerFilter?: string;
}): Promise<ProviderAuditReport> {
  const stacks = await listBusinessStacks({ limit: options?.limit ?? 500 });
  const filter = options?.providerFilter?.toLowerCase();

  type Acc = {
    count: number;
    direct: number;
    link: number;
    crawl: number;
    confSum: number;
    sampleUrl?: string;
    handles: Set<string>;
  };

  const byProvider = new Map<string, Acc>();

  for (const id of AUDIT_PROVIDER_IDS) {
    const p = getStackProvider(id) ?? SALON_STACK_PROVIDERS.find((x) => x.id === id);
    if (p) byProvider.set(id, { count: 0, direct: 0, link: 0, crawl: 0, confSum: 0, handles: new Set() });
  }

  let totalSignals = 0;
  let prospectsWithSignals = 0;

  function recordHit(
    providerId: string,
    source: SalonStackSignalSource | "prospect_field",
    confidence: number,
    url: string | undefined,
    handle: string,
  ) {
    if (filter && providerId !== filter && !providerId.includes(filter)) return;
    let acc = byProvider.get(providerId);
    if (!acc) {
      acc = { count: 0, direct: 0, link: 0, crawl: 0, confSum: 0, handles: new Set() };
      byProvider.set(providerId, acc);
    }
    totalSignals++;
    acc.count++;
    acc.confSum += confidence;
    if (url && !acc.sampleUrl) acc.sampleUrl = url;
    if (handle) acc.handles.add(handle.replace(/^@+/, ""));
    if (source === "prospect_field") {
      acc.direct++;
      return;
    }
    const bucket = sourceBucket(source);
    if (bucket === "direct") acc.direct++;
    else if (bucket === "link") acc.link++;
    else if (bucket === "crawl") acc.crawl++;
  }

  const prospectFieldToStackId: Record<string, string> = {
    glossgenius: "glossgenius",
    vagaro: "vagaro",
    square: "square_appointments",
    booksy: "booksy",
    fresha: "fresha",
    styleseat: "styleseat",
  };

  const prospects = await filterProspects({ vertical: "salon" });
  for (const p of prospects) {
    const bp = p.bookingProvider;
    if (!bp || bp === "unknown") continue;
    const stackId = prospectFieldToStackId[bp] ?? bp;
    if (bp === "glossgenius" && !isGgValidationConfirmed(p.ggValidationStatus)) {
      const conf = p.bookingProviderConfidence ?? 0;
      if (conf < 85) continue;
    }
    const src =
      p.bookingProviderSource === "link_trail"
        ? ("link_in_bio" as SalonStackSignalSource)
        : (p.bookingProviderSource as SalonStackSignalSource) ?? "direct_url";
    recordHit(
      stackId,
      "prospect_field",
      (p.bookingProviderConfidence ?? 70) / 100,
      p.bookingUrl,
      p.identity.handle,
    );
  }

  for (const stack of stacks) {
    if (!stack.signals.length) continue;
    prospectsWithSignals++;
    const handle = stack.instagramHandle ?? stack.prospectId ?? "?";

    for (const sig of stack.signals) {
      recordHit(sig.providerId, sig.source, sig.confidence, sig.url, handle);
    }
  }

  const providers: ProviderAuditRow[] = [];

  for (const id of AUDIT_PROVIDER_IDS) {
    const acc = byProvider.get(id);
    if (!acc || acc.count === 0) {
      const def = getStackProvider(id);
      providers.push({
        providerId: id,
        label: def?.label ?? id,
        category: def?.category ?? "unknown",
        count: 0,
        directUrlCount: 0,
        linkInBioCount: 0,
        websiteCrawlCount: 0,
        averageConfidence: 0,
        sampleProspects: [],
      });
      continue;
    }
    const def = getStackProvider(id);
    providers.push({
      providerId: id,
      label: def?.label ?? id,
      category: def?.category ?? "unknown",
      count: acc.count,
      directUrlCount: acc.direct,
      linkInBioCount: acc.link,
      websiteCrawlCount: acc.crawl,
      averageConfidence: Math.round((acc.confSum / acc.count) * 100),
      sampleUrl: acc.sampleUrl,
      sampleProspects: Array.from(acc.handles).slice(0, 5),
    });
  }

  // Include any detected providers outside the audit list
  for (const [id, acc] of Array.from(byProvider.entries())) {
    if ((AUDIT_PROVIDER_IDS as readonly string[]).includes(id)) continue;
    if (acc.count === 0) continue;
    const def = getStackProvider(id);
    providers.push({
      providerId: id,
      label: def?.label ?? id,
      category: def?.category ?? "unknown",
      count: acc.count,
      directUrlCount: acc.direct,
      linkInBioCount: acc.link,
      websiteCrawlCount: acc.crawl,
      averageConfidence: Math.round((acc.confSum / acc.count) * 100),
      sampleUrl: acc.sampleUrl,
      sampleProspects: Array.from(acc.handles).slice(0, 5),
    });
  }

  providers.sort((a, b) => b.count - a.count);

  if (filter) {
    return {
      ok: true,
      totalStacks: stacks.length,
      totalSignals,
      prospectsWithSignals,
      providers: providers.filter(
        (r) => r.providerId.includes(filter) || r.label.toLowerCase().includes(filter),
      ),
    };
  }

  return {
    ok: true,
    totalStacks: stacks.length,
    totalSignals,
    prospectsWithSignals,
    providers,
  };
}
