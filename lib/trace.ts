import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "api-errors.log");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

/** Append one JSON line — matches reproducible bug log contract */
export function appendApiErrorLog(entry: Record<string, unknown>) {
  ensureLogDir();
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  fs.appendFileSync(LOG_FILE, line, "utf8");
}

export function getRequestIdFromRequest(req: NextRequest): string {
  return req.headers.get("x-request-id") ?? randomUUID();
}

async function readBodyPreview(req: NextRequest): Promise<unknown> {
  const m = req.method;
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return undefined;
  try {
    const ct = req.headers.get("content-type") ?? "";
    const clone = req.clone();
    if (ct.includes("application/json")) {
      return await clone.json();
    }
    if (ct.includes("multipart/form-data")) return "[multipart]";
    const text = await clone.text();
    return text.length > 16384 ? `${text.slice(0, 16384)}…` : text || undefined;
  } catch {
    return "[body unreadable]";
  }
}

/**
 * Wraps route handlers: forwards x-request-id on responses, logs uncaught errors to logs/api-errors.log.
 * Reads body via Request.clone() so the handler stream stays intact.
 */
export async function withApiTrace(
  req: NextRequest,
  route: string,
  handler: (req: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse>;
export async function withApiTrace<T>(
  req: NextRequest,
  route: string,
  handler: (req: NextRequest, ctx: T) => Promise<NextResponse>,
  ctx: T,
): Promise<NextResponse>;
export async function withApiTrace<T>(
  req: NextRequest,
  route: string,
  handler: ((req: NextRequest) => Promise<NextResponse>) | ((req: NextRequest, ctx: T) => Promise<NextResponse>),
  ...rest: [] | [ctx: T]
): Promise<NextResponse> {
  const requestId = getRequestIdFromRequest(req);
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  const body = await readBodyPreview(req);

  console.log(
    JSON.stringify({
      level: "api.trace",
      requestId,
      route,
      method: req.method ?? "GET",
      query,
      body,
    }),
  );

  try {
    const res =
      rest.length === 0
        ? await (handler as (req: NextRequest) => Promise<NextResponse>)(req)
        : await (handler as (req: NextRequest, ctx: T) => Promise<NextResponse>)(req, rest[0]);
    const headers = new Headers(res.headers);
    headers.set("x-request-id", requestId);
    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch (err: unknown) {
    const e = err as Error;
    appendApiErrorLog({
      requestId,
      route,
      method: req.method ?? "?",
      payload: { query, body },
      error: e?.message ?? String(err),
      stack: e?.stack,
    });
    console.error(JSON.stringify({ level: "api.error", requestId, route, error: e?.message }));
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
