/**
 * Shared HS256 key for jose (middleware Edge + Node route handlers).
 * Lazy-read env on each call so Edge/serverless always sees runtime vars (not a stale build-time inline).
 *
 * Trims JWT_SECRET; treats blank as unset so Node and Edge never diverge on `"" ?? fallback`.
 */
export function getJwtSecretKey(): Uint8Array {
  const trimmed = process.env.JWT_SECRET?.trim() ?? "";
  const secret =
    trimmed.length >= 16
      ? trimmed
      : process.env.NODE_ENV !== "production"
        ? "dev-secret-change-in-production"
        : trimmed.length > 0
          ? trimmed
          : "dev-secret-change-in-production";

  if (process.env.NODE_ENV === "production" && trimmed.length < 16) {
    console.error(
      "[auth] JWT_SECRET missing or shorter than 16 chars — set a strong secret in hosting env (Vercel → Settings → Environment Variables)",
    );
  }

  return new TextEncoder().encode(secret);
}
