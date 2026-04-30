"use client";

import {
  Instagram,
  MapPin,
  MessageCircle,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { LGENX_NET_CONTACT_ITEMS } from "@/lib/content/contact";

type ContactModalProps = {
  open: boolean;
  onClose: () => void;
};

const iconMap = {
  admin: UserRound,
  whatsapp: MessageCircle,
  instagram: Instagram,
  location: MapPin,
};

export function ContactModal({ open, onClose }: ContactModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="AmiHuman-contact-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-purple-50 to-orange-50 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-purple-600">
              Contact LGENX.NET
            </p>
            <h2
              id="AmiHuman-contact-title"
              className="mt-1 text-2xl font-black text-slate-950"
            >
              Reach the AmiHuman team.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Questions, invite help, account issues, or launch updates — start here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
            aria-label="Close Contact"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {LGENX_NET_CONTACT_ITEMS.map((item) => {
              const Icon = iconMap[item.id as keyof typeof iconMap] ?? ShieldCheck;
              const content = (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-purple-200 hover:bg-purple-50/40">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-sm">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-1 text-base font-black text-slate-950">
                        {item.value}
                      </p>
                      {item.note && (
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );

              return item.href ? (
                <a key={item.id} href={item.href} target="_blank" rel="noreferrer">
                  {content}
                </a>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
            <p className="text-sm font-semibold text-orange-950">
              AmiHuman is invite-only and private by design. We do not list a
              public office address yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

