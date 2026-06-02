// POST /api/admin/intelligence/salon/business-stack/debug-url

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { detectSalonBookingProvider } from "@/lib/intelligence/salon/provider-detector";
import { classifyGgPageContent, fetchGgPage } from "@/lib/intelligence/salon/glossgenius-page-validator";
import { isLinkInBioUrl } from "@/lib/intelligence/salon/provider-detector";
import { expandLinkInBioPage } from "@/lib/intelligence/salon/link-in-bio-expander";
import { isGgClientSubdomainUrl } from "@/lib/intelligence/salon/glossgenius-url";
import {
  detectBusinessStackFromUrls,
} from "@/lib/intelligence/salon/business-stack/fingerprint-detector";
import { detectValidatedGlossGeniusStackSignals } from "@/lib/intelligence/salon/business-stack/glossgenius-stack";

const BodySchema = z.object({
  url: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const { url } = BodySchema.parse(await req.json());
    const providerDetectorResult = detectSalonBookingProvider(url, {
      fromLinkInBio: isLinkInBioUrl(url),
    });

    let classification: Record<string, unknown> = {
      urlType: providerDetectorResult?.provider ?? "unknown",
      provider: providerDetectorResult?.provider,
      providerLabel: providerDetectorResult?.providerLabel,
    };

    let ggValidation: Record<string, unknown> | null = null;
    let stackSignals: Awaited<ReturnType<typeof detectBusinessStackFromUrls>> = [];
    let linkInBio:
      | {
          linkInBioLinksFound: number;
          linkInBioOutboundLinks: string[];
          linkInBioProviderLinks: string[];
        }
      | undefined;

    if (isLinkInBioUrl(url)) {
      const expanded = await expandLinkInBioPage(url);
      linkInBio = expanded.diagnostics;
      stackSignals = [
        ...detectBusinessStackFromUrls({
          urls: expanded.links,
          source: "link_in_bio",
        }),
        ...(await detectValidatedGlossGeniusStackSignals({
          urls: expanded.links,
          source: "link_in_bio",
        })),
      ];
      classification = {
        ...classification,
        urlType: "link_in_bio",
        outboundLinkCount: expanded.links.length,
      };
    } else if (isGgClientSubdomainUrl(url) || /glossgenius\.com/i.test(url)) {
      const fetched = await fetchGgPage(url);
      ggValidation = classifyGgPageContent({
        ...fetched,
        requestedUrl: url,
        discoverySource: "direct_url",
      });
      classification = {
        urlType: ggValidation.confirmed ? "booking_provider" : "generic_or_marketing",
        provider: ggValidation.confirmed ? "glossgenius" : undefined,
        providerLabel: ggValidation.confirmed ? "GlossGenius" : undefined,
        validationStatus: ggValidation.status,
        confidence: ggValidation.suggestedConfidence,
      };
      stackSignals = [
        ...(await detectValidatedGlossGeniusStackSignals({
          urls: [url],
          source: "direct_url",
        })),
      ];
    } else {
      stackSignals = detectBusinessStackFromUrls({
        urls: [url],
        source: "direct_url",
      });
      if (/glossgenius/i.test(url)) {
        const fetched = await fetchGgPage(url);
        ggValidation = classifyGgPageContent({
          ...fetched,
          requestedUrl: url,
          discoverySource: "direct_url",
        });
      }
    }

    const decision = ggValidation
      ? {
          confirmed: ggValidation.confirmed,
          reason: ggValidation.reason,
          status: ggValidation.status,
        }
      : providerDetectorResult
        ? {
            confirmed: providerDetectorResult.provider !== "unknown",
            provider: providerDetectorResult.provider,
            confidence: providerDetectorResult.confidence,
          }
        : { confirmed: stackSignals.length > 0, signalCount: stackSignals.length };

    return NextResponse.json({
      ok: true,
      url,
      classification,
      providerDetectorResult,
      ggValidation,
      stackSignals,
      linkInBio,
      decision,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "debug_url_failed", detail }, { status: 400 });
  }
}
