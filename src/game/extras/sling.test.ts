import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import type { Game, Kit, Ship } from "../types";
import { deathAnimSeconds, onCradleDeath, tickCradle } from "./cradle.ts";
import { onPlayerJump } from "./index.ts";
import {
  installSling,
  onJumpSling,
  recallSling,
  sendSling,
  tickEnemyBoarding,
  tickSling,
  toggleSlingPower,
  upgradeSling,
} from "./sling.ts";

function engage(g: Game) {
  g.phase = "combat";
  g.enemy = { rooms: [{ id: "e-weapons", title: "Weapons" }] } as unknown as Ship;
}

function kitOf(g: Game) {
  const kit = g.player.kits.sling;
  assert.ok(kit);
  return kit;
}

describe("sling", () => {
  it("sends one crew, recalls them, and loses anyone still over there", () => {
    const g = createGame(1);
    g.scrap = 200;
    installSling(g);
    assert.equal(g.scrap, 110);

    const kit = kitOf(g);
    assert.equal(kit.id, "sling");
    kit.level = 1;
    kit.power = 1;
    engage(g);

    const ivo = g.crew.find((c) => c.id === "c-ivo");
    assert.ok(ivo);
    for (const c of g.crew) {
      if (c !== ivo) c.hp = 0;
    }
    g.selected = ivo.id;
    ivo.path = ["p-shields"];

    sendSling(g, "e-weapons");
    assert.equal(ivo.aboard, "enemy");
    assert.equal(ivo.room, "e-weapons");
    assert.deepEqual(ivo.path, []);
    assert.equal(kit.cool, 20);
    assert.equal(kit.target, "e-weapons");
    assert.equal(kit.on, false);
    assert.equal(kit.left, 0);
    assert.equal(kit.aux, 0);
    assert.equal(g.player.parts, 0);
    assert.equal(g.scrap, 110);

    tickSling(g, 20);
    assert.equal(kit.cool, 0);
    recallSling(g);
    assert.equal(ivo.aboard, "player");
    // Crew Teleporter: a retrieved crewmember fits in the 2-tile teleporter room.
    assert.equal(ivo.room, g.player.rooms.find((r) => r.kit === "sling")?.id);
    assert.deepEqual(ivo.path, []);
    assert.equal(kit.cool, 20);

    tickSling(g, 20);
    sendSling(g, "e-weapons");
    assert.equal(ivo.aboard, "enemy");
    assert.equal(ivo.hp, 100);
    onJumpSling(g);
    assert.equal(ivo.hp, 0);
    assert.equal(g.log[0], "Ivo Park is lost on the other hull.");
  });

  it("retrieves at most four and seats the rest of them in an adjacent room", () => {
    // Crew Teleporter: "Can retrieve up to 4 crew from the enemy ship".
    // "Retrieved crew that cannot fit in the teleporter room will be placed in adjacent room(s)."
    const g = createGame(1);
    g.scrap = 200;
    installSling(g);
    const kit = kitOf(g);
    kit.power = 1;
    engage(g);
    const pad = g.player.rooms.find((r) => r.kit === "sling");
    assert.ok(pad);
    assert.equal(pad.w * pad.h - (pad.omit?.length ?? 0), 2);
    const neighbors = g.player.doors.flatMap((d) => {
      if (d.b === "void") return [];
      if (d.a === pad.id) return [d.b];
      if (d.b === pad.id) return [d.a];
      return [];
    });
    assert.ok(neighbors.length > 0);

    const source = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(source);
    g.crew.push({ ...source, id: "c-extra-1", name: "Extra One", path: [] });
    g.crew.push({ ...source, id: "c-extra-2", name: "Extra Two", path: [] });
    for (const c of g.crew) {
      if (c.side !== "player" || c.hp <= 0) continue;
      c.aboard = "enemy";
      c.room = "e-weapons";
      c.path = [];
    }
    const away = g.crew.filter((c) => c.side === "player" && c.aboard === "enemy");
    assert.equal(away.length, 5);

    recallSling(g);
    const back = g.crew.filter((c) => c.side === "player" && c.aboard === "player");
    const still = g.crew.filter((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0);
    assert.equal(back.length, 4);
    assert.equal(still.length, 1);
    assert.equal(still[0]?.id, "c-extra-2");
    assert.equal(back.filter((c) => c.room === pad.id).length, 2);
    const overflow = back.filter((c) => c.room !== pad.id);
    assert.equal(overflow.length, 2);
    for (const c of overflow) assert.ok(neighbors.includes(c.room));
  });

  it("does not clone crew left alive on the enemy ship, and still clones a crew already queued", () => {
    // Clone Bay, Overview: "Clone Bay will not revive your crew left on the enemy ship, whether you or the enemy jumps away."
    const g = createGame(1);
    g.scrap = 200;
    installSling(g);
    const kit = kitOf(g);
    kit.power = 1;
    engage(g);
    g.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: true, aux: 0 };

    const ada = g.crew.find((c) => c.id === "c-ada");
    const ivo = g.crew.find((c) => c.id === "c-ivo");
    const nen = g.crew.find((c) => c.id === "c-nen");
    assert.ok(ada && ivo && nen);

    // Nen already died and entered the queue. Ada is dead on the Lark and not queued yet. Ivo is still alive over there.
    nen.hp = 0;
    assert.equal(onCradleDeath(g, nen), true);
    const queued = nen.cloneIn;
    assert.equal(queued, 12 + deathAnimSeconds(nen.kin));
    ada.hp = 0;

    g.selected = ivo.id;
    sendSling(g, "e-weapons");
    assert.equal(ivo.aboard, "enemy");
    assert.equal(ivo.hp, 100);
    assert.equal(ada.aboard, "player");
    assert.equal(nen.aboard, "player");

    onPlayerJump(g);
    assert.equal(ivo.hp, 0);
    assert.equal(ivo.cloneIn, undefined);
    assert.equal(g.crew.includes(ivo), false);
    assert.equal(g.log.includes("Ivo Park is lost on the other hull."), true);

    assert.equal(nen.cloneIn, queued);
    assert.equal(g.crew.includes(nen), true);
    assert.equal(ada.cloneIn, 12 + deathAnimSeconds(ada.kin));
    assert.equal(g.crew.includes(ada), true);

    g.enemy!.kits = {};
    tickCradle(g, queued ?? 0);
    assert.equal(nen.hp, nen.maxHp);
    assert.equal(nen.cloneIn, undefined);
    assert.equal(g.crew.includes(ivo), false);
  });

  it("keeps the lone pilot and prefers the selected crew, then medbay", () => {
    const g = createGame(1);
    g.scrap = 90;
    installSling(g);
    const kit = kitOf(g);
    kit.power = 1;
    engage(g);

    sendSling(g, "e-weapons");
    assert.deepEqual(
      g.crew.filter((c) => c.aboard === "enemy").map((c) => c.id),
      ["c-ivo", "c-nen"],
    );
    assert.equal(g.crew.find((c) => c.id === "c-ada")?.aboard, "player");

    tickSling(g, 20);
    recallSling(g);
    tickSling(g, 20);

    const ada = g.crew.find((c) => c.id === "c-ada");
    const ivo = g.crew.find((c) => c.id === "c-ivo");
    const nen = g.crew.find((c) => c.id === "c-nen");
    assert.ok(ada && ivo && nen);
    ada.room = "p-weapons";
    ivo.room = "p-engines";
    nen.room = "p-medbay";
    sendSling(g, "e-weapons");
    assert.deepEqual(
      g.crew.filter((c) => c.aboard === "enemy").map((c) => c.id),
      ["c-ada", "c-nen"],
    );

    tickSling(g, 20);
    recallSling(g);
    tickSling(g, 20);
    ada.room = "p-pilot";
    ivo.room = "p-engines";
    nen.room = "p-weapons";
    g.selected = "c-ada";
    sendSling(g, "e-weapons");
    assert.deepEqual(
      g.crew.filter((c) => c.aboard === "enemy").map((c) => c.id),
      ["c-ada", "c-ivo"],
    );
  });

  it("charges 30 then 60, cools faster, and will not run underpowered", () => {
    const g = createGame(1);
    g.scrap = 89;
    installSling(g);
    assert.equal(g.player.kits.sling, undefined);

    g.scrap = 180;
    installSling(g);
    const kit = kitOf(g);
    assert.equal(g.scrap, 90);
    assert.equal(kit.level, 1);
    assert.equal(kit.power, 0);

    engage(g);
    sendSling(g, "e-weapons");
    assert.equal(
      g.crew.every((c) => c.aboard === "player"),
      true,
    );
    assert.equal(kit.cool, 0);

    toggleSlingPower(g);
    assert.equal(kit.power, 1);
    toggleSlingPower(g);
    assert.equal(kit.power, 0);
    toggleSlingPower(g);
    assert.equal(kit.power, 1);

    upgradeSling(g);
    assert.equal(kit.level, 2);
    assert.equal(g.scrap, 60);
    upgradeSling(g);
    assert.equal(kit.level, 3);
    assert.equal(g.scrap, 0);
    upgradeSling(g);
    assert.equal(kit.level, 3);

    kit.power = 3;
    kit.cool = 0;
    sendSling(g, "missing");
    assert.equal(kit.cool, 0);
    assert.equal(
      g.crew.every((c) => c.aboard === "player"),
      true,
    );

    sendSling(g, "e-weapons");
    assert.equal(kit.cool, 10);
    tickSling(g, 4);
    assert.equal(kit.cool, 6);
    recallSling(g);
    assert.equal(
      g.crew.some((c) => c.aboard === "enemy"),
      true,
    );

    tickSling(g, 6);
    recallSling(g);
    assert.equal(
      g.crew.every((c) => c.aboard === "player"),
      true,
    );
    assert.equal(kit.cool, 10);

    tickSling(g, 10);
    kit.level = 2;
    kit.power = 2;
    sendSling(g, "e-weapons");
    assert.equal(kit.cool, 15);
  });

  it("resets the cooldown the moment the ship is not in danger", () => {
    const g = createGame(1);
    g.scrap = 200;
    installSling(g);
    const kit = kitOf(g);
    kit.power = 1;
    engage(g);
    const ivo = g.crew.find((c) => c.id === "c-ivo");
    assert.ok(ivo);
    for (const c of g.crew) {
      if (c !== ivo) c.hp = 0;
    }
    g.selected = ivo.id;
    sendSling(g, "e-weapons");
    assert.equal(kit.cool, 20);
    tickSling(g, 5);
    assert.equal(kit.cool, 15);

    // Backup Battery's IN DANGER note: an asteroid field still counts, even off the combat phase.
    g.phase = "map";
    g.asteroid = true;
    tickSling(g, 4);
    assert.equal(kit.cool, 11);

    g.asteroid = false;
    g.pulsar = false;
    g.flare = false;
    g.asb = false;
    const boarder = g.crew.find((c) => c.hp <= 0);
    assert.ok(boarder);
    boarder.hp = 40;
    boarder.side = "enemy";
    boarder.aboard = "player";
    tickSling(g, 1);
    assert.equal(kit.cool, 10);

    boarder.hp = 0;
    tickSling(g, 0);
    assert.equal(kit.cool, 0);
    assert.equal(g.log[0], "Teleporter is ready.");
  });

  it("refuses a send and a recall while the enemy is cloaked, and while the player is cloaked", () => {
    // Crew Teleporter: player's crew cannot teleport onto or from a cloaked enemy ship.
    // Cloaking, Overview: friendly crew cannot be teleported to or from an enemy ship during your own cloak.
    const g = createGame(1);
    g.scrap = 200;
    installSling(g);
    const kit = kitOf(g);
    kit.power = 1;
    engage(g);
    const ivo = g.crew.find((c) => c.id === "c-ivo");
    assert.ok(ivo);
    for (const c of g.crew) {
      if (c !== ivo) c.hp = 0;
    }
    g.selected = ivo.id;
    g.enemy!.kits = { veil: cloak() };
    sendSling(g, "e-weapons");
    assert.equal(ivo.aboard, "player");
    assert.equal(kit.cool, 0);
    assert.equal(g.log[0], "Cloaking blocks the teleporter.");

    g.enemy!.kits.veil!.on = false;
    g.enemy!.kits.veil!.left = 0;
    sendSling(g, "e-weapons");
    assert.equal(ivo.aboard, "enemy");
    assert.equal(kit.cool, 20);
    kit.cool = 0;
    g.enemy!.kits.veil = cloak();
    recallSling(g);
    assert.equal(ivo.aboard, "enemy");
    assert.equal(kit.cool, 0);
    assert.equal(g.log[0], "Cloaking blocks the teleporter.");

    g.enemy!.kits.veil!.on = false;
    g.enemy!.kits.veil!.left = 0;
    g.player.kits.veil = cloak();
    recallSling(g);
    assert.equal(ivo.aboard, "enemy");
    assert.equal(kit.cool, 0);
    g.player.kits.veil.on = false;
    g.player.kits.veil.left = 0;
    recallSling(g);
    assert.equal(ivo.aboard, "player");
    assert.equal(kit.cool, 20);

    kit.cool = 0;
    g.player.kits.veil = cloak();
    sendSling(g, "e-weapons");
    assert.equal(ivo.aboard, "player");
    assert.equal(kit.cool, 0);
  });

  it("holds an enemy boarding party while that enemy is cloaked", () => {
    // Cloaking, Overview: friendly crew cannot be teleported to or from an enemy ship.
    // Crew Teleporter already blocks them when the player is the one cloaked.
    const g = mantisBoarder();
    g.boardTimer = 0;
    tickEnemyBoarding(g, 0.01);
    const party = (g.enemy!.boarding?.party ?? []).map((id) => g.crew.find((c) => c.id === id)!);
    assert.ok(party.length > 0);
    for (const c of party) {
      c.room = "e-teleporter";
      c.path = [];
      c.move = 0;
    }
    const pad = g.enemy!.kits.sling!;
    pad.cool = 0;
    g.enemy!.kits.veil = cloak();
    tickEnemyBoarding(g, 0.01);
    assert.ok(party.every((c) => c.aboard === "enemy"));
    assert.equal(pad.cool, 0);

    g.enemy!.kits.veil.on = false;
    g.enemy!.kits.veil.left = 0;
    tickEnemyBoarding(g, 0.01);
    assert.ok(party.every((c) => c.aboard === "player"));

    for (const c of party) c.hp = c.maxHp * 0.1;
    pad.cool = 0;
    g.enemy!.kits.veil = cloak();
    tickEnemyBoarding(g, 0.01);
    assert.ok(party.every((c) => c.aboard === "player"));
    assert.equal(pad.cool, 0);
    g.enemy!.kits.veil.on = false;
    g.enemy!.kits.veil.left = 0;
    tickEnemyBoarding(g, 0.01);
    assert.ok(party.every((c) => c.aboard === "enemy"));
    assert.ok(pad.cool > 0);
  });
});

function cloak(): Kit {
  return { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
}

function mantisBoarder(): Game {
  for (let seed = 1; seed < 500; seed++) {
    const g = createGame(seed);
    startCombat(g, "Mantis ship");
    const crew = g.crew.filter((c) => c.side === "enemy" && c.hp > 0);
    if (!g.enemy?.kits.sling || crew.length < 3) continue;
    g.enemy.weapons = [];
    g.player.weapons = [];
    g.enemyEscape = null;
    g.player.zoltan = 0;
    return g;
  }
  throw new Error("no Mantis ship with a teleporter");
}
