import type { Metadata } from "next";
import { cookies } from "next/headers";
import { VmbStartFlow } from "@/components/vmb/VmbStartFlow";
import { resolveActiveBook } from "@/lib/vmb/active-book-resolver";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export const metadata: Metadata = {
  title: "Load your book",
};

type Props = {
  searchParams?: { mode?: string };
};

export default async function VmbStartPage({ searchParams }: Props) {
  const refreshMode = searchParams?.mode === "refresh";
  const cookieStore = await cookies();
  const trialId = cookieStore.get(VMB_TRIAL_COOKIE)?.value?.trim();
  const activeBook = trialId ? await resolveActiveBook(trialId) : { hasActiveBook: false, source: "none" as const };

  return (
    <VmbStartFlow
      refreshMode={refreshMode}
      activeBook={activeBook.hasActiveBook ? activeBook : null}
    />
  );
}
