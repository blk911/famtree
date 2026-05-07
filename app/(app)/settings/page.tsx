"use client";
// app/(app)/settings/page.tsx

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Shield, User, Trash2, Timer, KeyRound, Eye, EyeOff } from "lucide-react";
import { IdentityChangePanel } from "@/components/settings/IdentityChangePanel";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [privacy, setPrivacy] = useState({
    isPublicInTree: true,
    showDob: false,
  });
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<3 | 5 | 10>(5);
  const [idleSaving, setIdleSaving] = useState(false);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwShow, setPwShow] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile }) => {
        setProfile(profile);
        setPrivacy({
          isPublicInTree: profile.isPublicInTree,
          showDob: profile.showDob,
        });
        const idle = profile.user?.idleTimeoutMinutes;
        if (idle === 3 || idle === 5 || idle === 10) setIdleTimeoutMinutes(idle);
      });
  }, []);

  const handleSaveIdleTimeout = async (m: 3 | 5 | 10) => {
    setIdleSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idleTimeoutMinutes: m }),
      });
      if (res.ok) {
        setIdleTimeoutMinutes(m);
        router.refresh();
      }
    } finally {
      setIdleSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwNew.length < 8) {
      setPwMsg({ text: "New password must be at least 8 characters." });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ text: "New passwords don't match." });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwMsg({
          text: typeof data?.error === "string" ? data.error : "Could not update password",
        });
        return;
      }
      setPwMsg({ ok: true, text: "Password updated. Other sessions were signed out." });
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      router.refresh();
    } finally {
      setPwSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(privacy),
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePhotoUpload = async (file: File) => {
    setPhotoUploading(true);
    setPhotoError("");

    const formData = new FormData();
    formData.append("photo", file);
    const res = await fetch("/api/profile/photo", { method: "POST", body: formData });
    const data = await res.json();

    if (res.ok) {
      setProfile((current: any) => current
        ? { ...current, user: { ...current.user, photoUrl: data.photoUrl } }
        : current
      );
    } else {
      setPhotoError(data?.error ?? "Could not upload photo");
    }

    setPhotoUploading(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const Toggle = ({
    label, description, value, onChange,
  }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-start justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-stone-900">{label}</p>
        <p className="text-xs text-stone-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 ${
          value ? "bg-stone-900" : "bg-stone-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="content-col space-y-8">
      {/* Account info */}
      <div className="profile-card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
          <User className="w-4 h-4 text-stone-600" />
          <h2 className="font-semibold text-stone-900 text-sm">Account</h2>
        </div>
        {profile && (
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">

            {/* Photo — top-center on mobile, right column on desktop */}
            <div className="flex flex-col items-center gap-3 order-first sm:order-last sm:flex-shrink-0">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-stone-100 bg-stone-200">
                {profile.user.photoUrl ? (
                  <img src={profile.user.photoUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-stone-500">
                    {(profile.user.firstName?.[0] ?? "")}{(profile.user.lastName?.[0] ?? "")}
                  </span>
                )}
              </div>
              <input
                id="settings-photo-input"
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ position: "absolute", left: "-9999px", opacity: 0, width: "1px", height: "1px" }}
                onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
              />
              <label
                htmlFor={photoUploading ? undefined : "settings-photo-input"}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                style={{ cursor: photoUploading ? "default" : "pointer", opacity: photoUploading ? 0.6 : 1 }}
              >
                <Camera className="h-3.5 w-3.5" />
                {photoUploading ? "Uploading..." : "Change photo"}
              </label>
              {photoError && <p className="text-xs text-red-600">{photoError}</p>}
            </div>

            {/* Info fields */}
            <div className="space-y-3 text-sm flex-1 min-w-0">
              <div className="grid grid-cols-[100px_1fr] items-start gap-2">
                <span className="text-stone-500 pt-0.5">Name</span>
                <span className="text-stone-900 font-medium break-words">
                  {profile.user.firstName} {profile.user.lastName}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-start gap-2">
                <span className="text-stone-500 pt-0.5">Email</span>
                <span className="text-stone-900 break-all">{profile.user.email}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-start gap-2">
                <span className="text-stone-500 pt-0.5">Mobile</span>
                <span className="text-stone-900 break-words">{profile.phone?.trim() ? profile.phone : "—"}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-start gap-2">
                <span className="text-stone-500 pt-0.5">Role</span>
                <span className="badge badge-stone capitalize w-fit">{profile.user.role}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-start gap-2">
                <span className="text-stone-500 pt-0.5">Member since</span>
                <span className="text-stone-500">
                  {new Date(profile.user.createdAt).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
            </div>

          </div>
        )}
      </div>

      <IdentityChangePanel />

      {/* Password */}
      <div className="profile-card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
          <KeyRound className="w-4 h-4 text-stone-600" />
          <h2 className="font-semibold text-stone-900 text-sm">Password</h2>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">
          Forgot it? Use{" "}
          <Link href="/login?forgot=1" className="font-semibold text-violet-700 hover:underline">
            Forgot password
          </Link>{" "}
          on the login page — we&apos;ll email you a one-hour link.
        </p>
        {pwMsg && (
          <p className={`text-xs font-medium ${pwMsg.ok ? "text-green-600" : "text-red-600"}`}>{pwMsg.text}</p>
        )}
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Current password</label>
            <div className="relative">
              <input
                type={pwShow ? "text" : "password"}
                autoComplete="current-password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                required
                className="field-input text-sm w-full pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                aria-label={pwShow ? "Hide passwords" : "Show passwords"}
                onClick={() => setPwShow((v) => !v)}
              >
                {pwShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">New password</label>
            <input
              type={pwShow ? "text" : "password"}
              autoComplete="new-password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              required
              minLength={8}
              className="field-input text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Confirm new password</label>
            <input
              type={pwShow ? "text" : "password"}
              autoComplete="new-password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              required
              minLength={8}
              className="field-input text-sm w-full"
            />
          </div>
          <button
            type="submit"
            disabled={pwSaving}
            className="btn-primary text-sm px-4 py-2"
          >
            {pwSaving ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>

      {/* Session security */}
      <div className="profile-card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
          <Timer className="w-4 h-4 text-stone-600" />
          <h2 className="font-semibold text-stone-900 text-sm">Session security</h2>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">
          If you stop using the site (no mouse, keyboard, scroll, or touch) for longer than the time you choose, we
          show a short warning and then sign you out automatically. Shorter times reduce risk if someone else picks up
          this device. Maximum option is 10 minutes.
        </p>
        <div className="flex flex-wrap gap-2">
          {([3, 5, 10] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={idleSaving}
              onClick={() => void handleSaveIdleTimeout(m)}
              className={`rounded-full px-4 py-2 text-xs font-semibold border transition-colors ${
                idleTimeoutMinutes === m
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="profile-card p-6 space-y-1">
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
          <Shield className="w-4 h-4 text-stone-600" />
          <h2 className="font-semibold text-stone-900 text-sm">Privacy</h2>
        </div>

        <div className="divide-y divide-stone-100">
          <Toggle
            label="Visible in family tree"
            description="Other tree members can see your profile and photo"
            value={privacy.isPublicInTree}
            onChange={(v) => setPrivacy((p) => ({ ...p, isPublicInTree: v }))}
          />
          <Toggle
            label="Show date of birth"
            description="Display your birthday on your profile"
            value={privacy.showDob}
            onChange={(v) => setPrivacy((p) => ({ ...p, showDob: v }))}
          />
        </div>

        <div className="pt-4 flex items-center gap-3">
          <button
            onClick={handleSavePrivacy}
            className="btn-primary text-sm px-4 py-2"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save privacy settings"}
          </button>
          {saved && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
        </div>
      </div>

      {/* Danger zone */}
      <div className="profile-card p-6 space-y-4 border-red-100">
        <div className="flex items-center gap-3 pb-4 border-b border-red-100">
          <Trash2 className="w-4 h-4 text-red-500" />
          <h2 className="font-semibold text-red-700 text-sm">Danger zone</h2>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-900">Delete account</p>
            <p className="text-xs text-stone-400 mt-0.5">
              Permanently remove your profile and data from AMIHUMAN.NET. This cannot be undone.
            </p>
          </div>
          <button
            className="btn-danger text-xs px-4 py-2 flex-shrink-0"
            onClick={() => window.confirm("Are you sure? This is permanent.") && alert("Contact your tree founder to delete your account.")}
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}

