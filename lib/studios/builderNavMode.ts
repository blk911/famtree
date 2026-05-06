export type StudioBuilderNavMode = "edit" | "preview" | "published";

/** `/studios/start` — default surface is published-style listing; `?mode=edit` opens the builder. */
export function parseStudioBuilderNavModeFromSearchParams(sp: {
  mode?: string | string[];
  previewNav?: string | string[];
}): StudioBuilderNavMode {
  const rawMode = Array.isArray(sp.mode) ? sp.mode[0] : sp.mode;
  const rawPreviewNav = Array.isArray(sp.previewNav) ? sp.previewNav[0] : sp.previewNav;

  if (rawMode === "edit") return "edit";
  if (rawMode === "preview") return "preview";
  if (rawMode === "published") return "published";

  if (rawPreviewNav === "1") return "preview";

  return "published";
}
