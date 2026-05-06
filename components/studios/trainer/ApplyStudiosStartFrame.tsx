"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ApplyStudioHeroFields, ApplyStudioIntro } from "@/lib/studios/applyPreview";
import type { Provider } from "@/types/studios";
import type { StudioBuilderNavMode } from "@/lib/studios/builderNavMode";
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
  initialNavMode,
  children,
}: {
  initialHero: ApplyStudioHeroFields;
  initialIntro: ApplyStudioIntro;
  foldImageUrl: string;
  provider: Pick<Provider, "displayName" | "imageUrl">;
  accent: string;
  editorPreviewSlug?: string | null;
  draftStorageKey?: string;
  /** Resolved from `/studios/start` URL — keeps member breadcrumb links and shell mode aligned. */
  initialNavMode: StudioBuilderNavMode;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [liveName, setLiveName] = useState(initialHero.fullName);
  const [studioViewMode, setStudioViewModeState] = useState<StudioBuilderNavMode>(initialNavMode);

  useEffect(() => {
    setStudioViewModeState(initialNavMode);
  }, [initialNavMode]);

  const pushNavModeToUrl = useCallback(
    (next: StudioBuilderNavMode) => {
      const basePath = pathname ?? "/studios/start";
      const qs = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      qs.delete("previewNav");
      if (next === "published") {
        qs.delete("mode");
      } else {
        qs.set("mode", next);
      }
      const tail = qs.toString();
      router.replace(tail ? `${basePath}?${tail}` : basePath, { scroll: false });
    },
    [pathname, router],
  );

  const setStudioViewMode = useCallback(
    (next: StudioBuilderNavMode) => {
      setStudioViewModeState(next);
      pushNavModeToUrl(next);
    },
    [pushNavModeToUrl],
  );

  const handleHeroCommit = (next: ApplyStudioHeroFields) => {
    setLiveName(next.fullName);
  };

  const shellValue = useMemo(
    () => ({
      mode: studioViewMode,
      setMode: setStudioViewMode,
    }),
    [studioViewMode, setStudioViewMode],
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
