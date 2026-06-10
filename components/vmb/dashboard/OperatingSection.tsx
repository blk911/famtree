import type { CSSProperties, ReactNode } from "react";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function OperatingSection({ title, subtitle, children }: Props) {
  return (
    <section
      style={{
        marginBottom: 28,
        padding: "24px 22px",
        background: "#fff",
        border: `1px solid ${VMB_THEME.line}`,
        borderRadius: 18,
        boxShadow: "0 1px 3px rgba(28, 25, 23, 0.04)",
      }}
    >
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p style={{ margin: "0 0 18px", fontSize: 14, lineHeight: 1.5, color: VMB_THEME.muted }}>
          {subtitle}
        </p>
      ) : (
        <div style={{ marginBottom: 18 }} />
      )}
      {children}
    </section>
  );
}

export const statRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px 18px",
  fontSize: 14,
  color: VMB_THEME.muted,
  marginBottom: 16,
};

export function ActionButton({
  label,
  variant = "primary",
  onClick,
  disabled,
}: {
  label: string;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "11px 16px",
        borderRadius: 11,
        border: isPrimary ? "none" : `1px solid ${VMB_THEME.line}`,
        background: isPrimary ? VMB_THEME.accent : "#fff",
        color: isPrimary ? "#fff" : VMB_THEME.ink,
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}
