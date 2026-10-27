import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playerHulls } from "./hulls.ts";
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
  for (const w of g.player.weapons) {
    w.enabled = false;
    w.charge = 0;
  }
  // The enemy's ship AI repowers anything switched off (extras/ship-ai.ts), so its guns are removed.
  g.enemy!.weapons = [];
  return g;
}

describe("player kit rooms (Systems: each system occupies one predetermined room)", () => {
  it("seats every starting kit of every hull in exactly one room", () => {
    for (const h of playerHulls()) {
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
      ["PLAYER_SHIP_STEALTH", "cloaking", "p-cloak"],
      ["PLAYER_SHIP_STEALTH_2", "cloaking", "p-cloak"],
      ["PLAYER_SHIP_CIRCLE_2", "drones", "p-drones"],
      ["PLAYER_SHIP_FED_3", "teleporter", "p-tele"],
      ["PLAYER_SHIP_FED_3", "artillery", "p-artillery"],
      ["PLAYER_SHIP_FED_3", "clonebay", "p-clone"],
      ["PLAYER_SHIP_ENERGY_3", "battery", "p-battery"],
      ["PLAYER_SHIP_ENERGY_3", "drones", "p-drones"],
      ["PLAYER_SHIP_JELLY_2", "teleporter", "p-tele"],
      ["PLAYER_SHIP_JELLY_3", "mind", "p-mind"],
      ["PLAYER_SHIP_JELLY_3", "hacking", "p-hack"],
      ["PLAYER_SHIP_JELLY_3", "clonebay", "p-clone"],
      ["PLAYER_SHIP_ANAEROBIC", "hacking", "p-hack"],
      ["PLAYER_SHIP_ANAEROBIC_2", "mind", "p-mind"],
      ["PLAYER_SHIP_MANTIS_2", "teleporter", "p-tele"],
      ["PLAYER_SHIP_CRYSTAL_2", "teleporter", "p-tele"],
      ["PLAYER_SHIP_CIRCLE", "drones", "p-drones"],
      ["PLAYER_SHIP_MANTIS", "teleporter", "p-tele"],
      ["PLAYER_SHIP_FED", "artillery", "p-artillery"],
      ["PLAYER_SHIP_HARD_3", "clonebay", "p-clone"],
    ];
    for (const [hull, kit, room] of want)
      assert.equal(kitRoom(createGame(3, hull), kit)?.id, room, `${hull} ${kit}`);
  });

  it("keeps Teleporter rooms at 2 tiles except Mantis B, Mantis C and Crystal B (Crew Teleporter)", () => {
    const four = new Set(["PLAYER_SHIP_MANTIS_2", "PLAYER_SHIP_MANTIS_3", "PLAYER_SHIP_CRYSTAL_2"]);
    for (const h of playerHulls()) {
      if (!h.kits.teleporter) continue;
      const r = kitRoom(createGame(3, h.id), "teleporter")!;
      assert.equal(r.w * r.h, four.has(h.id) ? 4 : 2, h.id);
    }
  });

  it("draws the same rooms in the hangar cutaway", () => {
    for (const h of playerHulls()) {
      const laid = seatLayout(layoutFor(h.id)!, Object.keys(h.kits) as KitId[]);
      const g = createGame(3, h.id);
      for (const r of laid.rooms)
        assert.equal(g.player.rooms.find((o) => o.id === r.id)?.kit, r.kit, `${h.id} ${r.id}`);
    }
  });

  it("puts a kit bought mid-run in the room its hangar picture keeps for it, and is idempotent", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD");
    g.scrap = 500;
    const halls = g.player.rooms.filter((r) => r.title === "Hall").length;
    installVeil(g);
    const r = kitRoom(g, "cloaking")!;
    assert.equal(r.id, "p-cloak");
    assert.equal(r.title, "Cloaking");
    assert.equal(r.w * r.h, 4);
    assert.equal(g.player.rooms.filter((o) => o.title === "Hall").length, halls - 1);
    seatKits(g.player);
    assert.equal(g.player.rooms.filter((o) => o.kit === "cloaking").length, 1);
  });

  it("keeps a room for every system a store sells on every traced hull (Systems: one predetermined room)", () => {
    const titles = [
      "Shields",
      "Sensors",
      "Doors",
      "Teleporter",
      "Cloaking",
      "Hacking",
      "Mind Control",
      "Drones",
      "Backup Battery",
    ];
    for (const h of playerHulls()) {
      const rooms = layoutFor(h.id)!.rooms;
      const kept = (r: { title: string; reserve?: string }) => r.reserve ?? r.title;
      for (const t of titles)
        assert.equal(rooms.filter((r) => kept(r) === t).length, 1, `${h.id} ${t}`);
      assert.equal(
        rooms.filter((r) => kept(r) === "Medbay" || kept(r) === "Clone Bay").length,
        1,
        `${h.id} medical`,
      );
    }
  });

  it("shows a room kept for an unbought system as a Hall, and names it once bought", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD");
    const tele = g.player.rooms.find((r) => r.id === "p-tele")!;
    assert.equal(tele.title, "Hall");
    assert.equal(tele.reserve, "Teleporter");
    for (const h of playerHulls()) {
      for (const r of createGame(3, h.id).player.rooms) {
        if (r.system === null && !r.kit) assert.equal(r.title, "Hall", `${h.id} ${r.id}`);
      }
    }
    g.scrap = 500;
    installSling(g);
    assert.equal(tele.kit, "teleporter");
    assert.equal(tele.title, "Teleporter");
    // Losing it leaves a Hall that is still kept for the teleporter.
    delete g.player.kits.teleporter;
    seatKits(g.player);
    assert.equal(tele.title, "Hall");
    assert.equal(tele.reserve, "Teleporter");
  });

  it("names a bought Shields room, and turns an older save's titled room into a kept Hall", () => {
    const g = createGame(3, "PLAYER_SHIP_STEALTH");
    const room = g.player.rooms.find((r) => r.id === "p-shields")!;
    assert.equal(room.title, "Hall");
    g.player.systems.shields.level = 2;
    seatKits(g.player);
    assert.equal(room.system, "shields");
    assert.equal(room.title, "Shields");
    const old = createGame(3, "PLAYER_SHIP_HARD");
    const pads = old.player.rooms.find((r) => r.id === "p-tele")!;
    pads.title = "Teleporter";
    pads.system = null;
    delete pads.kit;
    delete pads.reserve;
    seatKits(old.player);
    assert.equal(pads.title, "Hall");
    assert.equal(pads.reserve, "Teleporter");
  });

  it("gives bought Shields and Sensors the pale rooms on the hangar picture", () => {
    const g = createGame(3, "PLAYER_SHIP_STEALTH_3");
    assert.equal(g.player.rooms.find((r) => r.id === "p-shields")?.system, null);
    g.player.systems.shields.level = 2;
    g.player.systems.sensors.level = 1;
    seatKits(g.player);
    assert.equal(g.player.rooms.find((r) => r.id === "p-shields")?.system, "shields");
    assert.equal(g.player.rooms.find((r) => r.id === "p-sensors")?.system, "sensors");
  });

  it("seats a Clone Bay in the pale Medbay room of a hull with no medical system", () => {
    const g = createGame(3, "PLAYER_SHIP_JELLY_2");
    g.player.kits.clonebay = {
      id: "clonebay",
      level: 1,
      power: 0,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    seatKits(g.player);
    assert.equal(kitRoom(g, "clonebay")?.id, "p-medbay");
  });

  it("grows the Lark a room under its grid, with doors, when it has no empty room (INVENTED)", () => {
    const g = createGame(3);
    g.scrap = 500;
    const rows = g.player.rows;
    installVeil(g);
    installSling(g);
    const veil = kitRoom(g, "cloaking")!;
    const sling = kitRoom(g, "teleporter")!;
    assert.deepEqual([veil.x, veil.y, sling.x, sling.y], [0, rows, 2, rows]);
    assert.equal(g.player.rows, rows + 1);
    assert.ok(g.player.doors.some((d) => d.b === veil.id && d.a === "p-doors"));
    assert.ok(g.player.doors.some((d) => d.a === veil.id && d.b === sling.id));
    assert.ok(g.player.doors.some((d) => d.a === sling.id && d.b === "void"));
    const grown = g.player.doors.filter(
      (d) => d.a === veil.id || d.b === veil.id || d.a === sling.id || d.b === sling.id,
    );
    assert.ok(grown.every((d) => !d.open));
  });

  it("puts the Medbay back in the Clone Bay room when the store swaps it in (Systems)", () => {
    const g = createGame(3, "PLAYER_SHIP_FED_3");
    delete g.player.kits.clonebay;
    g.player.systems.medbay.level = 2;
    seatKits(g.player);
    const r = g.player.rooms.find((o) => o.id === "p-clone")!;
    assert.equal(r.system, "medbay");
    assert.equal(r.kit, undefined);
  });

  it("clones crew into the Clone Bay room on a hull without p-medbay", () => {
    const g = createGame(3, "PLAYER_SHIP_FED_3");
    g.player.kits.clonebay!.power = 1;
    const c = g.crew.find((o) => o.side === "player")!;
    c.hp = 0;
    assert.equal(onCradleDeath(g, c), true);
    assert.equal(c.room, "p-clone");
  });
});

describe("weapon hits, repair and Hard targeting reach the kit rooms", () => {
  it("lists the Cloaking room on Hard (Cloaking, Enemy AI and Cloaking)", () => {
    const g = quiet("PLAYER_SHIP_STEALTH", "hard");
    const veil = g.player.kits.cloaking!;
    veil.power = 1;
    veil.cool = 0;
    assert.ok(priorityRooms(g).includes("p-cloak"));
  });

  it("an enemy hit on the room damages the kit and caps its power; a damaged veil cannot be powered", () => {
    const g = quiet("PLAYER_SHIP_STEALTH");
    g.player.shieldNow = 0;
    g.player.systems.shields.power = 0;
    const veil = g.player.kits.cloaking!;
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
    const g = quiet("PLAYER_SHIP_STEALTH");
    const veil = g.player.kits.cloaking!;
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
