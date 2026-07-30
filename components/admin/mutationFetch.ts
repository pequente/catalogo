import { apiClientErrorFromResponse } from "@/src/lib/api/client-error";

export type MutationFetchResult = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

/** Lança {@link ApiClientError} quando `res.ok` é false. */
export function assertMutationOk(
  res: MutationFetchResult,
  data: unknown,
  fallbackMessage = "Erro na operação",
): asserts res is MutationFetchResult & { ok: true } {
  if (!res.ok) {
    throw apiClientErrorFromResponse(res.status, data, fallbackMessage);
  }
}

type MutationFetchOptions = {
  onUploadProgress?: (percent: number) => void;
};

/**
 * Request helper for admin mutations.
 * Uses XHR when body is FormData so upload progress can drive the top bar.
 */
export function mutationFetch(
  url: string,
  init: RequestInit = {},
  options: MutationFetchOptions = {},
): Promise<MutationFetchResult> {
  const body = init.body;
  const wantsProgress =
    typeof options.onUploadProgress === "function" &&
    typeof FormData !== "undefined" &&
    body instanceof FormData;

  if (wantsProgress) {
    return xhrMutation(url, init, options.onUploadProgress!);
  }

  return fetch(url, init).then(async (res) => {
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      json: async () => {
        if (!text) return null;
        try {
          return JSON.parse(text) as unknown;
        } catch {
          return null;
        }
      },
    };
  });
}

function xhrMutation(
  url: string,
  init: RequestInit,
  onUploadProgress: (percent: number) => void,
): Promise<MutationFetchResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open((init.method ?? "GET").toUpperCase(), url);

    const headers = init.headers;
    if (headers) {
      const entries =
        headers instanceof Headers
          ? [...headers.entries()]
          : Array.isArray(headers)
            ? headers
            : Object.entries(headers);
      for (const [key, value] of entries) {
        if (value == null) continue;
        // Let the browser set multipart boundary.
        if (key.toLowerCase() === "content-type") continue;
        xhr.setRequestHeader(key, String(value));
      }
    }

    if (init.credentials === "include") {
      xhr.withCredentials = true;
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onUploadProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.upload.onload = () => {
      onUploadProgress(100);
    };

    xhr.onload = () => {
      const text = xhr.responseText;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: async () => {
          if (!text) return null;
          try {
            return JSON.parse(text) as unknown;
          } catch {
            return null;
          }
        },
      });
    };

    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    if (init.signal) {
      if (init.signal.aborted) {
        xhr.abort();
        return;
      }
      init.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(init.body as Document | XMLHttpRequestBodyInit | null | undefined);
  });
}
