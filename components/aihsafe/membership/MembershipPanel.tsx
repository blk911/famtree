"use client";
// AIH Safe — list trust unit memberships for the current user and allow self-exit.
// Promote/demote omitted: TrustUnitMember has no role column until Phase 4 schema migration.

import { useState, useEffect, useCallback } from "react";
import {
  listTrustUnits,
  exitMembership,
  type AihDenied,
} from "@/components/aihsafe/common/apiClient";
import { DecisionNotice } from "@/components/aihsafe/common/DecisionNotice";
import type { TrustUnitDTO } from "@/types/aihsafe/dto";

interface Props {
  currentUserId: string;
}

export function MembershipPanel({ currentUserId }: Props) {
  const [units,      setUnits]      = useState<TrustUnitDTO[] | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [busy,       setBusy]       = useState<string | null>(null);
  const [exited,     setExited]     = useState<Record<string, true>>({});
  const [notices,    setNotices]    = useState<Record<string, AihDenied>>({});
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setFetchError(false);
    try {
      const r = await listTrustUnits();
      if (r.kind === "ok") setUnits(r.data.items);
      else setFetchError(true);
    } catch {
      setFetchError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleExit(membershipId: string) {
    setBusy(membershipId);
    setNotices(n => { const c = { ...n }; delete c[membershipId]; return c; });
    setErrors(e  => { const c = { ...e }; delete c[membershipId]; return c; });
    const r = await exitMembership(membershipId);
    setBusy(null);
    if (r.kind === "ok") {
      setExited(e => ({ ...e, [membershipId]: true }));
      load();
    } else if (r.kind === "denied") {
      setNotices(n => ({ ...n, [membershipId]: r }));
    } else if (r.kind === "error") {
      setErrors(e => ({ ...e, [membershipId]: r.message }));
    }
  }

  if (fetchError) {
    return (
      <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>
        Couldn&apos;t load your spaces. Check your connection.{" "}
        <button
          type="button"
          onClick={load}
          style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}
        >
          Retry
        </button>
      </p>
    );
  }

  if (units === null) {
    return <p style={{ fontSize: 13, color: "#a8a29e" }}>Loading…</p>;
  }

  // Only show units where the current user is an active member
  const myUnits = units.filter(u =>
    u.members.some(m => m.userId === currentUserId && !m.exitedAt)
  );

  if (myUnits.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#78716c" }}>
        You're not a member of any trusted spaces yet.
      </p>
    );
  }

  return (
    <div>
      {myUnits.map(unit => {
        const myMembership = unit.members.find(
          m => m.userId === currentUserId && !m.exitedAt
        );
        if (!myMembership) return null;

        const membershipId = myMembership.id;
        const isBusy       = busy === membershipId;
        const hasExited    = exited[membershipId];
        const notice       = notices[membershipId];
        const errorMsg     = errors[membershipId];

        return (
          <div
            key={unit.id}
            style={{
              border:       `1px solid ${hasExited ? "#d1fae5" : "#e7e5e4"}`,
              borderRadius: 14,
              padding:      "16px 18px",
              marginBottom: 12,
              background:   hasExited ? "#f0fdf4" : "#fafaf9",
              opacity:      hasExited ? 0.7 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1c1917", marginBottom: 2 }}>
                  {unit.name ?? `${unit.kind.charAt(0).toUpperCase()}${unit.kind.slice(1)} space`}
                </div>
                <div style={{ fontSize: 12, color: "#78716c" }}>
                  {unit.name && (
                    <span style={{ marginRight: 4 }}>
                      {unit.kind}
                      {" · "}
                    </span>
                  )}
                  {unit.members.filter(m => !m.exitedAt).length} {unit.members.filter(m => !m.exitedAt).length === 1 ? "member" : "members"}
                  {" · "}joined {new Date(myMembership.joinedAt).toLocaleDateString()}
                </div>
              </div>

              {hasExited ? (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#059669",
                  background: "#d1fae5", borderRadius: 8, padding: "4px 10px",
                }}>
                  ✓ Left
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleExit(membershipId)}
                  disabled={isBusy}
                  style={{
                    padding:      "7px 14px",
                    borderRadius: 9,
                    border:       "1px solid #fca5a5",
                    background:   "#fff",
                    color:        "#dc2626",
                    fontWeight:   600,
                    fontSize:     12,
                    cursor:       isBusy ? "not-allowed" : "pointer",
                    opacity:      isBusy ? 0.6 : 1,
                    flexShrink:   0,
                  }}
                >
                  {isBusy ? "…" : "Leave space"}
                </button>
              )}
            </div>

            {errorMsg && (
              <p role="alert" style={{ fontSize: 13, color: "#dc2626", marginTop: 10 }}>
                ⚠ {errorMsg}
              </p>
            )}
            {notice && (
              <div style={{ marginTop: 10 }}>
                <DecisionNotice
                  result={notice}
                  onDismiss={() => setNotices(n => { const c = { ...n }; delete c[membershipId]; return c; })}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
