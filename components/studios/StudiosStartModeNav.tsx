"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { parseStudioBuilderNavModeFromSearchParams } from "@/lib/studios/builderNavMode";

function modePillStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 14px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    textDecoration: "none",
    border: active ? "2px solid #262626" : "1px solid rgba(0, 0, 0, 0.08)",
    background: active ? "#fff" : "rgba(255, 255, 255, 0.92)",
    color: "#262626",
    boxShadow: active ? "0 1px 2px rgba(0, 0, 0, 0.06)" : "0 1px 2px rgba(0, 0, 0, 0.03)",
  };
}

/** Publish / Preview toggles for `/studios/start` — lives beside Return to AIH. */
export function StudiosStartModeNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (pathname !== "/studios/start") return null;

  const mode = parseStudioBuilderNavModeFromSearchParams({
    mode: searchParams.get("mode") ?? undefined,
    previewNav: searchParams.get("previewNav") ?? undefined,
  });
  const publishActive = mode === "published";
  const previewActive = mode === "edit" || mode === "preview";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <Link href="/studios/start" style={modePillStyle(publishActive)} scroll={false}>
        Publish
      </Link>
      <Link href="/studios/start?mode=edit" style={modePillStyle(previewActive)} scroll={false}>
        Preview
      </Link>
    </div>
  );
}
