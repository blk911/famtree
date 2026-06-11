"use client";

import Link from "next/link";
import type { AiosAction } from "@/lib/taikos/types";

type Props = {
  action: AiosAction;
  onClick?: (action: AiosAction) => void;
};

export function AiosActionButton({ action, onClick }: Props) {
  const handleClick = () => onClick?.(action);

  if (action.href) {
    return (
      <Link href={action.href} className="aios-action-btn" onClick={handleClick}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" className="aios-action-btn" onClick={handleClick}>
      {action.label}
    </button>
  );
}
