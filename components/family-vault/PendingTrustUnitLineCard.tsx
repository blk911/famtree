"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";

export type PendingTuLineRequest = {
  id: string;
  createdAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    approvalStatus?: string;
    pendingInvite?: boolean;
  }>;
};

function fmt(m: { firstName: string; lastName: string }) {
  return `${m.firstName} ${m.lastName}`.trim();
}

function initials(m: { firstName: string; lastName: string; pendingInvite?: boolean }) {
  if (m.pendingInvite) return "?";
  return `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();
}

/** One-line summary + expand for full roster / acceptance status (scales to many members). */
export function PendingTrustUnitLineCard({
  request,
  viewerId,
}: {
  request: PendingTuLineRequest;
  viewerId: string;
}) {
  const [open, setOpen] = useState(false);
  const registered = request.members.filter((m) => !m.pendingInvite);
  const pendingCnt = request.members.length - registered.length;
  const accepted = registered.filter((m) => (m.approvalStatus ?? "PENDING") === "APPROVED").length;
  const sponsor = request.createdBy;
  const proposed = new Date(request.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const sorted = [...request.members].sort((a, b) => {
    const pa = a.pendingInvite ? 1 : 0;
    const pb = b.pendingInvite ? 1 : 0;
    if (pa !== pb) return pa - pb;
    return fmt(a).localeCompare(fmt(b), undefined, { sensitivity: "base" });
  });

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-amber-50/90"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
              Forming
            </span>
            <span className="truncate text-sm font-semibold text-stone-900">
              Trust unit · {request.members.length} member{request.members.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-xs text-stone-600">
            Sponsor <span className="font-semibold text-stone-800">{fmt(sponsor)}</span>
            {" · "}
            <span className="font-medium">
              {accepted}/{registered.length} accepted
              {pendingCnt > 0 ? ` · ${pendingCnt} invite pending` : ""}
            </span>
            {" · "}Proposed {proposed}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="border-t border-amber-100 bg-white/90 px-3 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Acceptance status
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {sorted.map((m) => {
              const st = m.approvalStatus ?? "PENDING";
              const isViewer = m.id === viewerId;
              const isSponsor = m.id === sponsor.id;
              const pendingSlot = !!m.pendingInvite;
              const ok = st === "APPROVED";
              const bad = st === "DECLINED";
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50/80 px-2 py-2"
                >
                  <div
                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white ${
                      pendingSlot ? "bg-gradient-to-br from-stone-500 to-stone-600" : "bg-gradient-to-br from-violet-600 to-fuchsia-600"
                    }`}
                  >
                    {m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(m)
                    )}
                    {ok ? (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-stone-900">
                      {pendingSlot ? "Pending invite" : fmt(m)}
                    </p>
                    {pendingSlot ? (
                      <p className="truncate text-[10px] text-amber-900">{m.firstName}</p>
                    ) : null}
                    <p className="text-[10px] text-stone-500">
                      {isViewer ? "You · " : ""}
                      {isSponsor ? "Sponsor · " : ""}
                      <span
                        className={
                          ok ? "font-bold text-green-700" : bad ? "font-bold text-red-700" : "font-medium text-amber-800"
                        }
                      >
                        {ok ? "Accepted" : bad ? "Declined" : pendingSlot ? "Invite pending" : "Waiting"}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-stone-500">
            Invite-only: downhill sponsor bonds plus optional trust units — confirm actions on your{" "}
            <strong className="text-stone-700">Dashboard</strong>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
