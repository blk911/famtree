"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";

type UserMini = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

function formatName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function comparePeople(a: UserMini, b: UserMini) {
  return `${a.firstName} ${a.lastName}`.localeCompare(
    `${b.firstName} ${b.lastName}`,
    undefined,
    { sensitivity: "base" },
  );
}

/** Single-line bond row for Family Units; tap row for a short detail strip. */
export function BondFamilyRow({
  self,
  peer,
  bondedAt,
}: {
  self: UserMini;
  peer: UserMini;
  bondedAt: string;
}) {
  const [open, setOpen] = useState(false);
  const href = `/family-vault/private?peer=${encodeURIComponent(peer.id)}`;
  const [left, right] = [self, peer].sort(comparePeople);
  const joined = new Date(bondedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left hover:bg-stone-50/80 transition-colors"
        >
          <div className="flex shrink-0 items-center">
            {[left, right].map((p, i) => (
              <div
                key={p.id}
                title={formatName(p.firstName, p.lastName)}
                className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-sky-600 to-blue-600 text-[11px] font-bold text-white"
                style={{ marginLeft: i > 0 ? -10 : 0 }}
              >
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(p.firstName, p.lastName)
                )}
              </div>
            ))}
          </div>
          <span className="min-w-0 truncate text-sm font-semibold text-stone-900">
            {formatName(left.firstName, left.lastName)} ·{" "}
            {formatName(right.firstName, right.lastName)}
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs text-stone-500">
            Joined {joined}
          </span>
          <ChevronDown
            className={`ml-auto h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div className="flex items-center border-l border-stone-100 px-2">
          <Link
            href={href}
            title="Open private conversation"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-blue-700 hover:bg-stone-100"
          >
            <MessageCircle className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {open ? (
        <div className="border-t border-stone-100 bg-stone-50/60 px-3 py-2 text-xs text-stone-600">
          Bond · direct thread with both members. Messages stay in{" "}
          <span className="font-medium text-stone-800">Private Feed</span>.
        </div>
      ) : null}
    </div>
  );
}
