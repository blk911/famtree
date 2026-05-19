// Stable refs for derived notices — embedded in body for read-state without schema changes.

const REF_RE = /<!--vault-ref:([^>]+)-->/;

export function vaultRef(refKey: string): string {
  return `<!--vault-ref:${refKey}-->`;
}

export function parseVaultRef(body: string): string | null {
  const m = body.match(REF_RE);
  return m?.[1] ?? null;
}

export function stripVaultRef(body: string): string {
  return body.replace(REF_RE, "").trim();
}

export function derivedNoticeId(type: string, id: string): string {
  return `derived:${type}:${id}`;
}

export function parseDerivedNoticeId(noticeId: string): { type: string; id: string } | null {
  if (!noticeId.startsWith("derived:")) return null;
  const rest = noticeId.slice("derived:".length);
  const colon = rest.indexOf(":");
  if (colon <= 0) return null;
  return { type: rest.slice(0, colon), id: rest.slice(colon + 1) };
}

export function refKeyForDerived(parsed: { type: string; id: string }): string {
  if (parsed.type === "approval" && parsed.id.startsWith("requestor-")) {
    return `approval:requestor:${parsed.id.slice("requestor-".length)}`;
  }
  return `${parsed.type}:${parsed.id}`;
}
