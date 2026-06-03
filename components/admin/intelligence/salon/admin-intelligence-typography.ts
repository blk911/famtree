// Salon / admin intelligence readability tokens (inline styles only — not global CSS).

import type { CSSProperties } from "react";

/** Data table header — compact but readable */
export const ADMIN_INTEL_TABLE_HEADER: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 11,
  fontWeight: 700,
  color: "#78716c",
  borderBottom: "1px solid #e7e5e4",
  whiteSpace: "nowrap",
};

/** Data table body cell */
export const ADMIN_INTEL_TABLE_CELL: CSSProperties = {
  padding: "8px 10px",
  fontSize: 13,
  color: "#57534e",
  borderBottom: "1px solid #f5f5f4",
  verticalAlign: "top",
};

/** Drawer field label */
export const ADMIN_INTEL_DRAWER_LABEL: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#a8a29e",
  marginBottom: 2,
};

/** Drawer field value */
export const ADMIN_INTEL_DRAWER_VALUE: CSSProperties = {
  fontSize: 13,
  color: "#44403c",
  lineHeight: 1.45,
};

/** Drawer section heading (PROVIDER PROVENANCE, etc.) */
export const ADMIN_INTEL_SECTION_TITLE: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#a8a29e",
  letterSpacing: "0.06em",
  marginBottom: 8,
};

/** Secondary metadata — IDs, timestamps, helper lines under primary text */
export const ADMIN_INTEL_META: CSSProperties = {
  fontSize: 11,
  color: "#a8a29e",
};

/** Question / narrative blocks on audit pages */
export const ADMIN_INTEL_BODY: CSSProperties = {
  fontSize: 13,
  color: "#44403c",
  lineHeight: 1.5,
};

/** Summary card metric label */
export const ADMIN_INTEL_CARD_LABEL: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#a8a29e",
  marginBottom: 4,
};

/** Monospace URL / evidence lines in tables */
export const ADMIN_INTEL_URL: CSSProperties = {
  fontSize: 13,
  wordBreak: "break-all",
};
