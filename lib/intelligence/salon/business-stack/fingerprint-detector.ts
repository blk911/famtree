// lib/intelligence/salon/business-stack/fingerprint-detector.ts

import { isGgClientSubdomainUrl } from "../glossgenius-url";
import { SALON_STACK_PROVIDERS } from "./provider-registry";
import type {
  SalonStackSignal,
  SalonStackSignalSource,
  StackDetectInput,
} from "./types";

const CONF_BY_SOURCE: Record<SalonStackSignalSource, number> = {
  direct_url: 0.95,
  link_in_bio: 0.9,
  website_link: 0.85,
  website_html: 0.75,
  public_search: 0.7,
  manual: 1,
};

function hostOf(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function haystack(url: string, html?: string): string {
  return `${url} ${html ?? ""}`.toLowerCase();
}

function matchProvider(
  provider: (typeof SALON_STACK_PROVIDERS)[number],
  url: string,
  html?: string,
): { matched: boolean; evidence: string[]; confidence: number } {
  const h = hostOf(url);
  const full = haystack(url, html);
  const evidence: string[] = [];

  for (const pattern of provider.urlPatterns ?? []) {
    if (full.includes(pattern.toLowerCase())) {
      evidence.push(`path:${pattern}`);
      return { matched: true, evidence, confidence: 0.92 };
    }
  }

  for (const domain of provider.domains) {
    const d = domain.toLowerCase();
    if (h === d || h.endsWith(`.${d}`) || full.includes(d)) {
      if (provider.id === "glossgenius" && !isGgClientSubdomainUrl(url)) {
        continue;
      }
      evidence.push(`domain:${d}`);
      if (provider.id === "square" && full.includes("appointments")) {
        return { matched: false, evidence, confidence: 0 };
      }
      if (provider.id === "square_appointments") {
        return { matched: true, evidence, confidence: 0.94 };
      }
      return { matched: true, evidence, confidence: 0.88 };
    }
  }

  for (const marker of provider.htmlMarkers ?? []) {
    if (html && html.toLowerCase().includes(marker.toLowerCase())) {
      evidence.push(`html:${marker}`);
      return { matched: true, evidence, confidence: 0.78 };
    }
  }

  return { matched: false, evidence, confidence: 0 };
}

function signalKey(s: SalonStackSignal): string {
  return `${s.providerId}:${s.category}:${s.url ?? ""}:${s.source}`;
}

export function mergeStackSignals(signals: SalonStackSignal[]): SalonStackSignal[] {
  const byKey = new Map<string, SalonStackSignal>();
  for (const s of signals) {
    const key = signalKey(s);
    const existing = byKey.get(key);
    if (!existing || s.confidence > existing.confidence) {
      byKey.set(key, s);
    } else if (existing) {
      existing.evidence = Array.from(new Set([...existing.evidence, ...s.evidence])).slice(0, 8);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.confidence - a.confidence);
}

export function detectBusinessStackFromUrls(input: StackDetectInput): SalonStackSignal[] {
  const source = input.source ?? "direct_url";
  const baseConf = CONF_BY_SOURCE[source] ?? 0.6;
  const signals: SalonStackSignal[] = [];
  const now = new Date().toISOString();

  for (const raw of input.urls ?? []) {
    const url = (raw ?? "").trim();
    if (!url.startsWith("http")) continue;

    for (const provider of SALON_STACK_PROVIDERS) {
      if (provider.category === "booking") continue;
      const hit = matchProvider(provider, url);
      if (!hit.matched) continue;
      const conf = Math.min(1, baseConf * (hit.confidence >= 0.9 ? 1 : hit.confidence));
      signals.push({
        providerId: provider.id,
        providerLabel: provider.label,
        category: provider.category,
        source,
        url,
        confidence: Math.round(conf * 1000) / 1000,
        evidence: [`url:${url}`, ...hit.evidence],
        detectedAt: now,
      });
    }
  }

  return mergeStackSignals(signals);
}

export function detectBusinessStackFromHtml(input: StackDetectInput): SalonStackSignal[] {
  const html = input.html ?? "";
  if (!html) return [];
  const source: SalonStackSignalSource = input.source ?? "website_html";
  const baseConf = CONF_BY_SOURCE[source];
  const signals: SalonStackSignal[] = [];
  const now = new Date().toISOString();
  const url = input.urls?.[0] ?? "";

  for (const provider of SALON_STACK_PROVIDERS) {
    const hit = matchProvider(provider, url, html);
    if (!hit.matched) continue;
    signals.push({
      providerId: provider.id,
      providerLabel: provider.label,
      category: provider.category,
      source,
      url: url || undefined,
      confidence: Math.round(baseConf * hit.confidence * 1000) / 1000,
      evidence: [`html_scan`, ...hit.evidence],
      detectedAt: now,
    });
  }

  return mergeStackSignals(signals);
}
