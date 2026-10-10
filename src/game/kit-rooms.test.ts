import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HULLS } from "./hulls.ts";
import { layoutFor, seatKits, seatLayout } from "./layouts.ts";
import { createGame, REPAIR_SECONDS, startCombat, step } from "./sim.ts";
import type { Game, KitId, Shot } from "./types.ts";
import { onCradleDeath } from "./extras/cradle.ts";
import { installSling } from "./extras/sling.ts";
import { installVeil, startVeil, toggleVeilPower } from "./extras/veil.ts";
import { priorityRooms } from "./wiki/targeting.ts";

function kitRoom(g: Game, kit: KitId) {
  return g.player.rooms.find((r) => r.kit === kit);
}

/** A fight with the guns and hazards off, so only the shots a test pushes land. */
function quiet(hull: string, difficulty: "easy" | "normal" | "hard" = "normal"): Game {
  const g = createGame(11, hull, difficulty);
  startCombat(g, "scout");
  g.asteroid = false;
  g.asb = false;
  g.boardTimer = 0;
  g.enemyEscape = null;
  for (const w of [...g.player.weapons, ...g.enemy!.weapons]) {
    w.enabled = false;
    w.charge = 0;
  }
  return g;
}

describe("player kit rooms (Systems: each system occupies one predetermined room)", () => {
  it("seats every starting kit of every hull in exactly one room", () => {
    for (const h of HULLS) {
      const g = createGame(3, h.id);
      for (const id of Object.keys(h.kits) as KitId[]) {
        const rooms = g.player.rooms.filter((r) => r.kit === id);
        assert.equal(rooms.length, 1, `${h.id} ${id}`);
        assert.equal(rooms[0].system, null, `${h.id} ${id} shares a system room`);
      }
      assert.equal(g.player.rooms.filter((r) => r.kit).length, Object.keys(h.kits).length, h.id);
    }
  });

  it("uses the rooms labelled on the traced hangar pictures", () => {
    const want: [string, KitId, string][] = [
      ["stealth-a", "veil", "p-cloak"],
      ["stealth-b", "veil", "p-cloak"],
      ["engi-b", "swarm", "p-drones"],
      ["fed-c", "sling", "p-tele"],
      ["fed-c", "flak", "p-artillery"],
      ["fed-c", "cradle", "p-clone"],
      ["zoltan-c", "cell", "p-battery"],
      ["zoltan-c", "swarm", "p-drones"],
      ["slug-b", "sling", "p-tele"],
      ["slug-c", "leash", "p-mind"],
      ["slug-c", "spike", "p-hack"],
      ["slug-c", "cradle", "p-clone"],
      ["lanius-a", "spike", "p-hack"],
      ["lanius-b", "leash", "p-mind"],
      ["mantis-b", "sling", "p-tele"],
      ["crystal-b", "sling", "p-tele"],
      ["engi-a", "swarm", "p-drones"],
      ["mantis-a", "sling", "p-tele"],
      ["fed-a", "lance", "p-artillery"],
      ["kestrel-c", "cradle", "p-clone"],
    ];
    for (const [hull, kit, room] of want) assert.equal(kitRoom(createGame(3, hull), kit)?.id, room, `${hull} ${kit}`);
  });

  it("keeps Teleporter rooms at 2 tiles except Mantis B, Mantis C and Crystal B (Crew Teleporter)", () => {
    const four = new Set(["mantis-b", "mantis-c", "crystal-b"]);
    for (const h of HULLS) {
      if (!h.kits.sling) continue;
      const r = kitRoom(createGame(3, h.id), "sling")!;
      assert.equal(r.w * r.h, four.has(h.id) ? 4 : 2, h.id);
    }
  });

  it("draws the same rooms in the hangar cutaway", () => {
    for (const h of HULLS) {
      const laid = seatLayout(layoutFor(h.id)!, Object.keys(h.kits) as KitId[]);
      const g = createGame(3, h.id);
      for (const r of laid.rooms) assert.equal(g.player.rooms.find((o) => o.id === r.id)?.kit, r.kit, `${h.id} ${r.id}`);
    }
  });

  it("puts a kit bought mid-run in the room its hangar picture keeps for it, and is idempotent", () => {
    const g = createGame(3, "kestrel-a");
    g.scrap = 500;
    const halls = g.player.rooms.filter((r) => r.title === "Hall").length;
    installVeil(g);
    const r = kitRoom(g, "veil")!;
    assert.equal(r.id, "p-cloak");
    assert.equal(r.w * r.h, 4);
    assert.equal(g.player.rooms.filter((o) => o.title === "Hall").length, halls);
    seatKits(g.player);
    assert.equal(g.player.rooms.filter((o) => o.kit === "veil").length, 1);
  });

  it("keeps a room for every system a store sells on every traced hull (Systems: one predetermined room)", () => {
    const titles = ["Shields", "Sensors", "Doors", "Teleporter", "Cloaking", "Hacking", "Mind Control", "Drones", "Backup Battery"];
    for (const h of HULLS) {
      const rooms = layoutFor(h.id)!.rooms;
      for (const t of titles) assert.equal(rooms.filter((r) => r.title === t).length, 1, `${h.id} ${t}`);
      assert.equal(rooms.filter((r) => r.title === "Medbay" || r.title === "Clone Bay").length, 1, `${h.id} medical`);
    }
  });

  it("gives bought Shields and Sensors the pale rooms on the hangar picture", () => {
    const g = createGame(3, "stealth-c");
    assert.equal(g.player.rooms.find((r) => r.id === "p-shields")?.system, null);
    g.player.systems.shields.level = 2;
    g.player.systems.sensors.level = 1;
    seatKits(g.player);
    assert.equal(g.player.rooms.find((r) => r.id === "p-shields")?.system, "shields");
    assert.equal(g.player.rooms.find((r) => r.id === "p-sensors")?.system, "sensors");
  });

  it("seats a Clone Bay in the pale Medbay room of a hull with no medical system", () => {
    const g = createGame(3, "slug-b");
    g.player.kits.cradle = { id: "cradle", level: 1, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
    seatKits(g.player);
    assert.equal(kitRoom(g, "cradle")?.id, "p-medbay");
  });

  it("grows the Lark a room under its grid, with doors, when it has no empty room (INVENTED)", () => {
    const g = createGame(3);
    g.scrap = 500;
    const rows = g.player.rows;
    installVeil(g);
    installSling(g);
    const veil = kitRoom(g, "veil")!;
    const sling = kitRoom(g, "sling")!;
    assert.deepEqual([veil.x, veil.y, sling.x, sling.y], [0, rows, 2, rows]);
    assert.equal(g.player.rows, rows + 1);
    assert.ok(g.player.doors.some((d) => d.b === veil.id && d.a === "p-doors"));
    assert.ok(g.player.doors.some((d) => d.a === veil.id && d.b === sling.id));
    assert.ok(g.player.doors.some((d) => d.a === sling.id && d.b === "void"));
    const grown = g.player.doors.filter((d) => d.a === veil.id || d.b === veil.id || d.a === sling.id || d.b === sling.id);
    assert.ok(grown.every((d) => !d.open));
  });

  it("puts the Medbay back in the Clone Bay room when the store swaps it in (Systems)", () => {
    const g = createGame(3, "fed-c");
    delete g.player.kits.cradle;
    g.player.systems.medbay.level = 2;
    seatKits(g.player);
    const r = g.player.rooms.find((o) => o.id === "p-clone")!;
    assert.equal(r.system, "medbay");
    assert.equal(r.kit, undefined);
  });

  it("clones crew into the Clone Bay room on a hull without p-medbay", () => {
    const g = createGame(3, "fed-c");
    g.player.kits.cradle!.power = 1;
    const c = g.crew.find((o) => o.side === "player")!;
    c.hp = 0;
    assert.equal(onCradleDeath(g, c), true);
    assert.equal(c.room, "p-clone");
  });
});

describe("weapon hits, repair and Hard targeting reach the kit rooms", () => {
  it("lists the Cloaking room on Hard (Cloaking, Enemy AI and Cloaking)", () => {
    const g = quiet("stealth-a", "hard");
    const veil = g.player.kits.veil!;
    veil.power = 1;
    veil.cool = 0;
    assert.ok(priorityRooms(g).includes("p-cloak"));
  });

  it("an enemy hit on the room damages the kit and caps its power; a damaged veil cannot be powered", () => {
    const g = quiet("stealth-a");
    g.player.shieldNow = 0;
    g.player.systems.shields.power = 0;
    const veil = g.player.kits.veil!;
    let landed = false;
    for (let i = 0; i < 40 && !landed; i++) {
      const s: Shot = {
        id: `kit-${i}`,
        kind: "missile",
        from: "enemy",
        damage: 1,
        ion: 0,
        fireChance: 0,
        breachChance: 0,
        targetRoom: "p-cloak",
        wait: 0,
        t: 0.69,
        duration: 0.7,
      };
      g.shots.push(s);
      step(g, 0.05);
      landed = (veil.damage ?? 0) > 0;
    }
    assert.ok(landed, "no shot landed in 40 tries");
    assert.equal(veil.damage, 1);
    assert.equal(veil.power, 0);
    toggleVeilPower(g);
    assert.equal(veil.power, 0);
    startVeil(g);
    assert.equal(veil.on, false);
  });

  it("crew in the kit room repair it in REPAIR_SECONDS", () => {
    const g = quiet("stealth-a");
    const veil = g.player.kits.veil!;
    veil.damage = 1;
    veil.power = 0;
    const c = g.crew.find((o) => o.side === "player")!;
    c.room = "p-cloak";
    c.path = [];
    c.skills = {};
    for (let t = 0; t < REPAIR_SECONDS * 2 && (veil.damage ?? 0) > 0; t += 0.1) step(g, 0.1);
    assert.equal(veil.damage ?? 0, 0);
  });
});
