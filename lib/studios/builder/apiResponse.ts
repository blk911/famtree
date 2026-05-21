import { NextResponse } from "next/server";
import { StudioBuilderError } from "@/lib/studios/builder/index";

export function studioBuilderErrorResponse(err: unknown) {
  if (err instanceof StudioBuilderError) {
    const status =
      err.code === "NOT_FOUND" ? 404 : err.code === "FORBIDDEN" ? 403 : err.code === "CONFLICT" ? 409 : 400;
    return NextResponse.json({ error: err.message, code: err.code }, { status });
  }
  if (err instanceof Error && err.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
