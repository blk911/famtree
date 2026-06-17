import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import { getServiceCategory } from "@/lib/vmb/services/canonical-service-catalog";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbInviteTemplatesFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";
import {
  getDefaultNailInviteTemplate,
  listDefaultInviteTemplatesForCategory,
} from "./default-nail-invite-templates";
import type { VmbInviteOfferCategory, VmbInviteTemplate, VmbInviteType } from "./invite-template-types";
import { VMB_INVITE_OFFER_CATEGORIES, VMB_NAILS_INVITE_TYPES } from "./invite-template-types";
import {
  listInviteTemplateOverridesPostgres,
  upsertInviteTemplatePostgres,
} from "./invite-template-store-postgres";

export const INVITE_TEMPLATE_POSTGRES_REQUIRED = "INVITE_TEMPLATE_POSTGRES_REQUIRED";

const KNOWN_INVITE_TYPES = new Set<string>(VMB_NAILS_INVITE_TYPES);

function isStoredTemplate(item: unknown): item is VmbInviteTemplate {
  if (!item || typeof item !== "object") return false;
  const template = item as VmbInviteTemplate;
  return typeof template.id === "string" && typeof template.inviteType === "string";
}

async function listOverridesJson(): Promise<VmbInviteTemplate[]> {
  return readJsonArray(getVmbInviteTemplatesFile(), isStoredTemplate);
}

async function listOverrides(): Promise<VmbInviteTemplate[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listInviteTemplateOverridesPostgres();
  }
  return listOverridesJson();
}

function mergeTemplateLayers(
  baseline: VmbInviteTemplate,
  override?: VmbInviteTemplate,
): VmbInviteTemplate {
  if (!override) return { ...baseline };
  return {
    ...baseline,
    ...override,
    id: baseline.id,
    categoryId: baseline.categoryId,
    inviteType: baseline.inviteType,
    allowedOfferCategories: override.allowedOfferCategories?.length
      ? override.allowedOfferCategories
      : baseline.allowedOfferCategories,
  };
}

export async function listInviteTemplates(
  categoryId: ServiceCategoryId,
  options?: { includeInactive?: boolean },
): Promise<VmbInviteTemplate[]> {
  if (!getServiceCategory(categoryId)) return [];

  const baseline = listDefaultInviteTemplatesForCategory(categoryId);
  const overrides = await listOverrides();
  const overrideById = new Map(
    overrides.filter((row) => row.categoryId === categoryId).map((row) => [row.id, row]),
  );

  const merged = baseline.map((template) =>
    mergeTemplateLayers(template, overrideById.get(template.id)),
  );

  const sorted = merged.sort((a, b) => a.sortOrder - b.sortOrder);
  if (options?.includeInactive) return sorted;
  return sorted.filter((template) => template.active);
}

export async function getInviteTemplate(id: string): Promise<VmbInviteTemplate | undefined> {
  const baseline = getDefaultNailInviteTemplate(id);
  if (!baseline) return undefined;
  const overrides = await listOverrides();
  const override = overrides.find((row) => row.id === id);
  return mergeTemplateLayers(baseline, override);
}

function isValidOfferCategory(value: string): value is VmbInviteOfferCategory {
  return (VMB_INVITE_OFFER_CATEGORIES as readonly string[]).includes(value);
}

export function validateInviteTemplateInput(
  input: Partial<VmbInviteTemplate>,
): string | null {
  if (!input.id?.trim()) return "Template id is required";
  if (!input.categoryId?.trim() || !getServiceCategory(input.categoryId as ServiceCategoryId)) {
    return "Valid categoryId is required";
  }
  if (!input.inviteType?.trim() || !KNOWN_INVITE_TYPES.has(input.inviteType)) {
    return "Valid inviteType is required";
  }
  if (!input.defaultOfferCategory || !isValidOfferCategory(input.defaultOfferCategory)) {
    return "Valid defaultOfferCategory is required";
  }
  const allowed = input.allowedOfferCategories ?? [];
  if (!allowed.length) return "At least one allowedOfferCategory is required";
  for (const category of allowed) {
    if (!isValidOfferCategory(category)) return "Invalid allowedOfferCategory";
  }
  const content = [input.subject, input.eyebrow, input.headline, input.body, input.ctaLabel]
    .map((field) => field?.trim())
    .filter(Boolean);
  if (content.length === 0) return "Content fields cannot all be empty";
  return null;
}

export async function upsertInviteTemplate(
  input: VmbInviteTemplate,
): Promise<{ template: VmbInviteTemplate } | { error: string }> {
  const baseline = getDefaultNailInviteTemplate(input.id);
  if (!baseline) return { error: "Unknown invite template id" };
  if (baseline.categoryId !== input.categoryId) return { error: "categoryId cannot change" };
  if (baseline.inviteType !== input.inviteType) return { error: "inviteType cannot change" };

  const validationError = validateInviteTemplateInput(input);
  if (validationError) return { error: validationError };

  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    if (vmbProductionRequiresPostgres()) {
      return { error: INVITE_TEMPLATE_POSTGRES_REQUIRED };
    }
    return { error: writable.error };
  }

  const now = new Date().toISOString();
  const payload: VmbInviteTemplate = {
    ...baseline,
    ...input,
    id: baseline.id,
    categoryId: baseline.categoryId,
    inviteType: baseline.inviteType as VmbInviteType,
    updatedAt: now,
    createdAt: baseline.createdAt,
  };

  if (writable.backend === "postgres") {
    const saved = await upsertInviteTemplatePostgres(payload);
    if ("error" in saved) {
      return vmbProductionRequiresPostgres()
        ? { error: INVITE_TEMPLATE_POSTGRES_REQUIRED }
        : saved;
    }
    return saved;
  }

  const all = await listOverridesJson();
  const others = all.filter((row) => row.id !== payload.id);
  await writeJsonArray(getVmbInviteTemplatesFile(), [...others, payload]);
  return { template: payload };
}
