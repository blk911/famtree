// lib/intelligence/salon/backoffice/providers/glossgenius-parser.ts
// Maps GlossGenius export rows into normalized salon records.

import type {
  NormalizedSalonRecord,
  NormalizedSalonClient,
  NormalizedSalonAppointment,
  NormalizedSalonPayment,
  SalonBackOfficeEntity,
  SchemaDetection,
} from "../types";

function cell(row: Record<string, string>, header?: string): string {
  if (!header) return "";
  return (row[header] ?? "").trim();
}

function parseNumber(value: string): number | undefined {
  if (!value) return undefined;
  const n = Number.parseFloat(value.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function parseTags(value: string): string[] | undefined {
  if (!value) return undefined;
  const parts = value.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

function rowToRaw(row: Record<string, string>): Record<string, unknown> {
  return { ...row };
}

const CLIENT_ALIASES: Record<string, string[]> = {
  fullName: ["name", "client name", "full name"],
  firstName: ["first name", "firstname"],
  lastName: ["last name", "lastname"],
  email: ["email", "client email", "e-mail"],
  phone: ["phone", "mobile", "phone number", "cell"],
  birthday: ["birthday", "date of birth", "dob", "birth date"],
  tags: ["tags", "labels"],
  notes: ["notes", "client notes"],
};

const APPT_ALIASES: Record<string, string[]> = {
  clientName: ["client", "client name", "name"],
  serviceName: ["service", "service name", "treatment"],
  staffName: ["staff", "provider", "team member", "professional"],
  appointmentDate: ["appointment date", "date", "start time", "booked for"],
  status: ["status", "appointment status"],
  price: ["price", "amount", "total"],
};

const PAY_ALIASES: Record<string, string[]> = {
  clientName: ["client", "client name", "name"],
  serviceName: ["service", "service name"],
  staffName: ["staff", "provider", "professional"],
  paymentDate: ["payment date", "date", "paid at"],
  amount: ["amount", "total", "sale total", "net sales"],
  tip: ["tip", "gratuity"],
  paymentStatus: ["payment status", "status"],
};

function resolveHeader(
  row: Record<string, string>,
  key: string,
  mappings: Record<string, string>,
  aliases: Record<string, string[]>,
): string {
  if (mappings[key]) return cell(row, mappings[key]);
  const headers = Object.keys(row);
  const norm = (s: string) => s.toLowerCase().trim();
  for (const alias of aliases[key] ?? []) {
    const hit = headers.find((h) => norm(h) === alias || norm(h).includes(alias));
    if (hit) return cell(row, hit);
  }
  return "";
}

function parseClientRow(
  row: Record<string, string>,
  mappings: Record<string, string>,
): NormalizedSalonClient {
  const full = resolveHeader(row, "fullName", mappings, CLIENT_ALIASES);
  const first = resolveHeader(row, "firstName", mappings, CLIENT_ALIASES);
  const last = resolveHeader(row, "lastName", mappings, CLIENT_ALIASES);
  return {
    type: "client",
    fullName: full || [first, last].filter(Boolean).join(" ") || undefined,
    firstName: first || undefined,
    lastName: last || undefined,
    email: resolveHeader(row, "email", mappings, CLIENT_ALIASES) || undefined,
    phone: resolveHeader(row, "phone", mappings, CLIENT_ALIASES) || undefined,
    birthday: resolveHeader(row, "birthday", mappings, CLIENT_ALIASES) || undefined,
    tags: parseTags(resolveHeader(row, "tags", mappings, CLIENT_ALIASES)),
    notes: resolveHeader(row, "notes", mappings, CLIENT_ALIASES) || undefined,
    raw: rowToRaw(row),
  };
}

function parseAppointmentRow(
  row: Record<string, string>,
  mappings: Record<string, string>,
): NormalizedSalonAppointment {
  return {
    type: "appointment",
    clientName: resolveHeader(row, "clientName", mappings, APPT_ALIASES) || undefined,
    serviceName: resolveHeader(row, "serviceName", mappings, APPT_ALIASES) || undefined,
    staffName: resolveHeader(row, "staffName", mappings, APPT_ALIASES) || undefined,
    appointmentDate: resolveHeader(row, "appointmentDate", mappings, APPT_ALIASES) || undefined,
    status: resolveHeader(row, "status", mappings, APPT_ALIASES) || undefined,
    price: parseNumber(resolveHeader(row, "price", mappings, APPT_ALIASES)),
    raw: rowToRaw(row),
  };
}

function parsePaymentRow(
  row: Record<string, string>,
  mappings: Record<string, string>,
): NormalizedSalonPayment {
  return {
    type: "payment",
    clientName: resolveHeader(row, "clientName", mappings, PAY_ALIASES) || undefined,
    serviceName: resolveHeader(row, "serviceName", mappings, PAY_ALIASES) || undefined,
    staffName: resolveHeader(row, "staffName", mappings, PAY_ALIASES) || undefined,
    paymentDate: resolveHeader(row, "paymentDate", mappings, PAY_ALIASES) || undefined,
    amount: parseNumber(resolveHeader(row, "amount", mappings, PAY_ALIASES)),
    tip: parseNumber(resolveHeader(row, "tip", mappings, PAY_ALIASES)),
    paymentStatus: resolveHeader(row, "paymentStatus", mappings, PAY_ALIASES) || undefined,
    raw: rowToRaw(row),
  };
}

function isMappedRecord(r: NormalizedSalonRecord): boolean {
  if (r.type === "client") {
    return Boolean(r.fullName || r.email || r.phone || r.firstName);
  }
  if (r.type === "appointment") {
    return Boolean(r.clientName || r.serviceName || r.appointmentDate);
  }
  return Boolean(r.clientName || r.amount || r.paymentDate);
}

export function parseGlossGeniusRows(
  rows: Record<string, string>[],
  detection: SchemaDetection,
  entityOverride?: SalonBackOfficeEntity,
): { records: NormalizedSalonRecord[]; mappedCount: number } {
  const entity = entityOverride && entityOverride !== "unknown"
    ? entityOverride
    : detection.entity;

  const records: NormalizedSalonRecord[] = [];
  for (const row of rows) {
    let rec: NormalizedSalonRecord;
    if (entity === "appointments") {
      rec = parseAppointmentRow(row, detection.mappings);
    } else if (entity === "payments") {
      rec = parsePaymentRow(row, detection.mappings);
    } else {
      rec = parseClientRow(row, detection.mappings);
    }
    if (isMappedRecord(rec)) records.push(rec);
  }

  return { records, mappedCount: records.length };
}
