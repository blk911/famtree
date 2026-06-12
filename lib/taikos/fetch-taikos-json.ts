type JsonRecord = Record<string, unknown>;

export type TaikosFetchResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  authBlocked?: boolean;
};

const DRAFTS_UNAVAILABLE = "Drafts unavailable. Please refresh or sign back in.";

export async function fetchTaikosJson<T>(
  url: string,
  init?: RequestInit,
): Promise<TaikosFetchResult<T>> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "include",
      ...init,
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    if (res.status === 401 || res.status === 403) {
      if (isJson) {
        try {
          const json = (await res.json()) as JsonRecord;
          return {
            ok: false,
            status: res.status,
            authBlocked: true,
            error: typeof json.error === "string" ? json.error : DRAFTS_UNAVAILABLE,
          };
        } catch {
          // fall through
        }
      }
      return {
        ok: false,
        status: res.status,
        authBlocked: true,
        error: DRAFTS_UNAVAILABLE,
      };
    }

    if (!isJson) {
      return {
        ok: false,
        status: res.status,
        error: `Unexpected response (${res.status})`,
      };
    }

    const json = (await res.json()) as JsonRecord;
    if (!res.ok || json.ok === false) {
      return {
        ok: false,
        status: res.status,
        error: typeof json.error === "string" ? json.error : `Request failed (${res.status})`,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: json.data as T,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Network error",
    };
  }
}
