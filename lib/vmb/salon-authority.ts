import crypto from "crypto";
import { getJwtSecretKey } from "@/lib/auth/jwt-secret";

function signature(salonId: string): string {
  return crypto
    .createHmac("sha256", Buffer.from(getJwtSecretKey()))
    .update(`vmb-salon:${salonId}`)
    .digest("base64url");
}

export function createVmbSalonSession(salonId: string): string {
  const id = salonId.trim();
  if (!id) throw new Error("salonId required");
  return `${encodeURIComponent(id)}.${signature(id)}`;
}

export function verifyVmbSalonSession(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return undefined;
  let salonId: string;
  try {
    salonId = decodeURIComponent(raw.slice(0, separator)).trim();
  } catch {
    return undefined;
  }
  const supplied = raw.slice(separator + 1);
  const expected = signature(salonId);
  if (!salonId || supplied.length !== expected.length) return undefined;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)) ? salonId : undefined;
}
