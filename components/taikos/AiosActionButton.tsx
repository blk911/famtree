"use client";

import Link from "next/link";
import { resolveContractType } from "@/lib/taikos/actions/action-registry";
import type { AiosAction } from "@/lib/taikos/types";

type Props = {
  action: AiosAction;
  onClick?: (action: AiosAction) => void;
};

export function AiosActionButton({ action, onClick }: Props) {
  const isContract = action.kind === "contract" || !!resolveContractType(action);

  const handleClick = (e: React.MouseEvent) => {
    if (isContract) {
      e.preventDefault();
    }
    onClick?.(action);
  };

  if (action.href && !isContract) {
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
