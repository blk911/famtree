// lib/studios/loadStudioFromDb.ts
// Maps Prisma Studio + tiers → marketing Provider / StudioOffer shapes.

import { prisma } from "@/lib/db/prisma";
import type { OfferPackageType, Provider, ProviderCategory, StudioOffer } from "@/types/studios";

export async function loadStudioPageFromDb(
  slug: string,
): Promise<{ provider: Provider; offers: StudioOffer[]; ownerUserId: string } | null> {
  const studio = await prisma.studio.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      tiers: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!studio) return null;

  const owner = studio.owner;
  if (!owner) {
    console.error("[studios/db] studio row missing owner relation", { slug });
    return null;
  }

  const tiers = Array.isArray(studio.tiers) ? studio.tiers : [];
  const providerId = `db_${studio.id}`;
  const category: ProviderCategory = slug === "deb-dazzle" ? "nail_salon" : "trainer";

  const provider: Provider = {
    id: providerId,
    displayName: studio.name,
    slug: studio.slug,
    category,
    serviceType: undefined,
    locationLabel: undefined,
    city: undefined,
    state: undefined,
    imageUrl: owner.photoUrl ?? undefined,
    introVideoUrl: undefined,
    bio: studio.tagline ?? undefined,
    claimed: true,
    active: true,
    studioId: studio.id,
    createdAt: studio.createdAt,
  };

  const offers: StudioOffer[] = tiers.map((tier) => {
    const hasPrice = tier.price != null;
    const priceNum = hasPrice ? Number(tier.price) : null;
    const packageType: OfferPackageType = !hasPrice ? "custom" : "single";
    const priceLabel =
      hasPrice && priceNum != null
        ? priceNum.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
        : null;

    return {
      id: tier.id,
      studioId: studio.id,
      providerId,
      title: tier.name,
      description: priceLabel
        ? `${tier.name} — ${priceLabel}`
        : `${tier.name} — custom pricing; reach out to book.`,
      priceCents: hasPrice && priceNum != null ? Math.round(priceNum * 100) : undefined,
      durationMinutes: 60,
      packageType,
      active: true,
    };
  });

  return { provider, offers, ownerUserId: studio.ownerId };
}
