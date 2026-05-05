"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApplyStudioHeroFields, ApplyStudioIntro } from "@/lib/studios/applyPreview";
import type { Provider } from "@/types/studios";
import type { StudioBuilderNavMode } from "@/components/studios/StudioBuilderNavModeContext";
import { StudioBuilderShellProvider } from "@/components/studios/StudioBuilderNavModeContext";
import { ApplyStudioHero } from "./ApplyStudioHero";
import { ApplyStudioLiveNameContext } from "./ApplyStudioLiveNameContext";

export function ApplyStudiosStartFrame({
  initialHero,
  initialIntro,
  foldImageUrl,
  provider,
  accent,
  editorPreviewSlug = null,
  draftStorageKey,
  children,
}: {
  initialHero: ApplyStudioHeroFields;
  initialIntro: ApplyStudioIntro;
  foldImageUrl: string;
  provider: Pick<Provider, "displayName" | "imageUrl">;
  accent: string;
  editorPreviewSlug?: string | null;
  draftStorageKey?: string;
  children: ReactNode;
}) {
  const [liveName, setLiveName] = useState(initialHero.fullName);
  const [studioViewMode, setStudioViewMode] = useState<StudioBuilderNavMode>("edit");

  useEffect(() => {
    /** QA / wiring hook: `?previewNav=1` mirrors preview-mode business nav without restoring Preview chrome yet. */
    try {
      const q = new URLSearchParams(window.location.search).get("previewNav");
      if (q === "1") setStudioViewMode("preview");
    } catch {
      /* ignore */
    }
  }, []);

  const handleHeroCommit = (next: ApplyStudioHeroFields) => {
    setLiveName(next.fullName);
  };

  const shellValue = useMemo(
    () => ({
      mode: studioViewMode,
      setMode: setStudioViewMode,
    }),
    [studioViewMode],
  );

  return (
    <StudioBuilderShellProvider value={shellValue}>
      <ApplyStudioLiveNameContext.Provider value={liveName}>
        <ApplyStudioHero
          initialHero={initialHero}
          initialIntro={initialIntro}
          foldImageUrl={foldImageUrl}
          displayName={provider.displayName}
          imageUrl={provider.imageUrl}
          accent={accent}
          previewSlug={editorPreviewSlug}
          draftStorageKey={draftStorageKey}
          studioViewMode={studioViewMode}
          setStudioNavMode={setStudioViewMode}
          onHeroCommit={handleHeroCommit}
        />
        {children}
      </ApplyStudioLiveNameContext.Provider>
    </StudioBuilderShellProvider>
  );
}
