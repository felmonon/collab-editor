import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteDocumentWithReconciliation } from "./delete-document";

test("confirmed deletion does not issue a second request", async () => {
  const methods: string[] = [];
  const result = await deleteDocumentWithReconciliation("document", {
    fetcher: async (_url, options) => {
      methods.push(options.method!);
      return Response.json({ success: true });
    },
  });
  assert.deepEqual(result, { status: "deleted" });
  assert.deepEqual(methods, ["DELETE"]);
});

test("a hung DELETE is bounded and its late completion cannot replace a reconciled result", async () => {
  let finishDelete: ((response: Response) => void) | undefined;
  let deleteSignal: AbortSignal | null | undefined;
  const methods: string[] = [];
  const result = await deleteDocumentWithReconciliation("document", {
    deleteTimeoutMs: 5,
    checkTimeoutMs: 20,
    fetcher: async (_url, options) => {
      methods.push(options.method!);
      if (options.method === "DELETE") {
        deleteSignal = options.signal;
        return new Promise<Response>((resolve) => { finishDelete = resolve; });
      }
      return new Response(null, { status: 404 });
    },
  });
  assert.equal(deleteSignal?.aborted, true);
  assert.deepEqual(methods, ["DELETE", "GET"]);
  assert.deepEqual(result, { status: "unavailable" }, "a read proves unavailability, not which request deleted it");
  finishDelete!(Response.json({ success: true }));
  await Promise.resolve();
  assert.deepEqual(result, { status: "unavailable" });
});

test("a failed DELETE with an existing document permits an explicit retry without retrying automatically", async () => {
  const methods: string[] = [];
  const result = await deleteDocumentWithReconciliation("document", {
    fetcher: async (_url, options) => {
      methods.push(options.method!);
      return new Response(null, { status: options.method === "DELETE" ? 503 : 200 });
    },
  });
  assert.equal(result.status, "error");
  if (result.status === "error") assert.match(result.message, /still available when checked/);
  assert.deepEqual(methods, ["DELETE", "GET"]);
});

test("both requests timing out return an honest unknown outcome and release the UI", async () => {
  const result = await deleteDocumentWithReconciliation("document", {
    deleteTimeoutMs: 5,
    checkTimeoutMs: 5,
    fetcher: () => new Promise<Response>(() => {}),
  });
  assert.equal(result.status, "error");
  if (result.status === "error") assert.match(result.message, /couldn’t confirm.*refresh your workspace/);
});

test("expired authentication is distinguished from a deletion or retryable request failure", async () => {
  let requests = 0;
  const result = await deleteDocumentWithReconciliation("document", {
    fetcher: async () => { requests += 1; return new Response(null, { status: 401 }); },
  });
  assert.deepEqual(result, { status: "unauthorized" });
  assert.equal(requests, 1);
});

test("leaving the dialog aborts work and does not launch a reconciliation request", async () => {
  const controller = new AbortController();
  let requests = 0;
  const pending = deleteDocumentWithReconciliation("document", {
    signal: controller.signal,
    fetcher: () => { requests += 1; return new Promise<Response>(() => {}); },
  });
  await Promise.resolve();
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(requests, 1);
});
