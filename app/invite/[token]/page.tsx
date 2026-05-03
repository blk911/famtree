"use client";
// app/invite/[token]/page.tsx
// The "Who Am I?" identity challenge page

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TreePine, ShieldCheck, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";

type InviteInfo = {
  inviteId: string;
  recipientEmail: string;
  senderPhotoUrl: string | null;
  expiresAt: string;
  attemptsLeft: number;
};

type Stage = "loading" | "challenge" | "success" | "expired" | "not_found";

export default function InviteChallengePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [guessedName, setGuessedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // Load invite info
  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStage("not_found");
        } else {
          setInvite(data);
          setAttemptsLeft(data.attemptsLeft);
          setStage("challenge");
        }
      })
      .catch(() => setStage("not_found"));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guessedName }),
      });
      const data = await res.json();

      if (data.success) {
        setStage("success");
        // Redirect to register after 2s
        setTimeout(() => {
          router.push(
            `/register?token=${token}&email=${encodeURIComponent(invite?.recipientEmail ?? "")}`
          );
        }, 2000);
      } else {
        setAttemptsLeft(data.attemptsLeft);
        if (data.reason === "expired" || data.attemptsLeft === 0) {
          setStage("expired");
        } else {
          setErrorMsg(data.message);
        }
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────
  if (stage === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-400 text-sm animate-pulse">Loading your invite…</div>
      </div>
    );
  }

  // ── Not found / expired ──────────────────────────────────
  if (stage === "not_found" || stage === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <div className="auth-card max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">
            {stage === "expired" ? "Invite expired" : "Invite not found"}
          </h1>
          <p className="text-sm text-stone-500">
            {stage === "expired"
              ? "This invite has expired due to too many failed attempts or it timed out."
              : "This invite link is invalid or has already been used."}
          </p>
          <p className="text-sm text-stone-400">
            Ask the person who invited you to send a new invite.
          </p>
          <Link href="/" className="btn-secondary w-full">
            Go to AMIHUMAN.NET
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────
  if (stage === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <div className="auth-card max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">Identity confirmed!</h1>
          <p className="text-sm text-stone-500">
            You're in. Setting up your account now…
          </p>
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ── Challenge ────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Nav */}
      <nav className="flex items-center justify-center px-6 py-5 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-2 text-stone-900">
          <TreePine className="w-5 h-5" />
          <span className="font-semibold tracking-tight">AMIHUMAN.NET</span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="auth-card max-w-md w-full space-y-6">
          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            Identity verification required to join
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
              Who invited you?
            </h1>
            <p className="text-sm text-stone-500">
              Someone sent you this invite. Identify them to join their family tree.
            </p>
          </div>

          {/* Sender photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-stone-200 bg-stone-100 shadow-sm">
              {invite?.senderPhotoUrl ? (
                <img
                  src={invite.senderPhotoUrl}
                  alt="Who is this person?"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl text-stone-300">
                  👤
                </div>
              )}
            </div>
            <p className="text-xs text-stone-400">Do you recognise this person?</p>
          </div>

          {/* Attempt counter */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < attemptsLeft ? "bg-stone-800" : "bg-stone-200"
                }`}
              />
            ))}
            <span className="text-xs text-stone-400 ml-1">
              {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
            </span>
          </div>

          {/* Name input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="alert-error flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            <div>
              <label className="field-label">Type their name</label>
              <input
                className="field-input text-center text-lg"
                type="text"
                placeholder="e.g. Grandma Sue or Susan Smith"
                value={guessedName}
                onChange={(e) => setGuessedName(e.target.value)}
                required
                autoFocus
                autoComplete="off"
                autoCorrect="off"
              />
              <p className="text-xs text-stone-400 mt-1.5 text-center">
                First name, last name, or nickname all work
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={submitting || !guessedName.trim()}
            >
              {submitting ? "Checking…" : "That's who it is →"}
            </button>
          </form>

          <p className="text-center text-xs text-stone-400">
            Don't recognise this person? Simply ignore this email.
          </p>
        </div>
      </div>
    </div>
  );
}
