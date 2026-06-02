// lib/intelligence/salon/qualified-operator/engine.ts

import { isConfirmedSalonBookingProvider } from "../gg-booking-display";
import { isSalonImportCandidate } from "../import-candidate";
import { analyzeProspectProviderDetection } from "../provider-detection-diagnostics";
import type { QualifiedOperatorInput, QualifiedOperatorResult, QualificationReason, QualificationStatus, RecommendedNextAction } from "./types";

const SOCIAL_STACK_IDS = new Set(["instagram", "tiktok", "facebook", "youtube", "pinterest"]);

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function evidenceText(prospect: QualifiedOperatorInput["prospect"]): string {
  return (prospect.evidence ?? [])
    .map((e) =>
      typeof e === "string" ? e : [e.label, e.url, e.type, e.city, e.state].filter(Boolean).join(" "),
    )
    .join(" ")
    .toLowerCase();
}

function hasEmailOrPhone(prospect: QualifiedOperatorInput["prospect"]): boolean {
  const hay = [
    evidenceText(prospect),
    prospect.notes ?? "",
    ...(prospect.classificationNotes ?? []),
    ...(prospect.bookingProviderEvidence ?? []),
  ].join(" ");
  if (/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(hay)) return true;
  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(hay)) return true;
  if (/\(\d{3}\)\s*\d{3}[-\s]?\d{4}/.test(hay)) return true;
  return false;
}

function hasWebsite(prospect: QualifiedOperatorInput["prospect"]): boolean {
  const urls = [
    prospect.bestMatch?.url,
    prospect.bookingUrl,
    prospect.linkInBioUrl,
    ...(prospect.linkTrailUrlsScanned ?? []),
    ...(prospect.allMatchedUrls ?? []).map((m) => m.url),
  ].filter(Boolean) as string[];
  return urls.some((u) => {
    const lower = u.toLowerCase();
    if (lower.includes("instagram.com")) return false;
    if (lower.includes("tiktok.com") && !lower.includes("link")) return false;
    return (
      lower.includes("square.site") ||
      lower.includes("glossgenius.com") ||
      lower.includes("styleseat.com") ||
      lower.includes("vagaro.com") ||
      lower.includes("fresha.com") ||
      /\.(com|net|org|io|co|app)(\/|$)/.test(lower)
    );
  });
}

function hasContactOrWebsite(prospect: QualifiedOperatorInput["prospect"]): boolean {
  return hasEmailOrPhone(prospect) || hasWebsite(prospect);
}

function hasHighSocialSignal(
  prospect: QualifiedOperatorInput["prospect"],
  stack?: QualifiedOperatorInput["stack"],
): boolean {
  const signals = prospect.platformSignals ?? [];
  if (signals.includes("creator_platform") || signals.includes("appointment_platform")) {
    return true;
  }
  const stackSocial = (stack?.signals ?? []).filter((s) =>
    SOCIAL_STACK_IDS.has(s.providerId),
  ).length;
  if (stackSocial >= 2) return true;
  const hay = evidenceText(prospect);
  if (/\bfollowers?\b|\b\d{1,3}k\s+followers\b|\bverified\b/.test(hay)) return true;
  if ((prospect.communityScore ?? 0) >= 60 || (prospect.audienceScore ?? 0) >= 60) return true;
  return (prospect.platforms ?? []).some((p) =>
    ["instagram", "tiktok", "youtube", "facebook"].includes(p.toLowerCase()),
  );
}

function hasValidationRejectedOrGeneric(prospect: QualifiedOperatorInput["prospect"]): boolean {
  const gg = prospect.ggValidationStatus;
  if (
    gg === "generic_glossgenius_page" ||
    gg === "redirect_home" ||
    gg === "blocked"
  ) {
    return true;
  }
  if (prospect.ggResolverStatus === "generic_homepage") return true;

  const validations = prospect.providerDiscoveryDebug?.providerValidation?.validations ?? [];
  if (
    validations.some(
      (v) =>
        !v.confirmed &&
        (v.status === "generic" ||
          v.status === "generic_glossgenius_page" ||
          v.reason?.toLowerCase().includes("generic")),
    )
  ) {
    return true;
  }

  return false;
}

function hasNoUrlNoProvider(prospect: QualifiedOperatorInput["prospect"]): boolean {
  const det = analyzeProspectProviderDetection(prospect);
  const noProvider = !isConfirmedSalonBookingProvider(prospect) && !prospect.bookingProvider;
  return !det.hasAnyUrl && noProvider;
}

function providerConfidenceNormalized(conf?: number): number {
  if (conf == null) return 0;
  return conf <= 1 ? conf * 100 : conf;
}

function resolveStatus(
  score: number,
  flags: {
    confirmedBooking: boolean;
    importCandidate: boolean;
    hasContactOrWebsite: boolean;
    validationPenalty: boolean;
    stackSignalCount: number;
    noUrlNoProvider: boolean;
    prospectStatus: string;
  },
): QualificationStatus {
  if (flags.prospectStatus === "bad_fit" || (flags.validationPenalty && score < 45)) {
    return "rejected";
  }
  if (flags.noUrlNoProvider && score < 40) return "rejected";

  if (
    score >= 72 &&
    flags.confirmedBooking &&
    flags.importCandidate &&
    flags.hasContactOrWebsite &&
    flags.stackSignalCount >= 2
  ) {
    return "campaign_ready";
  }

  if (score >= 58 && flags.confirmedBooking && flags.stackSignalCount >= 1) {
    return "qualified";
  }

  if (score >= 38 || flags.confirmedBooking || flags.stackSignalCount >= 1) {
    return "needs_enrichment";
  }

  return "prospect_only";
}

function resolveNextAction(
  status: QualificationStatus,
  flags: {
    confirmedBooking: boolean;
    importCandidate: boolean;
    hasAnyUrl: boolean;
    stackSignalCount: number;
    validationPenalty: boolean;
    noUrlNoProvider: boolean;
  },
): RecommendedNextAction {
  if (status === "campaign_ready" && flags.importCandidate) {
    return "launch_import_campaign";
  }
  if (status === "rejected") return "review_operator";
  if (flags.noUrlNoProvider) return "run_ig_url_backfill";
  if (!flags.confirmedBooking && flags.validationPenalty) return "validate_booking_provider";
  if (flags.stackSignalCount === 0 && flags.hasAnyUrl) return "run_business_stack_backfill";
  if (!flags.confirmedBooking) return "run_public_presence";
  if (status === "qualified" && flags.importCandidate) return "launch_import_campaign";
  if (status === "needs_enrichment") return "run_business_stack_backfill";
  if (status === "campaign_ready" || status === "qualified") return "no_action";
  return "review_operator";
}

export function scoreQualifiedOperator(input: QualifiedOperatorInput): QualifiedOperatorResult {
  const { prospect, stack } = input;
  const confirmedBooking =
    input.confirmedBooking ?? isConfirmedSalonBookingProvider(prospect);
  const importCandidate = input.importCandidate ?? isSalonImportCandidate(prospect);
  const stackSignalCount = stack?.signals?.length ?? 0;
  const reasons: QualificationReason[] = [];
  let score = 0;

  if (confirmedBooking) {
    score += 25;
    reasons.push({
      code: "confirmed_booking_provider",
      label: "Confirmed booking provider",
      delta: 25,
    });
  } else {
    reasons.push({
      code: "missing_confirmed_booking",
      label: "No confirmed booking provider",
      delta: 0,
    });
  }

  if (stackSignalCount > 0) {
    score += 10;
    reasons.push({
      code: "business_stack_signals",
      label: `Business stack signals (${stackSignalCount})`,
      delta: 10,
    });
  } else {
    reasons.push({
      code: "insufficient_stack",
      label: "No business stack signals",
      delta: 0,
    });
  }

  if (importCandidate) {
    score += 20;
    reasons.push({
      code: "import_candidate",
      label: "Back-office import candidate",
      delta: 20,
    });
  }

  const contactOrWebsite = hasContactOrWebsite(prospect);
  if (contactOrWebsite) {
    score += 15;
    reasons.push({
      code: "contact_or_website_found",
      label: "Phone, email, or website found",
      delta: 15,
    });
  }

  const highSocial = hasHighSocialSignal(prospect, stack ?? undefined);
  if (highSocial) {
    score += 10;
    reasons.push({
      code: "high_social_signal",
      label: "Strong IG / social presence",
      delta: 10,
    });
  }

  const confNorm = providerConfidenceNormalized(prospect.bookingProviderConfidence);
  if (confNorm >= 90) {
    score += 10;
    reasons.push({
      code: "high_provider_confidence",
      label: `Provider confidence ${Math.round(confNorm)}%`,
      delta: 10,
    });
  }

  const noUrlNoProvider = hasNoUrlNoProvider(prospect);
  if (noUrlNoProvider) {
    score -= 15;
    reasons.push({
      code: "no_url_no_provider",
      label: "No public URL and no provider",
      delta: -15,
    });
  }

  const validationPenalty = hasValidationRejectedOrGeneric(prospect);
  if (validationPenalty) {
    score -= 20;
    reasons.push({
      code: "validation_rejected_or_generic",
      label: "Validation rejected or generic homepage",
      delta: -20,
    });
  }

  const qualifiedOperatorScore = clamp(score);
  const det = analyzeProspectProviderDetection(prospect);
  const qualificationStatus = resolveStatus(qualifiedOperatorScore, {
    confirmedBooking,
    importCandidate,
    hasContactOrWebsite: contactOrWebsite,
    validationPenalty,
    stackSignalCount,
    noUrlNoProvider,
    prospectStatus: prospect.status,
  });

  if (qualifiedOperatorScore < 40 && qualificationStatus !== "rejected") {
    reasons.push({
      code: "low_overall_score",
      label: `Overall score ${qualifiedOperatorScore} below outreach threshold`,
      delta: 0,
    });
  }

  const recommendedNextAction = resolveNextAction(qualificationStatus, {
    confirmedBooking,
    importCandidate,
    hasAnyUrl: det.hasAnyUrl,
    stackSignalCount,
    validationPenalty,
    noUrlNoProvider,
  });

  const handle = prospect.identity.handle.replace(/^@/, "");

  return {
    prospectId: prospect.prospectId,
    instagramHandle: handle,
    displayName: prospect.identity.name,
    businessCategory: prospect.businessSubcategory ?? prospect.businessCategory ?? null,
    bookingProvider: prospect.bookingProvider,
    bookingProviderLabel: prospect.bookingProviderLabel ?? undefined,
    bookingProviderConfidence: prospect.bookingProviderConfidence,
    qualifiedOperatorScore,
    qualificationStatus,
    qualificationReasons: reasons,
    recommendedNextAction,
    importCandidate,
    confirmedBooking,
    stackSignalCount,
    hasContactOrWebsite: contactOrWebsite,
    highSocialSignal: highSocial,
    validationPenalty,
  };
}
