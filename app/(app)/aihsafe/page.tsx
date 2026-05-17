// AIH Safe — governed social layer. Server component.
// Role routing: derives shellMode from user.role + dateOfBirth and passes it
// to FounderShell so each user sees the appropriate governance shell.
// Authorization note: shellMode controls UI only. Backend governance gates are
// enforced in API routes regardless of which shell is rendered.

export const dynamic = "force-dynamic";

import { requireAuth }     from "@/lib/auth";
import { FounderShell }    from "@/components/aihsafe/founder/FounderShell";
import { deriveShellMode } from "@/components/aihsafe/roles";

export const metadata = { title: "Msg Vault · AMIHUMAN.NET" };

export default async function AihSafePage() {
  const user      = await requireAuth();
  const shellMode = deriveShellMode({
    role:        user.role,
    dateOfBirth: user.dateOfBirth ?? null,
  });
  return <FounderShell currentUserId={user.id} shellMode={shellMode} />;
}
