import Link from "next/link";

type Props = {
  legacyPath: string;
  canonicalPath: string;
  label: string;
};

/** Shown on deprecated admin paths that remain for compatibility. */
export function LegacyAdminPathNotice({ legacyPath, canonicalPath, label }: Props) {
  return (
    <div
      className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <strong className="font-bold">{label}</strong> has moved to{" "}
      <Link href={canonicalPath} className="font-semibold text-amber-900 underline">
        {canonicalPath}
      </Link>
      . This legacy path ({legacyPath}) remains available until migration is complete.
    </div>
  );
}
