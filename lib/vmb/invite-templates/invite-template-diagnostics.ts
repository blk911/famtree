import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import type { VmbInviteTemplate } from "./invite-template-types";

export type NailInviteTemplateDiagnosticRow = {
  id: string;
  subject: string;
  headline: string;
  bodyPreview: string;
  ctaLabel: string;
  updatedAt?: string;
};

export type NailInviteTemplateDiagnosticSummary = {
  backend: "postgres" | "json";
  count: number;
  uniqueBodies: number;
  uniqueCtas: number;
  rows: NailInviteTemplateDiagnosticRow[];
};

export function bodyPreview(body: string, length = 100): string {
  const trimmed = body.trim();
  if (trimmed.length <= length) return trimmed;
  return `${trimmed.slice(0, length)}…`;
}

export function summarizeNailInviteTemplates(
  templates: VmbInviteTemplate[],
  backend: "postgres" | "json",
): NailInviteTemplateDiagnosticSummary {
  const sorted = [...templates].sort((a, b) => a.sortOrder - b.sortOrder);
  const uniqueBodies = new Set(sorted.map((row) => row.body.trim())).size;
  const uniqueCtas = new Set(sorted.map((row) => row.ctaLabel.trim())).size;

  return {
    backend,
    count: sorted.length,
    uniqueBodies,
    uniqueCtas,
    rows: sorted.map((row) => ({
      id: row.id,
      subject: row.subject,
      headline: row.headline,
      bodyPreview: bodyPreview(row.body),
      ctaLabel: row.ctaLabel,
      updatedAt: row.updatedAt,
    })),
  };
}

export async function loadNailInviteTemplateDiagnostics(): Promise<NailInviteTemplateDiagnosticSummary> {
  const { listInviteTemplates } = await import("./invite-template-store");
  const backend = await resolveVmbStorageBackend();
  const templates = await listInviteTemplates("nails", { includeInactive: true });
  return summarizeNailInviteTemplates(templates, backend);
}

export function printNailInviteTemplateDiagnostics(summary: NailInviteTemplateDiagnosticSummary): void {
  console.log(`active storage backend: ${summary.backend}`);
  console.log(`count: ${summary.count}`);
  console.log(`unique bodies: ${summary.uniqueBodies}`);
  console.log(`unique CTA labels: ${summary.uniqueCtas}`);
  console.log("");

  for (const row of summary.rows) {
    console.log(`--- ${row.id} ---`);
    console.log(`subject: ${row.subject}`);
    console.log(`headline: ${row.headline}`);
    console.log(`body: ${row.bodyPreview}`);
    console.log(`ctaLabel: ${row.ctaLabel}`);
    console.log(`updatedAt: ${row.updatedAt ?? "(none)"}`);
    console.log("");
  }
}

export function validateNailInviteTemplateDiagnostics(
  summary: NailInviteTemplateDiagnosticSummary,
): string[] {
  const errors: string[] = [];
  if (summary.count !== 10) {
    errors.push(`expected 10 templates, got ${summary.count}`);
  }
  if (summary.uniqueBodies < 10) {
    errors.push(`expected 10 unique bodies, got ${summary.uniqueBodies}`);
  }
  if (summary.uniqueCtas < 8) {
    errors.push(`expected at least 8 unique CTA labels, got ${summary.uniqueCtas}`);
  }
  return errors;
}
