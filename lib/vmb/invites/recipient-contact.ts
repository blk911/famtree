import crypto from "crypto";

export type RecipientContactKind = "email" | "phone";

export type NormalizedRecipientContact = {
  kind: RecipientContactKind;
  value: string;
};

export function normalizeRecipientContact(raw: string): NormalizedRecipientContact | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { kind: "email", value: email };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return { kind: "phone", value: digits };
}

export function hashInviteClaimContact(inviteId: string, contact: NormalizedRecipientContact): string {
  return crypto
    .createHash("sha256")
    .update(`${inviteId.trim()}:${contact.kind}:${contact.value}`)
    .digest("hex")
    .slice(0, 24);
}

export function maskRecipientContactSummary(contact: NormalizedRecipientContact): string {
  if (contact.kind === "email") {
    const [local, domain] = contact.value.split("@");
    if (!domain) return "***";
    const visible = local.length <= 1 ? "*" : `${local.slice(0, 1)}***`;
    return `${visible}@${domain}`;
  }
  return `***-${contact.value.slice(-4)}`;
}

export function normalizeRecipientName(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) return null;
  return trimmed;
}
