import { MsgVaultError } from "@/lib/msg-vault/errors";
import {
  forbidden,
  notFound,
  unauthenticated,
  validationFail,
  conflict,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import type { NextResponse } from "next/server";
import type { ErrorResponse, SuccessResponse } from "@/types/aihsafe/api-responses";

export function handleMsgVaultError(err: unknown): NextResponse<ErrorResponse> {
  if (err instanceof MsgVaultError) {
    switch (err.status) {
      case 403:
        return forbidden(err.message);
      case 404:
        return notFound(err.message);
      case 409:
        return conflict(err.message);
      case 422:
        return validationFail(err.message);
      default:
        return serverError(err.message);
    }
  }
  console.error("[msg-vault]", err);
  return serverError();
}

export type MsgVaultHandler<T> = () => Promise<NextResponse<SuccessResponse<T>>>;
