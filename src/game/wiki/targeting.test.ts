import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, evasionPercent, startCombat, step } from "../sim.ts";
import type { Game, Kit, KitId } from "../types.ts";
import { enemyTarget, priorityList, priorityRooms, randomRoom } from "./targeting.ts";

function kit(id: KitId, over: Partial<Kit> = {}): Kit {
  return { id, level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0, ...over };
}

function calm(difficulty: "easy" | "normal" | "hard"): Game {
  const g = createGame(7, undefined, difficulty);
  // Below the Piloting line: no engines bars, no evasion.
  g.player.systems.engines.power = 0;
  return g;
}

/** Engines 4 on the Lark gives 30% evasion; 3 gives exactly 25%. */
function engines(g: Game, n: number): Game {
  g.player.systems.engines.level = n;
  g.player.systems.engines.power = n;
  return g;
}

describe("enemy targeting (wiki/targeting.ts)", () => {
  it("lists nothing on Easy or Normal, whatever the state", () => {
    for (const d of ["easy", "normal"] as const) {
      const g = engines(createGame(3, undefined, d), 4);
      g.player.rooms[0].fire = 1;
      assert.ok(priorityList(g).includes("doors"));
      assert.deepEqual(priorityRooms(g), []);
    }
  });

  it("Piloting: >25% evasion on Hard lists Piloting and Engines", () => {
    const g = engines(createGame(3, undefined, "hard"), 4);
    assert.equal(evasionPercent(g, g.player, "player"), 30);
    assert.deepEqual(priorityList(g), ["pilot", "engines"]);
    assert.equal(evasionPercent(engines(g, 3), g.player, "player"), 25);
    assert.deepEqual(priorityList(g), [], "exactly 25% is not >25%");
    engines(g, 4);
    assert.deepEqual(priorityRooms(g).sort(), ["p-engines", "p-pilot"]);
    assert.deepEqual(priorityList(calm("hard")), []);
  });

  it("Door System: boarders or fires on Hard list Doors", () => {
    const g = calm("hard");
    g.player.rooms.find((r) => r.system === "medbay")!.fire = 1;
    assert.deepEqual(priorityRooms(g), ["p-doors"]);
    const h = calm("hard");
    h.crew.push({ ...h.crew[0], id: "boarder", side: "enemy", aboard: "player" });
    assert.deepEqual(priorityList(h), ["doors"]);
    h.crew[h.crew.length - 1].hp = 0;
    assert.deepEqual(priorityList(h), []);
  });

  it("Cloaking off cooldown, an active Backup Battery, and crew aboard the enemy (Teleporter)", () => {
    const g = calm("hard");
    g.player.kits.veil = kit("veil", { cool: 5 });
    g.player.kits.cell = kit("cell", { power: 0 });
    g.player.kits.sling = kit("sling");
    assert.deepEqual(priorityList(g), []);
    g.player.kits.veil.cool = 0;
    g.player.kits.cell.on = true;
    g.player.kits.cell.left = 10;
    g.crew[0].aboard = "enemy";
    assert.deepEqual(priorityList(g), ["cloaking", "battery", "teleporter"]);
    // GAP: the Lark has no kit rooms, so these entries add no room.
    assert.deepEqual(priorityRooms(g), []);
    g.player.rooms.find((r) => r.system === "sensors")!.kit = "veil";
    assert.deepEqual(priorityRooms(g), ["p-sensors"]);
  });

  it("Hard aims at the list more often than chance; Normal stays uniform", () => {
    const count = (d: "normal" | "hard") => {
      const g = calm(d);
      g.player.rooms.find((r) => r.system === "medbay")!.fire = 1;
      let doors = 0;
      for (let i = 0; i < 4000; i++) if (enemyTarget(g, null) === "p-doors") doors++;
      return doors / 4000;
    };
    const rooms = createGame(1).player.rooms.length;
    const normal = count("normal");
    const hard = count("hard");
    assert.ok(Math.abs(normal - 1 / rooms) < 0.03, `normal ${normal}`);
    // INVENTED PRIORITY_CHANCE 0.5: 0.5 + 0.5 / rooms.
    assert.ok(Math.abs(hard - (0.5 + 0.5 / rooms)) < 0.04, `hard ${hard}`);
  });

  it("randomRoom covers every room", () => {
    const g = createGame(9);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(randomRoom(g, g.player));
    assert.equal(seen.size, g.player.rooms.length);
  });

  it("an enemy gun re-aims each volley", () => {
    const g = createGame(11, undefined, "normal");
    startCombat(g, "scout");
    const gun = g.enemy!.weapons.find((w) => w.enabled !== false);
    assert.ok(gun);
    const aims = new Set<string>();
    let last = gun.charge;
    for (let i = 0; i < 4000 && aims.size < 2; i++) {
      step(g, 0.05);
      if (!g.enemy) break;
      if (gun.charge < last && gun.target) aims.add(gun.target);
      last = gun.charge;
      g.player.hull = g.player.hullMax;
    }
    assert.ok(aims.size >= 2, `aims ${[...aims]}`);
  });
});
