// GET /api/admin/intelligence/salon/prospects/[prospectId]/detail

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listProspects } from "@/lib/studios/prospects/store";
import { enrichProspectBookingIfMissing } from "@/lib/intelligence/salon/booking-from-trail";
import { analyzeProspectProviderDetection } from "@/lib/intelligence/salon/provider-detection-diagnostics";
import { isSalonImportCandidate } from "@/lib/intelligence/salon/import-candidate";
import { RELATIONSHIP_OPPORTUNITY_LABELS } from "@/lib/studios/prospects/opportunity-taxonomy";
import { buildSalonIdentityPacket, prospectToPublicPresenceInput } from "@/lib/intelligence/salon/public-presence/identity-extractor";
import { listPresenceResults } from "@/lib/intelligence/salon/public-presence/presence-store";
import { getBusinessStack } from "@/lib/intelligence/salon/business-stack/stack-store";
import { getQualifiedOperatorForProspect } from "@/lib/intelligence/salon/qualified-operator/list";

type RouteContext = { params: Promise<{ prospectId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { prospectId } = await context.params;
    const prospects = await listProspects();
    const raw = prospects.find((p) => p.prospectId === prospectId);
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Prospect not found" },
        { status: 404 },
      );
    }

    const prospect = enrichProspectBookingIfMissing(raw);
    const providerDetection = analyzeProspectProviderDetection(prospect);
    const handle = prospect.identity.handle.replace(/^@/, "");
    const igProfile = `https://www.instagram.com/${handle}/`;

    const linkTrail = {
      bioUrl: providerDetection.bioUrl,
      bestUrl: providerDetection.bestUrl,
      linkInBioUrl: providerDetection.linkInBioUrl,
      linkTrailUrlsScanned: providerDetection.linkTrailUrlsScanned,
      linkInBioPageFetched: providerDetection.linkInBioPageFetched,
    };

    const opportunity = {
      tags: prospect.offerFitTags ?? [],
      platformSignals: prospect.platformSignals ?? [],
      relationshipType: prospect.relationshipOpportunityType,
      relationshipLabel: prospect.relationshipOpportunityType
        ? RELATIONSHIP_OPPORTUNITY_LABELS[
            prospect.relationshipOpportunityType as keyof typeof RELATIONSHIP_OPPORTUNITY_LABELS
          ] ?? prospect.relationshipOpportunityType
        : null,
      score: prospect.overallOpportunityScore ?? null,
      recommendedPlay: prospect.classificationNotes?.[0] ?? null,
      importCandidate: isSalonImportCandidate(prospect),
    };

    const ggCheckedUrls =
      (prospect.ggCheckedUrls?.length ?? 0) > 0
        ? prospect.ggCheckedUrls!
        : (prospect.bookingProviderEvidence ?? [])
            .filter((e) => e.includes("glossgenius.com") || e.includes("checked"))
            .concat(providerDetection.evidence.filter((e) => e.includes("glossgenius")));

    const pd = prospect.providerDiscoveryDebug;

    const notes = {
      outcome: providerDetection.outcome,
      reasonLabel: providerDetection.reasonLabel,
      glossGeniusStatus: providerDetection.glossGeniusStatusLabel,
      ggResolverStatus: prospect.ggResolverStatus ?? "not_attempted",
      ggResolverReason: prospect.ggResolverReason ?? pd?.providerResolverReason,
      providerResolverReason: prospect.providerResolverReason ?? pd?.providerResolverReason,
      ggCheckedUrls: Array.from(
        new Set([...(ggCheckedUrls ?? []), ...(pd?.ggCheckedUrls ?? [])]),
      ),
      providerDiscoveryDebug: pd,
      noUrl: !providerDetection.hasAnyUrl,
      noProvider: providerDetection.outcome !== "detected",
    };

    const sourceLinks = {
      instagram: igProfile,
      booking: prospect.bookingUrl ?? providerDetection.bestUrl,
      linkInBio: providerDetection.linkInBioUrl,
      website: prospect.bestMatch?.url,
    };

    const identity = buildSalonIdentityPacket(prospectToPublicPresenceInput(prospect));
    const storedResults = await listPresenceResults({ prospectId, limit: 30 });
    const publicPresence = {
      identity,
      results: storedResults,
      bestProvider: prospect.bookingProvider
        ? {
            provider: prospect.bookingProvider,
            source: prospect.bookingProviderSource ?? "unknown",
            confidence: prospect.bookingProviderConfidence ?? 0,
            bookingUrl: prospect.bookingUrl ?? "",
            evidence: prospect.bookingProviderEvidence ?? [],
          }
        : undefined,
      diagnostics: { errors: [] as string[] },
    };

    const businessStack = await getBusinessStack(prospectId);
    const qualifiedOperator = getQualifiedOperatorForProspect(prospect, businessStack ?? undefined);

    return NextResponse.json({
      ok: true,
      prospect,
      providerDetection,
      linkTrail,
      opportunity,
      sourceLinks,
      notes,
      publicPresence,
      businessStack: businessStack ?? undefined,
      qualifiedOperator,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "detail failed", detail },
      { status: 500 },
    );
  }
}
