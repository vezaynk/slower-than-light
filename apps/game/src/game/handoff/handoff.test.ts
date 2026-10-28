import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STAND_IN_ID, type ArchiveEntry } from "../pack/archive-list.ts";
import {
  absorbTicket,
  decodeFrame,
  decodeTicket,
  encodeChunk,
  encodeManifest,
  encodeTicket,
} from "./frame.ts";
import {
  CHUNK_BYTES,
  commitHandoff,
  digestBytes,
  type HandoffBytes,
  type HandoffManifest,
  type HandoffStore,
  type TextKey,
} from "./payload.ts";
import { IncomingHandoff, writeHandoff } from "./transfer.ts";

const STAND_IN: ArchiveEntry = {
  id: STAND_IN_ID,
  name: "Stand-in archive",
  size: 0,
  enabled: true,
  builtin: true,
};

function memoryStore(order: ArchiveEntry[], texts: Partial<Record<TextKey, string>> = {}) {
  const blobs = new Map<string, Blob>();
  const saved = new Map<TextKey, string | null>();
  for (const [key, value] of Object.entries(texts)) saved.set(key as TextKey, value);
  const ops: string[] = [];
  let ids = 0;
  const store: HandoffStore = {
    async loadOrder() {
      ops.push("load");
      return order.map((row) => ({ ...row }));
    },
    async saveOrder(list) {
      ops.push("save");
      order.splice(0, order.length, ...list.map((row) => ({ ...row })));
    },
    async putBlob(id, blob) {
      ops.push(`put:${id}`);
      blobs.set(id, blob);
    },
    async deleteBlob(id) {
      ops.push(`del:${id}`);
      blobs.delete(id);
    },
    readText(key) {
      return saved.get(key) ?? null;
    },
    writeText(key, value) {
      ops.push(`text:${key}`);
      saved.set(key, value);
    },
    newId() {
      ids += 1;
      return `new-${ids}`;
    },
  };
  return { store, blobs, saved, ops, order };
}

async function packed(name: string, payload: Uint8Array, enabled = true) {
  const blob = new Blob([payload]);
  return {
    file: { name, size: blob.size, enabled },
    digest: await digestBytes(payload),
    blob,
  };
}

async function textRow(key: TextKey, value: string) {
  const encoded = new TextEncoder().encode(value);
  return { row: { key, size: encoded.length, digest: await digestBytes(encoded) }, value };
}

describe("phone handoff", () => {
  it("round-trips a ticket in any page order", async () => {
    const sdp = `v=0\r\n${"a=candidate:1 1 UDP 1 192.168.1.9 9 typ host\r\n".repeat(40)}`;
    const parts = await encodeTicket({ v: 1, role: "offer", sdp }, 40);
    assert.ok(parts.length > 1);
    assert.match(parts[0]!, /^STL1\.1\.\d+\./);
    const back = await decodeTicket(parts.slice().reverse().join("\n"));
    assert.equal(back.role, "offer");
    assert.equal(back.sdp, sdp);
  });

  it("gathers ticket pages and rejects an incomplete code", async () => {
    const parts = await encodeTicket({ v: 1, role: "answer", sdp: "v=0" }, 12);
    const bag = new Map<number, string>();
    const first = absorbTicket(bag, parts[1] ?? parts[0]!);
    assert.equal(first.done, null);
    assert.equal(first.have, 1);
    let done: string | null = null;
    for (const part of parts) done = absorbTicket(bag, part).done;
    assert.ok(done);
    assert.equal((await decodeTicket(done!)).role, "answer");
    await assert.rejects(() => decodeTicket(parts[0]!), /incomplete/);
    await assert.rejects(() => decodeTicket("not a code"), /could not be read/);
  });

  it("frames a description and a chunk", () => {
    const manifest: HandoffManifest = {
      v: 1,
      files: [{ name: "Stand-in archive", size: 0, enabled: true, builtin: true }],
      digests: [null],
      texts: [],
    };
    const decoded = decodeFrame(encodeManifest(manifest));
    assert.equal(decoded.kind, "manifest");
    if (decoded.kind === "manifest") assert.deepEqual(decoded.manifest, manifest);
    const chunk = decodeFrame(encodeChunk(3, 32, new Uint8Array([7, 8, 9])));
    assert.deepEqual(chunk, {
      kind: "chunk",
      fileIndex: 3,
      offset: 32,
      bytes: new Uint8Array([7, 8, 9]),
    });
  });

  it("copies files, the saved game, and achievements, and drops the previous file only after the order is saved", async () => {
    const payload = new Uint8Array(CHUNK_BYTES + 5);
    for (let i = 0; i < payload.length; i++) payload[i] = i % 251;
    const file = await packed("ftl.dat", payload);
    const save = await textRow("save", '{"sector":1,"name":"Kärel"}');
    const achievements = await textRow("achievements", '["ACH_WIN"]');
    const unlocks = await textRow("unlocks", '{"ships":["PLAYER_SHIP_HARD"],"wins":[]}');
    const life = await textRow("life", '{"scrap":40,"kills":2}');
    const manifest: HandoffManifest = {
      v: 1,
      files: [{ name: "Stand-in archive", size: 0, enabled: false, builtin: true }, file.file],
      digests: [null, file.digest],
      texts: [save.row, achievements.row, unlocks.row, life.row],
    };
    const bytes: HandoffBytes = {
      files: [undefined, file.blob],
      texts: {
        save: save.value,
        achievements: achievements.value,
        unlocks: unlocks.value,
        life: life.value,
      },
    };
    const frames: Uint8Array[] = [];
    await writeHandoff(
      async (frame) => {
        frames.push(frame);
      },
      manifest,
      bytes,
    );
    const incoming = new IncomingHandoff();
    let ready = false;
    for (const frame of frames) ready = await incoming.push(decodeFrame(frame));
    assert.equal(ready, true);
    const got = await incoming.finish();
    const { store, blobs, saved, ops, order } = memoryStore(
      [STAND_IN, { id: "old-dat", name: "old.dat", size: 4, enabled: true }],
      { save: "previous" },
    );
    await commitHandoff(got.manifest, got.bytes, store);
    assert.deepEqual(
      order.map((row) => row.id),
      [STAND_IN_ID, "new-1"],
    );
    assert.equal(order[0]!.enabled, false);
    assert.equal(order[1]!.name, "ftl.dat");
    assert.equal(order[1]!.size, payload.length);
    assert.equal(new Uint8Array(await blobs.get("new-1")!.arrayBuffer()).length, payload.length);
    assert.equal(saved.get("save"), save.value);
    assert.equal(saved.get("achievements"), achievements.value);
    assert.equal(saved.get("unlocks"), unlocks.value);
    assert.equal(saved.get("life"), life.value);
    assert.ok(ops.indexOf("save") < ops.indexOf("del:old-dat"));
    assert.equal(ops.includes("del:new-1"), false);
    assert.equal(blobs.has("old-dat"), false);
  });

  it("leaves the saved archive in place when the order cannot be saved", async () => {
    const file = await packed("mod.ftl", new TextEncoder().encode("<FTL/>"));
    const manifest: HandoffManifest = {
      v: 1,
      files: [{ name: "Stand-in archive", size: 0, enabled: true, builtin: true }, file.file],
      digests: [null, file.digest],
      texts: [],
    };
    const order = [STAND_IN, { id: "kept", name: "kept.dat", size: 9, enabled: true }];
    const { store, blobs, saved, ops } = memoryStore(order, {
      save: "keep-me",
      achievements: '["ACH"]',
    });
    store.saveOrder = async () => {
      ops.push("save");
      throw new Error("disk full");
    };
    await assert.rejects(
      () => commitHandoff(manifest, { files: [undefined, file.blob], texts: {} }, store),
      /disk full/,
    );
    assert.deepEqual(
      order.map((row) => row.id),
      [STAND_IN_ID, "kept"],
    );
    assert.equal(saved.get("save"), "keep-me");
    assert.equal(saved.get("achievements"), '["ACH"]');
    assert.equal(blobs.has("new-1"), false);
    assert.equal(ops.includes("del:kept"), false);
    assert.ok(ops.includes("del:new-1"));
    assert.ok(ops.indexOf("save") < ops.indexOf("del:new-1"));
  });

  it("writes nothing when a file arrives damaged", async () => {
    const file = await packed("ftl.dat", new Uint8Array([1, 2, 3, 4]));
    const manifest: HandoffManifest = {
      v: 1,
      files: [file.file],
      digests: ["ab".repeat(32)],
      texts: [],
    };
    const { store, ops } = memoryStore([STAND_IN]);
    await assert.rejects(
      () => commitHandoff(manifest, { files: [file.blob], texts: {} }, store),
      /damaged/,
    );
    assert.deepEqual(ops, []);
  });

  it("rejects a chunk that arrives out of order", async () => {
    const file = await packed("ftl.dat", new Uint8Array([1, 2, 3, 4]));
    const manifest: HandoffManifest = {
      v: 1,
      files: [file.file],
      digests: [file.digest],
      texts: [],
    };
    const incoming = new IncomingHandoff();
    await incoming.push(decodeFrame(encodeManifest(manifest)));
    await assert.rejects(
      () => incoming.push(decodeFrame(encodeChunk(0, 2, new Uint8Array([3, 4])))),
      /out of order/,
    );
  });
});
