import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import type { WeaponInst } from "../types.ts";
import { citedEnemy } from "../wiki/cited-enemies.ts";
import { citedSellQuote } from "../wiki/cited-stores.ts";
import "./base.ts";
import { loadPack, resetPackForTests, weaponDef } from "./registry.ts";

afterEach(() => resetPackForTests());

function mount(defId: string, uid = defId): WeaponInst {
  return { uid, defId, charge: 0, enabled: false, autofire: false, target: null };
}

describe("weapon lookups", () => {
  it("sells at the packed price and name, and keeps a printed sell line", () => {
    const burst = weaponDef("lineburst");
    const spark = weaponDef("spark");
    assert.ok(burst && spark);
    loadPack(
      {
        weapons: [
          { ...burst, name: "Line", price: 90 },
          { ...spark, price: 100 },
          {
            id: "ember",
            name: "Ember",
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
            price: 15,
            blurb: "",
          },
        ],
      },
      "append",
    );
    const g = createGame(1);
    g.player.weapons = [mount("lineburst", "w-line"), mount("ember"), mount("spark"), mount("dart")];
    g.cargo = [{ kind: "weapon", id: "ember" }];
    const quotes = citedSellQuote(g);
    const byRef = Object.fromEntries(quotes.filter((quote) => quote.kind === "weapon" && !quote.id.startsWith("c:")).map((quote) => [quote.ref, quote]));
    assert.equal(byRef.lineburst?.scrap, 45);
    assert.equal(byRef.lineburst?.name, "Line");
    assert.equal(byRef.ember?.scrap, 7);
    assert.equal(byRef.ember?.name, "Ember");
    assert.equal(byRef.spark?.scrap, 10);
    assert.equal(byRef.dart, undefined);
    const cargo = quotes.find((quote) => quote.id.startsWith("c:"));
    assert.equal(cargo?.name, "Ember (cargo)");
    assert.equal(cargo?.scrap, 7);
  });

  it("mounts an appended gun whose name the flagship prints, and arms from its packed power", () => {
    const ion = weaponDef("bossion");
    assert.ok(ion);
    loadPack(
      {
        weapons: [
          { ...ion, name: "Retired Ion" },
          { ...ion, id: "emberion", name: ion.name },
        ],
      },
      "append",
    );
    const g = createGame(1);
    startCombat(g, "boss");
    const ship = g.enemy;
    assert.ok(ship);
    assert.deepEqual(
      ship.weapons.map((weapon) => weapon.defId),
      ["emberion", "bosslaser", "bossmissile", "bossbeam"],
    );
    assert.ok(ship.weapons.every((weapon) => weapon.enabled));
  });

  it("arms a non-artillery hull from the packed power cost", () => {
    const ion = weaponDef("bossion");
    assert.ok(ion);
    loadPack({ weapons: [{ ...ion, power: 99 }] }, "append");
    const g = createGame(1);
    startCombat(g, "boss");
    const ship = g.enemy;
    assert.ok(ship);
    ship.flagship = undefined;
    citedEnemy(g, "boss", ship, g.crew);
    const armed = Object.fromEntries(ship.weapons.map((weapon) => [weapon.defId, weapon.enabled]));
    assert.equal(armed.bossion, false);
    assert.equal(armed.bossbeam, true);
  });
});
