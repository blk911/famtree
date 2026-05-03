"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, PenLine } from "lucide-react";

type Ack = {
  id: string;
  inviteeId: string;
  response: string | null;
  respondedAt: string | null;
  invitee: { firstName: string; lastName: string };
};

type OpenRequest = {
  id: string;
  status: string;
  expiresAt: string;
  hasConflict: boolean;
  changeName: boolean;
  changeEmail: boolean;
  changePhone: boolean;
  proposedFirstName: string | null;
  proposedLastName: string | null;
  proposedEmail: string | null;
  proposedPhone: string | null;
  requesterNote: string;
  acknowledgments: Ack[];
};

type IdentityPayload = {
  selfServiceRemaining: number;
  current: { firstName: string; lastName: string; email: string; phone: string };
  inviteePreviewCount: number;
  openRequest: OpenRequest | null;
};

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function IdentityChangePanel() {
  const [data, setData] = useState<IdentityPayload | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const reload = useCallback(async () => {
    setLoadErr("");
    const res = await fetch("/api/identity-change");
    const json = await res.json();
    if (!res.ok) {
      setLoadErr(json?.error ?? "Could not load identity settings.");
      return;
    }
    const p = json as IdentityPayload;
    setData(p);
    setFirstName(p.current.firstName);
    setLastName(p.current.lastName);
    setEmail(p.current.email);
    setPhone(p.current.phone ?? "");
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const withdraw = async (id: string) => {
    if (!window.confirm("Withdraw this identity change request? You can submit a new one later.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/identity-change/${id}/withdraw`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tone: "err", text: json?.error ?? "Withdraw failed." });
        return;
      }
      await reload();
      setMsg({ tone: "ok", text: "Request withdrawn." });
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!data) return;
    setBusy(true);
    setMsg(null);
    try {
      const trimmedNote = note.trim();
      if (trimmedNote.length < 10) {
        setMsg({ tone: "err", text: "Please add a short explanation (at least 10 characters)." });
        setBusy(false);
        return;
      }

      const fn = firstName.trim();
      const ln = lastName.trim();
      const nameDelta = fn !== data.current.firstName || ln !== data.current.lastName;
      if (nameDelta && (!fn || !ln)) {
        setMsg({ tone: "err", text: "Provide both first and last name when changing your legal name." });
        setBusy(false);
        return;
      }

      const body: Record<string, unknown> = {
        requesterNote: trimmedNote,
      };
      if (fn !== data.current.firstName || ln !== data.current.lastName) {
        body.proposedFirstName = fn;
        body.proposedLastName = ln;
      }
      const em = email.trim().toLowerCase();
      if (em !== data.current.email.toLowerCase()) {
        body.proposedEmail = email.trim();
      }
      const ph = phone.trim();
      if (ph !== (data.current.phone ?? "").trim()) {
        body.proposedPhone = ph === "" ? "" : ph;
      }

      const res = await fetch("/api/identity-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tone: "err", text: json?.error ?? "Could not submit request." });
        return;
      }
      setNote("");
      await reload();
      setMsg({ tone: "ok", text: "Request submitted." });
    } finally {
      setBusy(false);
    }
  };

  if (loadErr) {
    return (
      <div className="profile-card p-6">
        <p className="text-sm text-red-600">{loadErr}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="profile-card p-6 flex items-center gap-2 text-stone-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const open = data.openRequest;

  return (
    <div className="profile-card p-6 space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
        <PenLine className="w-4 h-4 text-stone-600" />
        <h2 className="font-semibold text-stone-900 text-sm">Legal name, email &amp; mobile</h2>
      </div>

      <p className="text-xs text-stone-500 leading-relaxed">
        Identity updates use your remaining self-service slot, require a short note, and ask people you personally invited to acknowledge.
        Email changes are also approved by an admin before they take effect. After your first approved change, contact an admin for another self-service update if needed.
      </p>

      <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 text-xs text-stone-600">
        Self-service updates remaining:{" "}
        <span className="font-semibold text-stone-900">{data.selfServiceRemaining}</span>
        {data.inviteePreviewCount > 0 && (
          <span className="block mt-1">
            Active accounts you invited (must acknowledge):{" "}
            <span className="font-semibold text-stone-900">{data.inviteePreviewCount}</span>
          </span>
        )}
      </div>

      {msg && (
        <p className={`text-xs font-medium ${msg.tone === "ok" ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
      )}

      {open ? (
        <div className="space-y-4 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm text-stone-800">
              <p className="font-semibold">Request in progress</p>
              <p className="text-xs text-stone-600 mt-1">
                Status: <strong>{open.status.replace(/_/g, " ")}</strong>
                {" · "}expires {fmtShort(open.expiresAt)}
              </p>
              {open.hasConflict && (
                <p className="text-xs text-amber-900 mt-2">
                  This request moved to admin review because of a deadline or a “no” acknowledgment — an admin will decide next steps.
                </p>
              )}
            </div>
          </div>

          <div className="text-xs space-y-1 text-stone-700">
            <p className="font-semibold text-stone-900">Proposed changes</p>
            {open.changeName && (
              <p>
                Name → {open.proposedFirstName} {open.proposedLastName}
              </p>
            )}
            {open.changeEmail && open.proposedEmail && <p>Email → {open.proposedEmail}</p>}
            {open.changePhone && (
              <p>Mobile → {open.proposedPhone === null || open.proposedPhone === "" ? "(clear)" : open.proposedPhone}</p>
            )}
            <p className="text-stone-500 mt-2 italic">&ldquo;{open.requesterNote}&rdquo;</p>
          </div>

          {open.status === "PENDING_ACKS" && open.acknowledgments.length > 0 && (
            <div className="text-xs border-t border-amber-100 pt-3 space-y-1">
              <p className="font-semibold text-stone-800">Invitee responses</p>
              <ul className="space-y-1">
                {open.acknowledgments.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>
                      {a.invitee.firstName} {a.invitee.lastName}
                    </span>
                    <span className="text-stone-500">
                      {!a.response ? "Pending" : a.response === "YES" ? "Yes" : "No"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(open.status === "PENDING_ACKS" || open.status === "PENDING_ADMIN") && (
            <button
              type="button"
              disabled={busy}
              onClick={() => withdraw(open.id)}
              className="text-xs font-semibold text-red-700 hover:text-red-800 underline underline-offset-2 disabled:opacity-50"
            >
              Withdraw request
            </button>
          )}
        </div>
      ) : data.selfServiceRemaining <= 0 ? (
        <p className="text-sm text-stone-600">
          You have used your self-service identity update. Please message an admin (founder or site admin) to unlock another change when appropriate — for example legal name changes, divorce, or recovery situations.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs space-y-1">
              <span className="text-stone-500 font-medium">First name</span>
              <input
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-stone-500 font-medium">Last name</span>
              <input
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-xs space-y-1">
            <span className="text-stone-500 font-medium">Email</span>
            <input
              type="email"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-stone-500 font-medium">Mobile</span>
            <input
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Leave blank to clear after submit"
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-stone-500 font-medium">Note to reviewers (required)</span>
            <textarea
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm min-h-[88px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain why you need this change (min. 10 characters)."
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Submit identity change request
          </button>
        </div>
      )}
    </div>
  );
}
