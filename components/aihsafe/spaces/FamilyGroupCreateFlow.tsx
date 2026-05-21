"use client";

import { useMemo, useState } from "react";
import {
  createFamilyUnit,
  sendInvite,
  type AihDenied,
  type AihEscalated,
} from "@/components/aihsafe/common/apiClient";
import { DecisionNotice } from "@/components/aihsafe/common/DecisionNotice";
import type { FamilyUnitDTO, GuardianLinkDTO, TrustUnitDTO } from "@/types/aihsafe/dto";
import { buildTrustedNetwork } from "@/components/aihsafe/spaces/buildTrustedNetwork";
import { PeopleSelector } from "@/components/aihsafe/spaces/PeopleSelector";
import {
  CreateFlowSteps,
  createFlowInput,
  createFlowPrimaryBtn,
  createFlowSecondaryBtn,
} from "@/components/aihsafe/spaces/CreateFlowSteps";
import { AihsafeCreateFlowReview } from "@/components/ui/aihsafe";

const TOTAL_STEPS = 3;

export function FamilyGroupCreateFlow({
  currentUserId,
  trustUnits,
  familyUnits,
  guardianLinks,
  onCreated,
}: {
  currentUserId: string;
  trustUnits: TrustUnitDTO[];
  familyUnits: FamilyUnitDTO[];
  guardianLinks: GuardianLinkDTO[];
  onCreated?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteNew, setShowInviteNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<AihEscalated | AihDenied | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const network = useMemo(
    () => buildTrustedNetwork(currentUserId, trustUnits, familyUnits, guardianLinks),
    [currentUserId, trustUnits, familyUnits, guardianLinks],
  );

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setNotice(null);
    setSuccess(null);

    const r = await createFamilyUnit(trimmed, {
      ...(selectedIds.length ? { memberIds: selectedIds } : {}),
    });

    if (r.kind !== "ok") {
      setBusy(false);
      if (r.kind === "pending" || r.kind === "denied") setNotice(r);
      return;
    }

    const unit = r.data;
    if (inviteEmail.trim()) {
      await sendInvite({
        recipientEmail: inviteEmail.trim(),
        relationship:   "frnd",
        familyUnitId:   unit.id,
      });
    }

    setBusy(false);
    setSuccess(`Family group "${trimmed}" created.`);
    onCreated?.();
  }

  if (success) {
    return (
      <p style={{ fontSize: 14, color: "#059669", margin: 0, lineHeight: 1.5 }}>✓ {success}</p>
    );
  }

  if (step === 1) {
    return (
      <CreateFlowSteps
        step={1}
        total={TOTAL_STEPS}
        title="Family group name"
        footer={
          <button
            type="button"
            style={!name.trim() ? { ...createFlowPrimaryBtn, opacity: 0.45, background: "#1c1917" } : { ...createFlowPrimaryBtn, background: "#1c1917" }}
            disabled={!name.trim()}
            onClick={() => setStep(2)}
          >
            Next →
          </button>
        }
      >
        <input
          style={createFlowInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Smiths · Holiday Squad · …"
          maxLength={80}
          autoFocus
        />
        <p style={{ fontSize: 12, color: "#78716c", margin: "8px 0 0" }}>
          A family group is for relatives and household members you steward.
        </p>
      </CreateFlowSteps>
    );
  }

  if (step === 2) {
    return (
      <CreateFlowSteps
        step={2}
        total={TOTAL_STEPS}
        title="Add family members"
        footer={
          <>
            <button type="button" style={createFlowSecondaryBtn} onClick={() => setStep(1)}>
              ← Back
            </button>
            <button
              type="button"
              style={{ ...createFlowPrimaryBtn, background: "#1c1917" }}
              onClick={() => setStep(3)}
            >
              Next →
            </button>
          </>
        }
      >
        <PeopleSelector
          people={network}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
          emptyMessage="No family members in your network yet — invite someone below."
        />
        <div style={{ marginTop: 14 }}>
          {!showInviteNew ? (
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "#6366f1",
                cursor: "pointer",
              }}
              onClick={() => setShowInviteNew(true)}
            >
              + Invite new family member
            </button>
          ) : (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#57534e", marginBottom: 6 }}>
                Email (sent after group is created)
              </label>
              <input
                style={createFlowInput}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          )}
        </div>
      </CreateFlowSteps>
    );
  }

  return (
    <CreateFlowSteps
      step={3}
      total={TOTAL_STEPS}
      title="Create family group"
      footer={
        <>
          <button type="button" style={createFlowSecondaryBtn} onClick={() => setStep(2)} disabled={busy}>
            ← Back
          </button>
          <button
            type="button"
            style={
              busy
                ? { ...createFlowPrimaryBtn, opacity: 0.45, background: "#1c1917" }
                : { ...createFlowPrimaryBtn, background: "#1c1917" }
            }
            disabled={busy || !name.trim()}
            onClick={() => void handleCreate()}
          >
            {busy ? "Creating…" : "Create group"}
          </button>
        </>
      }
    >
      <AihsafeCreateFlowReview>
        <div>
          <dt>Name</dt>
          <dd>{name.trim()}</dd>
        </div>
        <div>
          <dt>Members</dt>
          <dd>
            {selectedIds.length === 0 && !inviteEmail.trim()
              ? "Just you for now"
              : [
                  selectedIds.length > 0 ? `${selectedIds.length} from your network` : null,
                  inviteEmail.trim() ? `invite ${inviteEmail.trim()}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </dd>
        </div>
      </AihsafeCreateFlowReview>
      {notice && <DecisionNotice result={notice} onDismiss={() => setNotice(null)} />}
    </CreateFlowSteps>
  );
}
