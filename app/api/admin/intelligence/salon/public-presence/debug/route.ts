// POST /api/admin/intelligence/salon/public-presence/debug

export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { discoverSalonPublicPresence } from "@/lib/intelligence/salon/public-presence/discovery-engine";
import { buildSalonIdentityPacket } from "@/lib/intelligence/salon/public-presence/identity-extractor";
import { searchSalonPublicPresence, getSearchProviderStatus } from "@/lib/intelligence/salon/public-presence/search-provider";
import { classifySalonUrl } from "@/lib/intelligence/salon/public-presence/url-classifier";
import {
  detectSalonBookingProvider,
  detectBestSalonBookingProvider,
} from "@/lib/intelligence/salon/provider-detector";
import {
  collectGlossGeniusCandidates,
  resolveGlossGeniusFromHandle,
} from "@/lib/intelligence/salon/glossgenius-handle-resolver";
import { mapDiscoveryToBookingFields } from "@/lib/intelligence/salon/public-presence/discovery-engine";

const BodySchema = z.object({
  instagramHandle: z.string().min(1),
  displayName: z.string().optional(),
  bio: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  categoryHint: z.string().optional(),
  forceSearch: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const handle = body.instagramHandle.replace(/^@+/, "").trim();

    const input = {
      instagramHandle: handle,
      displayName: body.displayName,
      bio: body.bio,
      city: body.city,
      state: body.state,
      categoryHint: body.categoryHint,
    };

    const identity = buildSalonIdentityPacket(input);
    const searchStatus = getSearchProviderStatus();
    const search = await searchSalonPublicPresence(identity, { maxQueries: 4 });

    const classifiedUrls = search.results.map((r) => ({
      ...r,
      classified: classifySalonUrl(r.url, r.title, r.snippet),
    }));

    const ggCandidates = collectGlossGeniusCandidates({
      instagramHandle: handle,
      displayName: body.displayName,
    });

    const ggFallback = await resolveGlossGeniusFromHandle({
      instagramHandle: handle,
      displayName: body.displayName,
      bio: body.bio,
    });

    const discovery = await discoverSalonPublicPresence(input, {
      forceSearch: body.forceSearch,
      enableSearch: body.forceSearch,
      enableGgFallback: true,
    });

    const finalDecision = mapDiscoveryToBookingFields(discovery);

    const directDetection = body.bio
      ? detectBestSalonBookingProvider({ urls: [], text: body.bio, linkPageLinks: [] })
      : null;

    return NextResponse.json({
      ok: true,
      identityPacket: identity,
      searchQueries: identity.searchQueries,
      searchStatus,
      searchResults: search.results,
      classifiedUrls,
      providerDetector: {
        directDetection,
        perUrl: classifiedUrls
          .filter((c) => c.classified.urlType === "booking_provider")
          .map((c) => ({
            url: c.url,
            detection: detectSalonBookingProvider(c.url),
          })),
      },
      ggFallback: {
        candidates: ggCandidates,
        resolver: ggFallback,
      },
      discovery,
      finalDecision,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "debug failed", detail },
      { status: 500 },
    );
  }
}
