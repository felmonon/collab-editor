export type DeleteDocumentResult =
  | { status: "deleted" | "unavailable" | "unauthorized" }
  | { status: "error"; message: string };

type Fetcher = (url: string, options: RequestInit) => Promise<Response>;

class RequestTimedOut extends Error {}

function boundedFetch(
  fetcher: Fetcher,
  url: string,
  options: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    const finish = (error?: unknown, response?: Response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      if (error) reject(error);
      else resolve(response!);
    };
    const cancel = () => {
      controller.abort();
      finish(new DOMException("Request cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      controller.abort();
      finish(new RequestTimedOut("Request timed out"));
    }, timeoutMs);
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) {
      cancel();
      return;
    }
    // Bound even a transport that fails to settle after its signal is aborted.
    Promise.resolve().then(() => fetcher(url, { ...options, signal: controller.signal }))
      .then((response) => finish(undefined, response), (error) => finish(error));
  });
}

/** An aborted or failed DELETE is not proof that the server kept the document. */
export async function deleteDocumentWithReconciliation(
  id: string,
  {
    signal,
    fetcher = fetch,
    deleteTimeoutMs = 15_000,
    checkTimeoutMs = 5_000,
    onChecking,
  }: {
    signal?: AbortSignal;
    fetcher?: Fetcher;
    deleteTimeoutMs?: number;
    checkTimeoutMs?: number;
    onChecking?: () => void;
  } = {},
): Promise<DeleteDocumentResult> {
  const url = `/api/documents/${encodeURIComponent(id)}`;
  let timedOut = false;
  try {
    const response = await boundedFetch(fetcher, url, { method: "DELETE" }, deleteTimeoutMs, signal);
    if (response.ok) return { status: "deleted" };
    if (response.status === 401) return { status: "unauthorized" };
  } catch (error) {
    if (signal?.aborted) throw error;
    timedOut = error instanceof RequestTimedOut;
  }

  if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
  onChecking?.();
  try {
    const response = await boundedFetch(fetcher, url, { method: "GET", cache: "no-store" }, checkTimeoutMs, signal);
    if (response.status === 404) return { status: "unavailable" };
    if (response.status === 401) return { status: "unauthorized" };
    if (response.ok) return {
      status: "error",
      message: timedOut
        ? "Deletion took too long. The document was still available when checked. You can try again, or close this dialog."
        : "We couldn’t delete this document. It was still available when checked. Please try again.",
    };
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  return {
    status: "error",
    message: "We couldn’t confirm whether the document was deleted. Close this dialog and refresh your workspace before trying again.",
  };
}
