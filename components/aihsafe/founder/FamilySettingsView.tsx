"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";
import { getFamilyGovernance } from "@/components/aihsafe/common/apiClient";
import type { FamilyGovernanceViewDTO } from "@/types/aihsafe/dto";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles";
import {
  governanceAudience,
  settingsInterestCategoriesNote,
  settingsPanelFootnote,
  settingsPanelIntroCopy,
  settingsPanelTitle,
  settingsViewOnlyLabel,
} from "@/components/aihsafe/roles/governanceView";

function yesNo(on: boolean): string {
  return on ? "Yes" : "No";
}

function yesNoTone(on: boolean): "on" | "off" {
  return on ? "on" : "off";
}

function formatScope(scope: string): string {
  const map: Record<string, string> = {
    family: "Family",
    trust_unit: "Trusted space",
    extended_trust: "Extended trust",
    guardian_only: "Guardian only",
    private: "Private",
    public_approved: "Public (approved)",
  };
  return map[scope] ?? scope.replace(/_/g, " ");
}

function formatLimit(n: number): string {
  return n > 0 ? `${n} per day` : "No daily limit set";
}

function ReadOnlyRow({
  label,
  description,
  value,
  valueTone = "neutral",
}: {
  label: string;
  description: string;
  value: string;
  valueTone?: "neutral" | "on" | "off";
}) {
  const valueColor =
    valueTone === "on" ? "#166534" : valueTone === "off" ? "#78716c" : "#1c1917";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "13px 0",
        borderBottom: "1px solid #f5f4f0",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#1c1917", marginBottom: 2 }}>{label}</div>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, lineHeight: 1.45 }}>{description}</p>
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: valueColor,
          flexShrink: 0,
          marginTop: 2,
          textAlign: "right",
          maxWidth: 140,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ padding: "13px 0", borderBottom: "1px solid #f5f4f0" }}>
      <div style={{ height: 13, width: "50%", background: "#e7e5e4", borderRadius: 4, marginBottom: 6 }} />
      <div>
        <div style={{ height: 11, width: "80%", background: "#f5f4f0", borderRadius: 4 }} />
      </div>
    </div>
  );
}

function IntroBanner({
  shellMode,
  audience,
}: {
  shellMode: FamilySafeShellMode;
  audience: ReturnType<typeof governanceAudience>;
}) {
  const intro = settingsPanelIntroCopy(shellMode, audience);
  const footnote = settingsPanelFootnote(audience);
  const isMinor = audience === "minor";

  return (
    <div
      style={{
        background: isMinor ? "#f5f3ff" : "#fafaf9",
        border: isMinor ? "1px solid #ddd6fe" : "1px solid #e7e5e4",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 18,
        fontSize: 13,
        color: isMinor ? "#4c1d95" : "#57534e",
        lineHeight: 1.55,
      }}
    >
      {intro}
      {footnote && (
        <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "#78716c" }}>
          {footnote}
        </span>
      )}
    </div>
  );
}

interface Props {
  shellMode: FamilySafeShellMode;
  isGuardian: boolean;
}

export function FamilySettingsView({ shellMode, isGuardian }: Props) {
  const [data, setData] = useState<FamilyGovernanceViewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const audience = governanceAudience(shellMode, isGuardian);
  const title = settingsPanelTitle(shellMode);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const result = await getFamilyGovernance();
    if (result.kind === "ok") {
      setData(result.data);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e7e5e4",
    padding: "20px 22px",
    marginBottom: 14,
  };

  return (
    <div>
      <div style={{ maxWidth: 680 }}>
        <div style={cardStyle}>
          <SectionHeader title={title} />
          <IntroBanner shellMode={shellMode} audience={audience} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              padding: "8px 12px",
              background: "#fafaf9",
              border: "1px solid #e7e5e4",
              borderRadius: 10,
            }}
            role="status"
            aria-live="polite"
          >
            <span aria-hidden="true" style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#57534e" }}>
              {settingsViewOnlyLabel(audience)}
            </span>
            </div>

          {loadError && (
            <div
              role="alert"
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                color: "#dc2626",
                marginBottom: 12,
              }}
            >
              Couldn&apos;t load family settings.{" "}
              <button
                type="button"
                onClick={load}
                style={{
                  background: "none",
                  border: "none",
                  color: "#dc2626",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {loading && !loadError && (
            <div>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          )}

          {!loading && data && (
            <>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#a8a29e",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "8px 0 0",
                }}
              >
                Your participation
              </p>

              <ReadOnlyRow
                label="Posting"
                description="Whether you can share in Family Safe Activity."
                value={yesNo(data.personal.postingAllowed)}
                valueTone={yesNoTone(data.personal.postingAllowed)}
              />
              <ReadOnlyRow
                label="Guardian approval"
                description="Some shares may wait for a guardian before they appear."
                value={yesNo(data.personal.postingRequiresGuardianApproval)}
                valueTone={data.personal.postingRequiresGuardianApproval ? "on" : "off"}
              />
              <ReadOnlyRow
                label="Default visibility"
                description="Who usually sees what you share."
                value={formatScope(data.personal.defaultVisibility)}
              />
              <ReadOnlyRow
                label="Sharing limits"
                description="Daily limits that apply to your account."
                value={formatLimit(data.personal.dailyPostLimit)}
              />
              <ReadOnlyRow
                label="Invite limit"
                description="How many invites you may send per day."
                value={formatLimit(data.personal.dailyInviteLimit)}
              />

              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#a8a29e",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "16px 0 0",
                }}
              >
                Family-wide settings
              </p>

              <ReadOnlyRow
                label="Guardian approval for minors"
                description="Children and teens may need approval before posts go live."
                value={yesNo(data.family.requireGuardianApprovalForMinors)}
                valueTone={yesNoTone(data.family.requireGuardianApprovalForMinors)}
              />
              <ReadOnlyRow
                label="Minor posting"
                description="Whether children and teens can post in Activity."
                value={yesNo(data.family.allowMinorPosting)}
                valueTone={yesNoTone(data.family.allowMinorPosting)}
              />
              <ReadOnlyRow
                label="Trusted adults"
                description="Whether your family can add trusted adults to the circle."
                value={yesNo(data.family.enableTrustedAdults)}
                valueTone={yesNoTone(data.family.enableTrustedAdults)}
              />
              <ReadOnlyRow
                label="Private trusted spaces"
                description="Restricted circles for approved members only."
                value={yesNo(data.family.enablePrivateThreads)}
                valueTone={yesNoTone(data.family.enablePrivateThreads)}
              />
              <ReadOnlyRow
                label="Default visibility (family)"
                description="Starting visibility for adult members in Activity."
                value={formatScope(data.family.defaultVisibilityScope)}
              />
              <ReadOnlyRow
                label="External links (minors)"
                description="Family rule for links in posts by children and teens. Applies where the platform supports it."
                value={yesNo(data.family.allowMinorExternalLinks)}
                valueTone={yesNoTone(data.family.allowMinorExternalLinks)}
              />

              <p
                style={{
                  fontSize: 11,
                  color: "#a8a29e",
                  margin: "14px 0 0",
                  lineHeight: 1.5,
                }}
              >
                {settingsInterestCategoriesNote(audience)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
