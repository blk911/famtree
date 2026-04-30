"use client";

import { X } from "lucide-react";
import { LGENX_NET_FAQS } from "@/lib/content/faq";

type FaqModalProps = {
  open: boolean;
  onClose: () => void;
};

export function FaqModal({ open, onClose }: FaqModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="AmiHuman-faq-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-purple-600">
              LGENX.NET FAQ
            </p>
            <h2
              id="AmiHuman-faq-title"
              className="mt-1 text-2xl font-black text-slate-950"
            >
              Private family networking, explained.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close FAQ"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(86vh-96px)] overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {LGENX_NET_FAQS.map((item, index) => (
              <details
                key={item.id}
                className="group rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-base font-bold text-slate-950">
                      {item.question}
                    </span>
                  </div>
                </summary>
                <div className="mt-3 space-y-2 pl-10 text-base leading-7 text-slate-700">
                  {item.answer.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-4">
            <p className="text-sm font-semibold text-purple-950">
              AmiHuman isn't about growing a following. It's about protecting and
              strengthening the relationships you already have.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

