// components/admin/MarketIntelPageShell.tsx

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Responsive gutters for Market Intel workflow pages — left-aligned with admin full-bleed layout. */
export function MarketIntelPageShell({ children, className = "" }: Props) {
  return (
    <div
      className={`w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
