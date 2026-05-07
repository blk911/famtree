"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export type TuModalMember = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  approvalStatus?: string;
};

export type TuModalRequest = {
  id: string;
  createdAt: string;
  createdBy: TuModalMember;
  members: TuModalMember[];
};

function fmtName(m: TuModalMember) {
  return `${m.firstName} ${m.lastName}`.trim();
}

function initials(m: TuModalMember) {
  return `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();
}

export function TrustUnitFormationModal({
  request,
  currentUserId,
  onHoldOrLater,
  onAfterAction,
}: {
  request: TuModalRequest;
  currentUserId: string;
  /** Hold / “continue” — hide modal until next login (session dismiss). */
  onHoldOrLater: () => void;
  /** Refresh server props after accept / decline */
  onAfterAction: () => void;
}) {
  const [members, setMembers] = useState(request.members);
  const [loading, setLoading] = useState<"ACCEPT" | "DECLINE" | null>(null);

  useEffect(() => {
    setMembers(request.members);
  }, [request]);

  const me = members.find((m) => m.id === currentUserId);
  const myStatus = me?.approvalStatus ?? "PENDING";
  const iApproved = myStatus === "APPROVED";
  const iDeclined = myStatus === "DECLINED";
  const acceptedCount = members.filter((m) => m.approvalStatus === "APPROVED").length;
  const allApproved = members.length > 0 && acceptedCount === members.length;

  const respond = async (action: "ACCEPT" | "DECLINE") => {
    setLoading(action);
    try {
      const res = await fetch("/api/trust/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, userId: currentUserId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (action === "ACCEPT") {
          setMembers((prev) =>
            prev.map((m) =>
              m.id === currentUserId ? { ...m, approvalStatus: "APPROVED" } : m,
            ),
          );
        }
        if (action === "DECLINE" || data.active) {
          onHoldOrLater();
        }
        onAfterAction();
      }
    } finally {
      setLoading(null);
    }
  };

  const sponsor = request.createdBy;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-900/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tu-formation-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="border-b border-stone-100 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600">
            Trust Unit
          </p>
          <h2 id="tu-formation-title" className="mt-1 text-xl font-bold text-stone-900">
            You can form a Trust Unit
          </h2>
          <p className="mt-2 text-sm leading-snug text-stone-600">
            AMIHUMAN.NET is <strong className="text-stone-800">invite-only</strong>: everyone joins downhill from a{" "}
            <strong className="text-stone-800">sponsor</strong> who invited them. When three aligned members qualify,
            a Trust Unit can form <span className="italic">on top of</span> those downhill links — each person here must
            accept before it goes live.
          </p>
          <p className="mt-2 text-sm text-stone-600">
            <span className="font-semibold text-stone-800">Sponsor</span> who proposed this unit:{" "}
            <span className="font-semibold text-stone-900">{fmtName(sponsor)}</span>
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Proposed {new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" · "}
            <span className="font-medium text-stone-700">
              {acceptedCount}/{members.length} accepted
            </span>
          </p>
        </div>

        <div className="divide-y divide-stone-100 px-6">
          {members.map((member) => {
            const st = member.approvalStatus ?? "PENDING";
            const isSelf = member.id === currentUserId;
            const approved = st === "APPROVED";
            const declined = st === "DECLINED";

            return (
              <div key={member.id} className="flex flex-wrap items-center gap-3 py-4">
                <div className="relative shrink-0">
                  <div
                    className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white ${
                      approved ? "ring-2 ring-green-500 ring-offset-2" : ""
                    }`}
                  >
                    {member.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(member)
                    )}
                  </div>
                  {approved ? (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white shadow">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-stone-900">{fmtName(member)}</p>
                  {isSelf ? (
                    <p className="text-xs text-violet-700">You</p>
                  ) : sponsor.id === member.id ? (
                    <p className="text-xs text-stone-500">Sponsor</p>
                  ) : null}
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  {isSelf && !approved && !declined ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!!loading}
                        onClick={() => void respond("ACCEPT")}
                        className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {loading === "ACCEPT" ? "Accepting…" : "Accept"}
                      </button>
                      <button
                        type="button"
                        disabled={!!loading}
                        onClick={onHoldOrLater}
                        className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                      >
                        Hold
                      </button>
                    </div>
                  ) : null}

                  {isSelf && approved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800 ring-1 ring-green-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Accepted
                    </span>
                  ) : null}

                  {!isSelf ? (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        approved
                          ? "bg-green-50 text-green-800 ring-1 ring-green-200"
                          : declined
                            ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                            : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                      }`}
                    >
                      {approved ? "Accepted" : declined ? "Declined" : "Waiting"}
                    </span>
                  ) : null}

                  {isSelf && !approved && !declined ? (
                    <button
                      type="button"
                      disabled={!!loading}
                      onClick={() => void respond("DECLINE")}
                      className="text-left text-[11px] font-semibold text-red-600 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      Decline this proposal
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-stone-100 bg-stone-50 px-6 py-4">
          {iApproved && !allApproved ? (
            <p className="text-center text-xs text-stone-600">
              Waiting for everyone else to accept. You&apos;ll see updates here and under{" "}
              <strong>Family → Units</strong>.
            </p>
          ) : null}
          {(iApproved || allApproved) && (
            <button
              type="button"
              onClick={onHoldOrLater}
              className="w-full rounded-xl bg-white py-2.5 text-sm font-bold text-stone-800 ring-1 ring-stone-200 hover:bg-stone-100"
            >
              Continue to dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
