import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private client network — AIH Studios",
  description: "Placeholder route for the studio private client network entry.",
};

export default function StudiosPvtNetLoginPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-stone-900">Private client network</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-600">
        Entry point for your private client network. Flow will plug in here next.
      </p>
    </div>
  );
}
