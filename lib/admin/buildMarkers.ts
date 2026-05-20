/** Set in next.config env when /admin/tools ships the intro preview panel. */
export const ADMIN_TOOLS_VIDEO_PREVIEW_FEATURE = "member-video-preview-v1";

export function deployIncludesAdminVideoPreview(): boolean {
  const raw = process.env.NEXT_PUBLIC_ADMIN_TOOLS_FEATURES ?? "";
  return raw.split(",").map((s) => s.trim()).includes(ADMIN_TOOLS_VIDEO_PREVIEW_FEATURE);
}
