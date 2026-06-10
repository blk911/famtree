import type { HiddenMoneyReport } from "@/lib/intelligence/salon/backoffice/types";

/** GlossGenius-style sample results for /vmb demo and landing sample section. */
export const VMB_SAMPLE_HIDDEN_MONEY_REPORT: HiddenMoneyReport = {
  id: "report-sample-gg-demo",
  importRunId: "salon-import-sample-gg-demo",
  summary:
    "847 records analyzed · 312 clients · 428 appointments · 107 payments · $48,920 revenue signal",
  metrics: {
    clients: 312,
    appointments: 428,
    payments: 107,
    totalRevenue: 48920,
    avgTicket: 142,
    missingEmailCount: 41,
    missingPhoneCount: 28,
  },
  opportunities: [
    {
      id: "hm-sample-vip",
      title: "VIP Clients",
      description:
        "Invite top clients first — 24 client(s) show high spend or repeat payment activity.",
      confidence: "high",
      estimatedValue: "$890 top ticket",
    },
    {
      id: "hm-sample-lapsed",
      title: "Lapsed Clients",
      description: "68 client(s) with last visit older than 90 days — win-back campaign.",
      confidence: "medium",
    },
    {
      id: "hm-sample-bundle",
      title: "Service Bundle",
      description:
        'Package top recurring service "balayage" (24 occurrences) into prepaid offers.',
      confidence: "medium",
    },
    {
      id: "hm-sample-rebook",
      title: "Rebooking Gap",
      description:
        "Appointments exist but few future/rebooked statuses — prompt rebooking after each visit.",
      confidence: "medium",
    },
    {
      id: "hm-sample-contact",
      title: "Missing Contact Info",
      description:
        "Recover missing contact info before launch/invite campaign (41 missing email, 28 missing phone).",
      confidence: "high",
    },
  ],
  createdAt: new Date().toISOString(),
};
