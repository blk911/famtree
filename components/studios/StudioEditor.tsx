import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";
import type { NormalizedStudioEditorProps } from "@/lib/studio/templates/normalizeStudioTemplate";

export type StudioEditorMode = "template-start";

/**
 * Canonical studio builder shell — `/studios/start` loads normalized template props only.
 * Read-only template sources live under `lib/studio/templates/*`; nothing here queries Deb’s live row.
 */
export function StudioEditor({
  initialStudio,
  mode,
}: {
  initialStudio: NormalizedStudioEditorProps;
  mode: StudioEditorMode;
}) {
  if (mode !== "template-start") {
    throw new Error(`StudioEditor: unsupported mode ${String(mode)}`);
  }

  return (
    <TrainerStudioShell
      variant="start"
      provider={initialStudio.provider}
      offers={initialStudio.offers}
      applyTemplate={{ hero: initialStudio.hero, intro: initialStudio.intro }}
      editorPreviewSlug={initialStudio.editorPreviewSlug}
      accentHex={initialStudio.accentHex}
      draftStorageKey={initialStudio.draftStorageKey}
      editorNavItems={initialStudio.navItems}
    />
  );
}
