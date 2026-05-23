// Msg Vault — governed message attachments (Agent 109).

export const MsgAttachmentKind = {
  IMAGE:    "image",
  VIDEO:    "video",
  DOCUMENT: "document",
} as const;
export type MsgAttachmentKind =
  (typeof MsgAttachmentKind)[keyof typeof MsgAttachmentKind];

export interface MsgAttachmentDTO {
  kind: MsgAttachmentKind;
  url: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
}
