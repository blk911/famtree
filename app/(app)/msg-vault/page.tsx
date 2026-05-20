export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { MsgVaultShell } from "@/components/msg-vault/MsgVaultShell";
import { deriveShellMode } from "@/components/aihsafe/roles";
import { requireAuth } from "@/lib/auth";
import { loadTrustUnitsSafe } from "@/lib/tree/safe-data";

export const metadata = { title: "Msg Vault · AMIHUMAN.NET" };

export default async function MsgVaultPage() {
  const user = await requireAuth();
  const shellMode = deriveShellMode({
    role:        user.role,
    dateOfBirth: user.dateOfBirth ?? null,
  });

  const trustUnits = await loadTrustUnitsSafe(user.id);

  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#78716c" }}>Loading Msg Vault…</div>}>
      <MsgVaultShell
        currentUserId={user.id}
        shellMode={shellMode}
        firstName={user.firstName}
        trustUnits={trustUnits.map((unit) => ({
          id: unit.id,
          members: unit.members.map((m) => ({ user: { id: m.user.id } })),
        }))}
      />
    </Suspense>
  );
}
