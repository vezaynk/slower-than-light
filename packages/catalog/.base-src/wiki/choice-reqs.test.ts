import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allEvents } from "@stl/pack";
import { loadCatalog } from "../pack/base.ts";
import {
  CHOICE_REQS,
  CITED_LOCKS,
  FILLER_LOCKS,
  MISSING_LOCKS,
  QUEST_LOCKS,
} from "./choice-reqs.ts";

loadCatalog();

function packedReqIds(): Set<string> {
  const seen = new Set<string>();
  for (const ev of allEvents()) {
    for (const choice of ev.choices) if (choice.reqs?.length) seen.add(choice.id);
    for (const card of ev.cards ?? [])
      for (const choice of card.choices) if (choice.reqs?.length) seen.add(choice.id);
  }
  return seen;
}

describe("choice requirements", () => {
  it("is the four lock maps, and every authored lock is on a packed choice", () => {
    assert.deepEqual(CHOICE_REQS, {
      ...FILLER_LOCKS,
      ...MISSING_LOCKS,
      ...CITED_LOCKS,
      ...QUEST_LOCKS,
    });
    const seen = packedReqIds();
    for (const id of Object.keys(CHOICE_REQS)) assert.equal(seen.has(id), true, id);
  });
});
