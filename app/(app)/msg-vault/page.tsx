export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { MsgVaultShell } from "@/components/msg-vault/MsgVaultShell";
import { deriveShellMode } from "@/components/aihsafe/roles";
import { requireAuth } from "@/lib/auth";

export const metadata = { title: "Msg Vault · AMIHUMAN.NET" };

export default async function MsgVaultPage() {
  const user = await requireAuth();
  const shellMode = deriveShellMode({
    role:        user.role,
    dateOfBirth: user.dateOfBirth ?? null,
  });

  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#78716c" }}>Loading Msg Vault…</div>}>
      <MsgVaultShell
        currentUserId={user.id}
        shellMode={shellMode}
        firstName={user.firstName}
        lastName={user.lastName}
      />
    </Suspense>
  );
}
