// lib/intelligence/salon/google-identity/google-identity-connection.ts
// Server-runtime GOOGLE_MAPS_API_KEY detection (no secret values in logs/responses).

const ENV_VAR = "GOOGLE_MAPS_API_KEY";

export type GoogleIdentityConnectionDiagnostics = {
  hasGoogleMapsKey: boolean;
  keyLength: number;
  providerConnected: boolean;
  providerConnectionReason: string;
};

function readMapsApiKey(): string | undefined {
  const raw = process.env[ENV_VAR];
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

export function getGoogleMapsApiKey(): string | undefined {
  return readMapsApiKey();
}

export function getGoogleIdentityConnectionDiagnostics(): GoogleIdentityConnectionDiagnostics {
  const raw = process.env[ENV_VAR];
  const trimmed = readMapsApiKey();
  const hasGoogleMapsKey = Boolean(trimmed);
  const keyLength = trimmed?.length ?? 0;

  let providerConnectionReason: string;
  if (hasGoogleMapsKey) {
    providerConnectionReason = `${ENV_VAR} is set in the Next.js server runtime.`;
  } else if (raw != null && raw.length > 0) {
    providerConnectionReason = `${ENV_VAR} is present but empty or whitespace-only after trim.`;
  } else if (typeof process.env[ENV_VAR] === "undefined") {
    providerConnectionReason = `${ENV_VAR} is not defined in the server runtime. Add it to .env.local (or deployment env) and restart the dev server.`;
  } else {
    providerConnectionReason = `${ENV_VAR} is defined but has no usable value.`;
  }

  return {
    hasGoogleMapsKey,
    keyLength,
    providerConnected: hasGoogleMapsKey,
    providerConnectionReason,
  };
}

export function isSalonGoogleDataSourceConnected(): boolean {
  return getGoogleIdentityConnectionDiagnostics().providerConnected;
}
