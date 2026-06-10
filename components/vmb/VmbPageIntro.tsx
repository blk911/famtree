import type { ReactNode } from "react";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function VmbPageIntro({ eyebrow, title, description, action }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 20,
        marginBottom: 32,
      }}
    >
      <div style={{ maxWidth: 640 }}>
        {eyebrow ? (
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: VMB_THEME.accent,
            }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        {description ? (
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 16,
              lineHeight: 1.6,
              color: VMB_THEME.muted,
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
