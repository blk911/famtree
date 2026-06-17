import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { ServiceCategoryId } from "@/lib/vmb/services/canonical-catalog-types";
import { listInviteTemplates, upsertInviteTemplate } from "@/lib/vmb/invite-templates/invite-template-store";
import type { VmbInviteTemplate } from "@/lib/vmb/invite-templates/invite-template-types";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

const CATEGORIES: ServiceCategoryId[] = [
  "nails",
  "hair",
  "lashes",
  "brows",
  "waxing",
  "skin",
  "massage",
  "barber",
];

function parseCategory(raw: string | null): ServiceCategoryId {
  const value = raw?.trim() as ServiceCategoryId | undefined;
  if (value && CATEGORIES.includes(value)) return value;
  return "nails";
}

function isAdmin(role: string): boolean {
  return role === "founder" || role === "admin";
}

export async function GET(request: NextRequest) {
  const categoryId = parseCategory(request.nextUrl.searchParams.get("categoryId"));
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";

  if (includeInactive) {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
    }
  }

  const templates = await listInviteTemplates(categoryId, { includeInactive });
  return NextResponse.json({ ok: true, categoryId, templates }, { headers: NO_STORE_HEADERS });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<VmbInviteTemplate>;
  if (!body.id?.trim()) {
    return NextResponse.json({ ok: false, error: "Template id required" }, { status: 400 });
  }

  const saved = await upsertInviteTemplate(body as VmbInviteTemplate);
  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, template: saved.template }, { headers: NO_STORE_HEADERS });
}
