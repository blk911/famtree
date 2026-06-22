import crypto from "crypto";

export function generateRecipientToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashRecipientToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}
