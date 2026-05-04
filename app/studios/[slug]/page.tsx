import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { MOCK_PROVIDERS } from "@/lib/studios/mockStudios";
import { resolveStudioPage } from "@/lib/studios/resolveStudioPage";
import { PROVIDER_CATEGORY_LABELS } from "@/types/studios";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return MOCK_PROVIDERS.filter((p) => p.active).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await resolveStudioPage(params.slug);
  if (!resolved) {
    return { title: "Studio not found — AIH Studios" };
  }
  const { provider } = resolved;
  const cat = PROVIDER_CATEGORY_LABELS[provider.category];
  return {
    title: `${provider.displayName} — AIH Studios`,
    description: provider.bio ?? `${provider.displayName} · ${cat} · ${provider.locationLabel ?? ""}`.trim(),
  };
}

export default async function TrainerStudioPage({ params }: Props) {
  const resolved = await resolveStudioPage(params.slug);
  if (!resolved) notFound();

  const { provider, offers } = resolved;

  return (
    <>
      <TrainerStudioShell provider={provider} offers={offers} />
      <StudiosFooter />
    </>
  );
}
