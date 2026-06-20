import { clearActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import { clearWorkspaceActiveBookBinding } from "@/lib/vmb/workspace-store";

export async function clearActiveBookBindingForSalon(
  salonId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedSalon = salonId.trim();
  if (!trimmedSalon) {
    return { ok: false, error: "salonId is required" };
  }

  const pointerResult = await clearActiveBookPointer(trimmedSalon);
  if ("error" in pointerResult) {
    return { ok: false, error: pointerResult.error };
  }

  const workspaceResult = await clearWorkspaceActiveBookBinding(trimmedSalon);
  if ("error" in workspaceResult) {
    return { ok: false, error: workspaceResult.error };
  }

  return { ok: true };
}
