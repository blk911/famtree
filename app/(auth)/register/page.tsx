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
    dateOfBirth: "",
  });
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Register account
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, inviteToken }),
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
            <div className="w-20 h-20 rounded-full overflow-hidden bg-stone-100 border-2 border-stone-200 flex items-center justify-center">
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
          <p className="text-xs text-stone-400">
            {inviteToken
              ? "Your photo will be used when you invite others"
              : "Add your photo — it's sent when you invite family"}
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
          <input
            className="field-input"
            type="date"
            value={form.dateOfBirth}
            onChange={set("dateOfBirth")}
            autoComplete="bday"
          />
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
