/** Client helper — delete a dashboard / open-feed post via API. */

export type DeletePostResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function deletePostClient(postId: string): Promise<DeletePostResult> {
  const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
  let body: { error?: string; success?: boolean } = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    return {
      ok:     false,
      error:  body.error ?? "Could not delete this post.",
      status: res.status,
    };
  }

  return { ok: true };
}
