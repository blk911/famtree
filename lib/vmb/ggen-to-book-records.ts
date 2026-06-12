import crypto from "crypto";
import type { NormalizedSalonRecord } from "@/lib/intelligence/salon/backoffice/types";
import type { VmbBookRecord } from "@/types/vmb/provider-ingest";

function stableId(seed: string): string {
  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

function clientNameFromRecord(record: NormalizedSalonRecord): string | undefined {
  if (record.type === "client") {
    const full = record.fullName?.trim();
    if (full) return full;
    const joined = [record.firstName, record.lastName].filter(Boolean).join(" ").trim();
    return joined || undefined;
  }
  return record.clientName?.trim() || undefined;
}

/** Map GGEN / back-office normalized rows into VMB book records for Find The Money analysis. */
export function ggenNormalizedToVmbBookRecords(
  records: NormalizedSalonRecord[],
): VmbBookRecord[] {
  const out: VmbBookRecord[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const clientName = clientNameFromRecord(record);
    if (!clientName) continue;

    const key = clientName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (record.type === "client") {
      out.push({
        id: stableId(`ggen-client|${clientName}|${i}`),
        clientName,
        email: record.email,
        phone: record.phone,
        notes: record.notes,
      });
      continue;
    }

    if (record.type === "appointment") {
      out.push({
        id: stableId(`ggen-appt|${clientName}|${record.serviceName ?? ""}|${i}`),
        clientName,
        email: record.clientEmail,
        phone: record.clientPhone,
        serviceName: record.serviceName,
        providerName: record.staffName,
        lastVisitDate: record.appointmentDate,
        amountSpent: record.price,
      });
      continue;
    }

    if (record.type === "payment") {
      out.push({
        id: stableId(`ggen-pay|${clientName}|${record.serviceName ?? ""}|${i}`),
        clientName,
        serviceName: record.serviceName,
        providerName: record.staffName,
        lastVisitDate: record.paymentDate,
        amountSpent: record.amount,
      });
    }
  }

  return out;
}

export function countGgenNormalized(records: NormalizedSalonRecord[]): {
  convertedRecordCount: number;
  convertedClientCount: number;
  convertedAppointmentCount: number;
} {
  let convertedAppointmentCount = 0;
  const clients = new Set<string>();

  for (const record of records) {
    const name = clientNameFromRecord(record);
    if (!name) continue;
    clients.add(name.toLowerCase());
    if (record.type === "appointment") convertedAppointmentCount++;
  }

  return {
    convertedRecordCount: records.length,
    convertedClientCount: clients.size,
    convertedAppointmentCount,
  };
}
