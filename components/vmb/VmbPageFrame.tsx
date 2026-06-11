import type { ReactNode } from "react";
import { VMB_THEME } from "@/lib/vmb/theme";

export type VmbPageFrameWidth = "feed" | "standard" | "wide";

type Props = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
  width?: VmbPageFrameWidth;
  /** Omit the default header block (custom in-page header). */
  headerless?: boolean;
  /** Home feed uses uppercase “This Week” styling. */
  titleVariant?: "default" | "home";
};

export function VmbPageFrame({
  title,
  subtitle,
  eyebrow,
  children,
  width = "standard",
  headerless = false,
  titleVariant = "default",
}: Props) {
  const showHeader = !headerless && (title || subtitle || eyebrow);
  const titleClass =
    titleVariant === "home"
      ? "vmb-page-frame__title vmb-page-frame__title--home"
      : "vmb-page-frame__title";

  return (
    <div className={`vmb-page-frame vmb-page-frame--${width}`}>
      {showHeader ? (
        <header className="vmb-page-frame__header">
          {eyebrow ? <p className="vmb-page-frame__eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className={titleClass}>{title}</h1> : null}
          {subtitle ? <p className="vmb-page-frame__subtitle">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}

export function VmbPageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="vmb-page-frame vmb-page-frame--standard">
      <p className="vmb-page-state" style={{ color: VMB_THEME.muted }}>
        {label}
      </p>
    </div>
  );
}

export function VmbPageEmpty({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="vmb-page-frame vmb-page-frame--standard">
      <div className="vmb-page-state">
        <p style={{ margin: "0 0 20px", fontSize: 16, lineHeight: 1.5, color: VMB_THEME.muted }}>
          {message}
        </p>
        {action}
      </div>
    </div>
  );
}
