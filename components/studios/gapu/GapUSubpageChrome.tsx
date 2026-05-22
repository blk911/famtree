import Link from "next/link";
import type { ReactNode } from "react";

import { GAP_U_SURFACE_CSS } from "@/lib/studios/gapu/gapuSurfaceCss";

type Props = {
  children?: ReactNode;
};

/**
 * Lightweight shell for Gap U deep pages — shares CSS tokens with the flagship route.
 */
export function GapUSubpageChrome({ children }: Props) {
  return (
    <>
      <style>{GAP_U_SURFACE_CSS}</style>
      {children}
    </>
  );
}

export function GapUSubpageBackLink() {
  return (
    <Link href="/studios/gap-u" className="gapu-back">
      ← Gap U Studio home
    </Link>
  );
}
