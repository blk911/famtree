"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

type UserMini = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

function formatName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

/** Accepted bond — you and one peer, link opens the private DM thread (empty threads are seeded on the private feed). */
export function BondPeerCard({
  peer,
  currentUser,
}: {
  peer: UserMini;
  currentUser: UserMini;
}) {
  const href = `/family-vault/private?peer=${encodeURIComponent(peer.id)}`;
  const people = [currentUser, peer].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(
      `${b.firstName} ${b.lastName}`,
      undefined,
      { sensitivity: "base" },
    ),
  );

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "16px",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {people.map((p, i) => (
              <div
                key={p.id}
                title={formatName(p.firstName, p.lastName)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid white",
                  background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "12px",
                  marginLeft: i > 0 ? -10 : 0,
                  position: "relative",
                }}
              >
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  initials(p.firstName, p.lastName)
                )}
              </div>
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="font-semibold truncate">
              {formatName(peer.firstName, peer.lastName)}
            </p>
            <p className="text-xs text-blue-700 mt-1">Bond · 1:1 conversation</p>
          </div>
        </div>
        <Link
          href={href}
          title="Open private conversation"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "999px",
            border: "1px solid #e7e5e4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#1d4ed8",
            background: "#fafaf9",
            flexShrink: 0,
          }}
        >
          <MessageCircle style={{ width: "16px", height: "16px" }} />
        </Link>
      </div>
    </div>
  );
}
