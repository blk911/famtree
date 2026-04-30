"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";

type TrustUnitMember = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
};

type TrustUnit = {
  id: string;
  members: TrustUnitMember[];
};

export function TrustUnitCard({ unit }: { unit: TrustUnit }) {
  const [open, setOpen] = useState(false);
  const formatName = (firstName: string, lastName: string) =>
    `${firstName} ${lastName}`
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const initials = (firstName: string, lastName: string) =>
    `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  const title = unit.members
    .map((member) => formatName(member.user.firstName, member.user.lastName))
    .join(" · ");

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"16px"}}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          style={{
            flex:1,display:"flex",alignItems:"center",justifyContent:"space-between",
            gap:"14px",background:"white",border:"none",cursor:"pointer",
            textAlign:"left",padding:0,
          }}
        >
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-green-600 mt-1">Trust Unit Active</p>
          </div>
          <ChevronDown
            style={{
              width:"18px",height:"18px",color:"#78716c",flexShrink:0,
              transform:open ? "rotate(180deg)" : "rotate(0deg)",
              transition:"transform 0.15s",
            }}
          />
        </button>
        <Link
          href={`/family-vault/private?unit=${unit.id}`}
          title="Open private TU conversation"
          style={{
            width:"34px",height:"34px",borderRadius:"999px",border:"1px solid #e7e5e4",
            display:"flex",alignItems:"center",justifyContent:"center",color:"#7c3aed",
            background:"#fafaf9",flexShrink:0,
          }}
        >
          <MessageCircle style={{width:"16px",height:"16px"}} />
        </Link>
      </div>

      {open && (
        <div style={{borderTop:"1px solid #f5f4f0",padding:"18px 16px 16px"}}>
          <div style={{display:"flex",gap:"22px",alignItems:"flex-start",flexWrap:"wrap"}}>
            {unit.members.map((member) => (
              <div key={member.user.id} style={{width:"96px",textAlign:"center"}}>
                <div style={{width:"64px",height:"64px",borderRadius:"50%",overflow:"hidden",margin:"0 auto",background:"linear-gradient(135deg,#7c3aed,#c026d3)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,border:"3px solid #ede9fe"}}>
                  {member.user.photoUrl
                    ? <img src={member.user.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                    : initials(member.user.firstName, member.user.lastName)}
                </div>
                <div style={{fontSize:"13px",fontWeight:700,color:"#1c1917",marginTop:"8px"}}>
                  {formatName(member.user.firstName, member.user.lastName)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
