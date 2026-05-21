import type {
  CreateStudioDraftDTO,
  CreateStudioSourceInputDTO,
  PatchStudioDraftDTO,
  StudioDraftContentDTO,
  StudioDraftDTO,
  StudioSourceInputDTO,
} from "@/types/studios/builder";

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }
  return data as T;
}

export async function fetchBuilderDraft(draftId: string): Promise<StudioDraftDTO> {
  const res = await fetch(`/api/studios/builder/drafts/${draftId}`, { credentials: "include" });
  const data = await parseJson<{ draft: StudioDraftDTO }>(res);
  return data.draft;
}

export async function createBuilderDraft(input: CreateStudioDraftDTO): Promise<StudioDraftDTO> {
  const res = await fetch("/api/studios/builder/drafts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ draft: StudioDraftDTO }>(res);
  return data.draft;
}

export async function patchBuilderDraft(
  draftId: string,
  patch: PatchStudioDraftDTO,
): Promise<StudioDraftDTO> {
  const res = await fetch(`/api/studios/builder/drafts/${draftId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseJson<{ draft: StudioDraftDTO }>(res);
  return data.draft;
}

export async function addBuilderSource(
  draftId: string,
  input: CreateStudioSourceInputDTO,
): Promise<StudioSourceInputDTO> {
  const res = await fetch(`/api/studios/builder/drafts/${draftId}/sources`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ source: StudioSourceInputDTO }>(res);
  return data.source;
}

export async function removeBuilderSource(draftId: string, sourceId: string): Promise<void> {
  const res = await fetch(`/api/studios/builder/drafts/${draftId}/sources/${sourceId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function generateBuilderDraft(draftId: string): Promise<StudioDraftDTO> {
  const res = await fetch(`/api/studios/builder/drafts/${draftId}/generate`, {
    method: "POST",
    credentials: "include",
  });
  const data = await parseJson<{ draft: StudioDraftDTO }>(res);
  return data.draft;
}

export async function publishBuilderDraft(draftId: string): Promise<{
  draft: StudioDraftDTO;
  studioId: string;
  slug: string;
  trustUnitId: string;
  alreadyPublished: boolean;
}> {
  const res = await fetch(`/api/studios/builder/drafts/${draftId}/publish`, {
    method: "POST",
    credentials: "include",
  });
  return parseJson(res);
}

export function sourceDtoToLocalRow(s: StudioSourceInputDTO) {
  return {
    id: s.id,
    sourceType: s.sourceType,
    url: s.url ?? "",
    label: s.label ?? "",
  };
}
