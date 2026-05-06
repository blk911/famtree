import { FITNESS_STUDIO_TEMPLATE } from "@/lib/studio/templates/fitness-studio-template";
import type { FitnessStudioTemplate } from "@/lib/studio/templates/fitness-studio-template";
import { NEUTRAL_STUDIO_TEMPLATE } from "@/lib/studio/templates/neutral-studio-template";
import type { NeutralStudioTemplate } from "@/lib/studio/templates/neutral-studio-template";

export function cloneStudioTemplate<T>(template: T): T {
  return structuredClone(template) as T;
}

export function cloneFitnessStudioTemplate(): FitnessStudioTemplate {
  return cloneStudioTemplate(FITNESS_STUDIO_TEMPLATE);
}

export function cloneNeutralStudioTemplate(): NeutralStudioTemplate {
  return cloneStudioTemplate(NEUTRAL_STUDIO_TEMPLATE);
}
