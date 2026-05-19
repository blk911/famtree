export class MsgVaultError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "MsgVaultError";
  }
}

export function accessDenied(message = "You do not have access to this conversation."): MsgVaultError {
  return new MsgVaultError(message, "FORBIDDEN", 403);
}

export function notFound(message = "Conversation not found."): MsgVaultError {
  return new MsgVaultError(message, "NOT_FOUND", 404);
}

export function validationError(message: string): MsgVaultError {
  return new MsgVaultError(message, "VALIDATION_ERROR", 422);
}

export function conflict(message: string): MsgVaultError {
  return new MsgVaultError(message, "CONFLICT", 409);
}
