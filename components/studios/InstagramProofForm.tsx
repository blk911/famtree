"use client";

import { useState, type FormEvent } from "react";
import type { StudioInstagramProofCardCategory } from "@/lib/studios/studioProofCard";
import { isValidInstagramProofUrl } from "@/lib/studios/studioProofCard";

const CATEGORY_OPTIONS: { value: StudioInstagramProofCardCategory; label: string }[] = [
  { value: "client-moment", label: "Client moment" },
  { value: "testimonial", label: "Testimonial" },
  { value: "transformation", label: "Transformation" },
  { value: "group", label: "Group" },
];

export type InstagramProofFormValues = {
  name: string;
  quote: string;
  instagramUrl: string;
  imageUrl?: string;
  category: StudioInstagramProofCardCategory;
};

export function InstagramProofForm({
  initial,
  submitLabel = "Save",
  onSave,
  onCancel,
}: {
  initial?: Partial<InstagramProofFormValues>;
  submitLabel?: string;
  onSave: (values: InstagramProofFormValues) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [quote, setQuote] = useState(initial?.quote ?? "");
  const [instagramUrl, setInstagramUrl] = useState(initial?.instagramUrl ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl?.trim() ?? "");
  const [category, setCategory] = useState<StudioInstagramProofCardCategory>(initial?.category ?? "client-moment");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const q = quote.trim();
    const ig = instagramUrl.trim();
    if (!n) {
      setError("Client name is required.");
      return;
    }
    if (!q) {
      setError("Short quote is required.");
      return;
    }
    if (!ig) {
      setError("Instagram post URL is required.");
      return;
    }
    if (!isValidInstagramProofUrl(ig)) {
      setError("URL must start with https://www.instagram.com/ or https://instagram.com/");
      return;
    }
    setError(null);
    const trimmedImg = imageUrl.trim();
    onSave({
      name: n,
      quote: q,
      instagramUrl: ig,
      category,
      ...(trimmedImg ? { imageUrl: trimmedImg } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">Client name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">Short quote</label>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">Instagram post URL</label>
        <input
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          type="url"
          placeholder="https://www.instagram.com/p/…"
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">Image URL (optional)</label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          type="url"
          placeholder="https://…"
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as StudioInstagramProofCardCategory)}
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
