import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { heldSchematics } from "../rules/make-room.ts";
import { pageWin } from "./quests.ts";
import { eventText } from "../event-text.ts";
import { textRe } from "./quest-text-re.ts";

/**
 * Template:Pirate Smuggler / Rebel Transport. The unnamed weapon and drone schematic are random ones (Rewards,
 * "Weapon" / "Drone"). Counts held anywhere: rack, cargo, or a make-room choice.
 */
function held(g: Game, kind: "weapon" | "drone"): number {
  const queued = (g.overflow ?? []).filter((x) => x.kind === kind).length;
  if (kind === "drone") return heldSchematics(g).length + queued;
  return (
    g.player.weapons.length + (g.cargo ?? []).filter((x) => x.kind === "weapon").length + queued
  );
}

/** The rows whose sentence hands over a weapon / a drone schematic. */
function gives(text: string, kind: "weapon" | "drone"): number {
  if (kind === "drone")
    return textRe(
      "event_REBEL_TRANSPORT_CAPTURED_4_text",
      "event_REBEL_TRANSPORT_DESTROYED_5_text",
    ).test(text)
      ? 1
      : 0;
  return textRe(
    "event_REBEL_TRANSPORT_DESTROYED_1_text",
    "event_REBEL_TRANSPORT_DESTROYED_3_text",
    "event_REBEL_TRANSPORT_CAPTURED_1_text",
  ).test(text)
    ? 1
    : 0;
}

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "NEBULA_PIRATE_SMUGGLE";
  b.name = "Optional fight: pirate smuggler";
  g.here = b.id;
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resourceLines(body: string): string[] {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) =>
    new RegExp(`${label}: \\d+`).test(body),
  );
}

describe("Pirate smuggler cargo", () => {
  it("a destroyed ship pays the printed cargo table and grants the unnamed weapon or schematic as a random one", () => {
    const seen = new Set<string>();
    const randomTiers = new Set<string>();
    for (let seed = 1; seed <= 160; seed++) {
      const g = createGame(seed);
      open(g);
      const guns = held(g, "weapon");
      const kits = held(g, "drone");
      const crew = g.crew.length;
      const visited = g.beacons.filter((b) => b.visited).length;
      assert.equal(pageWin(g, "pirate-smuggler", false), true);
      const body = g.event?.body ?? "";
      const text = body.split("\n\n")[0] ?? "";
      seen.add(text);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(held(g, "weapon"), guns + gives(text, "weapon"), body);
      assert.equal(held(g, "drone"), kits + gives(text, "drone"), body);
      assert.equal(g.crew.length, crew, body);
      assert.equal(g.beacons.filter((b) => b.visited).length, visited);
      const lines = resourceLines(body);
      if (text.startsWith(eventText("event_REBEL_TRANSPORT_DESTROYED_6_text"))) {
        assert.deepEqual(lines, ["Drone parts"]);
        assert.equal(g.player.parts, 1);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
      } else if (
        text.startsWith(eventText("event_REBEL_TRANSPORT_DESTROYED_9_text")) ||
        text.startsWith(eventText("event_REBEL_TRANSPORT_DESTROYED_10_text")) ||
        text.startsWith(eventText("event_REBEL_TRANSPORT_DESTROYED_2_text"))
      ) {
        assert.equal(lines.length, 2, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
      } else if (text.startsWith(eventText("event_REBEL_TRANSPORT_DESTROYED_11_text"))) {
        assert.equal(lines.length, 2, body);
        assert.ok(paid[0]! >= 19 && paid[0]! <= 23, body);
      } else if (text.startsWith(eventText("event_REBEL_TRANSPORT_DESTROYED_3_text"))) {
        assert.equal(lines.length, 0, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 23, body);
        if (paid[0]! >= 7 && paid[0]! <= 10) randomTiers.add("low");
        else if (paid[0]! >= 12 && paid[0]! <= 18) randomTiers.add("medium");
        else if (paid[0]! >= 20 && paid[0]! <= 23) randomTiers.add("high");
      } else {
        assert.equal(lines.length, 0, body);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
      }
    }
    // Eleven rows. The stand-in prints one line for rows that pay the same, so count distinct lines.
    const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) =>
      eventText(`event_REBEL_TRANSPORT_DESTROYED_${n}_text`),
    );
    assert.equal(seen.size, new Set(rows).size, [...seen].join(" | "));
    assert.equal(
      randomTiers.has("low") && randomTiers.has("medium") && randomTiers.has("high"),
      true,
    );
  });

  it("a crew kill pays the printed cargo table and grants the unnamed weapon or schematic as a random one", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      const g = createGame(seed);
      open(g);
      const guns = held(g, "weapon");
      const kits = held(g, "drone");
      const crew = g.crew.length;
      const visited = g.beacons.filter((b) => b.visited).length;
      assert.equal(pageWin(g, "pirate-smuggler", true), true);
      const body = g.event?.body ?? "";
      const text = body.split("\n\n")[0] ?? "";
      seen.add(text);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(held(g, "weapon"), guns + gives(text, "weapon"), body);
      assert.equal(held(g, "drone"), kits + gives(text, "drone"), body);
      assert.equal(g.crew.length, crew);
      assert.equal(g.beacons.filter((b) => b.visited).length, visited);
      assert.equal(resourceLines(body).length, 0, body);
      if (text.startsWith(eventText("event_REBEL_TRANSPORT_CAPTURED_2_text")))
        assert.ok(paid[0]! >= 19 && paid[0]! <= 23, body);
      else assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    }
    const rows = [1, 2, 3, 4].map((n) => eventText(`event_REBEL_TRANSPORT_CAPTURED_${n}_text`));
    assert.equal(seen.size, new Set(rows).size);
  });
});
