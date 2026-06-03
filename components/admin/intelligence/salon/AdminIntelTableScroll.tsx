"use client";

import type { CSSProperties, ReactNode } from "react";

/** Local horizontal scroll shell — keeps page/sidebar from scrolling sideways. */
export const ADMIN_INTEL_TABLE_SCROLL_OUTER: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  background: "#fff",
  border: "1px solid #e7e5e4",
};

export function adminIntelTableStyle(minWidth = 1100): CSSProperties {
  return {
    width: "max-content",
    minWidth,
    borderCollapse: "collapse",
  };
}

type AdminIntelTableScrollProps = {
  children: ReactNode;
  minWidth?: number;
  borderRadius?: number;
  outerStyle?: CSSProperties;
};

export function AdminIntelTableScroll({
  children,
  minWidth,
  borderRadius = 12,
  outerStyle,
}: AdminIntelTableScrollProps) {
  return (
    <div
      style={{
        ...ADMIN_INTEL_TABLE_SCROLL_OUTER,
        borderRadius,
        ...outerStyle,
      }}
    >
      {children}
    </div>
  );
}
