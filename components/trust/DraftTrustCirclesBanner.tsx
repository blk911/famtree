import Link from "next/link";
import { TRUST_CIRCLES_EMPTY_HINT } from "@/lib/trust/display";

export function DraftTrustCirclesBanner({ draftCount }: { draftCount: number }) {
  if (draftCount <= 0) return null;

  return (
    <div
      className="border rounded-lg bg-stone-50 overflow-hidden"
      style={{ borderColor: "#e7e5e4", padding: "14px 16px" }}
    >
      <p className="font-semibold text-sm" style={{ color: "#44403c", margin: 0 }}>
        Draft — setup needed
        {draftCount > 1 ? ` (${draftCount} trust circles)` : ""}
      </p>
      <p className="text-xs mt-1" style={{ color: "#78716c", marginBottom: 0, lineHeight: 1.45 }}>
        {TRUST_CIRCLES_EMPTY_HINT}{" "}
        <Link href="/invite" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
          Invite someone →
        </Link>
      </p>
    </div>
  );
}

export function TrustCirclesEmptyBanner() {
  return (
    <div style={{ padding: "12px 0", color: "#a8a29e", fontSize: 13 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#57534e" }}>No trust circles yet.</p>
      <p style={{ margin: 0, lineHeight: 1.45 }}>{TRUST_CIRCLES_EMPTY_HINT}</p>
    </div>
  );
}
