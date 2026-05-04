/** Where studio UI is rendered and what powers it. */
export type StudioMode = "public" | "owner-preview" | "builder" | "admin-template";

/** Who is viewing a live studio URL (controls edit chrome only). */
export type StudioViewerRole = "public" | "owner";

export function studioViewerCanEdit(role: StudioViewerRole): boolean {
  return role === "owner";
}
