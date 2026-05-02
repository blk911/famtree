"use client";

import { createContext, useContext } from "react";

/** Populated only under `ApplyStudiosStartFrame` so offer modals track edited hero name. */
export const ApplyStudioLiveNameContext = createContext<string | undefined>(undefined);

export function useApplyStudioLiveName(fallback: string): string {
  const v = useContext(ApplyStudioLiveNameContext);
  return v ?? fallback;
}
