import Link from "next/link";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";

export default function VmbSupportPage() {
  return (
    <VmbPageFrame title="Support" subtitle="We are here when you need a hand.">
      <p className="vmb-page-state">
        Support is coming soon. Email your salon success team or restart the Launch Guide from Today.
      </p>
      <p style={{ marginTop: 16 }}>
        <Link href="/vmb/today">Back to Today</Link>
      </p>
    </VmbPageFrame>
  );
}
