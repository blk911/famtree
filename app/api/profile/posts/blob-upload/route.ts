import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  ALLOWED_IMAGE_UPLOAD_MIMES,
  ALLOWED_VIDEO_UPLOAD_MIMES,
  MAX_VIDEO_UPLOAD_BYTES,
} from "@/lib/media/upload-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DBG = process.env.DEBUG_MEDIA_UPLOAD === "1";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
  } catch {
    if (DBG) console.warn("[blob-upload] reject layer=auth reason=unauthenticated");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch (e) {
    if (DBG) console.warn("[blob-upload] reject layer=json-parse", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        if (DBG) {
          console.log("[blob-upload] generate-token", {
            pathname,
            multipart,
            clientPayloadLen: clientPayload?.length ?? 0,
          });
        }
        return {
          allowedContentTypes: [
            ...ALLOWED_IMAGE_UPLOAD_MIMES,
            ...ALLOWED_VIDEO_UPLOAD_MIMES,
          ],
          maximumSizeInBytes: MAX_VIDEO_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        if (DBG) {
          console.log("[blob-upload] upload-completed", {
            url: blob.url,
            contentType: blob.contentType,
          });
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    if (DBG) {
      console.error("[blob-upload] reject layer=handleUpload", err);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Blob upload handler failed" },
      { status: 400 },
    );
  }
}
