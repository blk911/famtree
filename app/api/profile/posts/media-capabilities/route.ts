import { NextResponse } from "next/server";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
} from "@/lib/media/upload-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Advertises whether client-direct Blob upload is available (avoids serverless request body caps). */
export async function GET() {
  return NextResponse.json({
    blobClientUpload: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    blobUploadPath: "/api/profile/posts/blob-upload",
    maxImageBytes: MAX_IMAGE_UPLOAD_BYTES,
    maxVideoBytes: MAX_VIDEO_UPLOAD_BYTES,
  });
}
