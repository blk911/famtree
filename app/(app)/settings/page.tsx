"use client";
// app/(app)/settings/page.tsx

import { useState, useEffect, useRef } from "react";
import { Camera, Shield, User, Trash2 } from "lucide-react";

export default function SettingsPage() {
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

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile }) => {
        setProfile(profile);
        setPrivacy({
          isPublicInTree: profile.isPublicInTree,
          showDob: profile.showDob,
        });
      });
  }, []);

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
    <div className="space-y-8">
      {/* Account info */}
      <div className="profile-card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
          <User className="w-4 h-4 text-stone-600" />
          <h2 className="font-semibold text-stone-900 text-sm">Account</h2>
        </div>
        {profile && (
          <div className="flex items-start justify-between gap-8">
            <div className="space-y-3 text-sm flex-1">
              <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                <span className="text-stone-500">Name</span>
                <span className="text-stone-900 font-medium">
                  {profile.user.firstName} {profile.user.lastName}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                <span className="text-stone-500">Email</span>
                <span className="text-stone-900">{profile.user.email}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                <span className="text-stone-500">Role</span>
                <span className="badge badge-stone capitalize w-fit">{profile.user.role}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                <span className="text-stone-500">Member since</span>
                <span className="text-stone-500">
                  {new Date(profile.user.createdAt).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="w-40 flex-shrink-0 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-stone-100 bg-stone-200">
                {profile.user.photoUrl ? (
                  <img src={profile.user.photoUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-stone-500">
                    {(profile.user.firstName?.[0] ?? "")}{(profile.user.lastName?.[0] ?? "")}
                  </span>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              >
                <Camera className="h-3.5 w-3.5" />
                {photoUploading ? "Uploading..." : "Change photo"}
              </button>
              {photoError && <p className="mt-2 text-xs text-red-600">{photoError}</p>}
            </div>
          </div>
        )}
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
              Permanently remove your profile and data from FamTree. This cannot be undone.
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
