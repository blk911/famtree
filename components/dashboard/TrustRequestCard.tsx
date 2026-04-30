"use client";

import { useState } from "react";
import { CheckCircle2, Star } from "lucide-react";

type TrustMember = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  approvalStatus?: string;
};

type TrustRequest = {
  id: string;
  members: TrustMember[];
  createdBy: TrustMember;
};

export function TrustRequestCard({
  request,
  currentUserId,
  onResolved,
}: {
  request: TrustRequest;
  currentUserId: string;
  onResolved?: (requestId: string) => void;
}) {
  const [loading, setLoading] = useState<"ACCEPT" | "DECLINE" | null>(null);
  const [members, setMembers] = useState(request.members);

  const currentMember = members.find((member) => member.id === currentUserId);
  const currentUserApproved = currentMember?.approvalStatus === "APPROVED";

  const respond = async (action: "ACCEPT" | "DECLINE") => {
    setLoading(action);
    const res = await fetch("/api/trust/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: request.id, userId: currentUserId, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (action === "DECLINE" || data.active) {
        onResolved?.(request.id);
      } else {
        setMembers((items) => items.map((member) =>
          member.id === currentUserId ? { ...member, approvalStatus: "APPROVED" } : member
        ));
      }
    }
    setLoading(null);
  };

  const initials = (member: TrustMember) =>
    `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:"24px",alignItems:"center"}}>
        <div>
          <p className="font-semibold">Trust Unit Request</p>
          <p className="text-sm mt-1 text-stone-500">
            {request.createdBy.firstName} is forming a trusted unit with these members:
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-stone-800">
            {members.map((member) => member.firstName).join(" · ")}
          </div>
          {currentUserApproved && (
            <div style={{display:"inline-flex",alignItems:"center",gap:"5px",fontSize:"12px",fontWeight:800,color:"#16a34a",marginTop:"10px"}}>
              <CheckCircle2 style={{width:"14px",height:"14px",color:"#16a34a"}} />
              You accepted. Waiting on the rest of the unit.
            </div>
          )}
        </div>

        <div style={{display:"flex",alignItems:"flex-start",gap:"22px",justifyContent:"flex-end"}}>
          {members.map((member) => {
            const approved = member.approvalStatus === "APPROVED";
            return (
              <div key={member.id} style={{position:"relative",textAlign:"center",width:"76px"}}>
                <div style={{width:"56px",height:"56px",borderRadius:"50%",margin:"0 auto",overflow:"hidden",background:"linear-gradient(135deg,#7c3aed,#c026d3)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,border:approved ? "3px solid #22c55e" : "3px solid #ede9fe",boxShadow:approved ? "0 0 0 4px rgba(34,197,94,0.12)" : "none"}}>
                  {member.photoUrl
                    ? <img src={member.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                    : initials(member)}
                </div>
                {approved && (
                  <span style={{position:"absolute",top:"-5px",right:"8px",width:"22px",height:"22px",borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid white"}}>
                    <CheckCircle2 style={{width:"14px",height:"14px",color:"white"}} />
                  </span>
                )}
                <div style={{fontSize:"12px",fontWeight:700,color:"#1c1917",marginTop:"7px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {member.firstName}
                </div>
                <div style={{height:"3px",background:approved ? "#22c55e" : "#e7e5e4",borderRadius:"999px",marginTop:"5px"}} />
                {approved && (
                  <div style={{display:"inline-flex",alignItems:"center",gap:"3px",fontSize:"10px",fontWeight:800,color:"#16a34a",marginTop:"4px"}}>
                    <Star style={{width:"10px",height:"10px",fill:"#16a34a"}} />
                    Accepted
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {currentUserApproved ? (
        <div className="flex gap-2 mt-5 justify-center">
          <div style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"999px",background:"#f0fdf4",color:"#16a34a",fontSize:"13px",fontWeight:800,border:"1px solid #bbf7d0"}}>
            <Star style={{width:"14px",height:"14px",fill:"#16a34a"}} />
            Accepted
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mt-5 justify-center">
          <button
            onClick={() => respond("ACCEPT")}
            disabled={!!loading}
            className="btn-primary text-xs px-3 py-2"
          >
            {loading === "ACCEPT" ? "Accepting..." : "Accept"}
          </button>
          <button
            onClick={() => respond("DECLINE")}
            disabled={!!loading}
            className="btn-secondary text-xs px-3 py-2"
          >
            {loading === "DECLINE" ? "Declining..." : "Decline"}
          </button>
        </div>
      )}
    </div>
  );
}
