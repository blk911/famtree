import type { Provider, StudioOffer } from "@/types/studios";
import type { StudioDraftContentDTO } from "@/types/studios/builder";

export type ResolvedStudioPage = {
  provider: Provider;
  offers: StudioOffer[];
  /** Present when loaded from Prisma — used for owner/admin edit chrome. */
  ownerUserId?: string | null;
  publishedContent?: StudioDraftContentDTO;
  trustUnitId?: string | null;
};
