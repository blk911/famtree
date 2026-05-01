"use client";
// app/(auth)/reset-password/page.tsx

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TreePine, Eye, EyeOff, CheckCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [done, setDone]               = useState(false);

  if (!token) {
    return (
      <div style={{textAlign:"center",padding:"32px 0"}}>
        <p style={{color:"#dc2626",fontWeight:600,fontSize:"15px"}}>Invalid reset link.</p>
        <Link href="/login" style={{color:"#f59e0b",fontWeight:700,fontSize:"14px"}}>Back to login</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setLoading(true);
    setError("");

    try {
      const res  = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {done ? (
        <div style={{textAlign:"center",padding:"16px 0"}}>
          <CheckCircle style={{width:"48px",height:"48px",color:"#16a34a",margin:"0 auto 14px"}} />
          <h2 style={{fontSize:"20px",fontWeight:800,color:"#1c1917",margin:"0 0 8px"}}>Password updated!</h2>
          <p style={{color:"#78716c",fontSize:"14px",margin:"0 0 20px"}}>Redirecting you to login…</p>
          <Link href="/login" style={{color:"#f59e0b",fontWeight:700,fontSize:"14px"}}>Go now →</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {error && (
            <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"10px",padding:"12px 14px",fontSize:"14px",color:"#dc2626",fontWeight:600}}>
              {error}
            </div>
          )}

          <div>
            <label style={{fontSize:"13px",fontWeight:700,color:"#44403c",display:"block",marginBottom:"6px"}}>
              New password
            </label>
            <div style={{position:"relative"}}>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoFocus
                style={{width:"100%",boxSizing:"border-box",padding:"10px 40px 10px 14px",border:"1.5px solid #e5e4e0",borderRadius:"10px",fontSize:"15px",outline:"none"}}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#a8a29e"}}
              >
                {showPw ? <EyeOff style={{width:"16px",height:"16px"}} /> : <Eye style={{width:"16px",height:"16px"}} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{fontSize:"13px",fontWeight:700,color:"#44403c",display:"block",marginBottom:"6px"}}>
              Confirm new password
            </label>
            <input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              required
              style={{width:"100%",boxSizing:"border-box",padding:"10px 14px",border:"1.5px solid #e5e4e0",borderRadius:"10px",fontSize:"15px",outline:"none"}}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height:"48px",background:"linear-gradient(135deg,#f59e0b,#f43f5e)",
              color:"white",fontWeight:700,borderRadius:"10px",fontSize:"15px",
              border:"none",cursor:"pointer",opacity:loading ? 0.75 : 1,
            }}
          >
            {loading ? "Updating…" : "Set new password"}
          </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight:"100vh",
      background:"radial-gradient(circle at 12% 82%, rgba(245,158,11,0.32), transparent 34%), radial-gradient(circle at 88% 14%, rgba(244,63,94,0.28), transparent 30%), #0f1729",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"32px",position:"relative",
    }}>
      <Link href="/login" style={{position:"absolute",top:"24px",left:"24px",color:"rgba(255,255,255,0.82)",fontSize:"14px",fontWeight:600,textDecoration:"none"}}>
        ← Back to login
      </Link>

      <div style={{width:"100%",maxWidth:"440px",background:"white",padding:"40px",borderRadius:"20px",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"10px",marginBottom:"24px"}}>
          <div style={{width:"54px",height:"54px",borderRadius:"16px",background:"linear-gradient(135deg,#f59e0b,#f43f5e)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <TreePine style={{width:"29px",height:"29px",color:"white"}} />
          </div>
          <div style={{fontSize:"22px",fontWeight:800,color:"#0f1729",letterSpacing:"-0.4px"}}>AMIHUMAN.NET</div>
        </div>

        <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f1729",margin:"0 0 6px",textAlign:"center"}}>Set new password</h1>
        <p style={{fontSize:"14px",color:"#78716c",textAlign:"center",margin:"0 0 24px"}}>Choose a strong password for your account.</p>

        <Suspense fallback={<div style={{textAlign:"center",color:"#a8a29e",fontSize:"14px"}}>Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
