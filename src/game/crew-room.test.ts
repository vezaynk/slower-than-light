import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { claimPadTile, interiorLinks, medicalLimit, restSpot, roomCapacity, roomConsole } from "./crew-spots.ts";
import { installSling, sendSling } from "./extras/sling.ts";
import {
  closeAllDoors,
  createGame,
  orderCrew,
  orderSelected,
  repairPace,
  returnToStations,
  saveStations,
  selectCrew,
  startCombat,
  step,
  toggleDoor,
} from "./sim.ts";

describe("medical standing spots", () => {
  const wide = { x: 0, y: 0, w: 2, h: 2, system: "medbay" as const };
  const slim = { x: 0, y: 0, w: 2, h: 1, system: "medbay" as const };
  const clone = { x: 0, y: 0, w: 2, h: 2, system: null, kit: "cradle" };

  it("uses the printed medbay and clone caps, and a dead-end player medbay stays at 2", () => {
    assert.equal(medicalLimit(wide, "player", 2), 3);
    assert.equal(medicalLimit(wide, "player", 1), 2);
    assert.equal(medicalLimit(slim, "player", 3), 2);
    assert.equal(medicalLimit(wide, "enemy", 2), 4);
    assert.equal(medicalLimit(slim, "enemy", 1), 2);
    assert.equal(medicalLimit(clone, "player", 2), 3);
    assert.equal(medicalLimit({ ...clone, w: 2, h: 1 }, "player", 1), 1);
    assert.equal(medicalLimit(clone, "enemy", 2), 4);
    assert.equal(medicalLimit({ ...wide, kit: "cradle" }, "player", 2), 3);
  });
});

describe("crew room orders", () => {
  it("orders a boarded crew member onto another enemy room and keeps the selection", () => {
    const g = createGame(3);
    startCombat(g, "scout");
    const ivo = g.crew.find((c) => c.id === "c-ivo");
    assert.ok(ivo && g.enemy && g.enemy.rooms.length > 1);
    const dest = g.enemy.rooms[1]!.id;
    ivo.aboard = "enemy";
    ivo.room = g.enemy.rooms[0]!.id;
    ivo.path = [];
    g.selected = ivo.id;
    g.squad = [ivo.id];
    g.paused = true;
    const result = orderCrew(g, ivo.id, dest);
    assert.equal(result, "ok");
    assert.equal(ivo.path[ivo.path.length - 1], dest);
    assert.equal(g.selected, ivo.id);
    for (let i = 0; i < 10; i++) step(g, 0.05);
    assert.equal(ivo.room, g.enemy.rooms[0]!.id);
  });

  it("puts the first crew sent back at the front of the fight", () => {
    const g = createGame(5);
    startCombat(g, "scout");
    const ada = g.crew.find((c) => c.id === "c-ada");
    const ivo = g.crew.find((c) => c.id === "c-ivo");
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(ada && ivo && foe);
    for (const c of g.crew) {
      if (c.side === "player" && c.id !== ada.id && c.id !== ivo.id) c.room = "p-pilot";
    }
    ada.room = "p-oxygen";
    ivo.room = "p-oxygen";
    ada.path = [];
    ivo.path = [];
    orderCrew(g, ada.id, "p-engines");
    orderCrew(g, ivo.id, "p-engines");
    assert.ok((ada.file ?? 0) < (ivo.file ?? 0));
    ada.room = "p-engines";
    ivo.room = "p-engines";
    ada.path = [];
    ivo.path = [];
    ada.move = 0;
    ivo.move = 0;
    foe.aboard = "player";
    foe.room = "p-engines";
    foe.path = [];
    foe.think = 99;
    foe.hp = 400;
    foe.maxHp = 400;
    const adaHp = ada.hp;
    const ivoHp = ivo.hp;
    for (let i = 0; i < 25; i++) step(g, 0.05);
    assert.ok(ada.hp < adaHp);
    assert.equal(ivo.hp, ivoHp);
  });

  it("heals a walker in the medbay and leaves an idle body past the spot cap", () => {
    const g = createGame(6);
    startCombat(g, "scout");
    g.player.systems.medbay.power = 1;
    const ada = g.crew.find((c) => c.id === "c-ada")!;
    const ivo = g.crew.find((c) => c.id === "c-ivo")!;
    const nen = g.crew.find((c) => c.id === "c-nen")!;
    const extra = { ...ada, id: "c-extra", name: "Extra", file: 8 };
    g.crew.push(extra);
    for (const c of [ada, ivo, nen, extra]) {
      c.room = "p-medbay";
      c.hp = 40;
      c.path = [];
      c.move = 0;
    }
    ada.file = 0;
    ivo.file = 1;
    nen.file = 9;
    nen.path = ["p-oxygen"];
    extra.file = 8;
    for (let i = 0; i < 4; i++) step(g, 0.05);
    assert.ok(ada.hp > 40);
    assert.ok(ivo.hp > 40);
    assert.ok(nen.hp > 40);
    assert.equal(extra.hp, 40);
    assert.equal(nen.room, "p-medbay");
  });

  it("lets only the standing spots repair a medbay", () => {
    const g = createGame(7);
    startCombat(g, "scout");
    g.player.systems.medbay.power = 0;
    g.player.systems.medbay.damage = 1;
    const ada = g.crew.find((c) => c.id === "c-ada")!;
    const ivo = g.crew.find((c) => c.id === "c-ivo")!;
    const nen = g.crew.find((c) => c.id === "c-nen")!;
    for (const c of [ada, ivo, nen]) {
      c.room = "p-medbay";
      c.path = [];
      c.move = 0;
    }
    ada.file = 0;
    ivo.file = 1;
    nen.file = 9;
    const before = g.player.systems.medbay.fix;
    step(g, 0.05);
    const delta = g.player.systems.medbay.fix - before;
    const expected = (repairPace(ada) + repairPace(ivo)) * 0.05;
    assert.ok(Math.abs(delta - expected) < 1e-6);
  });

  it("refuses a mind-controlled order, a coated room, and a missing room out loud", () => {
    const g = createGame(8);
    const ivo = g.crew.find((c) => c.id === "c-ivo")!;
    g.selected = ivo.id;
    g.squad = [ivo.id];
    ivo.leashed = 10;
    orderSelected(g, "p-oxygen", "player");
    assert.equal(g.log[0], "You can't give them orders.");
    assert.equal(g.selected, ivo.id);
    assert.deepEqual(ivo.path, []);
    ivo.leashed = 0;
    const oxygen = g.player.rooms.find((r) => r.id === "p-oxygen")!;
    oxygen.lock = 12;
    orderSelected(g, "p-oxygen", "player");
    assert.equal(g.log[0], "The crystal coating blocks the way.");
    assert.deepEqual(ivo.path, []);
    oxygen.lock = 0;
    orderSelected(g, "no-such-room", "player");
    assert.equal(g.log[0], "They can't reach that room.");
    assert.equal(g.selected, ivo.id);
  });

  it("will not end a walk in a room that has no standing spot left", () => {
    const g = createGame(4, "kestrel-a");
    g.phase = "map";
    const ada = g.crew.find((c) => c.name === "Ada Voss")!;
    const ivo = g.crew.find((c) => c.name === "Ivo Park")!;
    const nen = g.crew.find((c) => c.name === "Nen Hale")!;
    const oxygen = g.player.rooms.find((r) => r.id === "p-oxygen")!;
    const medbay = g.player.rooms.find((r) => r.id === "p-medbay")!;
    assert.equal(roomCapacity(oxygen, "player", interiorLinks(g.player.doors, oxygen.id)), 2);
    const medCap = roomCapacity(medbay, "player", interiorLinks(g.player.doors, medbay.id));
    assert.equal(medCap, medicalLimit(medbay, "player", interiorLinks(g.player.doors, medbay.id)));
    assert.ok(medCap < medbay.w * medbay.h);

    ada.room = "p-oxygen";
    ada.path = [];
    nen.room = "p-oxygen";
    nen.path = [];
    ivo.room = "p-engines";
    ivo.path = [];
    g.selected = ivo.id;
    g.squad = [ivo.id];
    orderSelected(g, "p-oxygen", "player");
    assert.equal(orderCrew(g, ivo.id, "p-oxygen"), "full");
    assert.deepEqual(ivo.path, []);
    assert.equal(ivo.room, "p-engines");
    assert.equal(g.log[0], "That room is full.");

    const past = orderCrew(g, ivo.id, "p-medbay");
    assert.equal(past, "ok");
    assert.equal(ivo.path.at(-1), "p-medbay");
    assert.notEqual(ivo.path.at(-1), "p-oxygen");

    ivo.path = [];
    ivo.move = 0;
    const bodies = [ada, nen, ivo];
    for (const c of bodies) {
      c.room = "p-engines";
      c.path = [];
    }
    const fillers = bodies.slice(0, medCap);
    for (const c of fillers) {
      c.room = "p-medbay";
      c.path = [];
    }
    const extra = { ...ivo, id: "c-extra", name: "Extra", path: [] as string[], room: "p-engines" };
    delete extra.pad;
    g.crew.push(extra);
    g.squad = [extra.id];
    orderSelected(g, "p-medbay", "player");
    assert.equal(extra.path.length, 0);
    assert.equal(extra.room, "p-engines");
    assert.equal(g.log[0], "That room is full.");
  });

  it("lets a Crystal finish leaving a coated room through a shut door", () => {
    const g = createGame(9);
    g.phase = "map";
    const ivo = g.crew.find((c) => c.id === "c-ivo")!;
    const door = g.player.doors.find(
      (d) =>
        (d.a === "p-engines" && d.b === "p-oxygen") || (d.a === "p-oxygen" && d.b === "p-engines"),
    );
    assert.ok(door);
    ivo.room = "p-engines";
    ivo.path = ["p-oxygen"];
    ivo.move = 0;
    ivo.kin = "plain";
    g.player.rooms.find((r) => r.id === "p-engines")!.lock = 12;
    door.open = false;
    door.coat = 8;
    for (let i = 0; i < 20; i++) step(g, 0.05);
    assert.equal(ivo.room, "p-engines");
    assert.ok(ivo.path.length > 0);

    ivo.kin = "shard";
    ivo.path = ["p-oxygen"];
    ivo.move = 0;
    door.open = false;
    for (let i = 0; i < 200 && ivo.room === "p-engines"; i++) step(g, 0.05);
    assert.equal(ivo.room, "p-oxygen");
  });

  it("saves stations on the player ship and returns crew there", () => {
    const g = createGame(10);
    g.phase = "map";
    const ivo = g.crew.find((c) => c.id === "c-ivo")!;
    const nen = g.crew.find((c) => c.id === "c-nen")!;
    ivo.room = "p-pilot";
    ivo.path = [];
    nen.aboard = "enemy";
    saveStations(g);
    assert.equal(g.log[0], "Stations saved.");
    assert.equal(ivo.station, "p-pilot");
    assert.equal(nen.station, undefined);
    ivo.room = "p-engines";
    for (const other of g.crew) {
      if (other.id === ivo.id || other.side !== "player") continue;
      other.station = "p-engines";
      if (other.room === "p-pilot") {
        other.room = "p-engines";
        other.path = [];
      }
    }
    returnToStations(g);
    assert.equal(ivo.path[ivo.path.length - 1], "p-pilot");
    assert.equal(nen.aboard, "enemy");
  });

  it("blocks door controls when any ion is on a still-functional Door System", () => {
    const g = createGame(11);
    const door = g.player.doors.find((d) => d.b !== "void");
    assert.ok(door);
    g.player.systems.doors.level = 3;
    g.player.systems.doors.power = 1;
    g.player.systems.doors.ion = [5];
    const was = door.open;
    toggleDoor(g, door.a, door.b);
    assert.equal(door.open, was);
    assert.equal(g.log[0], "Door control is dead.");
    closeAllDoors(g);
    assert.equal(door.open, was);
    g.player.systems.doors.ion = [];
    toggleDoor(g, door.a, door.b);
    assert.notEqual(door.open, was);
  });

  it("sends only crew who were given a teleporter pad", () => {
    const g = createGame(12);
    g.scrap = 200;
    installSling(g);
    const kit = g.player.kits.sling;
    assert.ok(kit);
    kit.power = 1;
    g.phase = "combat";
    g.enemy = { rooms: [{ id: "e-weapons", title: "Weapons" }] } as unknown as typeof g.enemy;
    const pad = g.player.rooms.find((r) => r.kit === "sling");
    const ivo = g.crew.find((c) => c.id === "c-ivo");
    const ada = g.crew.find((c) => c.id === "c-ada");
    assert.ok(pad && ivo && ada && g.enemy);
    for (const c of g.crew) {
      if (c !== ivo && c !== ada) c.hp = 0;
    }
    ivo.room = pad.id;
    ivo.path = [];
    delete ivo.pad;
    ada.room = pad.id;
    ada.path = [];
    delete ada.pad;
    sendSling(g, "e-weapons");
    assert.equal(ivo.aboard, "player");
    assert.equal(g.log[0], "No one to teleport.");
    orderCrew(g, ivo.id, pad.id);
    assert.ok(ivo.pad);
    selectCrew(g, ivo.id);
    sendSling(g, "e-weapons");
    assert.equal(ivo.aboard, "enemy");
    assert.equal(ada.aboard, "player");
    assert.equal(ivo.pad, undefined);
  });
});

describe("manning terminal", () => {
  it("puts the crew member who runs the system on the right-hand terminal", () => {
    const g = createGame(4, "kestrel-a");
    const engines = g.player.rooms.find((r) => r.id === "p-engines");
    const oxygen = g.player.rooms.find((r) => r.id === "p-oxygen");
    const medbay = g.player.rooms.find((r) => r.id === "p-medbay");
    const ivo = g.crew.find((c) => c.name === "Ivo Park");
    const ada = g.crew.find((c) => c.name === "Ada Voss");
    assert.ok(engines && oxygen && medbay && ivo && ada);
    // Door System picture: "(console on the right)". Engines is 2×2 at (1, 2), so the top-right tile.
    assert.deepEqual(roomConsole(engines, g.player), { x: 2, y: 2 });
    assert.equal(roomConsole(oxygen, g.player), null);
    assert.equal(roomConsole(medbay, g.player), null);
    assert.equal(roomConsole({ ...engines, system: "weapons" }, { flagship: {} }), null);
    assert.equal(roomCapacity(engines, "player", interiorLinks(g.player.doors, engines.id)), 4);

    const alone = restSpot(engines, g.crew, ivo.id, "player", g.player);
    assert.deepEqual(alone && { x: alone.x, y: alone.y, stack: alone.stack }, { x: 2, y: 2, stack: 0 });

    ada.room = "p-engines";
    ada.path = [];
    const adaSpot = restSpot(engines, g.crew, ada.id, "player", g.player);
    const ivoSpot = restSpot(engines, g.crew, ivo.id, "player", g.player);
    assert.ok(adaSpot && ivoSpot);
    assert.deepEqual({ x: adaSpot.x, y: adaSpot.y }, { x: 2, y: 2 });
    assert.notDeepEqual({ x: ivoSpot.x, y: ivoSpot.y }, { x: 2, y: 2 });

    ada.leashed = 10;
    const back = restSpot(engines, g.crew, ivo.id, "player", g.player);
    const held = restSpot(engines, g.crew, ada.id, "player", g.player);
    assert.ok(back && held);
    assert.deepEqual({ x: back.x, y: back.y }, { x: 2, y: 2 });
    assert.notDeepEqual({ x: held.x, y: held.y }, { x: 2, y: 2 });
  });
});
