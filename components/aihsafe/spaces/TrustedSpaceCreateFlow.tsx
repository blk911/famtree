"use client";

import { useMemo, useState } from "react";
import {
  createTrustUnit,
  sendInvite,
  type AihDenied,
  type AihEscalated,
} from "@/components/aihsafe/common/apiClient";
import { DecisionNotice } from "@/components/aihsafe/common/DecisionNotice";
import {
  TRUSTED_SPACE_CREATION_TYPES,
  SPACE_NAME_EXAMPLES,
  type TrustedSpaceCreationTypeId,
} from "@/lib/aihsafe/space-creation-types";
import { vaultSpaceTypeShortLabel } from "@/lib/aihsafe/vault-space";
import type { FamilyUnitDTO, GuardianLinkDTO, InviteDTO, TrustUnitDTO } from "@/types/aihsafe/dto";
import { buildTrustedNetwork, pendingInviteEmails } from "@/components/aihsafe/spaces/buildTrustedNetwork";
import { PeopleSelector } from "@/components/aihsafe/spaces/PeopleSelector";
import {
  CreateFlowSteps,
  createFlowInput,
  createFlowPrimaryBtn,
  createFlowSecondaryBtn,
} from "@/components/aihsafe/spaces/CreateFlowSteps";

const TOTAL_STEPS = 4;

export function TrustedSpaceCreateFlow({
  currentUserId,
  trustUnits,
  familyUnits,
  guardianLinks,
  invites,
  onCreated,
}: {
  currentUserId: string;
  trustUnits: TrustUnitDTO[];
  familyUnits: FamilyUnitDTO[];
  guardianLinks: GuardianLinkDTO[];
  invites: InviteDTO[];
  onCreated?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState<TrustedSpaceCreationTypeId>(TRUSTED_SPACE_CREATION_TYPES[0].id);
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
  const pendingEmails = useMemo(() => pendingInviteEmails(invites), [invites]);
  const spaceType = TRUSTED_SPACE_CREATION_TYPES.find((t) => t.id === typeId)!;

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setNotice(null);
    setSuccess(null);

    const r = await createTrustUnit({
      vaultSpaceType: spaceType.vaultSpaceType,
      name: trimmed,
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
        trustUnitId:      unit.id,
      });
    }

    setBusy(false);
    setSuccess(`${vaultSpaceTypeShortLabel(unit.vaultSpaceType)} space "${trimmed}" created.`);
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
        title="Name your trusted space"
        footer={
          <>
            <button type="button" style={createFlowSecondaryBtn} disabled>
              Back
            </button>
            <button
              type="button"
              style={!name.trim() ? { ...createFlowPrimaryBtn, opacity: 0.45 } : createFlowPrimaryBtn}
              disabled={!name.trim()}
              onClick={() => setStep(2)}
            >
              Next →
            </button>
          </>
        }
      >
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
          Space name
        </label>
        <input
          style={createFlowInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Soccer Parents"
          maxLength={80}
          autoFocus
        />
        <p style={{ fontSize: 12, color: "#78716c", margin: "8px 0 0" }}>
          Examples: {SPACE_NAME_EXAMPLES.join(" · ")}
        </p>
      </CreateFlowSteps>
    );
  }

  if (step === 2) {
    return (
      <CreateFlowSteps
        step={2}
        total={TOTAL_STEPS}
        title="Choose a space type"
        footer={
          <>
            <button type="button" style={createFlowSecondaryBtn} onClick={() => setStep(1)}>
              ← Back
            </button>
            <button type="button" style={createFlowPrimaryBtn} onClick={() => setStep(3)}>
              Next →
            </button>
          </>
        }
      >
        <div className="aihsafe-create-flow__type-grid">
          {TRUSTED_SPACE_CREATION_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`aihsafe-create-flow__type${typeId === t.id ? " aihsafe-create-flow__type--on" : ""}`}
              onClick={() => setTypeId(t.id)}
            >
              <span className="aihsafe-create-flow__type-label">{t.label}</span>
              <span className="aihsafe-create-flow__type-hint">{t.hint}</span>
            </button>
          ))}
        </div>
      </CreateFlowSteps>
    );
  }

  if (step === 3) {
    return (
      <CreateFlowSteps
        step={3}
        total={TOTAL_STEPS}
        title="Add people to this space"
        footer={
          <>
            <button type="button" style={createFlowSecondaryBtn} onClick={() => setStep(2)}>
              ← Back
            </button>
            <button type="button" style={createFlowPrimaryBtn} onClick={() => setStep(4)}>
              Next →
            </button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: "#57534e", margin: "0 0 12px", lineHeight: 1.45 }}>
          Start with your trusted network. You can invite others into this space after it&apos;s created.
        </p>
        <PeopleSelector people={network} selectedIds={selectedIds} onChange={setSelectedIds} />

        {pendingEmails.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#78716c", margin: "0 0 6px" }}>
              Pending invites
            </p>
            <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, color: "#78716c" }}>
              {pendingEmails.slice(0, 5).map((email) => (
                <li key={email}>{email} — joins when they accept</li>
              ))}
            </ul>
          </div>
        )}

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
              + Invite someone new
            </button>
          ) : (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#57534e", marginBottom: 6 }}>
                Email (sent after space is created)
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
      step={4}
      total={TOTAL_STEPS}
      title="Create trusted space"
      footer={
        <>
          <button type="button" style={createFlowSecondaryBtn} onClick={() => setStep(3)} disabled={busy}>
            ← Back
          </button>
          <button
            type="button"
            style={busy ? { ...createFlowPrimaryBtn, opacity: 0.45 } : createFlowPrimaryBtn}
            disabled={busy || !name.trim()}
            onClick={() => void handleCreate()}
          >
            {busy ? "Creating…" : "Create space"}
          </button>
        </>
      }
    >
      <dl className="aihsafe-create-flow__review">
        <div>
          <dt>Name</dt>
          <dd>{name.trim()}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{spaceType.label}</dd>
        </div>
        <div>
          <dt>People</dt>
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
      </dl>
      {notice && <DecisionNotice result={notice} onDismiss={() => setNotice(null)} />}
    </CreateFlowSteps>
  );
}
