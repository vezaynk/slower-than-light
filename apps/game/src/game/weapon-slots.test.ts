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
    const g = createGame(1, "PLAYER_SHIP_HARD");
    assert.equal(weaponSlotCap(g), 4);
    assert.equal(g.player.weapons.length, 2);
    assert.equal(buyGun(g, "LASER_BURST_1").after, 3);
    assert.equal(buyGun(g, "LASER_BURST_2").after, 4);
    // Per the user: a weapon with no free slot goes to cargo; a full cargo hold refuses it.
    const stowed = buyGun(g, "ION_STUN");
    assert.equal(stowed.after, 4);
    assert.equal(stowed.spent, 20);
    assert.deepEqual(g.cargo, [{ kind: "weapon", id: "ION_STUN" }]);
    g.cargo = [0, 1, 2, 3].map(() => ({ kind: "weapon" as const, id: "LASER_BURST_1" }));
    const refused = buyGun(g, "LASER_HEAVY_1");
    assert.equal(refused.spent, 0);
    assert.equal(g.log[0], "No free weapon slot or cargo slot.");
  });

  it("keeps a Stealth cruiser at the three slots its layout prints", () => {
    const g = createGame(1, "PLAYER_SHIP_STEALTH");
    assert.equal(weaponSlotCap(g), 3);
    assert.equal(buyGun(g, "LASER_BURST_1").after, g.player.weapons.length);
    const before = g.player.weapons.length;
    assert.equal(before, 3);
    const stowed = buyGun(g, "LASER_BURST_2");
    assert.equal(stowed.after, 3);
    assert.equal(stowed.spent, 20);
    assert.equal(g.cargo?.length, 1);
  });

  it("keeps Engi at three and still refuses a fourth", () => {
    const g = createGame(1, "PLAYER_SHIP_CIRCLE");
    assert.equal(weaponSlotCap(g), 3);
    assert.equal(buyGun(g, "LASER_BURST_1").after, 2);
    assert.equal(buyGun(g, "LASER_BURST_2").after, 3);
    assert.equal(buyGun(g, "ION_STUN").after, 3);
  });

  it("leaves the Lark at three slots, which no cruiser page prints", () => {
    const g = createGame(1);
    assert.equal(g.hullId, undefined);
    assert.equal(weaponSlotCap(g), 3);
    assert.equal(buyGun(g, "LASER_BURST_1").after, 2);
    assert.equal(buyGun(g, "LASER_BURST_2").after, 3);
    assert.equal(buyGun(g, "ION_STUN").after, 3);
  });

  it("pays a surrender weapon into a free printed slot, else cargo, else asks what to leave behind", () => {
    const open = createGame(2, "PLAYER_SHIP_HARD");
    fill(open, ["LASER_BURST_1"]);
    assert.equal(open.player.weapons.length, 3);
    const paid = payOffer(
      open,
      { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0, weapon: "ION_STUN" },
      false,
    );
    assert.equal(paid.weaponName, "Ion Stunner");
    assert.equal(open.player.weapons.length, 4);

    // Per the user: make-room.ts. A full rack stows it in cargo; a full cargo hold asks what to leave behind.
    const full = createGame(3, "PLAYER_SHIP_HARD_2");
    assert.equal(full.player.weapons.length, 4);
    payOffer(full, { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0, weapon: "ION_STUN" }, true);
    assert.equal(full.player.weapons.length, 4);
    assert.deepEqual(full.cargo, [{ kind: "weapon", id: "ION_STUN" }]);
    full.cargo = [0, 1, 2, 3].map(() => ({ kind: "weapon" as const, id: "LASER_BURST_1" }));
    payOffer(full, { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0, weapon: "LASER_HEAVY_1" }, true);
    assert.deepEqual(full.overflow, [{ kind: "weapon", id: "LASER_HEAVY_1" }]);
  });

  it("rolls the surrender bonus weapon whether or not a printed slot is free (the full rack asks)", () => {
    const g = createGame(4, "PLAYER_SHIP_HARD");
    fill(g, ["LASER_BURST_1", "LASER_BURST_2"]);
    assert.equal(g.player.weapons.length, 4);
    let armed = 0;
    for (let i = 0; i < 400; i++) if (rollSurrenderOffer(g).weapon) armed += 1;
    assert.ok(armed > 0);
  });
});
