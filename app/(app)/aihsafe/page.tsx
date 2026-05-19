// AIH Safe — governed social layer. Server component.
// Role routing: derives shellMode from user.role + dateOfBirth and passes it
// to FounderShell so each user sees the appropriate governance shell.
// Authorization note: shellMode controls UI only. Backend governance gates are
// enforced in API routes regardless of which shell is rendered.

export const dynamic = "force-dynamic";

import { FounderShell }    from "@/components/aihsafe/founder/FounderShell";
import { deriveShellMode } from "@/components/aihsafe/roles";
import { requireAuth }     from "@/lib/auth";
import { prisma }          from "@/lib/db/prisma";

export const metadata = { title: "Family Safe · AMIHUMAN.NET" };

export default async function AihSafePage() {
  const user      = await requireAuth();
  const shellMode = deriveShellMode({
    role:        user.role,
    dateOfBirth: user.dateOfBirth ?? null,
  });

  const profile = await prisma.profile.findUnique({
    where:  { userId: user.id },
    select: { coverUrl: true },
  });

  const heroUser = {
    firstName: user.firstName ?? "",
    lastName:  user.lastName ?? "",
    photoUrl:  user.photoUrl ?? null,
  };

  return (
    <FounderShell
      currentUserId={user.id}
      shellMode={shellMode}
      heroUser={heroUser}
      heroCoverUrl={profile?.coverUrl ?? null}
    />
  );
}
