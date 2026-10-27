import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  crewDef,
  hullDef,
  loadPack,
  onPackWarning,
  packFromFtl,
  resetPackForTests,
  scrapRange,
  shipClassBlueprint,
} from "@stl/pack";
import type { HullDef, WeaponBlueprint } from "@stl/pack";
import { weightedBlueprint } from "../archive-pay.ts";
import { weaponCopy, weaponDamageLabel } from "../interface-copy.ts";
import "./base.ts";
import { choose, commitJump, createGame, waitHere } from "../sim.ts";
import { overtaken } from "../wiki/sector-map.ts";
import { citedFleetAdvance } from "../wiki/cited-sectors.ts";
import type { Game } from "../types.ts";

afterEach(() => resetPackForTests());

function emberHull(id: string, name: string, weapon: string): HullDef {
  const base = hullDef(shipClassBlueprint("rebel-fighter"));
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

    const ghosts = createGame(11);
    loadPack(
      {
        events: [
          {
            id: "ember-ghost",
            dest: "Ghosts",
            flag: "ember-ghost",
            aliases: [],
            sectors: [],
            body: "Ghosts.",
            choices: [
              {
                id: "c:ember-ghost:0",
                label: "Brace",
                fx: [{ k: "nothing" }],
                boarders: { min: 3, max: 3, class: "ghost" },
              },
            ],
          },
        ],
      },
      "append",
    );
    choose(ghosts, "c:ember-ghost:0");
    const shades = ghosts.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.equal(shades.length, 3);
    assert.ok(shades.every((c) => c.kin === "ghost" && c.hp === 50 && c.maxHp === 50));
    assert.equal(crewDef("ghost").suffocate, 0);
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

  it("draws one RANDOM blueprint and skips a rarity of 0", () => {
    const rows = [
      { id: "ZZZ", rarity: 1 },
      { id: "AAA", rarity: 5 },
      { id: "ZERO", rarity: 0 },
      { id: "NONE" },
      { id: "HEAVY", rarity: 6 },
    ];
    assert.equal(
      weightedBlueprint(rows, () => 0),
      "AAA",
    );
    assert.equal(
      weightedBlueprint(rows, () => 0.2),
      "ZZZ",
    );
    assert.equal(
      weightedBlueprint([{ id: "ZERO", rarity: 0 }], () => 0),
      undefined,
    );

    const gun = (id: string, rarity?: number): WeaponBlueprint => ({
      id,
      name: id,
      kind: "laser",
      power: 1,
      charge: 1,
      shots: 1,
      gap: 0,
      damage: 1,
      ion: 0,
      fire: 0,
      breach: 0,
      ammo: false,
      price: 1,
      blurb: "",
      ...(rarity == null ? {} : { rarity }),
    });
    loadPack(
      {
        weapons: [gun("RANDOM", 0), gun("BURST_ONLY", 2), gun("LOCKED", 6)],
        events: [
          {
            id: "ember-random",
            dest: "Random",
            flag: "ember-random",
            aliases: [],
            sectors: [],
            body: "Random.",
            choices: [
              {
                id: "ember-random",
                label: "Take",
                fx: [{ k: "nothing" }],
                grants: [{ kind: "weapon", id: "RANDOM" }],
              },
            ],
          },
        ],
      },
      "append",
    );
    const g = createGame(12);
    choose(g, "ember-random");
    assert.equal(holdsWeapon(g, "BURST_ONLY"), true);
    assert.equal(holdsWeapon(g, "RANDOM"), false);
    assert.equal(holdsWeapon(g, "LOCKED"), false);
  });

  it("skips RANDOM when every blueprint is excluded", () => {
    loadPack(
      {
        events: [
          {
            id: "ember-empty-random",
            dest: "Empty",
            flag: "ember-empty-random",
            aliases: [],
            sectors: [],
            body: "Empty.",
            choices: [
              {
                id: "ember-empty-random",
                label: "Take",
                fx: [{ k: "nothing" }],
                grants: [{ kind: "weapon", id: "RANDOM" }],
              },
            ],
          },
        ],
      },
      "append",
    );
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const g = createGame(13);
      const before = g.player.weapons.map((w) => w.defId).join(",");
      choose(g, "ember-empty-random");
      assert.equal(g.player.weapons.map((w) => w.defId).join(","), before);
      assert.ok(warnings.some((message) => message.includes("RANDOM")));
    } finally {
      restore();
    }
  });

  it("shows the archive type phrase on a weapon card", () => {
    packFromFtl([
      {
        path: "data/text_blueprints.xml",
        xml: `<FTL>
          <text name="type_ion">Ion</text>
          <text name="type_laser">Laser</text>
          <text name="type_beam">Beam</text>
          <text name="type_bomb">Bomb</text>
          <text name="type_burst">Burst</text>
          <text name="type_missile">Missile</text>
          <text name="type_crystal">Crystal</text>
        </FTL>`,
      },
    ]);
    assert.deepEqual(weaponCopy({ kind: "laser", ion: 1, ammo: false }), ["Ion"]);
    assert.deepEqual(weaponCopy({ kind: "ion", ammo: false }), ["Ion"]);
    assert.deepEqual(weaponCopy({ kind: "laser", ion: 0, ammo: false }), ["Laser"]);
    assert.deepEqual(weaponCopy({ kind: "beam" }), ["Beam"]);
    assert.deepEqual(weaponCopy({ kind: "bomb", ion: 2, ammo: false }), ["Bomb"]);
    assert.equal(weaponDamageLabel({ damage: 2, shots: 2 }), "2×2");
    assert.equal(weaponDamageLabel({ damage: 0, sysDamage: 2, shots: 1 }), "2");
    assert.equal(weaponDamageLabel({ damage: 0, sysDamage: -8, shots: 1 }), null);
    assert.deepEqual(weaponCopy({ kind: "flak" }), ["Burst"]);
    assert.deepEqual(weaponCopy({ kind: "missile", ammo: true }), ["Missile"]);
    assert.deepEqual(weaponCopy({ kind: "missile", ammo: false }), ["Crystal"]);
    resetPackForTests();
    assert.deepEqual(weaponCopy({ kind: "missile", ammo: false }), []);
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
    assert.equal(ambush.phase, "event");
    assert.ok(ambush.event?.body.includes("A hull drops in."));
    assert.equal(ambush.log.includes("A hull drops in."), false);
    assert.equal(ambush.event?.choices[0]?.id, "ship-resume");
    choose(ambush, "ship-resume");
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

  it("plays the environment tag on the fight and slows a nebula wait", () => {
    const page = (
      id: string,
      environment: {
        type: "asteroid" | "sun" | "pulsar" | "storm" | "nebula" | "PDS";
        target?: "all" | "enemy";
      },
      ship: boolean,
    ) => ({
      id,
      dest: id,
      flag: `cited:${id}`,
      aliases: [] as string[],
      sectors: [] as string[],
      body: id,
      environment,
      ...(ship ? { ship: { load: "EMBER_HULL", hostile: true as const } } : {}),
      choices: ship ? [] : [{ id: `c:${id}:0`, label: "Leave", fx: [{ k: "nothing" as const }] }],
    });
    loadPack(
      {
        hulls: [emberHull("EMBER_HULL", "Ember Hull", "LASER_BURST_3")],
        events: [
          page("ember-field", { type: "asteroid" }, true),
          page("ember-sun", { type: "sun" }, true),
          page("ember-wave", { type: "pulsar" }, true),
          page("ember-battery", { type: "PDS", target: "all" }, true),
          page("ember-cover", { type: "PDS", target: "enemy" }, true),
          page("ember-storm", { type: "storm" }, false),
          page("ember-nebula", { type: "nebula" }, false),
          {
            id: "ember-choice-sun",
            dest: "Choice sun",
            flag: "cited:ember-choice-sun",
            aliases: [],
            sectors: [],
            body: "Choose.",
            choices: [
              {
                id: "ember-choice-sun",
                label: "Fight",
                fx: [{ k: "fight", tier: "EMBER_HULL" }],
                environment: { type: "sun" },
              },
            ],
          },
        ],
      },
      "append",
    );

    const field = createGame(20);
    jumpTo(field, "cited:ember-field");
    assert.equal(field.phase, "event");
    assert.ok(field.event?.body.includes("ember-field"));
    assert.equal(field.log.includes("ember-field"), false);
    assert.equal(field.event?.choices[0]?.id, "ship-resume");
    choose(field, "ship-resume");
    assert.equal(field.phase, "combat");
    assert.equal(field.asteroid, true);
    assert.equal(field.enemy?.name, "Ember Hull");

    const sun = createGame(21);
    jumpTo(sun, "cited:ember-sun");
    assert.equal(sun.phase, "event");
    assert.ok(sun.event?.body.includes("ember-sun"));
    assert.equal(sun.log.includes("ember-sun"), false);
    choose(sun, "ship-resume");
    assert.equal(sun.phase, "combat");
    assert.equal(sun.flare, true);
    assert.ok((sun.flareWait ?? 0) > 0);

    const wave = createGame(22);
    jumpTo(wave, "cited:ember-wave");
    assert.equal(wave.phase, "event");
    assert.ok(wave.event?.body.includes("ember-wave"));
    assert.equal(wave.log.includes("ember-wave"), false);
    choose(wave, "ship-resume");
    assert.equal(wave.phase, "combat");
    assert.equal(wave.pulsar, true);
    assert.ok((wave.pulsarWait ?? 0) > 0);

    const battery = createGame(23);
    jumpTo(battery, "cited:ember-battery");
    assert.equal(battery.phase, "event");
    assert.ok(battery.event?.body.includes("ember-battery"));
    assert.equal(battery.log.includes("ember-battery"), false);
    choose(battery, "ship-resume");
    assert.equal(battery.phase, "combat");
    assert.equal(battery.asb, true);
    assert.equal(battery.asbAim, "all");
    assert.ok(battery.asbWait > 0);

    const cover = createGame(24);
    jumpTo(cover, "cited:ember-cover");
    assert.equal(cover.phase, "event");
    assert.ok(cover.event?.body.includes("ember-cover"));
    assert.equal(cover.log.includes("ember-cover"), false);
    choose(cover, "ship-resume");
    assert.equal(cover.phase, "combat");
    assert.equal(cover.asb, true);
    assert.equal(cover.asbAim, "enemy");

    const storm = createGame(25);
    jumpTo(storm, "cited:ember-storm");
    assert.equal(storm.phase, "event");
    assert.equal(storm.player.storm, true);
    assert.equal(storm.eventStorm, true);
    assert.equal(storm.enemy, null);

    const nebula = createGame(26);
    jumpTo(nebula, "cited:ember-nebula");
    assert.equal(nebula.eventNebula, true);
    nebula.phase = "map";
    nebula.paused = false;
    const fleet = nebula.fleet;
    waitHere(nebula);
    assert.equal(nebula.fleet - fleet, citedFleetAdvance(nebula, { kind: "nebula" }));

    const choice = createGame(27);
    choose(choice, "ember-choice-sun");
    assert.equal(choice.phase, "combat");
    assert.equal(choice.flare, true);
    assert.equal(choice.enemy?.name, "Ember Hull");
  });
});
