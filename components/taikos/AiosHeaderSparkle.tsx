"use client";

import { useAios } from "@/components/taikos/AiosProvider";

type Props = {
  label?: string;
};

export function AiosHeaderSparkle({ label }: Props) {
  const { open, openPanel } = useAios();

  return (
    <button
      type="button"
      className="aios-header-sparkle"
      aria-label={`Open tAIkOS for ${label ?? "this page"}`}
      aria-pressed={open}
      onClick={() => void openPanel("page-assistant")}
      title="Open tAIkOS for this page"
    >
      <span aria-hidden>✨</span>
    </button>
  );
}
