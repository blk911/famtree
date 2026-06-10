import type { CSSProperties, ReactNode } from "react";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  children: ReactNode;
  style?: CSSProperties;
  padding?: "sm" | "md" | "lg";
};

export function VmbCard({ children, style, padding = "md" }: Props) {
  const pad = padding === "sm" ? "18px 20px" : padding === "lg" ? "28px 26px" : "22px 24px";
  return (
    <div
      style={{
        background: VMB_THEME.cardBg,
        border: `1px solid ${VMB_THEME.line}`,
        borderRadius: 18,
        padding: pad,
        boxShadow: "0 1px 3px rgba(28, 25, 23, 0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
