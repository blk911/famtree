import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { liveStoryFromProvider } from "@/lib/studio/studioDraft";
import { MOCK_PROVIDERS } from "@/lib/studios/mockStudios";
import { getCurrentUser } from "@/lib/auth";
import { resolveStudioPage } from "@/lib/studios/resolveStudioPage";
import { resolveStudioMemberAccess } from "@/lib/studios/studioMemberAccess";
import { PublishedStudioExtras } from "@/components/studios/PublishedStudioExtras";
import { PROVIDER_CATEGORY_LABELS } from "@/types/studios";

type Props = { params: { slug: string } };

const ROUTE = "[studios/slug]";

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

  const { provider, offers, ownerUserId, publishedContent, trustUnitId } = resolved;
  const viewer = await getCurrentUser();
  const studioDbId = provider.studioId ?? provider.id.replace(/^db_/, "");
  const access =
    ownerUserId && publishedContent
      ? await resolveStudioMemberAccess(
          studioDbId,
          ownerUserId,
          trustUnitId ?? null,
          viewer?.id ?? null,
        )
      : { isOwner: viewer?.id === ownerUserId, isMember: false, trustUnitId: null };

  return (
    <>
      <TrainerStudioShell
        variant="live"
        provider={provider}
        offers={offers}
        liveStoryIntro={liveStoryFromProvider(provider)}
      />
      {publishedContent && provider.studioId ? (
        <PublishedStudioExtras
          slug={params.slug}
          content={publishedContent}
          isAuthenticated={Boolean(viewer)}
          isMember={access.isMember}
          isOwner={access.isOwner}
          trustUnitId={access.trustUnitId}
        />
      ) : null}
      <StudiosFooter />
    </>
  );
}
