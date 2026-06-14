import type { SalonQueryMode, SalonQueryTemplate } from "./types";

function q(
  id: string,
  category: string,
  label: string,
  example: string,
  intent: SalonQueryTemplate["intent"],
  aliases: string[],
): SalonQueryTemplate {
  return { id, category, label, example, intent, aliases };
}

export const SALON_QUERY_CATALOG: SalonQueryTemplate[] = [
  // clients (7)
  q("clients-best", "clients", "Best clients", "Who are my best clients?", "best_clients", [
    "who are my best clients",
    "best clients",
    "top clients",
    "favorite clients",
  ]),
  q("clients-spend", "clients", "Top spenders", "Who spends the most?", "top_spenders", [
    "who spends the most",
    "top spenders",
    "highest spend",
    "biggest spenders",
  ]),
  q("clients-frequent", "clients", "Frequent visitors", "Who comes most often?", "frequent_clients", [
    "who comes most often",
    "most frequent",
    "frequent clients",
    "regular clients",
  ]),
  q("clients-overdue", "clients", "Overdue clients", "Who is overdue?", "overdue_clients", [
    "who is overdue",
    "overdue clients",
    "past due",
    "needs rebooking",
  ]),
  q("clients-lapsed", "clients", "Lapsed clients", "Who hasn't been back?", "lapsed_clients", [
    "who hasn't been back",
    "who hasnt been back",
    "hasn't been in",
    "lapsed clients",
    "inactive clients",
  ]),
  q("clients-attention", "clients", "Needs attention", "Who needs attention?", "overdue_clients", [
    "who needs attention",
    "needs attention",
    "slipping away",
  ]),
  q("clients-drift", "clients", "Drifting away", "Who is drifting away?", "lapsed_clients", [
    "who is drifting away",
    "drifting away",
    "falling off",
  ]),

  // pcn (8)
  q("pcn-join", "pcn", "PCN candidates", "Who should join my PCN?", "pcn_candidates", [
    "who should join my pcn",
    "join my pcn",
    "private client network",
    "pcn candidates",
    "pcn invites",
  ]),
  q("pcn-first-20", "pcn", "First 20 invites", "Who belongs in my first 20 invites?", "first_20_pcn", [
    "first 20 invites",
    "first 20 pcn",
    "belongs in my first 20",
    "top 20 invites",
  ]),
  q("pcn-first-50", "pcn", "First 50 invites", "Who belongs in my first 50 invites?", "first_50_pcn", [
    "first 50 invites",
    "first 50 pcn",
    "belongs in my first 50",
    "top 50 invites",
  ]),
  q("pcn-early-access", "pcn", "Early access", "Who would appreciate early access?", "pcn_candidates", [
    "early access",
    "appreciate early access",
    "inner circle",
  ]),
  q("pcn-personal-note", "pcn", "Personal note", "Who should receive a personal note?", "pcn_candidates", [
    "personal note",
    "receive a personal note",
    "handwritten note",
  ]),
  q("pcn-vip-invite", "pcn", "VIP invite", "Who should get a private client invite?", "pcn_candidates", [
    "private client invite",
    "vip invite",
    "invite to pcn",
  ]),
  q("pcn-ambassador", "pcn", "Ambassador", "Who would make a good ambassador?", "referral_candidates", [
    "good ambassador",
    "make a good ambassador",
    "salon ambassador",
  ]),
  q("pcn-regular-history", "pcn", "Used to come regularly", "Who used to come regularly?", "lapsed_clients", [
    "used to come regularly",
    "used to visit often",
    "was a regular",
  ]),

  // revenue (6)
  q("rev-upgrade", "revenue", "Upgrade candidates", "Who is likely to upgrade?", "upgrade_candidates", [
    "likely to upgrade",
    "upgrade candidates",
    "upsell",
  ]),
  q("rev-addons", "revenue", "Add-ons", "Who buys add-ons?", "upgrade_candidates", [
    "buys add-ons",
    "add-ons",
    "addons",
    "premium add on",
  ]),
  q("rev-high-ticket", "revenue", "High ticket", "Who has high ticket visits?", "top_spenders", [
    "high ticket",
    "premium services",
    "high value visits",
  ]),
  q("rev-recover", "revenue", "Recoverable revenue", "Where can I recover revenue?", "lapsed_clients", [
    "recover revenue",
    "recoverable revenue",
    "win back revenue",
  ]),
  q("rev-vip", "revenue", "VIP spenders", "Who are my VIP clients?", "vip_candidates", [
    "vip clients",
    "vip spenders",
    "vip candidates",
  ]),
  q("rev-thank", "revenue", "Thank-you", "Who should receive a thank-you?", "vip_candidates", [
    "receive a thank-you",
    "thank you",
    "send a thank you",
  ]),

  // appointments (5)
  q("appt-call-week", "appointments", "Call this week", "Who should I call this week?", "overdue_clients", [
    "call this week",
    "should i call",
    "reach out this week",
  ]),
  q("appt-rebook", "appointments", "Due for rebook", "Who is due for a rebook?", "overdue_clients", [
    "due for a rebook",
    "due for rebooking",
    "time to rebook",
  ]),
  q("appt-miss-you", "appointments", "Win-back", "Who should get a we miss you note?", "lapsed_clients", [
    "we miss you",
    "win back",
    "bring back",
  ]),
  q("appt-refresh", "appointments", "Refresh invite", "Who needs a refresh invite?", "overdue_clients", [
    "refresh invite",
    "needs a refresh",
    "time for refresh",
  ]),
  q("appt-cadence", "appointments", "Past cadence", "Who is past their usual cadence?", "overdue_clients", [
    "past cadence",
    "usual cadence",
    "overdue for visit",
  ]),

  // referrals (6)
  q("ref-candidates", "referrals", "Referral candidates", "Who has referred friends?", "referral_candidates", [
    "referred friends",
    "referral candidates",
    "refer friends",
  ]),
  q("ref-ask", "referrals", "Ask for referral", "Who should I ask for a referral?", "referral_candidates", [
    "ask for a referral",
    "ask for referral",
    "referral ask",
  ]),
  q("ref-intro", "referrals", "Trusted intro", "Who could make a trusted intro?", "referral_candidates", [
    "trusted intro",
    "beauty circle intro",
    "introduce someone",
  ]),
  q("ref-bring-friend", "referrals", "Bring a friend", "Who would bring a friend?", "referral_candidates", [
    "bring a friend",
    "bring friend",
    "friend referral",
  ]),
  q("ref-influence", "referrals", "Influence", "Who has influence in my book?", "referral_candidates", [
    "has influence",
    "influence in my book",
    "connector clients",
  ]),
  q("ref-word-mouth", "referrals", "Word of mouth", "Who drives word of mouth?", "referral_candidates", [
    "word of mouth",
    "word-of-mouth",
    "shares about salon",
  ]),

  // relationship (6)
  q("rel-personal", "relationship", "Personal connection", "Who deserves a personal outreach?", "best_clients", [
    "personal outreach",
    "deserves personal",
    "personal connection",
  ]),
  q("rel-trust", "relationship", "Trust", "Who trusts me most?", "best_clients", [
    "trusts me most",
    "strong trust",
    "loyal relationship",
  ]),
  q("rel-celebrate", "relationship", "Celebrate", "Who should I celebrate?", "vip_candidates", [
    "should i celebrate",
    "celebrate with",
    "celebration client",
  ]),
  q("rel-check-in", "relationship", "Check in", "Who should I check in with?", "overdue_clients", [
    "check in with",
    "check-in",
    "touch base",
  ]),
  q("rel-recent", "relationship", "Recent activity", "Who has recent activity?", "best_clients", [
    "recent activity",
    "been in recently",
    "recent visits",
  ]),
  q("rel-strong-history", "relationship", "Strong history", "Who has a strong history with me?", "best_clients", [
    "strong history",
    "longtime client",
    "loyal client",
  ]),

  // birthdays (5)
  q("bday-soon", "birthdays", "Birthday soon", "Who has a birthday soon?", "birthday_candidates", [
    "birthday soon",
    "birthdays coming up",
    "upcoming birthday",
  ]),
  q("bday-card", "birthdays", "Birthday card", "Who should get a birthday card?", "birthday_candidates", [
    "birthday card",
    "send birthday card",
    "birthday note",
  ]),
  q("bday-celebrate", "birthdays", "Birthday celebration", "Who should get a birthday offer?", "birthday_candidates", [
    "birthday offer",
    "birthday celebration",
    "celebrate birthday",
  ]),
  q("bday-week", "birthdays", "This week", "Any birthdays this week?", "birthday_candidates", [
    "birthdays this week",
    "birthday this week",
  ]),
  q("bday-month", "birthdays", "This month", "Any birthdays this month?", "birthday_candidates", [
    "birthdays this month",
    "birthday this month",
  ]),

  // open_slots (7)
  q("slot-openings", "open_slots", "Fill openings", "Who can fill next week's openings?", "open_slot_candidates", [
    "fill next week",
    "fill openings",
    "fill open slots",
    "next week openings",
  ]),
  q("slot-chair", "open_slots", "Open chair", "Who can fill an opening?", "open_slot_candidates", [
    "fill an opening",
    "open chair",
    "empty chair",
    "open slot",
  ]),
  q("slot-today", "open_slots", "Today", "Who can come in today?", "open_slot_candidates", [
    "come in today",
    "fill today",
    "same day opening",
  ]),
  q("slot-gap", "open_slots", "Schedule gap", "Who fits a last-minute opening?", "open_slot_candidates", [
    "last-minute opening",
    "last minute opening",
    "schedule gap",
  ]),
  q("slot-rebook", "open_slots", "Likely due", "Who is likely due and could fill a spot?", "open_slot_candidates", [
    "likely due",
    "could fill a spot",
    "due and available",
  ]),
  q("slot-week", "open_slots", "This week", "Who should I invite this week?", "open_slot_candidates", [
    "invite this week",
    "this week opening",
    "fill this week",
  ]),
  q("slot-call-list", "open_slots", "Call list", "Who should be on my call list?", "overdue_clients", [
    "call list",
    "on my call list",
    "priority call",
  ]),
];

export const SALON_QA_SUGGESTED_CHIPS: SalonQueryTemplate[] = [
  // Opportunity
  SALON_QUERY_CATALOG.find((t) => t.id === "pcn-join")!,
  SALON_QUERY_CATALOG.find((t) => t.id === "clients-overdue")!,
  SALON_QUERY_CATALOG.find((t) => t.id === "rev-thank")!,
  // Intelligence
  {
    id: "intel-january-clients",
    category: "intelligence",
    label: "January clients",
    example: "Who were my January clients?",
    intent: "monthly_clients",
    aliases: ["who were my january clients"],
  },
  {
    id: "intel-popular-services",
    category: "intelligence",
    label: "Popular services",
    example: "What are my most popular services?",
    intent: "service_popularity",
    aliases: ["most popular services"],
  },
  {
    id: "intel-top-spenders",
    category: "intelligence",
    label: "Top spenders",
    example: "Who spent the most?",
    intent: "revenue_period",
    aliases: ["who spent the most"],
  },
  // Client
  {
    id: "client-grace",
    category: "clients",
    label: "Client dossier",
    example: "Tell me about Grace",
    intent: "client_lookup",
    aliases: ["tell me about grace"],
  },
  {
    id: "client-maya-history",
    category: "clients",
    label: "Client history",
    example: "Show Maya's history",
    intent: "client_lookup",
    aliases: ["show maya's history"],
  },
];

export function salonQaModeBadge(mode: SalonQueryMode): string {
  switch (mode) {
    case "opportunity":
      return "🎯 Opportunity";
    case "intelligence":
      return "📊 Intelligence";
    case "client":
      return "👤 Client";
  }
}

export function getSalonQueryTemplateById(id: string): SalonQueryTemplate | undefined {
  return SALON_QUERY_CATALOG.find((t) => t.id === id);
}
