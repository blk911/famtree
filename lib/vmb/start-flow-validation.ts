import type { VmbProviderPlatform } from "@/types/vmb/trial";

export type VmbStartFlowValidationInput = {
  provider: VmbProviderPlatform | "";
  ownerName: string;
  email: string;
  hasBookData: boolean;
};

export type VmbStartFlowValidationResult =
  | { ok: true }
  | { ok: false; message: string; field: "provider" | "identity" | "book" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateVmbStartFlowSubmit(
  input: VmbStartFlowValidationInput,
): VmbStartFlowValidationResult {
  if (!input.provider) {
    return {
      ok: false,
      field: "provider",
      message: "Choose your booking provider to continue.",
    };
  }
  const name = input.ownerName.trim();
  const email = input.email.trim();
  if (!name || !email) {
    return {
      ok: false,
      field: "identity",
      message: "Enter your name and salon email so we know where to send results.",
    };
  }
  if (!EMAIL_RE.test(email)) {
    return {
      ok: false,
      field: "identity",
      message: "Enter a valid salon email address.",
    };
  }
  if (!input.hasBookData) {
    return {
      ok: false,
      field: "book",
      message: "Upload or paste your client book, or use the sample book.",
    };
  }
  return { ok: true };
}
