import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchPackXml } from "./fetch-pack.ts";

function response(text: string, chunks: number[]) {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= chunks.length) {
        controller.close();
        return;
      }
      const size = chunks[offset] ?? 0;
      offset += 1;
      const start = chunks.slice(0, offset - 1).reduce((sum, n) => sum + n, 0);
      controller.enqueue(bytes.slice(start, start + size));
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "content-length": String(bytes.byteLength) },
  });
}

describe("fetchPackXml", () => {
  it("reports download progress and returns the body", async () => {
    const seen: number[] = [];
    const text = await fetchPackXml(
      "pack.xml",
      (ratio) => seen.push(ratio),
      () => Promise.resolve(response("abcdef", [2, 4])),
    );
    assert.equal(text, "abcdef");
    assert.equal(seen[0], 0);
    assert.ok(seen.some((ratio) => ratio > 0 && ratio < 1));
    assert.equal(seen.at(-1), 1);
  });

  it("rejects a failed response", async () => {
    await assert.rejects(
      fetchPackXml(
        "pack.xml",
        () => {},
        () => Promise.resolve(new Response("", { status: 404 })),
      ),
      /pack 404/,
    );
  });
});
