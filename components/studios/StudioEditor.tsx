import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";
import type { NormalizedStudioEditorProps } from "@/lib/studio/templates/normalizeStudioTemplate";
import type { StudioBuilderNavMode } from "@/lib/studios/builderNavMode";

export type StudioEditorMode = "template-start";

/**
 * Canonical studio builder shell — `/studios/start` loads normalized fitness starter props.
 * Template sources: `lib/studio/templates/*` + `docs/studio-templates.md`.
 */
export function StudioEditor({
  initialStudio,
  mode,
  initialBuilderNavMode = "published",
  studioSurface = "member",
}: {
  initialStudio: NormalizedStudioEditorProps;
  mode: StudioEditorMode;
  /** Start route only — from URL on `/studios/start`; admin lab defaults to published listing. */
  initialBuilderNavMode?: StudioBuilderNavMode;
  studioSurface?: "member" | "admin";
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
      initialBuilderNavMode={initialBuilderNavMode}
      initialProofCards={initialStudio.proofCards}
      studioSurface={studioSurface}
    />
  );
}
