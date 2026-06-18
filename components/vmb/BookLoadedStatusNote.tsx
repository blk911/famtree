"use client";

import Link from "next/link";
import { formatBookLoadedAt } from "@/lib/vmb/book-ingest-policy";
import { VMB_BOOK_REFRESH_ROUTE } from "@/lib/vmb/book-load-cta";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  loadedAt?: string;
  clientCount?: number;
};

export function BookLoadedStatusNote({ loadedAt, clientCount }: Props) {
  return (
    <p
      style={{
        margin: "0 0 16px",
        fontSize: 13,
        lineHeight: 1.45,
        color: VMB_THEME.muted,
      }}
    >
      Book loaded: {formatBookLoadedAt(loadedAt)}
      {typeof clientCount === "number" ? ` · ${clientCount} clients` : null}.{" "}
      <Link
        href={VMB_BOOK_REFRESH_ROUTE}
        style={{ color: VMB_THEME.accent, fontWeight: 600, textDecoration: "none" }}
      >
        Reprocess book
      </Link>{" "}
      only when you upload a fresh export.
    </p>
  );
}
