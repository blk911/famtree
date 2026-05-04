"use client";

export default function StudiosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[studios:error]", {
    message: error?.message,
    digest: error?.digest,
    stack: error?.stack,
  });

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Studio page failed to load</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Something in the studio data failed during render.
        </p>
        {error?.digest ? (
          <p className="mt-3 text-xs text-neutral-500">Error ID: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
