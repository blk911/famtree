/** Dev/operator-only VMB APIs — hidden in production. */
export function isVmbDevOperatorApiEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function vmbDevOperatorApiDisabledResponse(): { ok: false; error: string } {
  return { ok: false, error: "Not available in production" };
}
