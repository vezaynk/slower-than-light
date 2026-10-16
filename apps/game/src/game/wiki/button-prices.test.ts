import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { eventDef, loadPack, resetPackForTests } from "@stl/pack";
import type { EventDef } from "@stl/pack";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose, fillerEvent } from "./filler-events.ts";

afterEach(() => resetPackForTests());

function beacon(g: Game): Beacon {
  const found = g.beacons.find((item) => item.kind !== "start" && item.kind !== "exit" && item.kind !== "boss");
  assert.ok(found);
  return found;
}

function park(g: Game, flag: string, name: string): Beacon {
  const here = beacon(g);
  here.flag = flag;
  here.name = name;
  g.here = here.id;
  g.phase = "event";
  return here;
}

function row(id: string): EventDef {
  const found = eventDef(id);
  assert.ok(found);
  return found;
}

describe("named button prices", () => {
  it("packs the campaign bands", () => {
    assert.deepEqual(eventDef("rock-and-slug-standoff")?.prices, [
      { id: "debt", k: "scrap", lo: 10, hi: 15 },
      { id: "upgrade", k: "scrap", lo: 10, hi: 15 },
    ]);
    assert.deepEqual(eventDef("friendly-ship-out-of-fuel")?.prices, [{ id: "give", k: "fuel", lo: 2, hi: 4 }]);
    assert.deepEqual(eventDef("no-fuel-drifting-debris")?.prices, [{ id: "ransom", k: "scrap", lo: 25, hi: 40 }]);
    assert.deepEqual(eventDef("terraforming-scan")?.prices, [{ id: "scan", k: "scrap", lo: 15, hi: 25 }]);
  });

  it("pays a fixed Rock debt and refuses an amount outside the band", () => {
    loadPack({
      events: [{
        ...row("rock-and-slug-standoff"),
        prices: [
          { id: "debt", k: "scrap", lo: 8, hi: 8 },
          { id: "upgrade", k: "scrap", lo: 10, hi: 15 },
        ],
      }],
    }, "append");
    const g = createGame(1);
    park(g, "cited:rock-and-slug-standoff", "Rock and Slug standoff");
    g.event = citedEvent(g, beacon(g));
    choose(g, "c:rock-and-slug-standoff:0");
    assert.equal(g.event?.choices.find((choice) => choice.id.startsWith("s:rock-slug:debt:"))?.id, "s:rock-slug:debt:8");
    g.scrap = 40;
    choose(g, "s:rock-slug:debt:8");
    assert.equal(g.scrap, 32);

    const forged = createGame(2);
    park(forged, "cited:rock-and-slug-standoff", "Rock and Slug standoff");
    forged.event = citedEvent(forged, beacon(forged));
    choose(forged, "c:rock-and-slug-standoff:0");
    forged.scrap = 100;
    const body = forged.event?.body;
    choose(forged, "s:rock-slug:debt:12");
    assert.equal(forged.scrap, 100);
    assert.equal(forged.event?.body, body);
    assert.match(forged.event?.body ?? "", /thick boulder heads/);
  });

  it("omits a missing debt and keeps demand and leave", () => {
    loadPack({
      events: [{
        ...row("rock-and-slug-standoff"),
        prices: [{ id: "upgrade", k: "scrap", lo: 6, hi: 6 }],
      }],
    }, "append");
    const g = createGame(1);
    park(g, "cited:rock-and-slug-standoff", "Rock and Slug standoff");
    g.event = citedEvent(g, beacon(g));
    choose(g, "c:rock-and-slug-standoff:0");
    const ids = g.event?.choices.map((choice) => choice.id) ?? [];
    assert.equal(ids.some((id) => id.startsWith("s:rock-slug:debt:")), false);
    assert.ok(ids.includes("s:rock-slug:demand"));
    assert.ok(ids.includes("s:rock-slug:leave"));
  });

  it("pays a fixed reactor price and refuses an amount outside the band", () => {
    loadPack({
      events: [{
        ...row("rock-and-slug-standoff"),
        prices: [
          { id: "debt", k: "scrap", lo: 8, hi: 8 },
          { id: "upgrade", k: "scrap", lo: 6, hi: 6 },
        ],
      }],
    }, "append");
    let paid = false;
    let refused = false;
    for (let seed = 1; seed <= 40 && (!paid || !refused); seed++) {
      const g = createGame(seed);
      park(g, "cited:rock-and-slug-standoff", "Rock and Slug standoff");
      g.event = citedEvent(g, beacon(g));
      choose(g, "c:rock-and-slug-standoff:0");
      g.scrap = 40;
      choose(g, "s:rock-slug:debt:8");
      if (!/fair' price/.test(g.event?.body ?? "")) continue;
      assert.equal(g.event?.choices.find((choice) => choice.id.startsWith("s:rock-slug:upgrade:"))?.id, "s:rock-slug:upgrade:6");
      if (!paid) {
        const reactor = g.player.reactor;
        g.scrap = 100;
        choose(g, "s:rock-slug:upgrade:6");
        assert.equal(g.scrap, 94);
        assert.equal(g.player.reactor, reactor + 1);
        paid = true;
        continue;
      }
      const reactor = g.player.reactor;
      const body = g.event?.body;
      g.scrap = 100;
      choose(g, "s:rock-slug:upgrade:12");
      assert.equal(g.scrap, 100);
      assert.equal(g.player.reactor, reactor);
      assert.equal(g.event?.body, body);
      refused = true;
    }
    assert.equal(paid && refused, true);
  });

  it("omits a missing reactor price and keeps the decline", () => {
    loadPack({
      events: [{
        ...row("rock-and-slug-standoff"),
        prices: [{ id: "debt", k: "scrap", lo: 8, hi: 8 }],
      }],
    }, "append");
    let seen = false;
    for (let seed = 1; seed <= 40 && !seen; seed++) {
      const g = createGame(seed);
      park(g, "cited:rock-and-slug-standoff", "Rock and Slug standoff");
      g.event = citedEvent(g, beacon(g));
      choose(g, "c:rock-and-slug-standoff:0");
      g.scrap = 40;
      choose(g, "s:rock-slug:debt:8");
      if (!/fair' price/.test(g.event?.body ?? "")) continue;
      seen = true;
      const ids = g.event?.choices.map((choice) => choice.id) ?? [];
      assert.equal(ids.some((id) => id.startsWith("s:rock-slug:upgrade:")), false);
      assert.ok(ids.includes("s:rock-slug:decline"));
    }
    assert.equal(seen, true);
  });

  it("gives a fixed fuel amount and keeps the apology when the price is missing", () => {
    const page = row("friendly-ship-out-of-fuel");
    loadPack({ events: [{ ...page, prices: [{ id: "give", k: "fuel", lo: 3, hi: 3 }] }] }, "append");
    const g = createGame(1);
    const here = park(g, "filler:friendly-ship-out-of-fuel", "Friendly ship out of fuel");
    g.event = fillerEvent(g, here);
    assert.equal(g.event?.choices[0]?.id, "s:friendly-ship-out-of-fuel:give:3");
    assert.equal(g.event?.choices[1]?.id, page.choices[1]?.id);
    g.fuel = 5;
    choose(g, "s:friendly-ship-out-of-fuel:give:3");
    assert.equal(g.fuel, 2);

    const short = createGame(2);
    const shortHere = park(short, "filler:friendly-ship-out-of-fuel", "Friendly ship out of fuel");
    short.event = fillerEvent(short, shortHere);
    short.fuel = 2;
    const shortBody = short.event?.body;
    choose(short, "s:friendly-ship-out-of-fuel:give:3");
    assert.equal(short.fuel, 2);
    assert.equal(short.event?.body, shortBody);

    const forged = createGame(3);
    const forgedHere = park(forged, "filler:friendly-ship-out-of-fuel", "Friendly ship out of fuel");
    forged.event = fillerEvent(forged, forgedHere);
    forged.fuel = 20;
    const forgedBody = forged.event?.body;
    choose(forged, "s:friendly-ship-out-of-fuel:give:9");
    assert.equal(forged.fuel, 20);
    assert.equal(forged.event?.body, forgedBody);

    loadPack({ events: [{ ...page, prices: undefined }] }, "append");
    const quiet = createGame(4);
    const quietHere = park(quiet, "filler:friendly-ship-out-of-fuel", "Friendly ship out of fuel");
    quiet.event = fillerEvent(quiet, quietHere);
    assert.equal(quiet.event?.choices.some((choice) => choice.id.startsWith("s:friendly-ship-out-of-fuel:give:")), false);
    assert.equal(quiet.event?.choices[0]?.id, page.choices[1]?.id);
  });

  it("rolls one scan price onto both buttons and spends it on the pay path", () => {
    const g = createGame(7);
    fillerChoose(g, "s:terraforming-scan:stop");
    const bribe = g.event?.choices.find((choice) => choice.id.startsWith("s:terraforming-scan:bribe:"));
    const pay = g.event?.choices.find((choice) => choice.id.startsWith("s:terraforming-scan:pay:"));
    assert.ok(bribe && pay);
    const n = Number(bribe.id.split(":").at(-1));
    assert.ok(n >= 15 && n <= 25, bribe.id);
    assert.equal(pay.id, `s:terraforming-scan:pay:${n}`);
    assert.ok(g.event?.choices.some((choice) => choice.id === "s:terraforming-scan:demand"));

    loadPack({
      events: [{ ...row("terraforming-scan"), prices: [{ id: "scan", k: "scrap", lo: 20, hi: 20 }] }],
    }, "append");
    const fixed = createGame(1);
    fillerChoose(fixed, "s:terraforming-scan:stop");
    assert.deepEqual(
      fixed.event?.choices.map((choice) => choice.id),
      ["s:terraforming-scan:bribe:20", "s:terraforming-scan:pay:20", "s:terraforming-scan:demand"],
    );
    fixed.scrap = 100;
    choose(fixed, "s:terraforming-scan:pay:20");
    assert.equal(fixed.scrap, 80);

    const short = createGame(2);
    fillerChoose(short, "s:terraforming-scan:stop");
    short.scrap = 5;
    const shortBody = short.event?.body;
    choose(short, "s:terraforming-scan:pay:20");
    assert.equal(short.scrap, 5);
    assert.equal(short.event?.body, shortBody);

    const forged = createGame(3);
    fillerChoose(forged, "s:terraforming-scan:stop");
    forged.scrap = 100;
    const forgedBody = forged.event?.body;
    choose(forged, "s:terraforming-scan:pay:12");
    assert.equal(forged.scrap, 100);
    assert.equal(forged.event?.body, forgedBody);

    loadPack({ events: [{ ...row("terraforming-scan"), prices: undefined }] }, "append");
    const quiet = createGame(4);
    fillerChoose(quiet, "s:terraforming-scan:stop");
    assert.deepEqual(quiet.event?.choices.map((choice) => choice.id), ["s:terraforming-scan:demand"]);
  });

  it("pays a fixed ransom and refuses an amount outside the band", () => {
    const open = (seed: number) => {
      const g = createGame(seed);
      const here = park(g, "cited:no-fuel-drifting-debris", "No fuel: drifting debris");
      g.event = citedEvent(g, here);
      choose(g, "c:no-fuel-drifting-debris:send");
      choose(g, "c:no-fuel-drifting-debris:report");
      return g;
    };
    const ransom = (g: Game) => g.event?.choices.find((choice) => choice.id.startsWith("c:no-fuel-drifting-debris:pay:"));

    let campaign: Game | undefined;
    for (let seed = 1; seed <= 40 && !campaign; seed++) {
      const g = open(seed);
      if (ransom(g)) campaign = g;
    }
    const campaignPay = campaign ? ransom(campaign) : undefined;
    assert.ok(campaign && campaignPay);
    const cost = Number(campaignPay.id.split(":").at(-1));
    assert.ok(cost >= 25 && cost <= 40, String(cost));
    assert.ok(campaign.event?.choices.some((choice) => choice.id === "c:no-fuel-drifting-debris:refuse"));

    loadPack({
      events: [{ ...row("no-fuel-drifting-debris"), prices: [{ id: "ransom", k: "scrap", lo: 30, hi: 30 }] }],
    }, "append");
    let fixed: Game | undefined;
    for (let seed = 1; seed <= 40 && !fixed; seed++) {
      const g = open(seed);
      if (ransom(g)?.id === "c:no-fuel-drifting-debris:pay:30") fixed = g;
    }
    assert.ok(fixed);
    fixed.scrap = 100;
    choose(fixed, "c:no-fuel-drifting-debris:pay:30");
    assert.equal(fixed.scrap, 70);

    let forged: Game | undefined;
    for (let seed = 1; seed <= 40 && !forged; seed++) {
      const g = open(seed);
      if (ransom(g)) forged = g;
    }
    assert.ok(forged);
    forged.scrap = 100;
    const body = forged.event?.body;
    choose(forged, "c:no-fuel-drifting-debris:pay:12");
    assert.equal(forged.scrap, 100);
    assert.equal(forged.event?.body, body);
    assert.match(body ?? "", /pay a scrap ransom/);

    loadPack({ events: [{ ...row("no-fuel-drifting-debris"), prices: undefined }] }, "append");
    let quiet: Game | undefined;
    for (let seed = 1; seed <= 40 && !quiet; seed++) {
      const g = open(seed);
      if (/pay a scrap ransom/.test(g.event?.body ?? "")) quiet = g;
    }
    assert.ok(quiet);
    assert.equal(quiet.event?.choices.some((choice) => choice.id.startsWith("c:no-fuel-drifting-debris:pay:")), false);
    assert.deepEqual(quiet.event?.choices.map((choice) => choice.id), ["c:no-fuel-drifting-debris:refuse"]);

    resetPackForTests();
    assert.deepEqual(eventDef("no-fuel-drifting-debris")?.prices, [{ id: "ransom", k: "scrap", lo: 25, hi: 40 }]);
  });
});
