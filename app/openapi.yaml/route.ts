import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOpenApiYaml } from "@/lib/swagger";
import { withApiTrace } from "@/lib/trace";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApiTrace(req, "/openapi.yaml", async (_req) => {
    return new NextResponse(getOpenApiYaml(), {
      status: 200,
      headers: {
        "Content-Type": "application/yaml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  });
}
