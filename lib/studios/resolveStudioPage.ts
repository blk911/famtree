import { cache } from "react";
import { getActiveOffersForProvider, getProviderBySlug } from "@/lib/studios/mockStudios";
import { loadStudioPageFromDb } from "@/lib/studios/loadStudioFromDb";
import type { ResolvedStudioPage } from "@/lib/studios/resolvedStudioPage";

export type { ResolvedStudioPage };

export const resolveStudioPage = cache(async (slug: string): Promise<ResolvedStudioPage | null> => {
  const mock = getProviderBySlug(slug);
  if (mock) {
    return {
      provider: mock,
      offers: getActiveOffersForProvider(mock.id),
      ownerUserId: null,
    };
  }
  try {
    const fromDb = await loadStudioPageFromDb(slug);
    return fromDb;
  } catch (err) {
    console.error("[studios/resolve] loadStudioPageFromDb failed", { slug, err });
    throw err;
  }
});
