// lib/intelligence/salon/backoffice/schema-detector.ts
// Heuristic provider/entity detection from export headers (flexible casing).

import type {
  SalonBackOfficeEntity,
  SalonBackOfficeProvider,
  SchemaConfidence,
  SchemaDetection,
} from "./types";

function norm(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, " ");
}

type FieldRule = { key: string; patterns: string[] };

const CLIENT_FIELDS: FieldRule[] = [
  { key: "fullName", patterns: ["name", "client name", "full name", "customer name"] },
  { key: "firstName", patterns: ["first name", "firstname", "first"] },
  { key: "lastName", patterns: ["last name", "lastname", "last"] },
  { key: "email", patterns: ["email", "client email", "e-mail"] },
  { key: "phone", patterns: ["phone", "mobile", "phone number", "cell"] },
  { key: "birthday", patterns: ["birthday", "date of birth", "dob", "birth date"] },
  { key: "tags", patterns: ["tags", "labels", "tag"] },
  { key: "notes", patterns: ["notes", "client notes", "note"] },
  { key: "lastVisit", patterns: ["last visit", "last appointment", "last seen"] },
  { key: "clientSince", patterns: ["client since", "member since", "since"] },
  { key: "totalSpent", patterns: ["total spent", "lifetime value", "ltv", "total sales"] },
];

const APPOINTMENT_FIELDS: FieldRule[] = [
  { key: "clientName", patterns: ["client", "client name", "name", "customer"] },
  { key: "serviceName", patterns: ["service", "service name", "treatment", "appointment type"] },
  { key: "staffName", patterns: ["staff", "provider", "team member", "professional", "stylist"] },
  { key: "appointmentDate", patterns: ["appointment date", "date", "start time", "booked for", "scheduled"] },
  { key: "status", patterns: ["status", "appointment status"] },
  { key: "price", patterns: ["price", "amount", "total", "service price"] },
];

const PAYMENT_FIELDS: FieldRule[] = [
  { key: "clientName", patterns: ["client", "client name", "name", "customer"] },
  { key: "serviceName", patterns: ["service", "service name", "treatment"] },
  { key: "staffName", patterns: ["staff", "provider", "professional"] },
  { key: "paymentDate", patterns: ["payment date", "date", "paid at", "transaction date"] },
  { key: "amount", patterns: ["amount", "total", "sale total", "net sales", "gross"] },
  { key: "tip", patterns: ["tip", "gratuity"] },
  { key: "paymentStatus", patterns: ["payment status", "status", "paid"] },
];

function matchHeader(header: string, patterns: string[]): boolean {
  const n = norm(header);
  return patterns.some((p) => n === p || n.includes(p));
}

function buildMappings(
  headers: string[],
  rules: FieldRule[],
): { mappings: Record<string, string>; matched: Set<string> } {
  const mappings: Record<string, string> = {};
  const matched = new Set<string>();
  for (const rule of rules) {
    for (const h of headers) {
      if (matchHeader(h, rule.patterns)) {
        mappings[rule.key] = h;
        matched.add(h);
        break;
      }
    }
  }
  return { mappings, matched };
}

function scoreEntity(headers: string[], rules: FieldRule[]): number {
  let score = 0;
  for (const rule of rules) {
    if (headers.some((h) => matchHeader(h, rule.patterns))) score++;
  }
  return score;
}

function detectProvider(headers: string[]): SalonBackOfficeProvider {
  const n = headers.map(norm);
  const glossSignals = [
    "client since",
    "last visit",
    "total spent",
    "glossgenius",
    "appointment date",
  ];
  const hasEmail = n.some((h) => h.includes("email"));
  const hasPhone = n.some((h) => h.includes("phone") || h === "mobile");
  const hasName = n.some((h) => h === "name" || h.includes("client name") || h.includes("first name"));
  const glossHits = glossSignals.filter((s) => n.some((h) => h.includes(s))).length;

  if ((hasEmail && hasName) || (hasPhone && hasName) || glossHits >= 2) {
    return "glossgenius";
  }
  if (n.some((h) => h.includes("vagaro"))) return "vagaro";
  if (n.some((h) => h.includes("square"))) return "square";
  return "unknown";
}

function detectEntity(headers: string[]): SalonBackOfficeEntity {
  const clientScore = scoreEntity(headers, CLIENT_FIELDS);
  const apptScore = scoreEntity(headers, APPOINTMENT_FIELDS);
  const payScore = scoreEntity(headers, PAYMENT_FIELDS);
  const max = Math.max(clientScore, apptScore, payScore);
  if (max === 0) return "unknown";
  if (clientScore === max && clientScore >= apptScore && clientScore >= payScore) return "clients";
  if (apptScore === max) return "appointments";
  if (payScore === max) return "payments";
  return "unknown";
}

function rulesForEntity(entity: SalonBackOfficeEntity): FieldRule[] {
  switch (entity) {
    case "clients":
      return CLIENT_FIELDS;
    case "appointments":
      return APPOINTMENT_FIELDS;
    case "payments":
      return PAYMENT_FIELDS;
    default:
      return [...CLIENT_FIELDS, ...APPOINTMENT_FIELDS, ...PAYMENT_FIELDS];
  }
}

function confidenceFromMappings(mapped: number, total: number): SchemaConfidence {
  if (total === 0) return "low";
  const ratio = mapped / total;
  if (ratio >= 0.5 && mapped >= 3) return "high";
  if (ratio >= 0.25 || mapped >= 2) return "medium";
  return "low";
}

export function detectSalonBackOfficeSchema(
  headers: string[],
  _rows: Record<string, string>[],
): SchemaDetection {
  const provider = detectProvider(headers);
  const entity = detectEntity(headers);
  const rules = rulesForEntity(entity === "unknown" ? "clients" : entity);
  const { mappings, matched } = buildMappings(headers, rules);
  const unmappedHeaders = headers.filter((h) => !matched.has(h));
  const schemaConfidence = confidenceFromMappings(matched.size, headers.length);

  return {
    provider,
    entity: entity === "unknown" ? detectEntity(headers) : entity,
    schemaConfidence,
    mappings,
    unmappedHeaders,
  };
}
