"use client";
// app/(auth)/register/page.tsx

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TreePine, Eye, EyeOff, Upload } from "lucide-react";

// ── inner component that uses useSearchParams ──────────────────────────────────
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token") ?? undefined;
  const prefillEmail = searchParams.get("email") ?? "";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: prefillEmail,
    password: "",
  });
  const [dob, setDob] = useState({ month: "", day: "", year: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!photoFile) {
      setLoading(false);
      setError(
        "A current selfie is required — add a photo now to complete registration. Invites and your profile use this picture so people know it’s you.",
      );
      return;
    }

    try {
      // 1. Register account
      const dobString =
        dob.year.length === 4 && dob.month && dob.day
          ? `${dob.year}-${dob.month.padStart(2, "0")}-${dob.day.padStart(2, "0")}`
          : undefined;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dateOfBirth: dobString, inviteToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      // 2. Upload photo if provided
      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        await fetch("/api/profile/photo", { method: "POST", body: fd });
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div style={{ padding:"36px 40px" }} className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push("/")}
        style={{ display:"flex", alignItems:"center", gap:"6px", background:"none", border:"none", cursor:"pointer", fontSize:"13px", fontWeight:700, color:"#6b7280", padding:0, marginBottom:"4px" }}
      >
        ← Back
      </button>

      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 mb-3">
          <TreePine className="w-6 h-6 text-stone-800" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
          {inviteToken ? "Join the family tree" : "Start your family tree"}
        </h1>
        <p className="text-sm text-stone-500">
          {inviteToken
            ? "Create your account to complete your invitation"
            : "You'll be the founding member"}
        </p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo upload */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div
              className={`w-20 h-20 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center ring-2 ${
                photoFile ? "ring-stone-200 border-0" : "ring-red-500 ring-offset-2 ring-offset-white"
              }`}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-stone-300">👤</span>
              )}
            </div>
            <label
              htmlFor="photo-upload"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-stone-900 text-white
                         flex items-center justify-center cursor-pointer hover:bg-stone-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
          {photoFile ? (
            <p className="text-xs font-semibold text-center text-emerald-700 max-w-xs">
              Photo added — you can finish creating your account.
            </p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600 text-center max-w-xs leading-snug">
              Required — submit a current selfie to complete registration. Use a clear, recent photo of your face (this
              is how your family will recognize you).
            </p>
          )}
          <p className="text-xs text-stone-500 text-center">
            {inviteToken
              ? "This same photo is used when you send invites."
              : "You’ll use this photo when you invite family to join."}
          </p>
        </div>

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">First name</label>
            <input
              className="field-input"
              type="text"
              placeholder="Jane"
              value={form.firstName}
              onChange={set("firstName")}
              required
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="field-label">Last name</label>
            <input
              className="field-input"
              type="text"
              placeholder="Smith"
              value={form.lastName}
              onChange={set("lastName")}
              required
              autoComplete="family-name"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="field-label">Email</label>
          <input
            className="field-input"
            type="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={set("email")}
            required
            readOnly={!!prefillEmail}
            autoComplete="email"
          />
          {prefillEmail && (
            <p className="text-xs text-stone-400 mt-1">
              This is the email your invite was sent to
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="field-label">Password</label>
          <div className="relative">
            <input
              className="field-input pr-10"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={set("password")}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Date of birth */}
        <div>
          <label className="field-label">Date of birth <span className="text-stone-400 font-normal">(optional)</span></label>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 2fr", gap:"8px" }}>
            <input
              className="field-input"
              type="text"
              inputMode="numeric"
              placeholder="Month (1–12)"
              maxLength={2}
              value={dob.month}
              onChange={(e) => setDob((d) => ({ ...d, month: e.target.value.replace(/\D/g, "") }))}
              autoComplete="bday-month"
            />
            <input
              className="field-input"
              type="text"
              inputMode="numeric"
              placeholder="Day"
              maxLength={2}
              value={dob.day}
              onChange={(e) => setDob((d) => ({ ...d, day: e.target.value.replace(/\D/g, "") }))}
              autoComplete="bday-day"
            />
            <input
              className="field-input"
              type="text"
              inputMode="numeric"
              placeholder="Year (e.g. 1955)"
              maxLength={4}
              value={dob.year}
              onChange={(e) => setDob((d) => ({ ...d, year: e.target.value.replace(/\D/g, "") }))}
              autoComplete="bday-year"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-stone-500" style={{ paddingBottom:"8px" }}>
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-stone-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

// ── page shell — provides the Suspense boundary ────────────────────────────────
export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding:"36px 40px", textAlign:"center", color:"#6b7280" }}>Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
