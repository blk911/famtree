import Link from "next/link";
import {
  PUBLISHED_STUDIO_EDITOR_HREF,
  PUBLISHED_STUDIO_SPACES_INTRO,
  STUDIO_BUILDER_WIZARD_HREF,
} from "@/lib/studios/publishedSpaceBridge";

/** Lightweight bridge — Studios emerge from governed Spaces (Agent 92). */
export function StudiosSpacesPoweredNote({ className }: { className?: string }) {
  return (
    <p
      className={`m-0 text-center text-[13px] leading-relaxed text-stone-500 ${className ?? ""}`}
    >
      {PUBLISHED_STUDIO_SPACES_INTRO}{" "}
      <Link href="/aihsafe" className="font-semibold text-stone-700 underline-offset-2 hover:underline">
        Family Safe → Spaces
      </Link>
      {" · "}
      <Link
        href={STUDIO_BUILDER_WIZARD_HREF}
        className="font-semibold text-stone-700 underline-offset-2 hover:underline"
      >
        Studio builder
      </Link>
      {" · "}
      <Link
        href={PUBLISHED_STUDIO_EDITOR_HREF}
        className="font-semibold text-stone-700 underline-offset-2 hover:underline"
      >
        Classic editor
      </Link>
    </p>
  );
}
