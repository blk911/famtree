import { withApiTrace } from "@/lib/trace";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getOpenApiDocument } from "@/lib/swagger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/openapi", async (req: NextRequest) => {

  return NextResponse.json(getOpenApiDocument());
  });
}
