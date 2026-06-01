// lib/intelligence/salon/backoffice/hidden-money-report.ts
// Deterministic Hidden Money Report from normalized import records.

import crypto from "crypto";
import type { HiddenMoneyReport, NormalizedSalonRecord } from "./types";

function parseMoneyDate(value?: string): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

function daysAgo(dateMs: number): number {
  return (Date.now() - dateMs) / (1000 * 60 * 60 * 24);
}

export function buildHiddenMoneyReport(
  importRunId: string,
  normalizedRecords: NormalizedSalonRecord[],
): HiddenMoneyReport {
  const clients = normalizedRecords.filter((r) => r.type === "client");
  const appointments = normalizedRecords.filter((r) => r.type === "appointment");
  const payments = normalizedRecords.filter((r) => r.type === "payment");

  let missingEmail = 0;
  let missingPhone = 0;
  for (const c of clients) {
    if (!c.email) missingEmail++;
    if (!c.phone) missingPhone++;
  }

  const amounts = payments
    .map((p) => p.amount)
    .filter((a): a is number => typeof a === "number");
  const totalRevenue = amounts.reduce((s, a) => s + a, 0);
  const avgTicket = amounts.length ? totalRevenue / amounts.length : undefined;

  const opportunities: HiddenMoneyReport["opportunities"] = [];
  let oppIdx = 0;
  const addOpp = (
    title: string,
    description: string,
    confidence: "high" | "medium" | "low",
    estimatedValue?: string,
  ) => {
    opportunities.push({
      id: `hm-${importRunId}-${oppIdx++}`,
      title,
      description,
      confidence,
      estimatedValue,
    });
  };

  if (clients.length > 0 && (missingEmail > 0 || missingPhone > 0)) {
    addOpp(
      "Missing Contact Info",
      `Recover missing contact info before launch/invite campaign (${missingEmail} missing email, ${missingPhone} missing phone).`,
      missingEmail + missingPhone > clients.length * 0.3 ? "high" : "medium",
    );
  }

  const clientSpend = new Map<string, number>();
  for (const p of payments) {
    const name = (p.clientName ?? "").trim().toLowerCase();
    if (!name || p.amount === undefined) continue;
    clientSpend.set(name, (clientSpend.get(name) ?? 0) + p.amount);
  }
  const spendValues = Array.from(clientSpend.values());
  const vipCount = spendValues.filter((v) => v >= 200).length;
  if (vipCount > 0) {
    const topTicket = spendValues.length ? Math.max(...spendValues) : 0;
    addOpp(
      "VIP Clients",
      `Invite top clients first — ${vipCount} client(s) show high spend or repeat payment activity.`,
      "high",
      `$${Math.round(topTicket)} top ticket`,
    );
  }

  let lapsed = 0;
  for (const c of clients) {
    const lastVisit = (c.raw?.["Last Visit"] ?? c.raw?.["last visit"]) as string | undefined;
    const t = parseMoneyDate(typeof lastVisit === "string" ? lastVisit : undefined);
    if (t !== null && daysAgo(t) > 90) lapsed++;
  }
  if (lapsed > 0) {
    addOpp(
      "Lapsed Clients",
      `${lapsed} client(s) with last visit older than 90 days — win-back campaign.`,
      "medium",
    );
  }

  const serviceCounts = new Map<string, number>();
  for (const a of appointments) {
    const svc = (a.serviceName ?? "").trim().toLowerCase();
    if (!svc) continue;
    serviceCounts.set(svc, (serviceCounts.get(svc) ?? 0) + 1);
  }
  for (const p of payments) {
    const svc = (p.serviceName ?? "").trim().toLowerCase();
    if (!svc) continue;
    serviceCounts.set(svc, (serviceCounts.get(svc) ?? 0) + 1);
  }
  const topService = Array.from(serviceCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topService && topService[1] >= 3) {
    addOpp(
      "Service Bundle",
      `Package top recurring service "${topService[0]}" (${topService[1]} occurrences) into prepaid offers.`,
      "medium",
    );
  }

  const rebookGap = appointments.filter((a) => {
    const st = (a.status ?? "").toLowerCase();
    return st && !st.includes("booked") && !st.includes("future") && !st.includes("rebook");
  }).length;
  if (appointments.length >= 3 && rebookGap >= Math.ceil(appointments.length * 0.5)) {
    addOpp(
      "Rebooking Gap",
      "Appointments exist but few future/rebooked statuses — prompt rebooking after each visit.",
      "medium",
    );
  }

  if (opportunities.length === 0) {
    addOpp(
      "Baseline Review",
      "Export parsed successfully. Run a targeted campaign once contact and visit fields are enriched.",
      "low",
    );
  }

  const summaryParts = [
    `${normalizedRecords.length} record(s) analyzed`,
    clients.length ? `${clients.length} clients` : null,
    appointments.length ? `${appointments.length} appointments` : null,
    payments.length ? `${payments.length} payments` : null,
    totalRevenue > 0 ? `$${totalRevenue.toFixed(0)} revenue signal` : null,
  ].filter(Boolean);

  return {
    id: `report-${importRunId}`,
    importRunId,
    summary: summaryParts.join(" · ") || "Import analyzed.",
    metrics: {
      clients: clients.length || undefined,
      appointments: appointments.length || undefined,
      payments: payments.length || undefined,
      totalRevenue: totalRevenue > 0 ? totalRevenue : undefined,
      avgTicket,
      missingEmailCount: missingEmail || undefined,
      missingPhoneCount: missingPhone || undefined,
    },
    opportunities,
    createdAt: new Date().toISOString(),
  };
}

export function generateImportRunId(): string {
  return `salon-import-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}
