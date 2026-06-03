// lib/intelligence/salon/source-ingest/directory-classifier.ts

import type {
  DirectoryClassification,
  DirectorySourceType,
  SalonDirectoryProvider,
} from "./types";

const PROVIDER_LABELS: Record<SalonDirectoryProvider, string> = {
  vagaro: "Vagaro",
  styleseat: "StyleSeat",
  glossgenius: "GlossGenius",
  sola: "Sola Salon Studios",
  phenix: "Phenix Salon Suites",
  spectra: "Spectra Salon",
  unknown: "Unknown",
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return trimmed;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
}

export function classifyDirectoryUrl(
  rawUrl: string,
  opts?: { market?: string; category?: string },
): DirectoryClassification {
  const directoryUrl = normalizeUrl(rawUrl);
  const warnings: string[] = [];
  const host = hostOf(directoryUrl);
  const path = pathOf(directoryUrl);

  let provider: SalonDirectoryProvider = "unknown";
  let sourceType: DirectorySourceType = "unknown_directory";

  if (host === "vagaro.com" && path.includes("/professionals/")) {
    provider = "vagaro";
    sourceType = "vagaro_directory";
  } else if (host === "vagaro.com") {
    provider = "vagaro";
    sourceType = "vagaro_directory";
    warnings.push("Vagaro URL is not a /professionals/ directory listing; scan may return few results.");
  } else if (host === "styleseat.com") {
    provider = "styleseat";
    sourceType = "styleseat_directory";
  } else if (host === "glossgenius.com") {
    provider = "glossgenius";
    sourceType = "glossgenius_directory";
  } else if (host === "solasalonstudios.com" && path.includes("/locations")) {
    provider = "sola";
    sourceType = "suite_directory";
  } else if (host === "phenixsalonsuites.com") {
    provider = "phenix";
    sourceType = "suite_directory";
  } else if (host === "spectrasalon.com") {
    provider = "spectra";
    sourceType = "suite_directory";
  } else if (directoryUrl) {
    warnings.push("URL host not recognized as a supported salon directory provider.");
  }

  if (!directoryUrl) {
    warnings.push("Directory URL is empty or invalid.");
  }

  return {
    kind: "directory",
    provider,
    providerLabel: PROVIDER_LABELS[provider],
    sourceType,
    directoryUrl,
    market: opts?.market,
    category: opts?.category,
    warnings,
  };
}

export function providerLabel(provider: SalonDirectoryProvider): string {
  return PROVIDER_LABELS[provider];
}
