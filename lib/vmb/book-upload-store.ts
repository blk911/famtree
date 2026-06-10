import crypto from "crypto";
import type { VmbBookUpload } from "@/types/vmb/provider-ingest";
import { getVmbBookUploadsFile } from "./paths";
import { readJsonArray, writeJsonArray } from "./runtime-json-store";

function isUpload(item: unknown): item is VmbBookUpload {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as VmbBookUpload).uploadId === "string"
  );
}

export async function saveVmbBookUpload(
  input: Omit<VmbBookUpload, "uploadId" | "createdAt">,
): Promise<{ upload: VmbBookUpload } | { error: string }> {
  const upload: VmbBookUpload = {
    uploadId: `vmb-upload-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    ...input,
    createdAt: new Date().toISOString(),
  };
  const all = await listVmbBookUploads();
  all.unshift(upload);
  const err = await writeJsonArray(getVmbBookUploadsFile(), all);
  if (err) return { error: err };
  return { upload };
}

export async function listVmbBookUploads(): Promise<VmbBookUpload[]> {
  return readJsonArray(getVmbBookUploadsFile(), isUpload);
}
