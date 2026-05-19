// AIH Safe Core Graph — foundational contract only. No persistence, no UI, no permissions.
//
// Barrel export for all AIH Safe shared primitive types.
// Import from here in service code: import type { ... } from "@/types/aihsafe"
// Import from the leaf file directly only when you need to avoid pulling in unrelated symbols.

// ─── Agent 0/1 primitives ─────────────────────────────────────────────────────
export * from "./ids";
export * from "./roles";
export * from "./age-tiers";
export * from "./visibility";
export * from "./approval-states";
export * from "./invite-states";
export * from "./invite-intent";
export * from "./audit-events";
export * from "./trust-units";
export * from "./guardian";
export * from "./membership";

// ─── Agent 2 governance types ─────────────────────────────────────────────────
export * from "./governance";
export * from "./audit";
export * from "./visibility-rules";

// ─── Agent 2.75 API contract types ────────────────────────────────────────────
export * from "./dto";
export * from "./api-responses";

// ─── Agent 37 policy layer types ──────────────────────────────────────────────
export * from "./policy";
export * from "./vault-trust-space";
