"use client";

import { useState, type ReactNode } from "react";
import type { ApplyStudioHeroFields } from "@/lib/studios/applyPreview";
import type { Provider } from "@/types/studios";
import { ApplyStudioHero } from "./ApplyStudioHero";
import { ApplyStudioLiveNameContext } from "./ApplyStudioLiveNameContext";

export function ApplyStudiosStartFrame({
  initialHero,
  provider,
  accent,
  editorPreviewSlug = null,
  draftStorageKey,
  editorNavItems,
  children,
}: {
  initialHero: ApplyStudioHeroFields;
  provider: Pick<Provider, "displayName" | "imageUrl">;
  accent: string;
  /** When set, Preview navigates to `/studios/{slug}`. */
  editorPreviewSlug?: string | null;
  draftStorageKey?: string;
  editorNavItems?: readonly { readonly href: string; readonly label: string }[];
  children: ReactNode;
}) {
  const [liveName, setLiveName] = useState(initialHero.fullName);

  const handleHeroCommit = (next: ApplyStudioHeroFields) => {
    setLiveName(next.fullName);
  };

  return (
    <ApplyStudioLiveNameContext.Provider value={liveName}>
      <ApplyStudioHero
        initialHero={initialHero}
        displayName={provider.displayName}
        imageUrl={provider.imageUrl}
        accent={accent}
        previewSlug={editorPreviewSlug}
        draftStorageKey={draftStorageKey}
        editorNavItems={editorNavItems}
        onHeroCommit={handleHeroCommit}
      />
      {children}
    </ApplyStudioLiveNameContext.Provider>
  );
}
