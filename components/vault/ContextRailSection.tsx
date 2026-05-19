"use client";

import type { ReactNode } from "react";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #ece9e3",
  padding: "14px 16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

export function ContextRailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={cardStyle} aria-label={title}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {icon}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#78716c",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
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
        fontSize: 12,
        color: "#57534e",
        lineHeight: 1.65,
      }}
    >
      {items.map(({ label, value }) => (
        <li key={label}>
          <strong>{label}:</strong> {value}
        </li>
      ))}
    </ul>
  );
}
