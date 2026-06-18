import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";

export type ServiceTemplateParticipation = {
  templateId: string;
  templateName: string;
  snapshot?: InviteTemplateSnapshot;
};

export type ServiceTemplateParticipationMap = Record<string, ServiceTemplateParticipation[]>;

/** Map each catalog service id to published invitation templates that include it. */
export function buildServiceTemplateParticipation(
  publishedCopies: SalonInviteLocalCopy[],
): ServiceTemplateParticipationMap {
  const map = new Map<string, Map<string, ServiceTemplateParticipation>>();

  for (const copy of publishedCopies) {
    const entry: ServiceTemplateParticipation = {
      templateId: copy.sourceTemplateId,
      templateName: copy.snapshot.templateName,
      snapshot: copy.snapshot,
    };
    for (const serviceId of copy.snapshot.serviceIds) {
      const normalized = serviceId.trim();
      if (!normalized) continue;
      const bucket = map.get(normalized) ?? new Map<string, ServiceTemplateParticipation>();
      bucket.set(entry.templateId, entry);
      map.set(normalized, bucket);
    }
  }

  const result: ServiceTemplateParticipationMap = {};
  for (const [serviceId, templates] of Array.from(map.entries())) {
    result[serviceId] = Array.from(templates.values()).sort((a, b) =>
      a.templateName.localeCompare(b.templateName),
    );
  }
  return result;
}

export function participatingTemplatesForService(
  participation: ServiceTemplateParticipationMap,
  serviceOfferId: string,
): ServiceTemplateParticipation[] {
  return participation[serviceOfferId] ?? [];
}
