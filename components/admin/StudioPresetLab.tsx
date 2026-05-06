"use client";

import { useMemo, useState } from "react";
import { StudioEditor } from "@/components/studios/StudioEditor";
import type { NormalizedStudioEditorProps } from "@/lib/studio/templates/normalizeStudioTemplate";
import { normalizeStudioTemplate } from "@/lib/studio/templates/normalizeStudioTemplate";
import {
  cloneFitnessStudioTemplate,
  cloneNeutralStudioTemplate,
} from "@/lib/studio/templates/cloneStudioTemplate";

type BuiltPreset = "neutral" | "fitness";

type TabDef =
  | { id: BuiltPreset; label: string; disabled?: false }
  | { id: string; label: string; disabled: true };

const PRESET_TABS: TabDef[] = [
  { id: "neutral", label: "Neutral (base)" },
  { id: "fitness", label: "Fitness" },
  { id: "nails", label: "Nails", disabled: true },
  { id: "hair", label: "Hair", disabled: true },
  { id: "wax-brow", label: "Wax · brow · lips", disabled: true },
  { id: "spa", label: "Spa", disabled: true },
  { id: "massage", label: "Massage", disabled: true },
];

function normalizedForPreset(preset: BuiltPreset): NormalizedStudioEditorProps {
  if (preset === "neutral") return normalizeStudioTemplate(cloneNeutralStudioTemplate());
  return normalizeStudioTemplate(cloneFitnessStudioTemplate());
}

export function StudioPresetLab() {
  const [preset, setPreset] = useState<BuiltPreset>("neutral");

  const initialStudio = useMemo(() => normalizedForPreset(preset), [preset]);

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div
        className="sticky top-0 z-[100] border-b border-stone-200 bg-white/95 backdrop-blur-sm"
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Admin · Studio presets
            </p>
            <p className="text-sm font-semibold text-stone-900">Live builder preview — saved envelopes only</p>
          </div>
          <nav className="flex flex-wrap gap-1.5" aria-label="Studio preset categories">
            {PRESET_TABS.map((tab) => {
              const active = !tab.disabled && tab.id === preset;
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={!!tab.disabled}
                  onClick={() => {
                    if (!tab.disabled) setPreset(tab.id as BuiltPreset);
                  }}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    border: active ? "1px solid #1c1917" : "1px solid #e7e5e4",
                    background: active ? "#1c1917" : "#fff",
                    color: active ? "#fff" : "#44403c",
                  }}
                >
                  {tab.label}
                  {tab.disabled ? " · soon" : ""}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-0 pb-16 pt-2">
        <StudioEditor
          key={preset}
          initialStudio={initialStudio}
          mode="template-start"
          initialBuilderNavMode="edit"
          studioSurface="admin"
        />
      </div>
    </div>
  );
}
