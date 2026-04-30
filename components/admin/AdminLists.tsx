"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: Date | string;
};

type WaitlistPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: Date | string;
};

type Props = {
  members: Member[];
  waitlist: WaitlistPerson[];
};

const card = {
  background:"white", borderRadius:"16px",
  border:"1px solid #ece9e3", overflow:"hidden",
  boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
};

const rowStyle = (isLast: boolean) => ({
  display:"flex", alignItems:"center", gap:"16px",
  padding:"11px 20px",
  borderBottom:isLast ? "none" : "1px solid #f5f4f0",
  cursor:"pointer",
  transition:"background 0.1s",
});

const nameStyle = {
  minWidth:"140px", fontWeight:700, color:"#1c1917",
  fontSize:"15px", whiteSpace:"nowrap" as const,
};

const emailStyle = {
  flex:1, color:"#78716c", fontSize:"13px",
  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const,
};

const metaStyle = {
  fontSize:"12px", color:"#a8a29e", whiteSpace:"nowrap" as const,
};

function shortDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", { month:"short", day:"numeric" });
}

function fullDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px",fontSize:"14px"}}>
      <span style={{color:"#78716c",fontWeight:600}}>{label}</span>
      <span style={{color:"#1c1917",fontWeight:600,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{children}</span>
    </div>
  );
}

export function AdminLists({ members, waitlist }: Props) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedWaitlist, setSelectedWaitlist] = useState<WaitlistPerson | null>(null);

  useEffect(() => {
    if (!selectedMember && !selectedWaitlist) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedMember(null);
        setSelectedWaitlist(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedMember, selectedWaitlist]);

  return (
    <>
      <style>{`
        .admin-list-row:hover { background: #fafaf9; }
      `}</style>

      <div style={{display:"flex",flexDirection:"column",gap:"18px",width:"100%"}}>
        <section style={card}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #f5f4f0"}}>
            <h2 style={{fontSize:"15px",fontWeight:800,color:"#1c1917"}}>Recent members</h2>
          </div>
          {/* // Row list — members */}
          {members.map((member, index) => (
            <div
              key={member.id}
              className="admin-list-row"
              onClick={() => setSelectedMember(member)}
              style={rowStyle(index === members.length - 1)}
            >
              <div style={nameStyle}>{member.firstName} {member.lastName}</div>
              <div style={emailStyle}>{member.email}</div>
              <div style={metaStyle}>{member.role} · {shortDate(member.createdAt)}</div>
            </div>
          ))}
        </section>

        <section style={card}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #f5f4f0"}}>
            <h2 style={{fontSize:"15px",fontWeight:800,color:"#1c1917"}}>Waitlist</h2>
          </div>
          {/* // Row list — waitlist */}
          {waitlist.length === 0 ? (
            <div style={{padding:"24px",fontSize:"14px",color:"#a8a29e",textAlign:"center"}}>
              No waitlist requests yet.
            </div>
          ) : waitlist.map((person, index) => (
            <div
              key={person.id}
              className="admin-list-row"
              onClick={() => setSelectedWaitlist(person)}
              style={rowStyle(index === waitlist.length - 1)}
            >
              <div style={nameStyle}>{person.firstName} {person.lastName}</div>
              <div style={emailStyle}>{person.email}</div>
              <div style={metaStyle}>{person.phone ?? "—"} · {shortDate(person.createdAt)}</div>
            </div>
          ))}
        </section>
      </div>

      {/* // Modal — member detail */}
      {selectedMember && (
        <div
          onClick={(event) => event.target === event.currentTarget && setSelectedMember(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}
        >
          <div style={{position:"relative",background:"white",maxWidth:"420px",width:"90vw",borderRadius:"18px",padding:"32px",boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
            <button
              onClick={() => setSelectedMember(null)}
              style={{position:"absolute",top:"16px",right:"20px",border:"none",background:"transparent",fontSize:"20px",color:"#a8a29e",cursor:"pointer"}}
            >
              ×
            </button>
            <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"#0f1729",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700}}>
              {initials(selectedMember.firstName, selectedMember.lastName)}
            </div>
            <h2 style={{fontSize:"22px",fontWeight:800,color:"#1c1917",marginTop:"12px"}}>
              {selectedMember.firstName} {selectedMember.lastName}
            </h2>
            <p style={{fontSize:"14px",color:"#78716c",marginTop:"4px"}}>{selectedMember.email}</p>
            <div style={{height:"1px",background:"#f5f4f0",margin:"20px 0"}} />
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <InfoRow label="Role">
                <span style={{background:"#fff7ed",color:"#92400e",padding:"2px 10px",borderRadius:"999px",fontSize:"12px",fontWeight:700}}>
                  {selectedMember.role}
                </span>
              </InfoRow>
              <InfoRow label="Member since">{fullDate(selectedMember.createdAt)}</InfoRow>
              <InfoRow label="Email">{selectedMember.email}</InfoRow>
            </div>
            <button
              onClick={() => { window.location.href = `/invite?prefill=${encodeURIComponent(selectedMember.email)}`; }}
              style={{width:"100%",height:"44px",background:"#0f1729",color:"white",fontWeight:700,borderRadius:"10px",fontSize:"14px",border:"none",cursor:"pointer",marginTop:"24px"}}
            >
              Send Invite →
            </button>
          </div>
        </div>
      )}

      {/* // Modal — waitlist detail */}
      {selectedWaitlist && (
        <div
          onClick={(event) => event.target === event.currentTarget && setSelectedWaitlist(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}
        >
          <div style={{position:"relative",background:"white",maxWidth:"420px",width:"90vw",borderRadius:"18px",padding:"32px",boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
            <button
              onClick={() => setSelectedWaitlist(null)}
              style={{position:"absolute",top:"16px",right:"20px",border:"none",background:"transparent",fontSize:"20px",color:"#a8a29e",cursor:"pointer"}}
            >
              ×
            </button>
            <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#f43f5e)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700}}>
              {initials(selectedWaitlist.firstName, selectedWaitlist.lastName)}
            </div>
            <h2 style={{fontSize:"22px",fontWeight:800,color:"#1c1917",marginTop:"12px"}}>
              {selectedWaitlist.firstName} {selectedWaitlist.lastName}
            </h2>
            <p style={{fontSize:"14px",color:"#78716c",marginTop:"4px"}}>{selectedWaitlist.email}</p>
            <div style={{height:"1px",background:"#f5f4f0",margin:"20px 0"}} />
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <InfoRow label="Phone">{selectedWaitlist.phone ?? "Not provided"}</InfoRow>
              <InfoRow label="Requested">{fullDate(selectedWaitlist.createdAt)}</InfoRow>
              <InfoRow label="Email">{selectedWaitlist.email}</InfoRow>
            </div>
            <button
              onClick={() => { window.location.href = `/invite?prefill=${encodeURIComponent(selectedWaitlist.email)}`; }}
              style={{width:"100%",height:"44px",background:"#0f1729",color:"white",fontWeight:700,borderRadius:"10px",fontSize:"14px",border:"none",cursor:"pointer",marginTop:"24px"}}
            >
              Send Invite →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
