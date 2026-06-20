import { resolveActiveBook, type ResolveActiveBookInput, type ResolvedActiveBook } from "@/lib/vmb/active-book-resolver";
import { maybeAutoBindAdminDemoBook } from "@/lib/vmb/admin-demo-book";

/**
 * Resolve active book for a salon session, auto-binding the admin demo book in dev/test
 * when configured and the session has no active book yet.
 */
export async function resolveActiveBookForSession(
  trialId: string,
  input: ResolveActiveBookInput = {},
): Promise<ResolvedActiveBook> {
  const trimmedTrialId = trialId.trim();
  if (!trimmedTrialId) {
    return { hasActiveBook: false, source: "none" };
  }

  const initial = await resolveActiveBook(trimmedTrialId, input);
  if (initial.hasActiveBook) {
    return initial;
  }

  const auto = await maybeAutoBindAdminDemoBook(trimmedTrialId);
  if (!auto.bound) {
    return initial;
  }

  return resolveActiveBook(trimmedTrialId, input);
}
