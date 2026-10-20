import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { allEvents, eventDef, loadPack, resetPackForTests } from "@stl/pack";
import type { EventChoice } from "@stl/pack";
import { choose, createGame } from "../sim.ts";
import "../pack/base.ts";
import { fuelBand, FUEL_GIFTS, rollFuel } from "./fuel-gifts.ts";

afterEach(() => resetPackForTests());

function packedGifts(): Map<string, { lo: number; hi: number }> {
  const seen = new Map<string, { lo: number; hi: number }>();
  for (const ev of allEvents()) {
    const choices = [...ev.choices, ...(ev.cards ?? []).flatMap((card) => card.choices)];
    for (const choice of choices) {
      if (choice.gift?.k !== "fuel") continue;
      assert.equal(seen.has(choice.id), false, choice.id);
      seen.set(choice.id, { lo: choice.gift.lo, hi: choice.gift.hi });
    }
  }
  return seen;
}

function copyChoice(choice: EventChoice): EventChoice {
  return {
    id: choice.id,
    label: choice.label,
    fx: choice.fx.map((fx) => ({ ...fx })),
    ...(choice.reqs ? { reqs: choice.reqs.map((req) => ({ ...req })) } : {}),
    ...(choice.gift ? { gift: { ...choice.gift } } : {}),
  };
}

describe("fuel gifts", () => {
  it("packs every authored gift once, and keeps the leftover page off the chart", () => {
    const seen = packedGifts();
    for (const [id, gift] of Object.entries(FUEL_GIFTS)) {
      assert.deepEqual(seen.get(id), { lo: gift.lo, hi: gift.hi }, id);
    }
    const holder = eventDef("fuel-gifts");
    assert.ok(holder);
    assert.deepEqual(holder.sectors, []);
    assert.equal(holder.flag, "fuel-gifts");
    assert.equal(holder.dest, "fuel-gifts");
    assert.equal(holder.body, "");
    assert.ok(holder.choices.length > 0);

    const repair = eventDef("FUEL_OFF_ENGI_DUBIOUS");
    const paid = repair?.choices.find((choice) => choice.id === "c:no-fuel-engi-ship-repair:0");
    const drone = repair?.choices.find((choice) => choice.id === "c:no-fuel-engi-ship-repair:2");
    assert.equal(paid?.gift, undefined);
    assert.equal(
      paid?.fx.some(
        (fx) => fx.k === "res" && fx.id === "fuel" && fx.sign === 1 && fx.lo === 4 && fx.hi === 6,
      ),
      true,
    );
    assert.deepEqual(drone?.gift, { k: "fuel", lo: 4, hi: 6 });

    const trade = eventDef("NO_FUEL_REFUGEE")
      ?.cards?.flatMap((card) => card.choices)
      .find((choice) => choice.id === "c:no-fuel-refugee-trading:trade");
    assert.deepEqual(trade?.gift, { k: "fuel", lo: 3, hi: 3 });

    const g = createGame(1);
    assert.equal(
      g.beacons.some(
        (beacon) => beacon.flag === "gift:fuel-gifts" || beacon.flag === "reqs:blue-button-reqs",
      ),
      false,
    );
  });

  it("pays the packed band, and a fixed gift spends no random number", () => {
    let rolls = 0;
    assert.equal(
      rollFuel("missing-button", () => {
        rolls += 1;
        return 9;
      }),
      0,
    );
    assert.equal(rolls, 0);
    assert.equal(
      rollFuel("s:garbled-dock:doors", () => {
        rolls += 1;
        return 9;
      }),
      5,
    );
    assert.equal(rolls, 0);
    assert.equal(
      rollFuel("s:refuel-dock:steal", (lo, hi) => {
        rolls += 1;
        return lo + hi;
      }),
      8,
    );
    assert.equal(rolls, 1);

    const holder = eventDef("fuel-gifts");
    assert.ok(holder);
    const choices = holder.choices.map((choice) =>
      choice.id === "s:refuel-dock:steal"
        ? { ...copyChoice(choice), gift: { k: "fuel" as const, lo: 8, hi: 8 } }
        : copyChoice(choice),
    );
    loadPack({ events: [{ ...holder, choices }] }, "append");
    const stolen = createGame(1);
    const before = stolen.fuel;
    choose(stolen, "s:refuel-dock:steal");
    assert.equal(stolen.fuel - before, 8);

    resetPackForTests();
    assert.deepEqual(fuelBand("s:refuel-dock:steal"), [3, 5]);
    const restored = createGame(2);
    const held = restored.fuel;
    choose(restored, "s:refuel-dock:steal");
    const gained = restored.fuel - held;
    assert.ok(gained >= 3 && gained <= 5, String(gained));

    loadPack(
      {
        events: [
          {
            id: "ember-fuel",
            dest: "ember-fuel",
            flag: "gift:ember-fuel",
            aliases: [],
            sectors: [],
            body: "",
            choices: [
              {
                id: "c:ember:fuel",
                label: "c:ember:fuel",
                fx: [{ k: "nothing" }],
                gift: { k: "fuel", lo: 9, hi: 9 },
              },
            ],
          },
        ],
      },
      "append",
    );
    assert.deepEqual(fuelBand("c:ember:fuel"), [9, 9]);
    resetPackForTests();
    assert.equal(fuelBand("c:ember:fuel"), null);
  });
});
