// lib/studios/prospects/platform-signals.ts
// Converts matched domains/platform names into relationship-operation signals.

export type PlatformSignal =
  | "appointment_platform"
  | "learning_platform"
  | "commerce_platform"
  | "creator_platform"
  | "portfolio_platform"
  | "email_list_platform"
  | "payment_platform";

const SIGNAL_PATTERNS: Array<{ signal: PlatformSignal; patterns: string[] }> = [
  { signal: "appointment_platform", patterns: ["styleseat", "glossgenius", "vagaro", "booksy", "fresha", "acuity", "calendly", "squareup.com/appointments", "square appointments", "mindbody"] },
  { signal: "learning_platform", patterns: ["outschool", "teachable", "kajabi", "thinkific", "tutorbird", "lessonspace", "classwallet"] },
  { signal: "commerce_platform", patterns: ["shopify", "etsy", "squareup", "square.site", "stripe", "gumroad", "bigcartel"] },
  { signal: "creator_platform", patterns: ["patreon", "substack", "youtube", "tiktok", "instagram", "linktree", "beacons", "stan.store"] },
  { signal: "portfolio_platform", patterns: ["behance", "adobe portfolio", "myportfolio.com", "squarespace", "wix", "wordpress", "carrd"] },
  { signal: "email_list_platform", patterns: ["mailchimp", "convertkit", "klaviyo", "constantcontact"] },
  { signal: "payment_platform", patterns: ["stripe", "squareup", "paypal", "venmo", "cash.app"] },
];

export function classifyPlatformSignals(values: Array<string | null | undefined>): PlatformSignal[] {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  const signals = new Set<PlatformSignal>();

  for (const entry of SIGNAL_PATTERNS) {
    if (entry.patterns.some((pattern) => haystack.includes(pattern.toLowerCase()))) {
      signals.add(entry.signal);
    }
  }

  return Array.from(signals);
}
