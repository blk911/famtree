"use client";
// app/(auth)/login/page.tsx

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TreePine, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      const destination = data.user?.role === "founder" || data.user?.role === "admin" ? "/admin" : "/dashboard";
      router.push(destination);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:"100vh",background:"radial-gradient(circle at 12% 82%, rgba(245,158,11,0.32), transparent 34%), radial-gradient(circle at 88% 14%, rgba(244,63,94,0.28), transparent 30%), #0f1729",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"32px",position:"relative",
    }}>
      <style>{`
        .famtree-login-input:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.14); }
        .famtree-login-submit:hover { opacity: 0.9; }
      `}</style>
      <Link href="/" style={{position:"absolute",top:"24px",left:"24px",color:"rgba(255,255,255,0.82)",fontSize:"14px",fontWeight:600,textDecoration:"none"}}>
        ← Back to home
      </Link>

      <div className="auth-card space-y-6" style={{
        width:"100%",maxWidth:"480px",background:"white",padding:"40px",borderRadius:"20px",
        boxShadow:"0 24px 64px rgba(0,0,0,0.3)",
      }}>
        <div className="text-center space-y-1">
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"10px",marginBottom:"18px"}}>
            <div style={{width:"54px",height:"54px",borderRadius:"16px",background:"linear-gradient(135deg,#f59e0b,#f43f5e)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <TreePine style={{width:"29px",height:"29px",color:"white"}} />
            </div>
            <div style={{fontSize:"22px",fontWeight:800,color:"#0f1729",letterSpacing:"-0.4px"}}>FamTree</div>
          </div>
          <h1 className="tracking-tight" style={{fontSize:"28px",fontWeight:800,color:"#0f1729",margin:"0 0 6px"}}>Welcome back</h1>
          <p className="text-sm" style={{color:"#78716c",margin:0}}>Sign in to your family tree</p>
        </div>

        {error && <div className="alert-error" style={{borderLeft:"4px solid #f59e0b",borderRadius:"10px"}}>{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Email</label>
            <input
              className="field-input famtree-login-input"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              style={{borderRadius:"10px",fontSize:"15px"}}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label mb-0">Password</label>
            </div>
            <div className="relative">
              <input
                className="field-input pr-10 famtree-login-input"
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{borderRadius:"10px",fontSize:"15px"}}
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

          <button type="submit" className="btn-primary w-full famtree-login-submit" disabled={loading} style={{
            height:"48px",background:"linear-gradient(135deg,#f59e0b,#f43f5e)",color:"white",
            fontWeight:700,borderRadius:"10px",fontSize:"15px",border:"none",
          }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm" style={{color:"#78716c"}}>
          Don't have an account?{" "}
          <Link href="/register" className="font-medium hover:underline" style={{color:"#f59e0b"}}>
            Get started
          </Link>
        </p>
      </div>
    </div>
  );
}
