import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioPublicPage } from "@/components/studios/StudioPublicPage";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { getCurrentUser } from "@/lib/auth";
import { liveStoryFromProvider, STUDIO_PUBLIC_DEFAULT_NAV } from "@/lib/studio/studioDraft";
import type { StudioViewerRole } from "@/lib/studio/studioMode";
import { MOCK_PROVIDERS } from "@/lib/studios/mockStudios";
import { resolveStudioPage } from "@/lib/studios/resolveStudioPage";
import { PROVIDER_CATEGORY_LABELS } from "@/types/studios";

type Props = { params: { slug: string } };

const ROUTE = "[studios/slug]";

const isElevatedRole = (role: string) => role === "founder" || role === "admin";

export function generateStaticParams() {
  return MOCK_PROVIDERS.filter((p) => p.active).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolved = await resolveStudioPage(params.slug);
    if (!resolved) {
      return { title: "Studio not found — AIH Studios" };
    }
    const { provider } = resolved;
    const cat =
      PROVIDER_CATEGORY_LABELS[provider.category] ?? String(provider.category ?? "Studio");
    return {
      title: `${provider.displayName ?? "Studio"} — AIH Studios`,
      description:
        provider.bio ??
        `${provider.displayName ?? "Studio"} · ${cat} · ${provider.locationLabel ?? ""}`.trim(),
    };
  } catch (error) {
    console.error(`${ROUTE} generateMetadata failed`, { slug: params.slug, error });
    return { title: "Studio — AIH Studios" };
  }
}

export default async function TrainerStudioPage({ params }: Props) {
  let resolved: Awaited<ReturnType<typeof resolveStudioPage>> = null;
  try {
    resolved = await resolveStudioPage(params.slug);
    console.log(`${ROUTE} resolved`, {
      slug: params.slug,
      found: Boolean(resolved),
      providerId: resolved?.provider?.id,
      offersCount: Array.isArray(resolved?.offers) ? resolved.offers.length : 0,
    });
  } catch (error) {
    console.error(`${ROUTE} resolveStudioPage threw`, { slug: params.slug, error });
    throw error;
  }

  if (!resolved) notFound();

  const { provider, offers, ownerUserId } = resolved;

  const user = await getCurrentUser();
  const isOwner = Boolean(user && ownerUserId && user.id === ownerUserId);
  const isAdmin = Boolean(user && isElevatedRole(user.role));
  const canEdit = isOwner || isAdmin;
  const viewerRole: StudioViewerRole = canEdit ? "owner" : "public";

  return (
    <>
      <StudioPublicPage
        provider={provider}
        offers={offers}
        storyIntro={liveStoryFromProvider(provider)}
        accentHex={undefined}
        navItems={STUDIO_PUBLIC_DEFAULT_NAV}
        viewerRole={viewerRole}
        showEditControls={canEdit}
        studioSlug={params.slug}
      />
      <StudiosFooter />
    </>
  );
}
