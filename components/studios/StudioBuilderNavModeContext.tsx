"use client";

import { createContext, useContext, type ReactNode } from "react";

/** `/studios/start` shell: edit = builder, preview/published = client-style listing (owner can return to edit). */
export type StudioBuilderNavMode = "edit" | "preview" | "published";

export type StudioBuilderShellContextValue = {
  mode: StudioBuilderNavMode;
  setMode: (next: StudioBuilderNavMode) => void;
};

const StudioBuilderShellContext = createContext<StudioBuilderShellContextValue | null>(null);

export function StudioBuilderShellProvider({
  value,
  children,
}: {
  value: StudioBuilderShellContextValue;
  children: ReactNode;
}) {
  return <StudioBuilderShellContext.Provider value={value}>{children}</StudioBuilderShellContext.Provider>;
}

export function useStudioBuilderShellOptional(): StudioBuilderShellContextValue | null {
  return useContext(StudioBuilderShellContext);
}

export function useStudioBuilderNavMode(): StudioBuilderNavMode {
  return useContext(StudioBuilderShellContext)?.mode ?? "edit";
}
