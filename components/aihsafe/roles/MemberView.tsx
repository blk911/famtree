"use client";

import { FounderShell } from "@/components/aihsafe/founder/FounderShell";
import { RoleBanner } from "@/components/aihsafe/roles/RoleBanner";

export function MemberView({ currentUserId }: { currentUserId: string }) {
  return (
    <FounderShell
      currentUserId={currentUserId}
      shellMode="member"
      belowHero={<RoleBanner variant="member" />}
    />
  );
}
