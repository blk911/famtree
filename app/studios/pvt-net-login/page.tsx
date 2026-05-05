import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private network login — AIH Studios",
  description: "Placeholder route for private network client login.",
};

export default function StudiosPvtNetLoginPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-stone-900">Private network login</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-600">
        Entry point for the studio private network. Flow will plug in here next.
      </p>
    </div>
  );
}
