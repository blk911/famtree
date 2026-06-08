"use client";

import { ClearRuntimeButton } from "@/components/admin/runtime/ClearRuntimeButton";
import { getRuntimeClearTarget } from "@/lib/runtime/clear-runtime-config";

const target = getRuntimeClearTarget("transpo");

export function TranspoClearRuntimeAction() {
  return (
    <ClearRuntimeButton
      scope="transpo"
      label={target.label}
      description="Clears generated Transpo artifacts only. Seeds, research task states, and evidence overrides are preserved."
      suggestedRebuildCommands={target.suggestedRebuildCommands}
    />
  );
}
