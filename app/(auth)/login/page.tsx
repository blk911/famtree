"use client";
// app/(auth)/login/page.tsx

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TreePine, Eye, EyeOff, CheckCircle } from "lucide-react";

type View = "login" | "forgot" | "forgot-sent";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("login");

  // Login state
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  // Forgot password state
  const [resetEmail,   setResetEmail]   = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError,   setResetError]   = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      const dest = data.user?.role === "founder" || data.user?.role === "admin" ? "/admin" : "/dashboard";
      router.push(dest);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (!res.ok) {
        const data = await res.json();
        setResetError(data.error ?? "Something went wrong.");
        return;
      }
      setView("forgot-sent");
    } catch {
      setResetError("Network error — please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{ padding:"36px 40px" }}>
        <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:"6px", color:"#78716c", fontSize:"14px", fontWeight:600, textDecoration:"none", marginBottom:"18px" }}>
          Back to home
        </Link>

        {/* Brand */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"10px",marginBottom:"22px"}}>
          <div style={{width:"54px",height:"54px",borderRadius:"16px",background:"linear-gradient(135deg,#f59e0b,#f43f5e)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <TreePine style={{width:"29px",height:"29px",color:"white"}} />
          </div>
          <div style={{fontSize:"22px",fontWeight:800,color:"#0f1729",letterSpacing:"-0.4px"}}>AMIHUMAN.NET</div>
        </div>

        {/* ── LOGIN ─────────────────────────────────────────────── */}
        {view === "login" && (
          <>
            <h1 style={{fontSize:"26px",fontWeight:800,color:"#0f1729",margin:"0 0 4px",textAlign:"center"}}>Welcome back</h1>
            <p style={{fontSize:"14px",color:"#78716c",textAlign:"center",margin:"0 0 22px"}}>Sign in to your family tree</p>

            {error && (
              <div style={{background:"#fef2f2",borderLeft:"4px solid #f59e0b",borderRadius:"10px",padding:"12px 14px",fontSize:"14px",color:"#92400e",marginBottom:"16px",fontWeight:600}}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div>
                <label style={{fontSize:"13px",fontWeight:700,color:"#44403c",display:"block",marginBottom:"6px"}}>Email</label>
                <input
                  className="aih-input"
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  style={{width:"100%",boxSizing:"border-box",padding:"10px 14px",border:"1.5px solid #e5e4e0",borderRadius:"10px",fontSize:"15px",transition:"border-color 0.15s,box-shadow 0.15s"}}
                />
              </div>

              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
                  <label style={{fontSize:"13px",fontWeight:700,color:"#44403c"}}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setResetEmail(email); setView("forgot"); setError(""); }}
                    style={{fontSize:"12px",fontWeight:600,color:"#f59e0b",background:"none",border:"none",cursor:"pointer",padding:0}}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{position:"relative"}}>
                  <input
                    className="aih-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{width:"100%",boxSizing:"border-box",padding:"10px 40px 10px 14px",border:"1.5px solid #e5e4e0",borderRadius:"10px",fontSize:"15px",transition:"border-color 0.15s,box-shadow 0.15s"}}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#a8a29e"}}
                  >
                    {showPassword ? <EyeOff style={{width:"16px",height:"16px"}} /> : <Eye style={{width:"16px",height:"16px"}} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{height:"48px",background:"linear-gradient(135deg,#f59e0b,#f43f5e)",color:"white",fontWeight:700,borderRadius:"10px",fontSize:"15px",border:"none",cursor:"pointer",opacity:loading ? 0.75 : 1,marginTop:"4px"}}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p style={{textAlign:"center",fontSize:"14px",color:"#78716c",marginTop:"20px"}}>
              Don't have an account?{" "}
              <Link href="/register" style={{color:"#f59e0b",fontWeight:700,textDecoration:"none"}}>Get started</Link>
            </p>
          </>
        )}

        {/* ── FORGOT PASSWORD ────────────────────────────────────── */}
        {view === "forgot" && (
          <>
            <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f1729",margin:"0 0 6px",textAlign:"center"}}>Reset password</h1>
            <p style={{fontSize:"14px",color:"#78716c",textAlign:"center",margin:"0 0 22px",lineHeight:1.5}}>
              Enter your email and we'll send a reset link — expires in 1 hour.
            </p>

            {resetError && (
              <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"10px",padding:"12px 14px",fontSize:"14px",color:"#dc2626",fontWeight:600,marginBottom:"14px"}}>
                {resetError}
              </div>
            )}

            <form onSubmit={handleForgot} style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div>
                <label style={{fontSize:"13px",fontWeight:700,color:"#44403c",display:"block",marginBottom:"6px"}}>Email address</label>
                <input
                  className="aih-input"
                  type="email"
                  placeholder="jane@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  autoFocus
                  style={{width:"100%",boxSizing:"border-box",padding:"10px 14px",border:"1.5px solid #e5e4e0",borderRadius:"10px",fontSize:"15px",transition:"border-color 0.15s,box-shadow 0.15s"}}
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                style={{height:"48px",background:"linear-gradient(135deg,#f59e0b,#f43f5e)",color:"white",fontWeight:700,borderRadius:"10px",fontSize:"15px",border:"none",cursor:"pointer",opacity:resetLoading ? 0.75 : 1}}
              >
                {resetLoading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <button
              onClick={() => setView("login")}
              style={{display:"block",width:"100%",marginTop:"14px",background:"none",border:"none",cursor:"pointer",fontSize:"14px",color:"#78716c",fontWeight:600,textAlign:"center"}}
            >
              ← Back to login
            </button>
          </>
        )}

        {/* ── SENT CONFIRMATION ──────────────────────────────────── */}
        {view === "forgot-sent" && (
          <div style={{textAlign:"center",padding:"8px 0"}}>
            <CheckCircle style={{width:"52px",height:"52px",color:"#16a34a",margin:"0 auto 16px"}} />
            <h2 style={{fontSize:"22px",fontWeight:800,color:"#1c1917",margin:"0 0 10px"}}>Check your email</h2>
            <p style={{fontSize:"14px",color:"#78716c",lineHeight:1.6,margin:"0 0 24px"}}>
              If <strong>{resetEmail}</strong> is in our system, a reset link is on its way. Check your spam folder if it doesn't arrive within a minute.
            </p>
            <button
              onClick={() => { setView("login"); setResetEmail(""); }}
              style={{height:"44px",width:"100%",background:"#0f1729",color:"white",fontWeight:700,borderRadius:"10px",fontSize:"14px",border:"none",cursor:"pointer"}}
            >
              Back to login
            </button>
          </div>
        )}
      </div>
  );
}
