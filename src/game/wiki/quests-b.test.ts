import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { choiceDisabled, choose, commitJump, createGame, step } from "../sim.ts";
import type { Beacon, Game, Kit, KitId } from "../types.ts";
import { EXTRA_EVENTS } from "./cited-events-quests-b.ts";
import { citedEvent } from "./cited-events.ts";
import { classifyEvent } from "./beacon-mix.ts";
import { QUEST_ADDED } from "./quests.ts";
import { PART_B } from "./quests-b.ts";

function here(g: Game): Beacon {
  return g.beacons.find((b) => b.id === g.here)!;
}

function atCited(g: Game, sector: string, dest: string): Game {
  const ev = EXTRA_EVENTS.find((e) => e.dest === dest)!;
  g.sectorName = sector;
  const b = g.beacons.find((x) => x.col === 1)!;
  b.flag = ev.flag;
  b.kind = "event";
  b.name = dest;
  g.here = b.id;
  b.visited = true;
  g.event = citedEvent(g, b);
  assert.ok(g.event, dest);
  g.phase = "event";
  return g;
}

function questBeacons(g: Game, id: string): Beacon[] {
  return g.beacons.filter((b) => b.quest === id);
}

function jumpTo(g: Game, b: Beacon) {
  const from = here(g);
  if (!from.links.includes(b.id)) from.links.push(b.id);
  g.fuel = Math.max(g.fuel, 3);
  g.fleet = 0;
  g.phase = "map";
  g.event = null;
  commitJump(g, b.id);
}

/** Jump to the only marker of `id` and return its arrival card body. */
function arrive(g: Game, id: string, fight = false): string {
  const [b] = questBeacons(g, id);
  assert.ok(b, `marker ${id}`);
  jumpTo(g, b);
  if (fight && g.phase === "combat") return "";
  assert.equal(g.phase, "event", id);
  return g.event!.body;
}

function winByHull(g: Game) {
  g.enemy!.hull = 0;
  for (let i = 0; i < 3 && g.phase === "combat"; i++) step(g, 1 / 30);
}

function winByCrew(g: Game) {
  for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
  for (let i = 0; i < 3 && g.phase === "combat"; i++) step(g, 1 / 30);
}

function ids(g: Game): string[] {
  return g.event!.choices.map((c) => c.id);
}

function kit(id: KitId, target: string | null = null): Kit {
  return { id, level: 1, power: 0, left: 0, cool: 0, target, on: false, aux: 0 };
}

/** Runs `body` for seeds 1.. until every label in `want` was returned once. */
function reach(want: string[], body: (seed: number) => string, max = 300) {
  const seen = new Set<string>();
  for (let seed = 1; seed <= max && seen.size < want.length; seed++) {
    const got = body(seed);
    if (want.includes(got)) seen.add(got);
  }
  assert.deepEqual([...seen].sort(), [...want].sort());
}

function slugOf(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

describe("quests-b: opening cards (cited-events-quests-b.ts)", () => {
  it("each page's sectors are its {{Locations}} line, and ids follow the table format", () => {
    const want = new Set(EXTRA_EVENTS.map((e) => e.dest));
    const pages = new Map<string, string>();
    for (const line of readFileSync("/Users/slava/code/ftl.fandom.com-dump/pages.jsonl", "utf8").split("\n")) {
      if (!line) continue;
      const row = JSON.parse(line) as { title?: string; text?: string; ns?: number };
      if (row.ns === 0 && row.title && want.has(row.title)) pages.set(row.title, row.text ?? "");
    }
    assert.equal(pages.size, 6);
    for (const ev of EXTRA_EVENTS) {
      const m = pages.get(ev.dest)!.match(/\{\{Locations\|([^}]+)\}\}/)!;
      const names = m[1].split("|").map((s) => s.trim()).filter((s) => s && !s.includes("="));
      assert.deepEqual(ev.sectors, names, ev.dest);
      assert.equal(ev.slug, slugOf(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      ev.choices.forEach((c, i) => assert.equal(c.id, `c:${ev.slug}:${i}`));
      // Every choice that is not a plain "Nothing happens." runs in quests-b.ts.
      for (const c of ev.choices) if (c.fx[0].k !== "nothing") assert.ok(PART_B.choices[c.id], c.id);
    }
  });

  it("classifies as the event lists say (distress / neutral)", () => {
    const cls = Object.fromEntries(EXTRA_EVENTS.map((e) => [e.dest, classifyEvent(e)]));
    assert.equal(cls["Asteroid belt distress"], "distress");
    for (const d of ["Capture the ship", "Encrypted federation signal", "Merchant's request", "Engi ship attacked by Mantis ship", "Nebula wreckage"]) {
      assert.equal(cls[d], "neutral", d);
    }
  });
});

describe("Asteroid belt distress", () => {
  it("hail -> shield: one of three results; leaving can double the pursuit", () => {
    reach(["saved", "lost", "rock"], (seed) => {
      const g = atCited(createGame(seed), "Civilian Sector", "Asteroid belt distress");
      choose(g, "c:asteroid-belt-distress:0");
      assert.deepEqual(ids(g), ["q:asteroid:shield", "q:asteroid:leave"]);
      const hull = g.player.hull;
      const fuel = g.fuel;
      choose(g, "q:asteroid:shield");
      const body = g.event!.body;
      if (body.startsWith("You succeed")) {
        assert.equal(g.player.hull, hull - 1);
        assert.ok(g.fuel >= fuel + 3 && g.fuel <= fuel + 6);
        assert.ok(g.player.rooms.some((r) => r.fire > 0));
        return "saved";
      }
      if (body.startsWith("Despite")) {
        assert.equal(g.player.hull, hull - 4);
        return "lost";
      }
      assert.ok(body.startsWith("You try your best"));
      return "rock";
    });
    reach(["double", "none"], (seed) => {
      const g = atCited(createGame(seed), "Civilian Sector", "Asteroid belt distress");
      choose(g, "c:asteroid-belt-distress:0");
      choose(g, "q:asteroid:leave");
      return g.pursuitDouble ? "double" : "none";
    });
  });

  it("blue options: Defense Drone (1 part) can add the Hidden Federation Base; Teleporter can bring a survivor home", () => {
    reach(["damage", "marker"], (seed) => {
      const g = atCited(createGame(seed), "Civilian Sector", "Asteroid belt distress");
      g.player.kits.swarm = kit("swarm", "ward");
      g.player.parts = 2;
      choose(g, "c:asteroid-belt-distress:0");
      assert.ok(ids(g).includes("q:asteroid:defense"));
      assert.ok(!ids(g).includes("q:asteroid:repair"));
      choose(g, "q:asteroid:defense");
      assert.equal(g.player.parts, 1);
      if (questBeacons(g, "fed-base").length) return "marker";
      assert.ok(g.event!.body.startsWith("Your drone succeeds"));
      return "damage";
    });
    const g = atCited(createGame(3), "Civilian Sector", "Asteroid belt distress");
    g.player.kits.swarm = kit("swarm", "ward");
    g.player.parts = 0;
    choose(g, "c:asteroid-belt-distress:0");
    assert.equal(choiceDisabled(g, "q:asteroid:defense"), "Need 1 drone parts");
    reach(["crew", "high", "medium", "repair"], (seed) => {
      const g2 = atCited(createGame(seed), "Civilian Sector", "Asteroid belt distress");
      g2.player.kits.sling = kit("sling");
      choose(g2, "c:asteroid-belt-distress:0");
      const crew = g2.crew.length;
      choose(g2, "q:asteroid:teleport");
      if (g2.crew.length > crew) return "crew";
      assert.deepEqual(ids(g2), ["q:asteroid:home"]);
      choose(g2, "q:asteroid:home");
      const body = g2.event!.body;
      return body.includes("substantial reward") ? "high" : body.includes("modest means") ? "medium" : "repair";
    });
  });
});

describe("Capture the ship", () => {
  it("blue options are disabled without their gear; Teleporter -> agree adds the marker", () => {
    const g = atCited(createGame(4), "Civilian Sector", "Capture the ship");
    assert.equal(choiceDisabled(g, "c:capture-the-ship:2"), "Needs a Teleporter");
    assert.equal(choiceDisabled(g, "c:capture-the-ship:3"), "Needs a Fire Bomb");
    assert.equal(choiceDisabled(g, "c:capture-the-ship:4"), "Needs an Anti-Bio Beam");
    choose(g, "c:capture-the-ship:2");
    assert.equal(g.phase, "event");
    assert.equal(g.event!.body, citedEvent(g, here(g))!.body);
    g.player.kits.sling = kit("sling");
    choose(g, "c:capture-the-ship:2");
    assert.deepEqual(ids(g), ["q:capture:agree", "q:capture:decline"]);
    choose(g, "q:capture:agree");
    assert.ok(g.event!.body.includes(QUEST_ADDED));
    choose(g, "ack");
    assert.ok(arrive(g, "capture-ship").includes("WITHOUT destroying the ship"));
    // Capture the ship, Quest Marker: "Fight a Pirate ship."
    assert.equal(g.event!.choices.find((c) => c.id === "q:capture:fight")?.label, "Fight a Pirate ship.");
    choose(g, "q:capture:fight");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "quest-capture-ship");
    assert.equal(g.enemy!.pirate, true);
    assert.equal(g.enemySurrender!.chance, 0);
    assert.equal(g.enemyEscape!.mode, "never");
  });

  it("killing the crew pays high scrap; destroying the ship deals 15 hull damage", () => {
    const setup = () => {
      const g = atCited(createGame(6), "Civilian Sector", "Capture the ship");
      g.player.kits.sling = kit("sling");
      choose(g, "c:capture-the-ship:2");
      choose(g, "q:capture:agree");
      choose(g, "ack");
      arrive(g, "capture-ship");
      choose(g, "q:capture:fight");
      return g;
    };
    const a = setup();
    const scrap = a.scrap;
    winByCrew(a);
    assert.equal(a.phase, "event");
    assert.ok(a.event!.body.startsWith("You secure the ship"));
    assert.ok(a.scrap > scrap);
    const b = setup();
    b.player.hull = b.player.hullMax;
    winByHull(b);
    assert.deepEqual(ids(b), ["q:capture:blast"]);
    choose(b, "q:capture:blast");
    assert.equal(b.player.hull, b.player.hullMax - 15);
    assert.ok(b.player.rooms.some((r) => r.breach > 0));
    const c = setup();
    c.player.hull = 10;
    winByHull(c);
    choose(c, "q:capture:blast");
    assert.equal(c.phase, "defeat");
  });
});

describe("Encrypted federation signal", () => {
  it("the away party reaches all five results; the assist marker opens the Auto-ship fight", () => {
    reach(["base", "assist", "cache", "trap", "empty"], (seed) => {
      const g = atCited(createGame(seed), "Civilian Sector", "Encrypted federation signal");
      choose(g, "c:encrypted-federation-signal:0");
      if (g.phase === "combat") {
        assert.equal(g.fightEvent, "encrypted-federation-signal");
        assert.equal(g.enemy!.faction, "rebel");
        const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player").length;
        assert.ok(boarders >= 2 && boarders <= 3);
        return "trap";
      }
      const body = g.event!.body;
      if (questBeacons(g, "fed-base").length) {
        choose(g, "ack");
        arrive(g, "fed-base");
        return "base";
      }
      if (questBeacons(g, "fed-assist").length) {
        choose(g, "ack");
        const body = arrive(g, "fed-assist");
        const id = g.event!.choices[0]!.id;
        if (body.includes("bombarded by an automated drone")) {
          assert.equal(id, "q:fed-base:assist");
          choose(g, id);
          assert.equal(g.fightEvent, "quest-fed-assist");
          assert.equal(g.asb, false);
        } else if (body.includes("using their Anti-Ship Battery")) {
          assert.equal(id, "q:fed-base:assist-asb");
          choose(g, id);
          assert.equal(g.fightEvent, "quest-fed-assist-asb");
          assert.equal(g.asb, true);
        } else {
          assert.ok(body.includes("taking down the wing leader"));
          assert.equal(id, "q:fed-base:assist-wing");
          choose(g, id);
          assert.equal(g.fightEvent, "quest-fed-assist-wing");
          assert.equal(g.asb, true);
        }
        assert.equal(g.phase, "combat");
        return "assist";
      }
      if (body.startsWith("You find a small cache")) return "cache";
      assert.ok(body.includes("bloodstains"));
      return "empty";
    });
  });
});

describe("Engi ship attacked by Mantis ship", () => {
  it("a Mantis ship (page win, then contact) or a Mantis-crewed Engi ship with boarders", () => {
    reach(["mantis", "engi"], (seed) => {
      const g = atCited(createGame(seed), "Engi Controlled Sector", "Engi ship attacked by Mantis ship");
      choose(g, "c:engi-ship-attacked-by-mantis-ship:0");
      assert.equal(g.phase, "combat");
      assert.equal(g.enemySurrender!.chance, 0);
      assert.equal(g.enemyEscape!.mode, "never");
      if (g.enemy!.faction === "engi") {
        assert.ok(g.crew.filter((c) => c.side === "enemy").every((c) => c.kin === "blade"));
        assert.ok(g.crew.some((c) => c.side === "enemy" && c.aboard === "player"));
        return "engi";
      }
      assert.equal(g.enemy!.faction, "mantis");
      winByHull(g);
      assert.ok(g.event!.body.startsWith("The Mantis ship breaks apart."));
      assert.deepEqual(ids(g), ["q:engi-station:contact"]);
      return "mantis";
    });
  });

  it("contacting the Engi reaches all four results; Protocol 52.34 adds the Hidden Federation Base", () => {
    reach(["crew", "fuel", "empty", "request"], (seed) => {
      const g = atCited(createGame(seed), "Engi Controlled Sector", "Engi ship attacked by Mantis ship");
      choose(g, "q:engi-station:contact");
      const body = g.event!.body;
      if (body.includes("Request suitable reward")) {
        assert.deepEqual(ids(g).slice(0, 3), ["q:engi-station:fuel", "q:engi-station:weapon", "q:engi-station:drone"]);
        return "request";
      }
      return body.includes("welcome him aboard") ? "crew" : body.includes("some fuel") ? "fuel" : "empty";
    });
    const g = atCited(createGame(2), "Engi Controlled Sector", "Engi ship attacked by Mantis ship");
    g.player.hull = 5;
    choose(g, "q:engi-station:protocol");
    assert.equal(g.player.hull, 15);
    assert.equal(questBeacons(g, "fed-base").length, 1);
  });
});

describe("Merchant's request", () => {
  it("delivery: 5 drone parts and a marker; the station pays for them (or is the research station)", () => {
    reach(["paltry", "station"], (seed) => {
      const g = atCited(createGame(seed), "Civilian Sector", "Merchant's request");
      choose(g, "c:merchant-s-request:0");
      if (ids(g)[0] !== "q:merchant:deliver") return "other";
      const parts = g.player.parts;
      choose(g, "q:merchant:deliver");
      assert.equal(g.player.parts, parts + 5);
      choose(g, "ack");
      const body = arrive(g, "merchant-delivery");
      if (body.includes("no response to your hails")) {
        assert.deepEqual(ids(g), ["q:research:dock", "q:research:leave"]);
        choose(g, "q:research:dock");
        assert.equal(g.phase, "event");
        return "station";
      }
      const scrap = g.scrap;
      g.player.parts = 4;
      assert.equal(choiceDisabled(g, "q:merchant:paltry"), "Need 5 drone parts");
      g.player.parts = 5;
      choose(g, "q:merchant:paltry");
      assert.equal(g.player.parts, 0);
      assert.ok(g.scrap - scrap >= 20);
      return "paltry";
    });
  });

  it("investigation: remains / survivors / pirate; the cargo can lead to the delivery station", () => {
    reach(["remains", "crew", "pirate"], (seed) => {
      const g = atCited(createGame(seed), "Civilian Sector", "Merchant's request");
      choose(g, "c:merchant-s-request:0");
      if (ids(g)[0] !== "q:merchant:investigate") return "other";
      choose(g, "q:merchant:investigate");
      choose(g, "ack");
      arrive(g, "merchant-investigation");
      if (ids(g)[0] === "q:merchant:pirate") {
        // Merchant's request, Merchant's Investigation: "Fight a Pirate ship."
        assert.equal(g.event!.choices.find((c) => c.id === "q:merchant:pirate")?.label, "Fight a Pirate ship.");
        choose(g, "q:merchant:pirate");
        assert.equal(g.phase, "combat");
        assert.equal(g.enemySurrender!.chance, 0);
        assert.equal(g.fightEvent, "quest-merchant-pirate");
        winByHull(g);
        assert.ok(g.event!.body.startsWith("You contact the delivery ship"));
        return "pirate";
      }
      if (ids(g)[0] === "q:merchant:cargo-deliver") {
        choose(g, "q:merchant:cargo-deliver");
        choose(g, "ack");
        // Near the sector's end the marker is pushed to the next sector ("Added a quest marker to the next sector!").
        if (!questBeacons(g, "merchant-station").length) {
          assert.deepEqual(g.questsNext, ["merchant-station"]);
          return "remains";
        }
        const scrap = g.scrap;
        assert.ok(arrive(g, "merchant-station").includes("days late"));
        assert.ok(g.scrap > scrap);
        return "remains";
      }
      const crew = g.crew.length;
      choose(g, "q:merchant:promise");
      assert.ok(g.crew.length === crew + 1 || g.event!.body.includes("no room aboard"));
      assert.ok(questBeacons(g, "merchant-station").length === 1 || g.questsNext?.includes("merchant-station"));
      return "crew";
    });
  });
});

describe("Nebula wreckage", () => {
  it("Slug option needs a Slug; investigating reaches nothing / damage / survivor", () => {
    const g = atCited(createGame(1), "Uncharted Nebula", "Nebula wreckage");
    assert.equal(choiceDisabled(g, "c:nebula-wreckage:0"), "Needs a Slug crewmember");
    reach(["nothing", "pummeled", "survivor"], (seed) => {
      const g2 = atCited(createGame(seed), "Uncharted Nebula", "Nebula wreckage");
      const hull = g2.player.hull;
      choose(g2, "c:nebula-wreckage:1");
      if (ids(g2)[0] === "q:nebula:assist") return "survivor";
      if (g2.player.hull === hull - 5) return "pummeled";
      assert.equal(g2.player.hull, hull);
      return "nothing";
    });
  });

  it("the dying survivor gives the coordinates; the Zoltan ship thanks ABADOTH and fights any other answer", () => {
    const setup = (seed: number) => {
      const g = atCited(createGame(seed), "Uncharted Nebula", "Nebula wreckage");
      g.crew.find((c) => c.side === "player")!.kin = "gel";
      choose(g, "c:nebula-wreckage:0");
      choose(g, "q:nebula:assist");
      choose(g, "q:nebula:comfort");
      assert.ok(g.event!.body.includes("ABADOTH"));
      choose(g, "ack");
      assert.ok(arrive(g, "abadoth").includes("dead crewman"));
      assert.deepEqual(ids(g), ["q:abadoth:slug", "q:abadoth:scan"]);
      return g;
    };
    const a = setup(3);
    choose(a, "q:abadoth:scan");
    assert.equal(a.pursuitDouble, true);
    assert.ok(ids(a).includes("q:abadoth:abadoth"));
    const scrap = a.scrap;
    choose(a, "q:abadoth:abadoth");
    assert.ok(a.scrap > scrap);
    const b = setup(4);
    choose(b, "q:abadoth:slug");
    choose(b, "q:abadoth:anodyne");
    assert.equal(b.phase, "combat");
    assert.equal(b.enemy!.faction, "zoltan");
  });
});
