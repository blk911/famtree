import type { Provider, StudioOffer } from "@/types/studios";

export type ResolvedStudioPage = {
  provider: Provider;
  offers: StudioOffer[];
  /** Present when loaded from Prisma — used for owner/admin edit chrome. */
  ownerUserId?: string | null;
};
