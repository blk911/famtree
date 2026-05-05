"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Builder-only: switches hero nav between workflow anchors and client-facing anchors. */
export type StudioBuilderNavMode = "edit" | "preview";

const StudioBuilderNavModeContext = createContext<StudioBuilderNavMode>("edit");

export function StudioBuilderNavModeProvider({
  value,
  children,
}: {
  value: StudioBuilderNavMode;
  children: ReactNode;
}) {
  return <StudioBuilderNavModeContext.Provider value={value}>{children}</StudioBuilderNavModeContext.Provider>;
}

export function useStudioBuilderNavMode(): StudioBuilderNavMode {
  return useContext(StudioBuilderNavModeContext);
}
