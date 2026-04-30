"use client";

import { useState } from "react";
import { TrustRequestCard } from "@/components/dashboard/TrustRequestCard";

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

export function TrustRequestsPanel({
  requests,
  currentUserId,
}: {
  requests: TrustRequest[];
  currentUserId: string;
}) {
  const [items, setItems] = useState(requests);

  if (items.length === 0) return null;

  return (
    <div>
      <h2 style={{ fontSize:"17px", fontWeight:700, color:"#1c1917", marginBottom:"14px" }}>
        Trust Unit approvals
      </h2>
      <div className="space-y-3">
        {items.map((request) => (
          <TrustRequestCard
            key={request.id}
            request={request}
            currentUserId={currentUserId}
            onResolved={(requestId) => setItems((current) => current.filter((item) => item.id !== requestId))}
          />
        ))}
      </div>
    </div>
  );
}
