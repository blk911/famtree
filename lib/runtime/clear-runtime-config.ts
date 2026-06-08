// lib/runtime/clear-runtime-config.ts

export type RuntimeClearScope = "salon" | "transpo" | "hcare" | "labs";

export interface RuntimeClearTarget {
  scope: RuntimeClearScope;
  label: string;
  generatedGlobs: string[];
  preserveGlobs: string[];
  suggestedRebuildCommands: string[];
}

export const RUNTIME_CLEAR_TARGETS: Record<RuntimeClearScope, RuntimeClearTarget> = {
  transpo: {
    scope: "transpo",
    label: "Transpo",
    generatedGlobs: ["runtime-data/transpo/*.generated.json"],
    preserveGlobs: [
      "runtime-data/transpo/*.seed.json",
      "runtime-data/transpo/research-task-state.json",
      "runtime-data/transpo/evidence-overrides.json",
    ],
    suggestedRebuildCommands: ["npm run build:transpo"],
  },
  salon: {
    scope: "salon",
    label: "Salon",
    generatedGlobs: [
      "runtime-data/sola/*.generated.json",
      "runtime-data/markets/market-candidates.generated.json",
      "runtime-data/studios/**/*.generated.json",
      "runtime-data/studios/*.generated.json",
      "runtime-data/salon/**/*.generated.json",
      "runtime-data/salon/*.generated.json",
    ],
    preserveGlobs: [
      "runtime-data/sola/sola-review-states.json",
      "runtime-data/sola/sola-slugs.seed.json",
      "runtime-data/**/review-states.json",
      "runtime-data/**/*.seed.json",
    ],
    suggestedRebuildCommands: [
      "npm run build:markets",
      "npm run harvest:sola -- --seed --enrich --api-only --reuse-artifacts",
      "npm run build:sola:resolver",
    ],
  },
  hcare: {
    scope: "hcare",
    label: "HCare",
    generatedGlobs: [],
    preserveGlobs: ["runtime-data/hcare/**/*.seed.json", "runtime-data/hcare/**/review-states.json"],
    suggestedRebuildCommands: [],
  },
  labs: {
    scope: "labs",
    label: "Labs",
    generatedGlobs: [],
    preserveGlobs: ["runtime-data/labs/**/*.seed.json", "runtime-data/labs/**/review-states.json"],
    suggestedRebuildCommands: [],
  },
};

export function getRuntimeClearTarget(scope: RuntimeClearScope): RuntimeClearTarget {
  return RUNTIME_CLEAR_TARGETS[scope];
}
