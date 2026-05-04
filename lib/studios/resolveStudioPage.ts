import { cache } from "react";
import { getActiveOffersForProvider, getProviderBySlug } from "@/lib/studios/mockStudios";
import { loadStudioPageFromDb } from "@/lib/studios/loadStudioFromDb";

export const resolveStudioPage = cache(async (slug: string) => {
  const mock = getProviderBySlug(slug);
  if (mock) {
    return {
      provider: mock,
      offers: getActiveOffersForProvider(mock.id),
    };
  }
  return loadStudioPageFromDb(slug);
});
