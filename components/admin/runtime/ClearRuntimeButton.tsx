"use client";

import { useCallback, useState } from "react";
import type { RuntimeClearScope } from "@/lib/runtime/clear-runtime-config";
import type { ClearRuntimeArtifactsResult } from "@/lib/runtime/clear-runtime-artifacts";

type Props = {
  scope: RuntimeClearScope;
  label: string;
  description: string;
  suggestedRebuildCommands?: string[];
};

type PreviewState = {
  result: ClearRuntimeArtifactsResult;
  suggestedRebuildCommands: string[];
} | null;

export function ClearRuntimeButton({
  scope,
  label,
  description,
  suggestedRebuildCommands = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<PreviewState>(null);

  const runClear = useCallback(
    async (dryRun: boolean) => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const res = await fetch("/api/admin/runtime/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            confirm: !dryRun,
            dryRun,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setError(data.error ?? data.detail ?? "Clear failed");
          return;
        }

        const commands = data.target?.suggestedRebuildCommands ?? suggestedRebuildCommands;
        setPreview({
          result: data.result,
          suggestedRebuildCommands: commands,
        });

        if (dryRun) {
          setSuccess(`Preview: ${data.result.deletedFiles.length} file(s) would be deleted.`);
        } else {
          setSuccess(`Cleared ${data.result.deletedFiles.length} generated file(s).`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [scope, suggestedRebuildCommands],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
          setSuccess("");
          setPreview(null);
        }}
        className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
      >
        Clear {label} Generated Data
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-stone-200 bg-white p-4 shadow-lg">
            <h3 className="m-0 text-sm font-extrabold text-stone-900">
              Clear {label} generated data
            </h3>
            <p className="m-0 mt-2 text-xs leading-relaxed text-stone-600">{description}</p>
            <p className="m-0 mt-2 rounded-md bg-amber-50 px-2 py-2 text-[11px] text-amber-900 ring-1 ring-amber-200">
              Seeds, review states, research task states, and evidence overrides are preserved by
              default. This action only targets generated artifacts for the {label} vertical.
            </p>

            {error ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-2 py-2 text-xs text-red-800">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-2 py-2 text-xs text-green-800">
                {success}
              </div>
            ) : null}

            {preview ? (
              <div className="mt-3 space-y-3 text-xs text-stone-700">
                <div>
                  <div className="font-bold text-stone-900">
                    {preview.result.dryRun ? "Would delete" : "Deleted"} (
                    {preview.result.deletedFiles.length})
                  </div>
                  {preview.result.deletedFiles.length > 0 ? (
                    <ul className="m-0 mt-1 max-h-32 list-disc overflow-y-auto pl-4">
                      {preview.result.deletedFiles.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="m-0 mt-1 text-stone-500">No generated files matched.</p>
                  )}
                </div>

                {(preview.result.protectedFiles?.length ?? 0) > 0 ? (
                  <div>
                    <div className="font-bold text-stone-900">
                      Protected ({preview.result.protectedFiles.length})
                    </div>
                    <ul className="m-0 mt-1 max-h-24 list-disc overflow-y-auto pl-4">
                      {preview.result.protectedFiles.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {preview.suggestedRebuildCommands.length > 0 ? (
                  <div>
                    <div className="font-bold text-stone-900">Suggested rebuild</div>
                    <ul className="m-0 mt-1 list-none space-y-1 p-0">
                      {preview.suggestedRebuildCommands.map((cmd) => (
                        <li key={cmd}>
                          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">
                            {cmd}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
              >
                Close
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => runClear(true)}
                className="rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-800 disabled:opacity-50"
              >
                {loading ? "Working…" : "Preview files"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => runClear(false)}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Working…" : "Clear generated data"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
