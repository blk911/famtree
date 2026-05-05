"use client";

import { useCallback, useEffect, useId, useState } from "react";

export type RequestModalService = {
  title: string;
  desc: string;
  price: string;
  package: string;
  type: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  service: RequestModalService | null;
};

export function RequestSessionModal({ open, onClose, service }: Props) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [videoName, setVideoName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setContact("");
      setMessage("");
      setVideoName(null);
    }
  }, [open]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!service) return;
      // eslint-disable-next-line no-console -- placeholder until API exists
      console.log("Request session", {
        name: name.trim(),
        contact: contact.trim(),
        message: message.trim(),
        service,
        videoLabel: videoName,
      });
      onClose();
    },
    [contact, message, name, onClose, service, videoName],
  );

  if (!open || !service) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-black/[0.08] bg-white p-6 shadow-2xl ring-1 ring-black/[0.04]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-stone-900">
          Request session
        </h2>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">Selected service</p>
        <div className="mt-2 rounded-lg bg-stone-50 px-3 py-2 ring-1 ring-black/[0.06]">
          <p className="text-sm font-semibold text-stone-900">{service.title}</p>
          <p className="mt-0.5 text-xs text-stone-600">{service.desc}</p>
          <p className="mt-1 text-xs text-stone-800">
            <span className="font-semibold">{service.price}</span>
            <span className="text-stone-500"> · </span>
            <span>{service.package}</span>
          </p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-xs font-bold uppercase tracking-wide text-stone-500">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-stone-500">
            Email or phone
            <input
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-stone-500">
            Message
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full resize-y rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-900 outline-none focus:ring-2 focus:ring-stone-300"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-stone-500">
            Video (optional)
            <input
              type="file"
              accept="video/*"
              className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-stone-800 hover:file:bg-stone-200"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setVideoName(f?.name ?? null);
              }}
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
            >
              Submit request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
