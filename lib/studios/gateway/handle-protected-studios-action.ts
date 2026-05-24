import { isProtectedStudiosHref } from "@/lib/studios/gateway/protected-urls";

/**
 * When `visitorType === "public_unknown"` and the user activates a guarded control,
 * open the Request Access modal instead of navigating — unless there is no target href
 * and the caller only needs a modal (omit `intendedHref`).
 */
export function handleProtectedStudiosAction(
  args: {
    canAccessPrivateActions: boolean;
    actionName: string;
    intendedHref?: string | null;
    openRequestAccess: (action: string, href?: string) => void;
  },
): boolean {
  if (args.canAccessPrivateActions) return true;
  const href = args.intendedHref?.trim();
  const hrefTriggersGate = !href || isProtectedStudiosHref(href);
  if (!hrefTriggersGate) return true;

  args.openRequestAccess(args.actionName, href || undefined);
  return false;
}
