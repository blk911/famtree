import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { getActiveOffersForProvider, getProviderBySlug, MOCK_PROVIDERS } from "@/lib/studios/mockStudios";
import { PROVIDER_CATEGORY_LABELS } from "@/types/studios";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return MOCK_PROVIDERS.filter((p) => p.active).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = getProviderBySlug(params.slug);
  if (!provider) {
    return { title: "Studio not found — AIH Studios" };
  }
  const cat = PROVIDER_CATEGORY_LABELS[provider.category];
  return {
    title: `${provider.displayName} — AIH Studios`,
    description: provider.bio ?? `${provider.displayName} · ${cat} · ${provider.locationLabel ?? ""}`.trim(),
  };
}

export default async function TrainerStudioPage({ params }: Props) {
  const provider = getProviderBySlug(params.slug);
  if (!provider) notFound();

  const offers = getActiveOffersForProvider(provider.id);

  return (
    <>
      <TrainerStudioShell provider={provider} offers={offers} />
      <StudiosFooter />
    </>
  );
}
