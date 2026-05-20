"use client";

import Link from "next/link";

export type ContextRailAction =
  | { type: "link"; label: string; href: string }
  | { type: "button"; label: string; onClick: () => void };

export function ContextRailQuickActions({ actions }: { actions: ContextRailAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {actions.map((action) =>
        action.type === "link" ? (
          <Link
            key={action.href + action.label}
            href={action.href}
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#4f46e5",
              textDecoration: "none",
              padding: "6px 8px",
              borderRadius: 8,
              background: "#f5f3ff",
              border: "1px solid #e9e5ff",
            }}
          >
            {action.label}
          </Link>
        ) : (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              fontSize: 12,
              fontWeight: 600,
              color: "#4f46e5",
              padding: "6px 8px",
              borderRadius: 8,
              background: "#f5f3ff",
              border: "1px solid #e9e5ff",
              cursor: "pointer",
            }}
          >
            {action.label}
          </button>
        ),
      )}
    </div>
  );
}
