"use client";

import { FounderShell } from "@/components/aihsafe/founder/FounderShell";
import { RoleBanner } from "@/components/aihsafe/roles/RoleBanner";

export function FounderView({ currentUserId }: { currentUserId: string }) {
  return (
    <FounderShell
      currentUserId={currentUserId}
      shellMode="founder"
      belowHero={<RoleBanner variant="founder" />}
    />
  );
}
