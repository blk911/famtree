"use client";

import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  onClick: () => void;
  active?: boolean;
};

export function AiosLauncher({ onClick, active }: Props) {
  return (
    <button
      type="button"
      className="aios-launcher"
      onClick={onClick}
      aria-label="Open tAIkOS"
      aria-pressed={active}
      title="tAIkOS — your salon operating layer"
    >
      <span className="aios-launcher__spark" aria-hidden>
        ✨
      </span>
      <span className="aios-launcher__label">AIOS</span>
    </button>
  );
}

export const AIOS_THEME_ACCENT = VMB_THEME.accent;
