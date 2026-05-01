"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { Check, Eye, EyeOff, LogIn, Mail, Send, TreePine, Users, UserCheck } from "lucide-react";
import { ContactModal } from "@/components/marketing/ContactModal";
import { FaqModal } from "@/components/marketing/FaqModal";

type Modal        = "sign-in" | "join" | "invite-flow" | "send-invite" | null;
type JoinStep     = "invite" | "waitlist" | "success";
type InviteStep   = "email" | "challenge" | "register" | "welcome";

const CARDS = [
  { id:"sign-in",    icon:LogIn, label:"Sign In",          sub:"Already a member? Welcome back to your family.",           bg:"rgba(255,255,255,0.14)", border:"rgba(255,255,255,0.35)",   hoverBg:"rgba(255,255,255,0.22)" },
  { id:"invite",     icon:Mail,  label:"I Have an Invite", sub:"Got an invite from family? Start here.",                   bg:"rgba(255,255,255,0.10)", border:"rgba(255,220,180,0.5)",    hoverBg:"rgba(255,220,180,0.18)" },
  { id:"waitlist",   icon:Users, label:"Need an Invite?",  sub:"Not in the network yet? Get on the list — we'll reach out.", bg:"rgba(255,255,255,0.08)", border:"rgba(255,180,210,0.45)", hoverBg:"rgba(255,180,210,0.18)" },
  { id:"send-invite",icon:Send,  label:"Send an Invite",   sub:"Already a member? Invite someone into your family tree.",   bg:"rgba(255,255,255,0.11)", border:"rgba(180,230,255,0.45)", hoverBg:"rgba(180,230,255,0.2)" },
];

function HomeModalShell({
  children,
  maxWidth = "460px",
  onBackdrop,
  cardStyle,
}: {
  children: React.ReactNode;
  maxWidth?: string;
  onBackdrop: (e: MouseEvent<HTMLDivElement>) => void;
  cardStyle?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onBackdrop}
      style={{
        position:"fixed", inset:0, background:"rgba(30,27,75,0.6)", zIndex:50,
        display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", backdropFilter:"blur(4px)",
      }}
    >
      <div
        className="modal-card"
        style={{
          width:"100%", maxWidth, background:"white", borderRadius:"22px", padding:"40px",
          boxShadow:"0 32px 80px rgba(124,58,237,0.25)", boxSizing:"border-box",
          ...cardStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function HomeClient() {
  // -- modal/step state --
  const [modal,       setModal]      = useState<Modal>(null);
  const [joinStep,    setJoinStep]   = useState<JoinStep>("invite");
  const [inviteStep,  setInviteStep] = useState<InviteStep>("email");
  const [faqOpen,     setFaqOpen]    = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  // -- sign-in --
  const [siEmail,  setSiEmail]  = useState("");
  const [siPw,     setSiPw]     = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [siLoading,setSiLoad]   = useState(false);
  const [siError,  setSiErr]    = useState("");

  // -- waitlist --
  const [wFirst, setWFirst] = useState("");
  const [wLast,  setWLast]  = useState("");
  const [wEmail, setWEmail] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wLoad,  setWLoad]  = useState(false);
  const [wErr,   setWErr]   = useState("");

  // -- invite flow: step 1 - email lookup --
  const [ifEmail,   setIfEmail]   = useState("");
  const [ifLookup,  setIfLookup]  = useState(false);
  const [ifLookErr, setIfLookErr] = useState("");

  // -- invite flow: step 2 - identity challenge --
  const [ifToken,  setIfToken]  = useState("");
  const [ifPhoto,  setIfPhoto]  = useState<string | null>(null);
  const [ifFirst,  setIfFirst]  = useState("");
  const [ifLast,   setIfLast]   = useState("");
  const [ifChallLoad, setIfChallLoad] = useState(false);
  const [ifChallErr,  setIfChallErr]  = useState("");

  // -- invite flow: step 3 - quick register --
  const [regFirst,  setRegFirst]  = useState("");
  const [regLast,   setRegLast]   = useState("");
  const [regPw,     setRegPw]     = useState("");
  const [regPhoto,  setRegPhoto]  = useState<File | null>(null);
  const [regPreview,setRegPreview]= useState<string | null>(null);
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoad,   setRegLoad]   = useState(false);
  const [regErr,    setRegErr]    = useState("");
  const regPhotoRef = useRef<HTMLInputElement>(null);

  // -- invite flow: step 4 - welcome --
  const [welcomeName, setWelcomeName] = useState("");

  // -- helpers --
  const openSignIn = () => { setSiErr(""); setModal("sign-in"); };
  const openJoin   = (step: JoinStep = "invite") => { setWErr(""); setJoinStep(step); setModal("join"); };
  const openInvite = () => { setIfEmail(""); setIfLookErr(""); setInviteStep("email"); setModal("invite-flow"); };
  const openSendInviteModal = () => { setModal("send-invite"); };
  const close      = () => { setModal(null); setSiErr(""); setWErr(""); setIfChallErr(""); setRegErr(""); };
  const goWaitlist = () => {
    if (ifEmail && !wEmail) setWEmail(ifEmail);
    setModal("join");
    setJoinStep("waitlist");
  };

  useEffect(() => {
    if (!modal) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modal]);

  const overlay = (e: MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) close(); };

  const inputStyle: React.CSSProperties = {
    height:"46px", border:"1.5px solid #e5e7eb", borderRadius:"10px",
    padding:"0 14px", fontSize:"15px", outlineColor:"#c026d3",
    width:"100%", boxSizing:"border-box",
  };

  // -- handlers --
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault(); setSiLoad(true); setSiErr("");
    try {
      const res  = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:siEmail, password:siPw }) });
      const data = await res.json();
      if (!res.ok) { setSiErr(data.error ?? "Login failed"); return; }
      window.location.href = data.user?.role === "founder" || data.user?.role === "admin" ? "/admin" : "/dashboard";
    } catch { setSiErr("Something went wrong."); }
    finally { setSiLoad(false); }
  };

  const handleWaitlist = async (e: FormEvent) => {
    e.preventDefault(); setWLoad(true); setWErr("");
    try {
      const res  = await fetch("/api/waitlist", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ firstName:wFirst, lastName:wLast, email:wEmail, phone:wPhone }) });
      const data = await res.json();
      if (!res.ok) { setWErr(data.error ?? "Unable to save your spot"); return; }
      setJoinStep("success");
    } catch { setWErr("Something went wrong."); }
    finally { setWLoad(false); }
  };

  // Step 1 - look up invite by email
  const handleLookup = async (e: FormEvent) => {
    e.preventDefault(); setIfLookup(true); setIfLookErr("");
    try {
      const res  = await fetch(`/api/invite/lookup?email=${encodeURIComponent(ifEmail)}`);
      const data = await res.json();
      if (!data.found) {
        setIfLookErr("No pending invite found for that email. Check the address or request one.");
        return;
      }
      setIfToken(data.token);
      setIfPhoto(data.senderPhotoUrl ?? null);
      setIfFirst(""); setIfLast(""); setIfChallErr("");
      if (data.status === "ACCEPTED") {
        setRegFirst(""); setRegLast(""); setRegPw(""); setRegPhoto(null); setRegPreview(null); setRegErr("");
        setInviteStep("register");
      } else {
        setInviteStep("challenge");
      }
    } catch { setIfLookErr("Something went wrong. Please try again."); }
    finally { setIfLookup(false); }
  };

  // Step 2 - identity challenge
  const handleChallenge = async (e: FormEvent) => {
    e.preventDefault();
    if (!ifFirst.trim()) { setIfChallErr("First name is required."); return; }
    if (!ifLast.trim())  { setIfChallErr("Last name is required."); return; }
    setIfChallLoad(true); setIfChallErr("");
    try {
      const guessedName = `${ifFirst.trim()} ${ifLast.trim()}`;
      const res  = await fetch(`/api/invite/${ifToken}`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ guessedName }),
      });
      const data = await res.json();
      if (data.success) {
        setRegFirst(""); setRegLast(""); setRegPw(""); setRegPhoto(null); setRegPreview(null); setRegErr("");
        setInviteStep("register");
      } else if (data.reason === "wrong_name" && data.attemptsLeft > 0) {
        setIfChallErr(data.message ?? `That doesn't match. ${data.attemptsLeft} attempts remaining.`);
      } else {
        goWaitlist();
      }
    } catch { setIfChallErr("Something went wrong. Please try again."); }
    finally { setIfChallLoad(false); }
  };

  // Step 3 - quick registration
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault(); setRegLoad(true); setRegErr("");
    try {
      const res  = await fetch("/api/auth/register", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ firstName:regFirst, lastName:regLast, email:ifEmail, password:regPw, inviteToken:ifToken }),
      });
      const data = await res.json();
      if (!res.ok) { setRegErr(data.error ?? "Registration failed"); return; }

      if (regPhoto) {
        const fd = new FormData();
        fd.append("photo", regPhoto);
        await fetch("/api/profile/photo", { method:"POST", body:fd }).catch(() => null);
      }

      setWelcomeName(regFirst);
      setInviteStep("welcome");
    } catch { setRegErr("Something went wrong. Please try again."); }
    finally { setRegLoad(false); }
  };

  const handleRegPhoto = (file: File) => {
    setRegPhoto(file);
    if (regPreview) URL.revokeObjectURL(regPreview);
    setRegPreview(URL.createObjectURL(file));
  };

  // -- render --
  return (
    <main style={{ minHeight:"100vh", background:"#fdf8ff" }}>
      <style>{`
        .home-card:hover { transform:translateY(-5px) !important; background:var(--hbg) !important; }
        .home-card { transition:transform 0.2s,background 0.2s,box-shadow 0.2s; }
        .feat-card:hover { transform:translateY(-3px); box-shadow:0 20px 48px rgba(124,58,237,0.12) !important; }
        .feat-card { transition:transform 0.2s,box-shadow 0.2s; }
        @media(max-width:860px){ .action-row{grid-template-columns:1fr !important} .hero-h{font-size:40px !important} .exclusivity-pill{font-size:14px !important;padding:12px 18px !important} }
        @media(max-width:640px){ .modal-card{position:fixed !important;inset:0 !important;border-radius:0 !important;padding:28px !important;overflow-y:auto !important} .join-grid,.wl-grid{grid-template-columns:1fr !important} }
      `}</style>

      {/* -- HERO -- */}
      <section style={{ position:"relative", minHeight:"100vh", overflow:"hidden", display:"flex", flexDirection:"column", padding:"22px 28px 80px", color:"white", backgroundImage:"url('/images/index-bg3.webp')", backgroundSize:"cover", backgroundPosition:"center center" }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,rgba(4,6,28,0.48) 0%,rgba(10,8,40,0.28) 50%,rgba(4,6,28,0.55) 100%)", zIndex:1, pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"280px", background:"linear-gradient(to top,rgba(4,6,28,0.92) 0%,rgba(4,6,28,0.5) 55%,transparent 100%)", zIndex:1, pointerEvents:"none" }} />

        <nav style={{ position:"relative", zIndex:3, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"11px" }}>
            <div style={{ width:40, height:40, borderRadius:"12px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.35)" }}>
              <img src="/images/amihuman-logo.png" alt="AMIHUMAN.NET" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </div>
            <span style={{ fontSize:"20px", fontWeight:900, letterSpacing:"-0.5px" }}>AMIHUMAN.NET</span>
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={() => setFaqOpen(true)} style={{ border:"1px solid rgba(255,255,255,0.4)", borderRadius:"999px", background:"rgba(255,255,255,0.12)", backdropFilter:"blur(6px)", color:"white", fontSize:"14px", fontWeight:700, padding:"9px 22px", cursor:"pointer" }}>FAQ</button>
            <button onClick={() => setContactOpen(true)} style={{ border:"1px solid rgba(255,255,255,0.5)", borderRadius:"999px", background:"rgba(255,255,255,0.22)", backdropFilter:"blur(6px)", color:"white", fontSize:"14px", fontWeight:700, padding:"10px 22px", cursor:"pointer" }}>Contact</button>
          </div>
        </nav>

        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", position:"relative", zIndex:3, paddingTop:"32px" }}>
          <div className="exclusivity-pill" style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", gap:"5px", padding:"15px 30px", borderRadius:"999px", background:"rgba(255,255,255,0.16)", border:"1px solid rgba(255,255,255,0.38)", fontSize:"20px", fontWeight:900, letterSpacing:"0.04em", marginBottom:"24px", backdropFilter:"blur(8px)", boxShadow:"0 10px 34px rgba(0,0,0,0.22)", textTransform:"uppercase" }}>
            <span>INVITATION ONLY &nbsp;|&nbsp; RELATIONSHIP-FIRST &nbsp;|&nbsp; COMPLETELY PRIVATE</span>
            <span style={{ fontSize:"13px", letterSpacing:"0.12em", color:"rgba(255,255,255,0.78)" }}>NO ADS &nbsp;|&nbsp; NO BOTS &nbsp;|&nbsp; NO DATA MINING &nbsp;|&nbsp; EVER.</span>
          </div>
          <h1 className="hero-h" style={{ fontSize:"62px", fontWeight:900, lineHeight:1.03, letterSpacing:"-2.5px", margin:"0 0 18px", maxWidth:"720px", textShadow:"0 2px 24px rgba(0,0,0,0.2)" }}>
            Your Private<br />Family{" "}
            <span style={{ background:"linear-gradient(90deg,#fde68a,#fca5a5)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Network.</span>
          </h1>
          <p style={{ fontSize:"17px", lineHeight:1.7, color:"rgba(255,255,255,0.78)", maxWidth:"560px", margin:"0 0 44px" }}>
            A private social network built exclusively for families. Invitation-only. Just the people who matter most. No strangers or bots. All conversations are private.
          </p>

          <div className="action-row" style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0, 1fr))", gap:"14px", maxWidth:"920px", width:"100%" }}>
            {CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button key={card.id} className="home-card"
                  onClick={() => {
                    if (card.id === "sign-in") openSignIn();
                    else if (card.id === "invite") openInvite();
                    else if (card.id === "send-invite") openSendInviteModal();
                    else openJoin("waitlist");
                  }}
                  style={{ ["--hbg" as any]:card.hoverBg, background:card.bg, border:`1px solid ${card.border}`, borderRadius:"20px", padding:"26px 20px", cursor:"pointer", textAlign:"left", color:"white", backdropFilter:"blur(10px)" }}
                >
                  <div style={{ width:42, height:42, borderRadius:"12px", background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"14px" }}>
                    <Icon style={{ width:20, height:20 }} />
                  </div>
                  <div style={{ fontSize:"16px", fontWeight:800, marginBottom:"7px", letterSpacing:"-0.2px" }}>{card.label}</div>
                  <div style={{ fontSize:"13px", lineHeight:1.55, color:"rgba(255,255,255,0.68)" }}>{card.sub}</div>
                  <div style={{ marginTop:"16px", fontSize:"14px", color:"rgba(255,255,255,0.45)", fontWeight:700 }}>→</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <FaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />

      {/* -- WHY AMIHUMAN.NET -- */}
      <section style={{ background:"#fdf8ff", padding:"96px 24px" }}>
        <div style={{ maxWidth:"940px", margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:"11px", fontWeight:800, letterSpacing:"0.18em", color:"#c026d3", marginBottom:"12px" }}>WHY AMIHUMAN.NET</div>
          <h2 style={{ fontSize:"36px", fontWeight:800, color:"#1e1b4b", letterSpacing:"-1px", margin:"0 0 48px" }}>Finally! The social network built on trust.<br />Designed for family.</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"24px", textAlign:"left" }}>
            {[
              { title:"Your family. Your rules.", body:"You decide who gets in — and who doesn't. Every member is invited, verified, and personally connected. No random followers. No unknowns. Ever.", accent:"#7c3aed", bg:"#faf5ff", border:"#e9d5ff" },
              { title:"No ads. No tracking. No selling your data.", body:"We don't monetize your family. Period. No ad feeds. No behavioral tracking. No third-party sharing. This is your space — not a product.", accent:"#db2777", bg:"#fff1f7", border:"#fbcfe8" },
              { title:"A real network for real families.", body:"Posts, photos, timelines, and your family tree — all in one place. Private by default. Built for connection, not attention. Connections form trusted family units — not just followers.", accent:"#ea580c", bg:"#fff7ed", border:"#fed7aa" },
            ].map(({ title, body, accent, bg, border }) => (
              <div key={title} className="feat-card" style={{ background:bg, border:`1px solid ${border}`, borderRadius:"18px", padding:"28px", boxShadow:"0 4px 20px rgba(124,58,237,0.06)" }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:accent, marginBottom:"18px", boxShadow:`0 0 12px ${accent}80` }} />
                <h3 style={{ fontSize:"17px", fontWeight:800, color:"#1e1b4b", margin:"0 0 10px" }}>{title}</h3>
                <p style={{ fontSize:"15px", lineHeight:1.75, color:"#6b7280", margin:0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- HOW IT WORKS -- */}
      <section style={{ background:"linear-gradient(135deg,#fdf4ff,#fce7f3,#fff7ed)", padding:"96px 24px 72px" }}>
        <div style={{ maxWidth:"860px", margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:"11px", fontWeight:800, letterSpacing:"0.18em", color:"#c026d3", marginBottom:"12px" }}>HOW IT WORKS</div>
          <h2 style={{ fontSize:"36px", fontWeight:800, color:"#1e1b4b", letterSpacing:"-1px", margin:"0 0 52px" }}>Three steps to bring your family together.</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"36px" }}>
            {[
              { n:1, title:"Get invited",        body:"A family member sends you a personal invite. No invite? Join the waitlist — we'll reach out the moment someone adds you.", color:"#7c3aed" },
              { n:2, title:"Verify you're family",body:"Confirm who invited you from a photo. Our identity gate means only real connections get in. Always.", color:"#db2777" },
              { n:3, title:"Connect & share",    body:"Your profile, family tree, posts and photos — private to your family. No strangers ever.", color:"#ea580c" },
            ].map(({ n, title, body, color }) => (
              <div key={n}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:`linear-gradient(135deg,${color}ee,${color}99)`, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", fontWeight:900, margin:"0 auto 20px", boxShadow:`0 8px 24px ${color}40` }}>{n}</div>
                <h3 style={{ fontSize:"17px", fontWeight:800, color:"#1e1b4b", margin:"0 0 10px" }}>{title}</h3>
                <p style={{ fontSize:"14px", lineHeight:1.75, color:"#6b7280", margin:0 }}>{body}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop:"72px", padding:"48px 36px", borderRadius:"24px", background:"linear-gradient(135deg,#7c3aed,#c026d3,#e11d48)", boxShadow:"0 24px 64px rgba(124,58,237,0.3)" }}>
            <h2 style={{ fontSize:"30px", fontWeight:900, color:"white", letterSpacing:"-0.8px", margin:"0 0 8px" }}>Ready to bring your family together?</h2>
            <p style={{ fontSize:"16px", color:"rgba(255,255,255,0.72)", margin:"0 0 28px" }}>It starts with one invite.</p>
            <div style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
              <button onClick={openSignIn} style={{ padding:"13px 26px", border:"1px solid rgba(255,255,255,0.4)", borderRadius:"999px", background:"rgba(255,255,255,0.14)", color:"white", fontSize:"15px", fontWeight:700, cursor:"pointer", backdropFilter:"blur(6px)" }}>Sign In</button>
              <button onClick={() => openJoin("waitlist")} style={{ padding:"13px 26px", border:"none", borderRadius:"999px", background:"white", color:"#7c3aed", fontSize:"15px", fontWeight:800, cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.15)" }}>Need an Invite? →</button>
            </div>
          </div>
        </div>
        <footer style={{ textAlign:"center", fontSize:"12px", color:"#9ca3af", marginTop:"64px" }}>
          &copy; 2025 AMIHUMAN.NET &middot; Private family network &middot; No ads &middot; No data sold &middot; Ever.
        </footer>
      </section>

      {/* MODAL: Sign In */}
      {modal === "sign-in" && (
        <HomeModalShell onBackdrop={overlay}>
            <div style={{ textAlign:"center", marginBottom:"28px" }}>
              <div style={{ width:52, height:52, borderRadius:"16px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                <TreePine style={{ width:26, height:26, color:"white" }} />
              </div>
              <h2 style={{ fontSize:"26px", fontWeight:900, color:"#1e1b4b", margin:"0 0 5px" }}>Welcome back</h2>
              <p style={{ fontSize:"14px", color:"#6b7280", margin:0 }}>Sign in to your family tree</p>
            </div>
            {siError && <div style={{ background:"#fdf2f8", borderLeft:"4px solid #db2777", color:"#9d174d", padding:"11px 14px", borderRadius:"10px", fontSize:"14px", marginBottom:"16px" }}>{siError}</div>}
            <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
              <label style={{ display:"flex", flexDirection:"column", gap:"6px", fontSize:"13px", fontWeight:700, color:"#374151" }}>
                Email
                <input type="email" value={siEmail} onChange={e=>setSiEmail(e.target.value)} required autoFocus placeholder="jane@example.com" style={inputStyle} />
              </label>
              <label style={{ display:"flex", flexDirection:"column", gap:"6px", fontSize:"13px", fontWeight:700, color:"#374151" }}>
                Password
                <div style={{ position:"relative" }}>
                  <input type={showPw?"text":"password"} value={siPw} onChange={e=>setSiPw(e.target.value)} required placeholder="Your password" style={inputStyle} />
                  <button type="button" onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", border:"none", background:"transparent", color:"#9ca3af", cursor:"pointer", display:"flex" }}>
                    {showPw ? <EyeOff style={{width:18,height:18}}/> : <Eye style={{width:18,height:18}}/>}
                  </button>
                </div>
              </label>
              <button type="submit" disabled={siLoading} style={{ height:"48px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"white", fontSize:"15px", fontWeight:800, cursor:"pointer", opacity:siLoading?0.75:1, boxShadow:"0 8px 24px rgba(124,58,237,0.35)" }}>
                {siLoading ? "Signing in…" : "Sign In →"}
              </button>
            </form>
            <p style={{ textAlign:"center", fontSize:"14px", color:"#6b7280", margin:"20px 0 0" }}>
              Need an invite?{" "}
              <button onClick={()=>openJoin("waitlist")} style={{ border:"none", background:"transparent", padding:0, color:"#c026d3", fontWeight:700, cursor:"pointer" }}>Join the waitlist</button>
            </p>
        </HomeModalShell>
      )}

      {/* MODAL: Join / Waitlist */}
      {modal === "join" && (
        <HomeModalShell maxWidth="540px" onBackdrop={overlay}>
            {joinStep === "invite" && (
              <>
                <div style={{ textAlign:"center", marginBottom:"26px" }}>
                  <h2 style={{ fontSize:"26px", fontWeight:900, color:"#1e1b4b", margin:"0 0 8px" }}>Do you have an invite?</h2>
                  <p style={{ fontSize:"14px", color:"#6b7280", lineHeight:1.6, margin:0 }}>AMIHUMAN.NET is invite-only — every member is personally vouched for.</p>
                </div>
                <div className="join-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                  <button onClick={openInvite} style={{ textAlign:"left", background:"#faf5ff", border:"2px solid #e9d5ff", borderRadius:"16px", padding:"22px", cursor:"pointer" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#c026d3)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"12px" }}>
                      <Check style={{ width:18, height:18, color:"white" }} />
                    </div>
                    <h3 style={{ fontSize:"15px", fontWeight:800, color:"#1e1b4b", margin:"0 0 6px" }}>Yes — use my invite</h3>
                    <p style={{ fontSize:"13px", lineHeight:1.5, color:"#6b7280", margin:0 }}>Verify your identity and create your account.</p>
                  </button>
                  <button onClick={()=>setJoinStep("waitlist")} style={{ textAlign:"left", background:"#fff1f7", border:"2px solid #fbcfe8", borderRadius:"16px", padding:"22px", cursor:"pointer" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#db2777,#e11d48)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"12px", fontWeight:800, color:"white", fontSize:"20px" }}>?</div>
                    <h3 style={{ fontSize:"15px", fontWeight:800, color:"#1e1b4b", margin:"0 0 6px" }}>Not yet — need one</h3>
                    <p style={{ fontSize:"13px", lineHeight:1.5, color:"#6b7280", margin:0 }}>Join the waitlist and we'll reach out when your family adds you.</p>
                  </button>
                </div>
              </>
            )}

            {joinStep === "waitlist" && (
              <>
                <button onClick={()=>setJoinStep("invite")} style={{ border:"none", background:"transparent", color:"#6b7280", fontSize:"14px", fontWeight:700, cursor:"pointer", padding:0, marginBottom:"18px" }}>← Back</button>
                <div style={{ textAlign:"center", marginBottom:"22px" }}>
                  <h2 style={{ fontSize:"26px", fontWeight:900, color:"#1e1b4b", margin:"0 0 8px" }}>Request an Invite</h2>
                  <p style={{ fontSize:"14px", color:"#6b7280", lineHeight:1.6, margin:0 }}>The moment someone in your family adds you, we'll reach out immediately.</p>
                </div>
                {wErr && <div style={{ background:"#fdf2f8", borderLeft:"4px solid #db2777", color:"#9d174d", padding:"11px 14px", borderRadius:"10px", fontSize:"14px", marginBottom:"16px" }}>{wErr}</div>}
                <form onSubmit={handleWaitlist} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  <div className="wl-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                    <input value={wFirst} onChange={e=>setWFirst(e.target.value)} required placeholder="First Name" style={inputStyle} />
                    <input value={wLast}  onChange={e=>setWLast(e.target.value)}  required placeholder="Last Name"  style={inputStyle} />
                  </div>
                  <input type="email" value={wEmail} onChange={e=>setWEmail(e.target.value)} required placeholder="Email address" style={inputStyle} />
                  <input type="tel"   value={wPhone} onChange={e=>setWPhone(e.target.value)} placeholder="Phone (optional)" style={inputStyle} />
                  <button type="submit" disabled={wLoad} style={{ height:"48px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#db2777,#e11d48)", color:"white", fontSize:"15px", fontWeight:800, cursor:"pointer", opacity:wLoad?0.75:1, boxShadow:"0 8px 24px rgba(219,39,119,0.3)" }}>
                    {wLoad ? "Saving…" : "Save My Spot →"}
                  </button>
                </form>
              </>
            )}

            {joinStep === "success" && (
              <div style={{ textAlign:"center" }}>
                <div style={{ width:68, height:68, borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#c026d3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
                  <Check style={{ width:32, height:32, color:"white" }} />
                </div>
                <h2 style={{ fontSize:"26px", fontWeight:900, color:"#1e1b4b", margin:"0 0 8px" }}>You're on the list! 🎉</h2>
                <p style={{ fontSize:"15px", color:"#6b7280", lineHeight:1.6, margin:"0 0 24px" }}>We'll contact you the moment your invite is ready. Watch your inbox.</p>
                <button onClick={close} style={{ height:"46px", padding:"0 28px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"white", fontSize:"15px", fontWeight:800, cursor:"pointer" }}>Done</button>
              </div>
            )}
        </HomeModalShell>
      )}

      {/* MODAL: Send invite (member path → sign in) */}
      {modal === "send-invite" && (
        <HomeModalShell maxWidth="540px" onBackdrop={overlay}>
          <div style={{ textAlign:"center", marginBottom:"26px" }}>
            <div style={{ width:52, height:52, borderRadius:"16px", background:"linear-gradient(135deg,#0ea5e9,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
              <Send style={{ width:24, height:24, color:"white" }} />
            </div>
            <h2 style={{ fontSize:"26px", fontWeight:900, color:"#1e1b4b", margin:"0 0 8px" }}>Send an invite</h2>
            <p style={{ fontSize:"14px", color:"#6b7280", lineHeight:1.65, margin:0 }}>
              Invite someone by email with a photo-based identity check — they prove who invited them before they join.
              Sign in to compose and send invites from your dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setSiErr(""); setModal("sign-in"); }}
            style={{ width:"100%", height:"48px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"white", fontSize:"15px", fontWeight:800, cursor:"pointer", boxShadow:"0 8px 24px rgba(124,58,237,0.35)", marginBottom:"12px" }}
          >
            Sign in to send invites →
          </button>
          <p style={{ textAlign:"center", fontSize:"14px", color:"#6b7280", margin:"0 0 14px" }}>
            Not a member yet?{" "}
            <button type="button" onClick={() => openJoin("waitlist")} style={{ border:"none", background:"transparent", padding:0, color:"#c026d3", fontWeight:700, cursor:"pointer" }}>Request an invite</button>
          </p>
          <p style={{ textAlign:"center", fontSize:"13px", color:"#9ca3af", margin:0 }}>
            Got an email invite?{" "}
            <button type="button" onClick={openInvite} style={{ border:"none", background:"transparent", padding:0, color:"#6366f1", fontWeight:700, cursor:"pointer" }}>Use my invite</button>
          </p>
        </HomeModalShell>
      )}

      {/* MODAL: Invite Flow */}
      {modal === "invite-flow" && (
        <HomeModalShell
          onBackdrop={overlay}
          cardStyle={inviteStep !== "welcome" ? { minHeight:"min(85vh, 620px)" } : undefined}
        >
            {/* Step indicator */}
            {inviteStep !== "welcome" && (
              <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"28px", justifyContent:"center" }}>
                {(["email","challenge","register"] as InviteStep[]).map((s, i) => (
                  <div key={s} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:800,
                      background: inviteStep === s ? "linear-gradient(135deg,#7c3aed,#c026d3)" : (["email","challenge","register"].indexOf(inviteStep) > i ? "#d1fae5" : "#f3f4f6"),
                      color: inviteStep === s ? "white" : (["email","challenge","register"].indexOf(inviteStep) > i ? "#065f46" : "#9ca3af"),
                    }}>{i + 1}</div>
                    {i < 2 && <div style={{ width:24, height:2, background: ["email","challenge","register"].indexOf(inviteStep) > i ? "#7c3aed" : "#e5e7eb", borderRadius:"1px" }} />}
                  </div>
                ))}
              </div>
            )}

            {/* Step 1: Email */}
            {inviteStep === "email" && (
              <>
                <div style={{ textAlign:"center", marginBottom:"26px" }}>
                  <div style={{ width:52, height:52, borderRadius:"16px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                    <Mail style={{ width:24, height:24, color:"white" }} />
                  </div>
                  <h2 style={{ fontSize:"24px", fontWeight:900, color:"#1e1b4b", margin:"0 0 6px" }}>Enter your invite email</h2>
                  <p style={{ fontSize:"14px", color:"#6b7280", margin:0, lineHeight:1.6 }}>Enter the email address your family member sent the invite to.</p>
                </div>
                {ifLookErr && <div style={{ background:"#fef2f2", borderLeft:"4px solid #dc2626", color:"#dc2626", padding:"11px 14px", borderRadius:"10px", fontSize:"14px", marginBottom:"16px" }}>{ifLookErr}</div>}
                <form onSubmit={handleLookup} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  <input type="email" value={ifEmail} onChange={e=>{ setIfEmail(e.target.value); setIfLookErr(""); }} required autoFocus placeholder="jane@example.com" style={inputStyle} />
                  <button type="submit" disabled={ifLookup} style={{ height:"48px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"white", fontSize:"15px", fontWeight:800, cursor:"pointer", opacity:ifLookup?0.75:1, boxShadow:"0 8px 24px rgba(124,58,237,0.3)" }}>
                    {ifLookup ? "Checking…" : "Find My Invite →"}
                  </button>
                </form>
                <p style={{ textAlign:"center", fontSize:"13px", color:"#9ca3af", marginTop:"16px" }}>
                  No invite?{" "}
                  <button onClick={goWaitlist} style={{ border:"none", background:"transparent", padding:0, color:"#c026d3", fontWeight:700, cursor:"pointer" }}>Join the waitlist</button>
                </p>
              </>
            )}

            {/* Step 2: Identity Challenge */}
            {inviteStep === "challenge" && (
              <>
                <div style={{ textAlign:"center", marginBottom:"22px" }}>
                  <h2 style={{ fontSize:"24px", fontWeight:900, color:"#1e1b4b", margin:"0 0 6px" }}>Who invited you?</h2>
                  <p style={{ fontSize:"14px", color:"#6b7280", margin:0, lineHeight:1.6 }}>
                    Identify the person in this photo.<br />
                    <strong style={{ color:"#dc2626" }}>You have three attempts.</strong>
                  </p>
                </div>

                {/* Sender photo */}
                <div style={{ display:"flex", justifyContent:"center", marginBottom:"22px" }}>
                  <div style={{ width:120, height:120, borderRadius:"50%", overflow:"hidden", border:"4px solid #ede9fe", background:"linear-gradient(135deg,#7c3aed,#c026d3)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 32px rgba(124,58,237,0.25)" }}>
                    {ifPhoto
                      ? <img src={ifPhoto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <UserCheck style={{ width:48, height:48, color:"white" }} />}
                  </div>
                </div>

                {ifChallErr && <div style={{ background:"#fef2f2", borderLeft:"4px solid #dc2626", color:"#dc2626", padding:"11px 14px", borderRadius:"10px", fontSize:"14px", marginBottom:"16px" }}>{ifChallErr}</div>}

                <form onSubmit={handleChallenge} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                    <div>
                      <label style={{ fontSize:"12px", fontWeight:700, color:"#374151", display:"block", marginBottom:"5px" }}>
                        First name <span style={{ color:"#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text" value={ifFirst} onChange={e=>{ setIfFirst(e.target.value); setIfChallErr(""); }}
                        required placeholder="e.g. Jane"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize:"12px", fontWeight:700, color:"#374151", display:"block", marginBottom:"5px" }}>
                        Last name <span style={{ color:"#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text" value={ifLast} onChange={e=>{ setIfLast(e.target.value); setIfChallErr(""); }}
                        required placeholder="e.g. Smith"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:"10px", padding:"10px 12px", fontSize:"13px", color:"#92400e" }}>
                    ⚠️ Three attempts total — if they run out, this invite expires.
                  </div>
                  <button type="submit" disabled={ifChallLoad} style={{ height:"48px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"white", fontSize:"15px", fontWeight:800, cursor:"pointer", opacity:ifChallLoad?0.75:1, boxShadow:"0 8px 24px rgba(124,58,237,0.3)" }}>
                    {ifChallLoad ? "Verifying…" : "Confirm Identity →"}
                  </button>
                </form>
              </>
            )}

            {/* Step 3: Quick Register */}
            {inviteStep === "register" && (
              <>
                <div style={{ textAlign:"center", marginBottom:"22px" }}>
                  <div style={{ width:52, height:52, borderRadius:"16px", background:"linear-gradient(135deg,#16a34a,#15803d)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                    <Check style={{ width:26, height:26, color:"white" }} />
                  </div>
                  <h2 style={{ fontSize:"24px", fontWeight:900, color:"#1e1b4b", margin:"0 0 6px" }}>Identity confirmed!</h2>
                  <p style={{ fontSize:"14px", color:"#6b7280", margin:0 }}>Create your account to join the family tree.</p>
                </div>
                {regErr && <div style={{ background:"#fef2f2", borderLeft:"4px solid #dc2626", color:"#dc2626", padding:"11px 14px", borderRadius:"10px", fontSize:"14px", marginBottom:"16px" }}>{regErr}</div>}
                <form onSubmit={(e) => {
                  if (!regPhoto) { e.preventDefault(); setRegErr("A photo is required — please add a selfie so your family can recognise you."); return; }
                  handleRegister(e);
                }} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>

                  {/* Photo — first, required */}
                  <div style={{textAlign:"center",marginBottom:"4px"}}>
                    <input
                      ref={regPhotoRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{display:"none"}}
                      onChange={e=>e.target.files?.[0] && handleRegPhoto(e.target.files[0])}
                    />
                    <div
                      onClick={()=>regPhotoRef.current?.click()}
                      style={{
                        width:"96px", height:"96px", borderRadius:"50%", margin:"0 auto 10px",
                        overflow:"hidden", cursor:"pointer", flexShrink:0,
                        border: regPhoto ? "3px solid #7c3aed" : "3px dashed #c4b5fd",
                        background: regPhoto ? "transparent" : "#faf5ff",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}
                    >
                      {regPreview
                        ? <img src={regPreview} alt="Your photo" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        : <div style={{textAlign:"center",padding:"8px"}}>
                            <div style={{fontSize:"26px",marginBottom:"4px"}}>📸</div>
                            <div style={{fontSize:"10px",fontWeight:800,color:"#7c3aed",lineHeight:1.2}}>TAP TO<br/>ADD SELFIE</div>
                          </div>
                      }
                    </div>
                    <div style={{fontSize:"12px",fontWeight:700,color: regPhoto ? "#16a34a" : "#dc2626"}}>
                      {regPhoto ? "✓ Photo added" : "* Required — add your selfie"}
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                    <input type="text" value={regFirst} onChange={e=>setRegFirst(e.target.value)} required placeholder="First name" style={inputStyle} autoFocus />
                    <input type="text" value={regLast}  onChange={e=>setRegLast(e.target.value)}  required placeholder="Last name"  style={inputStyle} />
                  </div>
                  <input type="email" value={ifEmail} readOnly style={{ ...inputStyle, background:"#f9fafb", color:"#6b7280" }} />
                  <div style={{ position:"relative" }}>
                    <input type={showRegPw?"text":"password"} value={regPw} onChange={e=>setRegPw(e.target.value)} required minLength={8} placeholder="Password (8+ characters)" style={inputStyle} />
                    <button type="button" onClick={()=>setShowRegPw(v=>!v)} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", border:"none", background:"transparent", color:"#9ca3af", cursor:"pointer", display:"flex" }}>
                      {showRegPw ? <EyeOff style={{width:18,height:18}}/> : <Eye style={{width:18,height:18}}/>}
                    </button>
                  </div>
                  <button type="submit" disabled={regLoad} style={{ height:"48px", border:"none", borderRadius:"12px", background: regPhoto ? "linear-gradient(135deg,#7c3aed,#c026d3)" : "#d1d5db", color:"white", fontSize:"15px", fontWeight:800, cursor: regPhoto ? "pointer" : "not-allowed", opacity:regLoad?0.75:1, boxShadow: regPhoto ? "0 8px 24px rgba(124,58,237,0.3)" : "none" }}>
                    {regLoad ? "Creating account…" : "Join the Family Tree →"}
                  </button>
                </form>
              </>
            )}

            {/* Step 4: Welcome */}
            {inviteStep === "welcome" && (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:"56px", marginBottom:"12px" }}>🎉</div>
                <h2 style={{ fontSize:"28px", fontWeight:900, color:"#1e1b4b", margin:"0 0 10px" }}>
                  Welcome, {welcomeName}!
                </h2>
                <p style={{ fontSize:"15px", color:"#6b7280", lineHeight:1.6, margin:"0 0 28px" }}>
                  You're officially part of the family tree. Your profile is ready — start exploring and connecting.
                </p>
                <button
                  onClick={() => { window.location.href = "/dashboard"; }}
                  style={{ height:"50px", padding:"0 32px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"white", fontSize:"16px", fontWeight:800, cursor:"pointer", boxShadow:"0 8px 24px rgba(124,58,237,0.35)" }}
                >
                  Go to My Profile →
                </button>
              </div>
            )}
        </HomeModalShell>
      )}
    </main>
  );
}
