import Link from "next/link";
import {
  VMB_BOOK_LOAD_LABEL,
  VMB_BOOK_LOAD_ROUTE,
  type VMB_BOOK_REFRESH_ROUTE,
} from "@/lib/vmb/book-load-cta";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  href?: string;
  variant?: "primary" | "compact" | "link";
  className?: string;
};

export function LoadYourBookCta({
  href = VMB_BOOK_LOAD_ROUTE,
  variant = "primary",
  className,
}: Props) {
  if (variant === "link") {
    return (
      <Link
        href={href}
        className={className ?? "font-semibold text-rose-900 no-underline hover:text-rose-950"}
      >
        {VMB_BOOK_LOAD_LABEL}
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className={
          className ??
          "inline-flex rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 no-underline hover:bg-stone-50"
        }
      >
        {VMB_BOOK_LOAD_LABEL}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      style={{
        display: "inline-block",
        padding: "12px 20px",
        borderRadius: 12,
        background: VMB_THEME.accent,
        color: "#fff",
        fontSize: 14,
        fontWeight: 700,
        textDecoration: "none",
      }}
    >
      {VMB_BOOK_LOAD_LABEL}
    </Link>
  );
}
