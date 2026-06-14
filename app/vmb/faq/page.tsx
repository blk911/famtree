import Link from "next/link";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";

export default function VmbFaqPage() {
  return (
    <VmbPageFrame title="FAQ" subtitle="Quick answers about VMB and TAIKOS.">
      <p className="vmb-page-state">
        FAQ content is coming soon. On Today, open the help menu to restart the Launch Guide.
      </p>
      <p style={{ marginTop: 16 }}>
        <Link href="/vmb/today">Back to Today</Link>
      </p>
    </VmbPageFrame>
  );
}
