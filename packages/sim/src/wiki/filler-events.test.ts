import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { allEvents, allSectors, eventDef, fillerList } from "@stl/pack";
import { choiceDisabled, choose, commitJump, step } from "../sim.ts";
import { continueLabel } from "../interface-copy.ts";
import type { Game } from "../types.ts";
import "../pack/base.ts";
import { stampCitedEvents } from "./cited-events.ts";
import {
  FILLER_CHOICES,
  FILLER_FLAG,
  emptyPageFor,
  fillerEvent,
  pageForRow,
} from "./filler-events.ts";
import { placeIn } from "../fixtures.ts";
import { startedGame } from "../test-start.ts";

function storedCopy(): string {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const roots = [join(here, ".."), join(here, "../../../../apps/game/src")];
  const parts: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts"))
        parts.push(readFileSync(full, "utf8"));
    }
  };
  for (const root of roots) walk(root);
  return parts.join("\n");
}

function listDests(id: string): string[] {
  return (fillerList(id)?.entries ?? [])
    .map((entry) => eventDef(entry.id)?.dest)
    .filter((dest): dest is string => !!dest);
}

/** A fresh map dealt as `name`, as nextSector does (makeMap leaves no flags from an earlier deal). */
function dealt(seed: number, name: string): Game {
  const g = startedGame(seed);
  for (const b of g.beacons) {
    if (b.kind === "start" || b.kind === "exit" || b.kind === "boss") continue;
    b.flag = "";
    b.kind = "event";
  }
  g.beacons = [...g.beacons];
  g.sector = 4;
  placeIn(g, name);
  stampCitedEvents(g);
  return g;
}

const INVENTED = [
  "Deserter buoy",
  "Split wreck",
  "Mayday",
  "Dust well",
  "Fuel cache",
  "Rock field",
  "Deep cache",
];

describe("filler events (Sectors, Fallback events; EventList templates)", () => {
  it("every filler opening choice has a handler", () => {
    const dests = [
      "Asteroid field: explore",
      "Wreckage: search",
      "Station with life signs",
      "Optional fight: hidden Rebel ship",
      "Refugee ship",
      "Unknown life forms on a planet",
      "Empty station",
      "Planet scan request",
      "Empty beacon in nebula",
      "Lost ship in nebula",
      "Wrecks in plasma storm",
      "Fuel request",
      "Refugee ship distress",
      "Refugee ship, no comms",
      "Trade: scrap for upgrades",
      "Trade: scrap for fuel",
      "Trade: missiles for rewards",
      "Trade: supplies for reactor",
      "Distress: station infestation",
      "Distress: ship stuck in asteroids",
      "Distress: colony riot",
      "Distress: station fire",
      "Distress: life form on moon",
      "Hostile pirate ship (distress)",
      "Distress: defense satellites",
      "Crew for hire",
    ];
    assert.equal(dests.length, 26);
    for (const dest of dests) {
      const ev = allEvents().find((event) => event.dest === dest && event.choices.length > 0);
      assert.ok(ev, dest);
      for (const choice of ev.choices) {
        const rolled = choice.id === "c:friendly-ship-out-of-fuel:0";
        assert.ok(rolled || FILLER_CHOICES[choice.id], choice.id);
      }
    }
  });

  it("empty beacon pages: every sector type has one", () => {
    for (const sector of allSectors()) assert.ok(emptyPageFor(sector.id), sector.id);
  });

  it("deals no plain distress, items or nebula beacon, and no unique page twice", () => {
    const uniques = new Set(
      ["FILLER", "NEBULA", "DISTRESS", "ITEMS"].flatMap((id) =>
        (fillerList(id)?.entries ?? [])
          .filter((row) => row.unique)
          .map((row) => eventDef(row.id)?.dest)
          .filter((dest): dest is string => !!dest),
      ),
    );
    for (const sector of allSectors()) {
      const name = sector.id;
      for (let seed = 1; seed <= 40; seed++) {
        const g = dealt(seed, name);
        for (const b of g.beacons) {
          if (b.kind === "distress" || b.kind === "cache" || b.kind === "nebula")
            assert.ok(b.flag, `${name} ${seed} ${b.kind}`);
          if (b.flag.startsWith(FILLER_FLAG))
            assert.ok(b.flag.slice(FILLER_FLAG.length).length > 0);
        }
        const names = g.beacons.filter((b) => b.flag && uniques.has(b.name)).map((b) => b.name);
        assert.equal(new Set(names).size, names.length, `${name} ${seed} ${names}`);
      }
    }
  });

  it("every list row a draw can reach has a card", () => {
    const rows = ["FILLER", "NEBULA", "DISTRESS", "ITEMS"].flatMap(
      (id) => fillerList(id)?.entries ?? [],
    );
    const wired = rows.filter((row) => pageForRow(eventDef(row.id)?.dest ?? ""));
    assert.ok(
      (fillerList("FILLER")?.entries ?? []).every((row) =>
        pageForRow(eventDef(row.id)?.dest ?? ""),
      ),
      "every filler row is wired",
    );
    assert.ok(wired.length >= 50, `${wired.length}`);
  });

  it("plain beacons get documented cards whose choices all run (no invented filler)", () => {
    const valid = new Set(["map", "event", "combat", "reward", "defeat", "store"]);
    for (const sector of allSectors()) {
      const name = sector.id;
      for (let seed = 1; seed <= 12; seed++) {
        const g0 = dealt(seed, name);
        for (const b0 of g0.beacons) {
          if (!(
            b0.flag.startsWith(FILLER_FLAG) ||
            b0.kind === "empty" ||
            (b0.kind === "event" && !b0.flag)
          ))
            continue;
          for (let pick = 0; pick < 3; pick++) {
            const g = dealt(seed, name);
            const b = g.beacons.find((x) => x.id === b0.id)!;
            g.here = b.id;
            g.phase = "event";
            g.event = fillerEvent(g, b);
            assert.ok(g.event, `${name} ${b.flag}`);
            assert.ok(!INVENTED.includes(g.event.title), g.event.title);
            for (let depth = 0; depth < 5 && g.phase === "event" && g.event; depth++) {
              const cs = g.event.choices;
              choose(g, cs[Math.min(cs.length - 1, depth === 0 ? pick : 0)].id);
            }
            assert.ok(valid.has(g.phase), `${name} ${b.name} -> ${g.phase}`);
          }
        }
      }
    }
  });

  it("an exit shows FINISH_BEACON, then Continue draws a neutral exit or an item event, then the lane", () => {
    const neutral = new Set(listDests("EXIT_NEUTRAL"));
    const items = new Set(listDests("EXIT_ITEMS"));
    const pages = new Set([...neutral, ...items]);
    const halves = { neutral: 0, items: 0 };
    for (let seed = 1; seed <= 40; seed++) {
      const g = startedGame(seed);
      g.sectorId = "CIVILIAN_SECTOR";
      g.sectorName = "Civilian Sector";
      const exit = g.beacons.find((b) => b.kind === "exit")!;
      const from = g.beacons.find((b) => b.id === g.here)!;
      if (!from.links.includes(exit.id)) from.links.push(exit.id);
      g.fuel = 5;
      commitJump(g, exit.id);
      assert.equal(g.phase, "event");
      assert.equal(g.event?.body, eventDef("FINISH_BEACON")?.body);
      choose(g, "exit-continue");
      assert.ok(exit.flag.startsWith(FILLER_FLAG), `${seed}`);
      assert.ok(pages.has(exit.name), exit.name);
      if (neutral.has(exit.name)) halves.neutral += 1;
      else halves.items += 1;
      if (seed > 3) continue;
      // Play the card out, then the lane card follows on the map.
      for (
        let depth = 0;
        depth < 6 && g.phase === "event" && g.event?.title !== "Exit beacon";
        depth++
      ) {
        const open = g.event!.choices.find((c) => !choiceDisabled(g, c.id)) ?? g.event!.choices[0];
        choose(g, open.id);
      }
      const phase = g.phase as Game["phase"];
      if (phase === "combat") continue;
      if (phase === "store" || phase === "reward") g.phase = "map";
      if ((g.phase as Game["phase"]) === "map") g.event = null;
      step(g, 0.05);
      assert.equal(g.event?.title, "Exit beacon");
      assert.equal(g.event?.body, eventDef("FINISH_BEACON")?.body);
      assert.equal(g.event?.choices.find((c) => c.id === "exit-leave")?.label, "Continue...");
    }
    // An even split between the two halves.
    assert.ok(halves.neutral >= 10 && halves.items >= 10, JSON.stringify(halves));
  });

  it("a nebula sector's exit prints FINISH_BEACON_NEBULA and nothing happens", () => {
    const g = startedGame(14);
    g.sectorId = "NEBULA_SECTOR";
    g.sectorName = "Uncharted Nebula";
    const exit = g.beacons.find((b) => b.kind === "exit")!;
    const from = g.beacons.find((b) => b.id === g.here)!;
    if (!from.links.includes(exit.id)) from.links.push(exit.id);
    g.fuel = 5;
    commitJump(g, exit.id);
    assert.equal(g.event?.body, eventDef("FINISH_BEACON_NEBULA")?.body);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["exit-leave"],
    );
    assert.equal(g.event?.choices[0]?.label, continueLabel());
    assert.equal(exit.flag, "");
  });

  it("an old picket flag starts the Rebel fight and does not print a hail", () => {
    const g = startedGame(3);
    const exit = g.beacons.find((b) => b.kind === "exit")!;
    exit.flag = "picket";
    const from = g.beacons.find((b) => b.id === g.here)!;
    if (!from.links.includes(exit.id)) from.links.push(exit.id);
    g.fuel = 5;
    commitJump(g, exit.id);
    assert.equal(g.phase, "combat");
    assert.equal(g.pending, "exit-clear");
    assert.equal(g.event, null);
  });

  it("the invented exit sentences are not stored", () => {
    const stored = storedCopy();
    for (const t of [
      "The picket is scrap",
      "The exit buoy is green",
      "Take the lane",
      "Lane clear",
      "Lane out",
      "A picket sits on the only",
      "Push through",
      "Departure buoy",
      "The line starts over",
      "You hold. The line advances",
      "The buoy is quiet",
    ]) {
      assert.equal(stored.includes(t), false, t);
    }
  });

  it("the unused invented labels are not stored", () => {
    const stored = storedCopy();
    for (const t of [
      "leaves the hangar",
      "Not fitted:",
      "The Flagship jumps toward the Federation base.",
      "The boarders are dead.",
      "They charged FTL and left.",
      '"Departure"',
      '"Silt"',
      '"Wake"',
    ]) {
      assert.equal(stored.includes(t), false, t);
    }
  });
});
