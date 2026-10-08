import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buy, createGame, weaponSlotCap } from "./sim.ts";
import type { Game, WeaponInst } from "./types.ts";
import { payOffer, rollSurrenderOffer } from "./wiki/surrender.ts";

function mount(defId: string): WeaponInst {
  return { uid: defId, defId, charge: 0, enabled: false, autofire: false, target: null };
}

function fill(g: Game, ids: string[]) {
  for (const id of ids) {
    if (g.player.weapons.some((w) => w.defId === id)) continue;
    g.player.weapons.push(mount(id));
  }
}

function buyGun(g: Game, id: string) {
  g.scrap = 400;
  g.stock = [{ id: "gun", kind: "weapon", ref: id, name: id, detail: "", cost: 20, amount: 1 }];
  const scrap = g.scrap;
  const before = g.player.weapons.length;
  buy(g, "gun");
  return { before, after: g.player.weapons.length, scrap: g.scrap, spent: scrap - g.scrap };
}

describe("printed weapon slots", () => {
  it("lets a Kestrel hold the four slots its layout prints", () => {
    const g = createGame(1, "kestrel-a");
    assert.equal(weaponSlotCap(g), 4);
    assert.equal(g.player.weapons.length, 2);
    assert.equal(buyGun(g, "spark").after, 3);
    assert.equal(buyGun(g, "twin").after, 4);
    const refused = buyGun(g, "stunner");
    assert.equal(refused.after, 4);
    assert.equal(refused.spent, 0);
    assert.equal(g.log[0], "No free weapon slot.");
  });

  it("keeps a Stealth cruiser at the three slots its layout prints", () => {
    const g = createGame(1, "stealth-a");
    assert.equal(weaponSlotCap(g), 3);
    assert.equal(buyGun(g, "spark").after, g.player.weapons.length);
    const before = g.player.weapons.length;
    assert.equal(before, 3);
    const refused = buyGun(g, "twin");
    assert.equal(refused.after, 3);
    assert.equal(refused.spent, 0);
  });

  it("keeps Engi at three and still refuses a fourth", () => {
    const g = createGame(1, "engi-a");
    assert.equal(weaponSlotCap(g), 3);
    assert.equal(buyGun(g, "spark").after, 2);
    assert.equal(buyGun(g, "twin").after, 3);
    assert.equal(buyGun(g, "stunner").after, 3);
  });

  it("leaves the Lark at three slots, which no cruiser page prints", () => {
    const g = createGame(1);
    assert.equal(g.hullId, undefined);
    assert.equal(weaponSlotCap(g), 3);
    assert.equal(buyGun(g, "spark").after, 2);
    assert.equal(buyGun(g, "twin").after, 3);
    assert.equal(buyGun(g, "stunner").after, 3);
  });

  it("pays a surrender weapon into a free printed slot and not into a full one", () => {
    const open = createGame(2, "kestrel-a");
    fill(open, ["spark"]);
    assert.equal(open.player.weapons.length, 3);
    const paid = payOffer(
      open,
      { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0, weapon: "stunner" },
      false,
    );
    assert.equal(paid.weaponName, "Ion Stunner");
    assert.equal(open.player.weapons.length, 4);

    const full = createGame(3, "kestrel-b");
    assert.equal(full.player.weapons.length, 4);
    const blocked = payOffer(
      full,
      { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0, weapon: "stunner" },
      true,
    );
    assert.equal(blocked.weaponName, undefined);
    assert.equal(full.player.weapons.length, 4);
    assert.ok(blocked.extras.includes("No free weapon slot for it."));
  });

  it("rolls the surrender bonus only while a printed slot is free", () => {
    const g = createGame(4, "kestrel-a");
    fill(g, ["spark", "twin"]);
    assert.equal(g.player.weapons.length, 4);
    let armed = 0;
    for (let i = 0; i < 400; i++) if (rollSurrenderOffer(g).weapon) armed += 1;
    assert.equal(armed, 0);
    g.player.weapons.pop();
    let open = 0;
    for (let i = 0; i < 400; i++) if (rollSurrenderOffer(g).weapon) open += 1;
    assert.ok(open > 0);
  });
});
