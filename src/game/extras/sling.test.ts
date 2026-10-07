import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game, Ship } from "../types";
import {
  installSling,
  onJumpSling,
  recallSling,
  sendSling,
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
    assert.equal(ivo.room, "p-medbay");
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
});
