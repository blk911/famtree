"use client";

import { ClearRuntimeButton } from "@/components/admin/runtime/ClearRuntimeButton";
import { getRuntimeClearTarget } from "@/lib/runtime/clear-runtime-config";

const target = getRuntimeClearTarget("salon");

export function SalonClearRuntimeAction() {
  return (
    <ClearRuntimeButton
      scope="salon"
      label={target.label}
      description="Clears generated Salon/Sola/Market artifacts only. Seeds and review states are preserved."
      suggestedRebuildCommands={target.suggestedRebuildCommands}
    />
  );
}
