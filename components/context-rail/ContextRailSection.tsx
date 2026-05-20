"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #ece9e3",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

export function ContextRailSection({
  title,
  count,
  href,
  icon,
  children,
}: {
  title: string;
  count?: number;
  href?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={cardStyle} aria-label={title} className="context-rail-section">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {icon}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#78716c",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {count !== undefined && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#78716c",
                background: "#f5f4f0",
                borderRadius: 999,
                padding: "1px 6px",
              }}
            >
              {count}
            </span>
          )}
          {href && (
            <Link
              href={href}
              style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, textDecoration: "none" }}
            >
              View →
            </Link>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ContextRailMetaList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <ul
      style={{
        margin: 0,
        padding: 0,
        listStyle: "none",
        fontSize: 11,
        color: "#57534e",
        lineHeight: 1.55,
      }}
    >
      {items.map(({ label, value }) => (
        <li key={label}>
          <strong style={{ fontWeight: 600 }}>{label}:</strong> {value}
        </li>
      ))}
    </ul>
  );
}
