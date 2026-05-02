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
  children,
}: {
  initialHero: ApplyStudioHeroFields;
  provider: Pick<Provider, "displayName" | "imageUrl">;
  accent: string;
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
        onHeroCommit={handleHeroCommit}
      />
      {children}
    </ApplyStudioLiveNameContext.Provider>
  );
}
