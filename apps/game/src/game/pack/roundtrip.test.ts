import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import "./base.ts";
import { emitPack } from "./emit.ts";
import { parsePack } from "./parse.ts";
import { allCrew, allWeapons, resetPackForTests } from "./registry.ts";

describe("base pack xml", () => {
  it("round-trips the loaded records and matches the snapshot", () => {
    resetPackForTests();
    const pack = { crew: allCrew(), weapons: allWeapons() };
    const xml = emitPack(pack);
    const back = parsePack(xml);
    assert.deepEqual(back.crew, pack.crew);
    assert.deepEqual(back.weapons, pack.weapons);
    const golden = readFileSync(new URL("./base.xml", import.meta.url), "utf8");
    assert.equal(xml, golden);
  });
});
