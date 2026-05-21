import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { StudioBuilderShell } from "@/components/studios/builder/StudioBuilderShell";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { StudiosSpacesPoweredNote } from "@/components/studios/StudiosSpacesPoweredNote";

export const metadata: Metadata = {
  title: "Create studio — AIH Studios",
  description:
    "Step-by-step studio builder: choose your community type, add public source links, review your draft, and publish when ready.",
};

export default async function StudiosCreatePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await getCurrentUser();
  const draftParam = searchParams.draftId ?? searchParams.draft;
  const initialDraftId =
    typeof draftParam === "string" ? draftParam : Array.isArray(draftParam) ? draftParam[0] : null;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <StudiosSpacesPoweredNote />
      </div>
      <StudioBuilderShell isAuthenticated={Boolean(user)} initialDraftId={initialDraftId} />
      <StudiosFooter />
    </>
  );
}
