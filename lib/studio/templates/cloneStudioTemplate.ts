import { DEB_DAZZLE_STUDIO_TEMPLATE } from "@/lib/studio/templates/deb-dazzle-template";
import type { DebDazzleStudioTemplate } from "@/lib/studio/templates/deb-dazzle-template";

/** Deep clone for mutable draft state — never mutate exported canonical constants. */
export function cloneStudioTemplate<T>(template: T): T {
  return structuredClone(template) as T;
}

export function cloneDebDazzleStudioTemplate(): DebDazzleStudioTemplate {
  return cloneStudioTemplate(DEB_DAZZLE_STUDIO_TEMPLATE);
}
