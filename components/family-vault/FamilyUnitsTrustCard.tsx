"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";

type Member = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
};

export type FamilyUnitsTrustUnit = {
  id: string;
  createdAt: string;
  members: Member[];
};

const PREVIEW_COUNT = 4;

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

/** Compact TU row for Family Units; expands to show every member (handles large units). */
export function FamilyUnitsTrustCard({ unit }: { unit: FamilyUnitsTrustUnit }) {
  const [open, setOpen] = useState(false);
  const n = unit.members.length;
  const sorted = [...unit.members].sort((a, b) =>
    comparePeople(a.user, b.user),
  );
  const preview = sorted.slice(0, PREVIEW_COUNT);
  const extra = Math.max(0, n - PREVIEW_COUNT);
  const formed = new Date(unit.createdAt).toLocaleDateString("en-US", {
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
            {preview.map((m, i) => (
              <div
                key={m.user.id}
                title={formatName(m.user.firstName, m.user.lastName)}
                className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-violet-600 to-fuchsia-600 text-[11px] font-bold text-white"
                style={{ marginLeft: i > 0 ? -10 : 0 }}
              >
                {m.user.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.user.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(m.user.firstName, m.user.lastName)
                )}
              </div>
            ))}
            {extra > 0 ? (
              <div
                className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-stone-200 text-[11px] font-bold text-stone-700"
                style={{ marginLeft: -10 }}
              >
                +{extra}
              </div>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-stone-900">
              Trust unit · {n} member{n === 1 ? "" : "s"}
            </div>
            <div className="text-xs text-stone-500">Active · since {formed}</div>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div className="flex items-center border-l border-stone-100 px-2">
          <Link
            href={`/family-vault/private?unit=${unit.id}`}
            title="Open TU conversation"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-violet-700 hover:bg-stone-100"
          >
            <MessageCircle className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {open ? (
        <div className="border-t border-stone-100 bg-stone-50/50 px-3 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Members
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {sorted.map((m) => (
              <div
                key={m.user.id}
                className="flex items-center gap-2 rounded-lg border border-stone-100 bg-white px-2 py-1.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-[10px] font-bold text-white">
                  {m.user.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.user.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(m.user.firstName, m.user.lastName)
                  )}
                </div>
                <span className="min-w-0 truncate text-xs font-medium text-stone-800">
                  {formatName(m.user.firstName, m.user.lastName)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Private group thread · message everyone from{" "}
            <span className="font-medium text-stone-700">Private Threads</span>.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function comparePeople(
  a: { firstName: string; lastName: string },
  b: { firstName: string; lastName: string },
) {
  return `${a.firstName} ${a.lastName}`.localeCompare(
    `${b.firstName} ${b.lastName}`,
    undefined,
    { sensitivity: "base" },
  );
}
