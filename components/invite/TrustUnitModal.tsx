"use client";

type TrustMember = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

export default function TrustUnitModal({
  members,
  onConfirm,
  onFallback,
  sending = false,
}: {
  members: TrustMember[];
  onConfirm: () => void;
  onFallback: () => void;
  sending?: boolean;
}) {
  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ fontSize:"18px", fontWeight:800, color:"#1c1917", margin:0 }}>
        Possible Trust Unit Found
      </h2>

      <div style={{ display:"flex", gap:"16px", marginTop:"18px", justifyContent:"center" }}>
        {members.map((member) => {
          const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();
          return (
            <div key={member.id} style={{ textAlign:"center", width:"78px" }}>
              <div style={{ width:"64px", height:"64px", borderRadius:"50%", overflow:"hidden", margin:"0 auto", background:"linear-gradient(135deg,#7c3aed,#c026d3)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800 }}>
                {member.photoUrl
                  ? <img src={member.photoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : initials}
              </div>
              <p style={{ fontSize:"13px", margin:"8px 0 0", color:"#44403c", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {member.firstName}
              </p>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize:"14px", color:"#78716c", lineHeight:1.6, margin:"20px 0 0" }}>
        These members share a trusted connection. Create a Trust Unit?
      </p>

      <div style={{ display:"flex", gap:"10px", marginTop:"18px" }}>
        <button
          onClick={onConfirm}
          disabled={sending}
          style={{ flex:1, height:"44px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"white", fontSize:"14px", fontWeight:800, cursor:"pointer", opacity:sending ? 0.7 : 1 }}
        >
          {sending ? "Creating…" : "Create Trust Unit"}
        </button>
        <button
          onClick={onFallback}
          disabled={sending}
          style={{ flex:1, height:"44px", border:"1px solid #e7e5e4", borderRadius:"12px", background:"white", color:"#78716c", fontSize:"14px", fontWeight:700, cursor:"pointer" }}
        >
          Send Connection Instead
        </button>
      </div>
    </div>
  );
}
