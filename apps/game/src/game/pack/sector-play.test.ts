import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  civilianSectorTitle,
  loadPack,
  packFromFtl,
  resetPackForTests,
  sectorDef,
} from "@stl/pack";
import type { SectorDef } from "@stl/pack";
import { sectorTag } from "../sector-ids.ts";
import { buildRoute, choose, chooseSector, createGame } from "../sim.ts";
import "./base.ts";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="sectorname_CIVILIAN_SECTOR">Civilian Sector</text>
  <event name="START_BEACON">
    <text>Welcome to a new sector!</text>
    <item_modify>
      <item type="scrap" min="7" max="7"/>
    </item_modify>
  </event>
  <event name="START_FIGHT">
    <text>A patrol.</text>
    <ship load="pirate" hostile="true"/>
  </event>
</FTL>`;

afterEach(() => resetPackForTests());

function install(startEvent?: string, finalEvent?: string, title = true): void {
  const pack = packFromFtl([{ path: "data/text_sectorname.xml", xml: XML }]);
  const start = sectorDef("STANDARD_SPACE");
  const engi = sectorDef("ENGI_SECTOR");
  const last = sectorDef("FINAL");
  assert.ok(start && engi && last);
  const sectors: SectorDef[] = [
    startEvent ? { ...start, startEvent } : start,
    { ...engi, short: "Engi Controlled" },
  ];
  if (finalEvent) sectors.push({ ...last, startEvent: finalEvent });
  loadPack(
    {
      ...(title ? { civilianSectorTitle: pack.civilianSectorTitle } : {}),
      events: pack.events,
      sectors,
    },
    "append",
  );
}

describe("sector short names and start events", () => {
  it("shows the civilian title on column 0 and the short label on a chart tag", () => {
    install("START_BEACON");
    assert.equal(sectorDef("STANDARD_SPACE")?.name, "Civilian (Starting) Sector");
    const g = createGame(2);
    assert.equal(g.sectorName, "Civilian Sector");
    assert.equal(g.route[0]?.name, "Civilian Sector");
    assert.equal(g.route[0]?.sector, "STANDARD_SPACE");
    assert.equal(g.tutorial, true);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, "Welcome to a new sector!\n\nScrap: 7.");
    assert.equal(g.log.includes("Welcome to a new sector!"), false);
    assert.equal(g.log.includes("Scrap: 7."), false);
    assert.equal(g.scrap, 17);
    assert.equal(g.beacons.find((beacon) => beacon.kind === "start")?.resolved, true);

    let tagged = false;
    for (let seed = 1; seed <= 400 && !tagged; seed++) {
      const node = buildRoute(seed).find((item) => item.sector === "ENGI_SECTOR");
      if (!node) continue;
      assert.equal(node.name, "Engi Controlled Sector");
      assert.equal(node.short, "Engi Controlled");
      assert.equal(sectorTag(node), "Engi Controlled");
      tagged = true;
    }
    assert.equal(tagged, true);

    choose(g, "ack");
    assert.equal(g.phase, "map");
    assert.equal(g.event, null);
    const here = g.route.find((node) => node.id === g.routeHere);
    assert.ok(here);
    const dest = g.route.find((node) => node.id === here.links[0]);
    assert.ok(dest);
    g.sectorMap = true;
    chooseSector(g, dest.id);
    assert.equal(g.phase, "map");
    assert.equal(g.event, null);
    assert.equal(g.sectorName, dest.name);
  });

  it("keeps the stored starting title when the civilian string is absent", () => {
    assert.equal(civilianSectorTitle(), undefined);
    const g = createGame(6);
    const stored = sectorDef("STANDARD_SPACE")?.name;
    assert.equal(g.sectorName, stored);
    assert.equal(g.route[0]?.name, stored);
    assert.equal(g.phase, "map");
  });

  it("leaves the resolved start when the start event id is missing", () => {
    install("NO_SUCH");
    const g = createGame(5);
    assert.equal(g.phase, "map");
    assert.equal(g.event, null);
    assert.equal(g.sectorName, "Civilian Sector");
    assert.equal(g.beacons.find((beacon) => beacon.kind === "start")?.resolved, true);
  });

  it("stays in the fight a start event begins", () => {
    install("START_FIGHT");
    const g = createGame(4);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, "A patrol.");
    assert.equal(g.log.includes("A patrol."), false);
    assert.ok(g.enemy);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.ok(g.enemy);
    assert.equal(g.event, null);
    assert.equal(g.tutorial, true);
  });

  it("repairs the Last Stand before its start event", () => {
    install("START_BEACON", "START_BEACON");
    const g = createGame(3);
    choose(g, "ack");
    g.player.hull = Math.max(1, g.player.hullMax - 10);
    g.sector = 7;
    g.sectorMap = true;
    const here = g.route.find((node) => node.id === g.routeHere);
    const last = g.route.find((node) => node.sector === "FINAL");
    assert.ok(here && last);
    if (!here.links.includes(last.id)) here.links.push(last.id);
    const hull = g.player.hull;
    const fuel = g.fuel;
    chooseSector(g, last.id);
    assert.equal(g.sector, 8);
    assert.equal(g.sectorId, "FINAL");
    assert.equal(g.fuel, fuel + 10);
    assert.equal(g.player.hull, Math.min(g.player.hullMax, hull + 10));
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, "Welcome to a new sector!\n\nScrap: 7.");
    assert.equal(g.log.includes("Welcome to a new sector!"), false);
    assert.equal(g.log.includes("Scrap: 7."), false);
    assert.ok(g.beacons.some((beacon) => beacon.flag === "BOSS_REPAIR_STATION"));
  });
});
