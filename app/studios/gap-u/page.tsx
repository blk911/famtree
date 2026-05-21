import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getGapUStudioBundle } from "@/lib/studios/gapu";
import { GapUStudioPage } from "@/components/studios/gapu/GapUStudioPage";
import { StudiosFooter } from "@/components/studios/StudiosFooter";

const { provider, content } = getGapUStudioBundle();

export const metadata: Metadata = {
  title: `${provider.displayName} — AIH Studios`,
  description: content.hero.subcopy[0],
};

export default async function GapUStudioRoute() {
  const user = await getCurrentUser();

  return (
    <>
      <GapUStudioPage content={content} isAuthenticated={Boolean(user)} />
      <StudiosFooter />
    </>
  );
}
