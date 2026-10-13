import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { skillRank } from "../content.ts";
import { xpNeedFor } from "../extras/lineage.ts";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon, Game, Kit } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose, fillerEvent } from "./filler-events.ts";
import { questChoose } from "./quests.ts";

function beacon(name: string, flag: string): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: true,
    resolved: false,
    name,
    tier: "",
    flag,
    asteroid: false,
  };
}

function kit(id: Kit["id"], level = 1): Kit {
  return { id, level, power: level, left: 0, cool: 0, target: null, on: true, aux: 0 };
}

function swarm(target: string): Kit {
  return { id: "swarm", level: 1, power: 1, left: 0, cool: 0, target, on: true, aux: 0 };
}

function openFiller(g: Game, slug: string, name: string) {
  const b = beacon(name, `filler:${slug}`);
  g.beacons = [b];
  g.here = b.id;
  const ev = fillerEvent(g, b);
  assert.ok(ev);
  g.event = ev;
  g.phase = "event";
  return ev;
}

function openCited(g: Game, slug: string, name: string) {
  const b = beacon(name, `cited:${slug}`);
  g.beacons = [b, ...g.beacons.filter((x) => x.id !== b.id)];
  g.here = b.id;
  const ev = citedEvent(g, b);
  assert.ok(ev);
  g.event = ev;
  g.phase = "event";
  return ev;
}

function scrapOf(body: string): number {
  const m = body.match(/Scrap: (-?\d+)/);
  return m ? Number(m[1]) : 0;
}

describe("Skipped blue options", () => {
  it("nebula lost ship beams a crewmember for medium scrap, or tracks them with scanners", () => {
    const plain = createGame(1);
    const ev = openFiller(plain, "nebula-lost-ship", "Nebula lost ship");
    assert.deepEqual(ev.choices.map((c) => c.id), [
      "c:nebula-lost-ship:0",
      "c:nebula-lost-ship:1",
      "c:nebula-lost-ship:2",
      "c:nebula-lost-ship:3",
    ]);
    assert.equal(choiceDisabled(plain, "c:nebula-lost-ship:2"), "Needs a Teleporter");
    assert.equal(choiceDisabled(plain, "c:nebula-lost-ship:3"), "Needs Long-Ranged Scanners");

    const beam = createGame(2);
    beam.player.kits.sling = kit("sling");
    const crew = beam.crew.filter((c) => c.side === "player").length;
    const scrap = beam.scrap;
    openFiller(beam, "nebula-lost-ship", "Nebula lost ship");
    choose(beam, "c:nebula-lost-ship:2");
    assert.match(beam.event?.body ?? "", /beam the Federation crew aboard/);
    assert.equal(beam.crew.filter((c) => c.side === "player").length, crew + 1);
    const gained = beam.scrap - scrap;
    assert.ok(gained >= 12 && gained <= 19, String(gained));

    const seen = new Set<string>();
    for (let seed = 1; seed < 40 && seen.size < 2; seed++) {
      const g = createGame(seed);
      g.augments = ["glass"];
      const before = g.scrap;
      const n = g.crew.filter((c) => c.side === "player").length;
      choose(g, "c:nebula-lost-ship:3");
      if ((g.event?.body ?? "").includes("faint signatures")) {
        seen.add("crew");
        assert.equal(g.scrap, before);
        assert.equal(g.crew.filter((c) => c.side === "player").length, n + 1);
      } else if ((g.event?.body ?? "").includes("empty hull")) {
        seen.add("scrap");
        const got = g.scrap - before;
        assert.ok(got >= 12 && got <= 19, String(got));
        assert.equal(g.crew.filter((c) => c.side === "player").length, n);
      }
    }
    assert.deepEqual([...seen].sort(), ["crew", "scrap"]);
  });

  it("plasma piloting level 2 rolls the four printed results, and the weapon pays low scrap", () => {
    const plain = createGame(1);
    openFiller(plain, "plasma-storm-incapacitated-ships", "Plasma storm incapacitated ships");
    assert.ok(plain.event?.choices.some((c) => c.id === "c:plasma-storm-incapacitated-ships:2"));
    assert.equal(choiceDisabled(plain, "c:plasma-storm-incapacitated-ships:2"), "Needs level 2 Piloting");

    const seen = new Set<string>();
    for (let seed = 1; seed < 200 && seen.size < 4; seed++) {
      const g = createGame(seed);
      g.player.systems.pilot!.level = 2;
      const scrap = g.scrap;
      const crew = g.crew.filter((c) => c.side === "player").length;
      const guns = g.player.weapons.length;
      choose(g, "c:plasma-storm-incapacitated-ships:2");
      const body = g.event?.body ?? "";
      if (body.includes("unconscious passenger")) {
        seen.add("passenger");
        assert.equal(g.crew.filter((c) => c.side === "player").length, crew + 1);
        assert.ok(g.scrap > scrap);
      } else if (body.includes("salvageable drone schematic")) {
        seen.add("schematic");
        const got = scrapOf(body);
        assert.ok(got >= 12 && got <= 19, String(got));
      } else if (body.includes("intact weapon")) {
        seen.add("weapon");
        const got = scrapOf(body);
        assert.ok(got >= 7 && got <= 10, String(got));
        assert.equal(g.player.weapons.length, guns + 1);
      } else if (body.includes("carefully explores the wrecks")) {
        seen.add("nothing");
        assert.equal(g.scrap, scrap);
        assert.match(body, /Nothing happens/);
      }
    }
    assert.deepEqual([...seen].sort(), ["nothing", "passenger", "schematic", "weapon"]);
  });

  it("an Engi hull repair drone spends one drone part for 4-6 fuel", () => {
    const bare = createGame(1);
    openCited(bare, "no-fuel-engi-ship-repair", "No fuel: Engi ship repair");
    assert.ok(bare.event?.choices.some((c) => c.id === "c:no-fuel-engi-ship-repair:2"));
    assert.equal(choiceDisabled(bare, "c:no-fuel-engi-ship-repair:2"), "Needs a Hull Repair Drone");

    const dry = createGame(2);
    dry.player.kits.swarm = swarm("hull");
    dry.player.parts = 0;
    openCited(dry, "no-fuel-engi-ship-repair", "No fuel: Engi ship repair");
    assert.equal(choiceDisabled(dry, "c:no-fuel-engi-ship-repair:2"), "Need 1 drone part");
    const fuel = dry.fuel;
    choose(dry, "c:no-fuel-engi-ship-repair:2");
    assert.equal(dry.fuel, fuel);
    assert.equal(dry.player.parts, 0);

    const g = createGame(3);
    g.player.kits.swarm = swarm("hull");
    g.player.parts = 1;
    const before = g.fuel;
    openCited(g, "no-fuel-engi-ship-repair", "No fuel: Engi ship repair");
    choose(g, "c:no-fuel-engi-ship-repair:2");
    assert.match(g.event?.body ?? "", /happily accept your offer for help/);
    assert.equal(g.player.parts, 0);
    const got = g.fuel - before;
    assert.ok(got >= 4 && got <= 6, String(got));
    assert.match(g.event?.body ?? "", /Drone parts: -1/);
  });

  it("the abandoned clone bay can calm a crewmember or send one boarder", () => {
    const g = createGame(1);
    assert.equal(choiceDisabled(g, "s:abandoned-station:dna"), "Needs a Clone Bay");
    g.player.kits.cradle = kit("cradle");
    assert.equal(choiceDisabled(g, "s:abandoned-station:dna"), null);

    const seen = new Set<string>();
    for (let seed = 1; seed < 80 && seen.size < 3; seed++) {
      const run = createGame(seed);
      run.player.kits.cradle = kit("cradle");
      const crew = run.crew.filter((c) => c.side === "player").length;
      fillerChoose(run, "s:abandoned-station:dna");
      const body = run.event?.body ?? run.log.join("\n");
      if (body.includes("seems to accept")) {
        seen.add("accept");
        assert.equal(run.crew.filter((c) => c.side === "player").length, crew + 1);
      } else if (body.includes("calms down")) {
        seen.add("calm");
        assert.equal(run.crew.filter((c) => c.side === "player").length, crew + 1);
      } else if (run.phase === "combat" && !run.enemy) {
        seen.add("crazed");
        assert.equal(run.crew.filter((c) => c.side === "enemy" && c.aboard === "player").length, 1);
      }
    }
    assert.deepEqual([...seen].sort(), ["accept", "calm", "crazed"]);

    const quest = new Set<string>();
    for (let seed = 1; seed < 80 && quest.size < 2; seed++) {
      const run = createGame(seed);
      questChoose(run, "q:station:dna");
      const body = run.event?.body ?? "";
      if (body.includes("seems to accept")) quest.add("accept");
      if (body.includes("calms down")) quest.add("calm");
    }
    assert.deepEqual([...quest].sort(), ["accept", "calm"]);
  });

  it("a Damaged Stasis Pod at the Zoltan research facility yields Ruwen", () => {
    const g = createGame(4);
    openCited(g, "zoltan-research-facility", "Zoltan research facility");
    assert.ok(g.event?.choices.some((c) => c.id === "c:zoltan-research-facility:3"));
    assert.equal(choiceDisabled(g, "c:zoltan-research-facility:3"), "Needs a Damaged Stasis Pod");
    g.augments = ["glass", "stasis", "stasis"];
    assert.equal(choiceDisabled(g, "c:zoltan-research-facility:3"), null);
    choose(g, "c:zoltan-research-facility:3");
    assert.deepEqual(g.augments, ["glass", "stasis"]);
    const ruwen = g.crew.find((c) => c.name === "Ruwen");
    assert.ok(ruwen);
    assert.equal(ruwen?.kin, "shard");
    assert.match(g.event?.body ?? "", /cryogenic system/);
    assert.doesNotMatch(g.event?.body ?? "", /lose the augment/i);
  });

  it("a healing bomb keeps one Federation engineer and marks the hidden base", () => {
    const heal = { uid: "heal", defId: "healburst", charge: 0, enabled: false, autofire: false, target: null };
    let plain: Game | undefined;
    let card: Game | undefined;
    for (let seed = 1; seed < 80 && (!plain || !card); seed++) {
      if (!plain) {
        const g = createGame(seed);
        questChoose(g, "q:loyalists:contact");
        if ((g.event?.body ?? "").includes("verge of destruction")) plain = g;
      }
      if (!card) {
        const g = createGame(seed + 100);
        g.player.weapons.push(heal);
        g.missiles = 0;
        questChoose(g, "q:loyalists:contact");
        if ((g.event?.body ?? "").includes("verge of destruction")) card = g;
      }
    }
    assert.ok(plain);
    assert.ok(card);
    assert.equal(plain.event?.choices.some((c) => c.id === "q:loyalists:heal"), false);
    assert.ok(card.event?.choices.some((c) => c.id === "q:loyalists:heal"));
    assert.equal(choiceDisabled(card, "q:loyalists:heal"), "Need 1 missiles");
    card.missiles = 2;
    const before = new Set(card.crew.map((c) => c.id));
    choose(card, "q:loyalists:heal");
    assert.equal(card.missiles, 1);
    assert.match(card.event?.body ?? "", /healing bomb/);
    assert.match(card.event?.body ?? "", /quest marker/);
    const joined = card.crew.filter((c) => c.side === "player" && !before.has(c.id));
    assert.equal(joined.length, 1);
    assert.equal(skillRank(joined[0].skills?.engines ?? 0, xpNeedFor(joined[0], "engines")), 1);
    assert.ok(card.beacons.some((b) => b.quest === "fed-base") || (card.questsNext ?? []).includes("fed-base"));
  });
});
