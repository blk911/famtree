// AIH Safe — governed social layer. Server component.
// Composes all UX panels: status dashboard, family groups, trusted spaces, invite, memberships, guardian inbox.

export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { AihSafeShell, AihSection } from "@/components/aihsafe/common/AihSafeShell";
import { StatusDashboard }    from "@/components/aihsafe/common/StatusCard";
import { FamilyCreatePanel }  from "@/components/aihsafe/family/FamilyCreatePanel";
import { TrustUnitCreatePanel } from "@/components/aihsafe/trust-unit/TrustUnitCreatePanel";
import { InvitePanel }        from "@/components/aihsafe/invite/InvitePanel";
import { MembershipPanel }    from "@/components/aihsafe/membership/MembershipPanel";
import { GuardianInbox }      from "@/components/aihsafe/guardian/GuardianInbox";

export const metadata = { title: "Family Safe · AMIHUMAN.NET" };

export default async function AihSafePage() {
  const user = await requireAuth();

  return (
    <AihSafeShell>
      <StatusDashboard />

      <AihSection
        title="Family groups"
        subtitle="A family group is the outer circle — your household or close relatives."
      >
        <FamilyCreatePanel />
      </AihSection>

      <AihSection
        title="Trusted spaces"
        subtitle="Smaller, purpose-built circles with their own governance rules."
      >
        <TrustUnitCreatePanel />
      </AihSection>

      <AihSection
        title="Invite someone"
        subtitle="Every invite is governed. You decide the relationship before they join."
      >
        <InvitePanel />
      </AihSection>

      <AihSection
        title="Your memberships"
        subtitle="Spaces you belong to. You can leave any space at any time."
      >
        <MembershipPanel currentUserId={user.id} />
      </AihSection>

      <AihSection
        title="Guardian inbox"
        subtitle="Requests that need your approval before they go through."
      >
        <GuardianInbox />
      </AihSection>
    </AihSafeShell>
  );
}
