import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { enemyBlueprintId } from "@stl/catalog/src/enemy-blueprints.ts";
import { hullDef, loadPack, onPackWarning, resetPackForTests, scrapRange } from "@stl/pack";
import type { HullDef } from "@stl/pack";
import { choose, commitJump, createGame } from "../sim.ts";
import { overtaken } from "../wiki/sector-map.ts";
import type { Game } from "../types.ts";

afterEach(() => resetPackForTests());

function emberHull(id: string, name: string, weapon: string): HullDef {
  const base = hullDef(enemyBlueprintId("rebel-fighter"));
  assert.ok(base);
  return {
    ...base,
    id,
    name,
    weapons: [weapon],
    weaponLoad: undefined,
    weaponCount: 1,
    crewCounts: [{ amount: 2, class: "mantis" }],
    augments: [],
  };
}

function holdsWeapon(g: Game, id: string): boolean {
  return (
    g.player.weapons.some((w) => w.defId === id) ||
    (g.cargo ?? []).some((item) => item.kind === "weapon" && item.id === id)
  );
}

function jumpTo(g: Game, flag: string): void {
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(here);
  const dest = here.links
    .map((id) => g.beacons.find((b) => b.id === id))
    .find((b) => b && !overtaken({ fleet: g.fleet + 1, dangerY: g.dangerY }, b));
  assert.ok(dest);
  dest.kind = "event";
  dest.flag = flag;
  // The beacon's old name can match an earlier page before this flag does.
  dest.name = flag;
  dest.resolved = false;
  dest.tier = "";
  g.fuel = 5;
  g.phase = "map";
  g.paused = false;
  g.enemy = null;
  g.event = null;
  g.flee = 1;
  const jumps = g.jumps;
  commitJump(g, dest.id);
  assert.equal(g.jumps, jumps + 1);
}

describe("archive event payoffs", () => {
  it("fights a hull id with that hull's weapons, not a class roll", () => {
    loadPack(
      {
        hulls: [emberHull("EMBER_HULL", "Ember Hull", "LASER_BURST_3")],
        events: [
          {
            id: "ember-hull",
            dest: "Ember Hull",
            flag: "ember-hull",
            aliases: [],
            sectors: [],
            body: "A named hull.",
            choices: [
              {
                id: "c:ember-hull:0",
                label: "Fight",
                fx: [{ k: "fight", tier: "EMBER_HULL", asteroid: true }],
                grants: [{ kind: "augment", id: "ROCK_ARMOR" }],
                reward: { level: "HIGH", name: "standard" },
              },
            ],
          },
        ],
      },
      "append",
    );
    const g = createGame(1);
    const scrap = g.scrap;
    choose(g, "c:ember-hull:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.asteroid, true);
    assert.equal(g.enemy?.name, "Ember Hull");
    assert.equal(g.enemy?.classId, "EMBER_HULL");
    assert.equal(g.enemy?.faction, undefined);
    assert.deepEqual(
      g.enemy?.weapons.map((w) => w.defId),
      ["LASER_BURST_3"],
    );
    assert.equal(
      g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy" && c.kin === "mantis").length,
      2,
    );
    assert.equal(g.scrap, scrap);
    assert.equal(g.augments.includes("ROCK_ARMOR"), false);
  });

  it("draws auto_blueprint from the named blueprint list", () => {
    loadPack(
      {
        hulls: [
          emberHull("EMBER_A", "Ember A", "LASER_BURST_3"),
          emberHull("EMBER_B", "Ember B", "LASER_BURST_1"),
        ],
        blueprints: [{ id: "EMBER_LIST", names: ["EMBER_A", "EMBER_B"] }],
        events: [
          {
            id: "ember-list",
            dest: "Ember List",
            flag: "ember-list",
            aliases: [],
            sectors: [],
            body: "A list.",
            choices: [
              {
                id: "ember-list",
                label: "Fight",
                fx: [{ k: "fight", tier: "Auto-ship", autoBlueprint: "EMBER_LIST" }],
              },
            ],
          },
        ],
      },
      "append",
    );
    const g = createGame(2);
    const guns: Record<string, string> = { "Ember A": "LASER_BURST_3", "Ember B": "LASER_BURST_1" };
    const seen = new Set<string>();
    for (let i = 0; i < 24; i++) {
      choose(g, "ember-list");
      const name = g.enemy?.name ?? "";
      seen.add(name);
      assert.deepEqual(
        g.enemy?.weapons.map((w) => w.defId),
        [guns[name]],
      );
      g.phase = "map";
      g.enemy = null;
    }
    assert.deepEqual([...seen].sort(), ["Ember A", "Ember B"]);
  });

  it("runs a campaign switch handler once and does not also apply archive fields", () => {
    loadPack(
      {
        events: [
          {
            id: "ember-cache",
            dest: "Cache",
            flag: "ember-cache",
            aliases: [],
            sectors: [],
            body: "Cache.",
            choices: [
              {
                id: "engi-cache-secure",
                label: "Secure",
                fx: [{ k: "nothing" }],
                grants: [{ kind: "weapon", id: "BEAM_FIRE" }],
                reward: { level: "HIGH", name: "standard" },
              },
            ],
          },
        ],
      },
      "append",
    );
    const g = createGame(3);
    const before = g.scrap;
    assert.equal(holdsWeapon(g, "BEAM_FIRE"), false);
    choose(g, "engi-cache-secure");
    const [lo, hi] = scrapRange(g.difficulty, g.sector, "medium");
    const delta = g.scrap - before;
    assert.ok(delta >= lo && delta <= hi, `scrap delta ${delta} outside ${lo}..${hi}`);
    assert.equal(holdsWeapon(g, "BEAM_FIRE"), false);
  });

  it("beams boarders from min to max of that class", () => {
    loadPack(
      {
        events: [
          {
            id: "ember-board",
            dest: "Boarders",
            flag: "ember-board",
            aliases: [],
            sectors: [],
            body: "Boarders.",
            choices: [
              {
                id: "c:ember-board:0",
                label: "Brace",
                fx: [{ k: "nothing" }],
                boarders: { min: 2, max: 2, class: "mantis" },
              },
            ],
          },
          {
            id: "ember-human",
            dest: "Humans",
            flag: "ember-human",
            aliases: [],
            sectors: [],
            body: "Humans.",
            choices: [
              {
                id: "c:ember-human:0",
                label: "Brace",
                fx: [{ k: "nothing" }],
                boarders: { min: 1, max: 1 },
              },
            ],
          },
        ],
      },
      "append",
    );
    const mantis = createGame(4);
    choose(mantis, "c:ember-board:0");
    const boarded = mantis.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.equal(boarded.length, 2);
    assert.ok(boarded.every((c) => c.kin === "mantis"));
    const human = createGame(5);
    choose(human, "c:ember-human:0");
    const people = human.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.equal(people.length, 1);
    assert.equal(people[0]?.kin, "human");
  });

  it("grants a named blueprint and skips a missing one", () => {
    loadPack(
      {
        events: [
          {
            id: "ember-grant",
            dest: "Grant",
            flag: "ember-grant",
            aliases: [],
            sectors: [],
            body: "Grant.",
            choices: [
              {
                id: "ember-grant",
                label: "Take",
                fx: [{ k: "nothing" }],
                grants: [{ kind: "weapon", id: "BEAM_FIRE" }],
              },
              {
                id: "ember-missing",
                label: "Miss",
                fx: [{ k: "nothing" }],
                grants: [{ kind: "weapon", id: "NO_SUCH_GUN" }],
              },
            ],
          },
        ],
      },
      "append",
    );
    const g = createGame(6);
    assert.equal(holdsWeapon(g, "BEAM_FIRE"), false);
    choose(g, "ember-grant");
    assert.equal(holdsWeapon(g, "BEAM_FIRE"), true);
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const weapons = g.player.weapons.map((w) => w.defId).join(",");
      choose(g, "ember-missing");
      assert.equal(g.player.weapons.map((w) => w.defId).join(","), weapons);
      assert.ok(warnings.some((message) => message.includes("NO_SUCH_GUN")));
    } finally {
      restore();
    }
  });

  it("pays the existing high band for a high standard autoReward", () => {
    loadPack(
      {
        events: [
          {
            id: "ember-pay",
            dest: "Pay",
            flag: "ember-pay",
            aliases: [],
            sectors: [],
            body: "Pay.",
            choices: [
              {
                id: "ember-pay",
                label: "Take",
                fx: [{ k: "nothing" }],
                reward: { level: "HIGH", name: "standard" },
              },
            ],
          },
        ],
      },
      "append",
    );
    const g = createGame(7);
    const before = g.scrap;
    choose(g, "ember-pay");
    const [lo, hi] = scrapRange(g.difficulty, g.sector, "high");
    const delta = g.scrap - before;
    assert.ok(delta >= lo && delta <= hi, `scrap delta ${delta} outside ${lo}..${hi}`);
  });

  it("leaves a page without these fields unchanged and fights a page-level hostile ship", () => {
    loadPack(
      {
        hulls: [emberHull("EMBER_HULL", "Ember Hull", "LASER_BURST_3")],
        events: [
          {
            id: "ember-quiet",
            dest: "Quiet",
            flag: "cited:ember-quiet",
            aliases: [],
            sectors: [],
            body: "Nothing new.",
            choices: [{ id: "c:ember-quiet:0", label: "Leave", fx: [{ k: "nothing" }] }],
          },
          {
            id: "ember-ambush",
            dest: "Ambush",
            flag: "cited:ember-ambush",
            aliases: [],
            sectors: [],
            body: "A hull drops in.",
            ship: { load: "EMBER_HULL", hostile: true, asteroid: true },
            choices: [
              {
                id: "c:ember-ambush:0",
                label: "Fight",
                fx: [{ k: "fight", tier: "Rebel ship" }],
              },
            ],
          },
          {
            id: "ember-store",
            dest: "Store ship",
            flag: "cited:ember-store",
            aliases: [],
            sectors: [],
            body: "They are not hostile.",
            ship: { load: "EMBER_HULL", hostile: false },
            choices: [{ id: "c:ember-store:0", label: "Leave", fx: [{ k: "nothing" }] }],
          },
        ],
      },
      "append",
    );
    const quiet = createGame(8);
    const scrap = quiet.scrap;
    const guns = quiet.player.weapons.map((w) => w.defId).join(",");
    const crew = quiet.crew.length;
    jumpTo(quiet, "cited:ember-quiet");
    assert.equal(quiet.phase, "event");
    assert.equal(quiet.enemy, null);
    assert.equal(quiet.event?.body, "Nothing new.");
    assert.equal(quiet.scrap, scrap);
    assert.equal(quiet.player.weapons.map((w) => w.defId).join(","), guns);
    assert.equal(quiet.crew.length, crew);

    const ambush = createGame(9);
    jumpTo(ambush, "cited:ember-ambush");
    assert.equal(ambush.phase, "combat");
    assert.equal(ambush.asteroid, true);
    assert.equal(ambush.enemy?.name, "Ember Hull");
    assert.deepEqual(
      ambush.enemy?.weapons.map((w) => w.defId),
      ["LASER_BURST_3"],
    );

    const store = createGame(10);
    jumpTo(store, "cited:ember-store");
    assert.equal(store.phase, "event");
    assert.equal(store.enemy, null);
    assert.equal(store.event?.body, "They are not hostile.");
  });
});
