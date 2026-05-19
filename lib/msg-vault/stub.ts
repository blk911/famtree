export const MSG_VAULT_NOT_IMPLEMENTED =
  "Not implemented — Msg Vault Agent 50 route/service pass.";

export function msgVaultNotImplemented(): never {
  throw new Error(MSG_VAULT_NOT_IMPLEMENTED);
}
