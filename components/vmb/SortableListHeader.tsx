"use client";

import type { SortDirection } from "@/lib/vmb/useSortableList";
import { VMB_THEME } from "@/lib/vmb/theme";

type Column<K extends string> = {
  key: K;
  label: string;
  align?: "left" | "right";
};

type Props<K extends string> = {
  columns: Column<K>[];
  sortKey: K;
  sortDirection: SortDirection;
  onSort: (key: K) => void;
  gridTemplateColumns: string;
  trailingColumn?: string;
};

export function SortableListHeader<K extends string>({
  columns,
  sortKey,
  sortDirection,
  onSort,
  gridTemplateColumns,
  trailingColumn,
}: Props<K>) {
  return (
    <div
      role="row"
      style={{
        display: "grid",
        gridTemplateColumns,
        gap: 8,
        padding: "8px 0 10px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: VMB_THEME.muted,
        borderBottom: `1px solid ${VMB_THEME.line}`,
      }}
    >
      {columns.map((col) => {
        const active = sortKey === col.key;
        const arrow = active ? (sortDirection === "asc" ? " ↑" : " ↓") : "";
        return (
          <button
            key={col.key}
            type="button"
            role="columnheader"
            aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            onClick={() => onSort(col.key)}
            style={{
              margin: 0,
              padding: 0,
              border: "none",
              background: "transparent",
              textAlign: col.align ?? "left",
              font: "inherit",
              color: active ? VMB_THEME.ink : VMB_THEME.muted,
              cursor: "pointer",
            }}
          >
            {col.label}
            {arrow}
          </button>
        );
      })}
      {trailingColumn !== undefined ? (
        <span style={{ textAlign: "right" }}>{trailingColumn}</span>
      ) : null}
    </div>
  );
}
