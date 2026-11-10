import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { weaponDef } from "@stl/pack";
import { shedOverAssigned } from "./extras/cell.ts";
import {
  applyIon,
  armWeapon,
  bars,
  createGame,
  depowerWeapon,
  halvePlayerSystems,
  hurtSystem,
  isMain,
  powerDown,
  powerMask,
  powerUp,
  reorderWeapons,
  sealPlayerWeapons,
  settleZoltanPower,
  sparePower,
  step,
  toggleWeapon,
  weaponsPowerLocked,
  zoltanBars,
} from "./sim.ts";
import type { Crew, Game, SysId, WeaponInst } from "./types.ts";

/**
 * Power-button properties.
 * A weapon click adds the whole cost. powerUp takes the fewest bars that feed one more gun
 * and keeps every gun already in the mask. powerDown turns off the rightmost gun the bars
 * are actually feeding, including one fed only by a Zoltan, then returns reactor bars no
 * remaining gun needs. A gun that is still flagged on may take the freed bars.
 * Shields move by whole layers. Engines, oxygen, and medbay move one bar.
 */

const COSTS = ["LASER_BURST_1", "LASER_BURST_3", "BEAM_2", "BEAM_3"] as const;
const MAINS = ["shields", "engines", "oxygen", "medbay", "weapons"] as const;

describe("power fuzz", () => {
  it("powers a Glaive back up after a storm sheds its bars", () => {
    const g = boot();
    const sys = g.player.systems.weapons;
    lay(g, ["BEAM_3"], [true], 4, 1);
    g.player.reactor = 4;
    assert.equal(sparePower(g.player), 0);
    assert.deepEqual(fed(g), [true]);
    g.player.storm = true;
    shedOverAssigned(g, g.player, "player");
    assert.equal(sys.power, 2);
    assert.equal(g.player.weapons[0]!.enabled, true);
    assert.deepEqual(fed(g), [false]);
    g.player.reactor = 8;
    assert.ok(sparePower(g.player) >= 1);
    powerUp(g, "weapons");
    assert.equal(sys.power, 3);
    assert.equal(g.player.weapons[0]!.enabled, true);
    assert.deepEqual(fed(g), [true]);
  });

  it("powers a weapon back up after a partial ion lock ends", () => {
    const g = boot();
    const sys = g.player.systems.weapons;
    lay(g, ["BEAM_3"], [true], 4, 0);
    sys.level = 8;
    applyIon(g.player, "weapons", 5);
    assert.equal(sys.power, 3);
    assert.equal(weaponsPowerLocked(g), true);
    assert.deepEqual(fed(g), [false]);
    powerUp(g, "weapons");
    assert.equal(sys.power, 3);
    sys.ion = [];
    assert.equal(weaponsPowerLocked(g), false);
    powerUp(g, "weapons");
    assert.equal(sys.power, 4);
    assert.deepEqual(fed(g), [true]);
  });

  it("refuses weapon power buttons while a hack pulse holds Weapon Control", () => {
    const g = boot();
    lay(g, ["LASER_BURST_3", "LASER_BURST_1"], [true, true], 3, 0);
    g.enemy = g.player;
    g.phase = "combat";
    g.enemy.kits.hacking = {
      id: "hacking",
      level: 2,
      power: 2,
      left: 7,
      cool: 0,
      target: "weapons",
      on: true,
      aux: 0,
      hackLatched: true,
    };
    assert.equal(weaponsPowerLocked(g), true);
    const power = g.player.systems.weapons.power;
    const enabled = g.player.weapons.map((w) => w.enabled);
    powerDown(g, "weapons");
    powerUp(g, "weapons");
    toggleWeapon(g, g.player.weapons[1]!.uid);
    depowerWeapon(g, g.player.weapons[0]!.uid);
    armWeapon(g, g.player.weapons[1]!.uid);
    assert.equal(g.player.systems.weapons.power, power);
    assert.deepEqual(
      g.player.weapons.map((w) => w.enabled),
      enabled,
    );
  });

  it("walks weapon layouts for power up, power down, and toggle", () => {
    const g = boot();
    const failures: string[] = [];
    const note = (msg: string) => {
      if (failures.length < 40) failures.push(msg);
    };
    for (const ids of layouts()) {
      const n = ids.length;
      const sum = ids.reduce((n, id) => n + cost(id), 0);
      for (let bits = 0; bits < 2 ** n; bits++) {
        const enabled = ids.map((_, i) => ((bits >> i) & 1) === 1);
        for (const z of [0, 1, 2]) {
          for (let power = 0; power <= Math.min(8, sum); power++) {
            lay(g, ids, enabled, power, z);
            noteUp(g, note);
            lay(g, ids, enabled, power, z);
            noteDown(g, note);
            const off = enabled.findIndex((on) => !on);
            if (off >= 0) {
              lay(g, ids, enabled, power, z);
              noteToggle(g, off, note);
            }
          }
        }
      }
    }
    assert.equal(failures.length, 0, failures.join("\n"));
  });

  it("keeps a running gun's aim when power shifts to a weapon that was waiting", () => {
    const g = boot();
    lay(g, ["BEAM_3", "LASER_BURST_1"], [true, true], 3, 1);
    g.player.weapons[0]!.target = "keep";
    g.player.weapons[1]!.target = "wait";
    assert.deepEqual(fed(g), [true, false]);
    powerDown(g, "weapons");
    assert.equal(g.player.weapons[0]!.enabled, false);
    assert.equal(g.player.weapons[0]!.target, null);
    assert.equal(g.player.weapons[1]!.enabled, true);
    assert.equal(g.player.weapons[1]!.target, "wait");
    assert.equal(g.player.systems.weapons.power, 0);
    assert.deepEqual(fed(g), [false, true]);
  });

  it("does not give a wasted Zoltan bar to a cheaper gun until the dearer one is off", () => {
    const g = boot();
    lay(g, ["BEAM_3", "LASER_BURST_1"], [true, false], 0, 1);
    g.player.reactor = reactorUsed(g);
    assert.equal(sparePower(g.player), 0);
    assert.deepEqual(fed(g), [false, false]);
    toggleWeapon(g, g.player.weapons[1]!.uid);
    assert.equal(g.player.weapons[1]!.enabled, false);
    assert.equal(g.player.systems.weapons.power, 0);
    depowerWeapon(g, g.player.weapons[0]!.uid);
    assert.equal(g.player.weapons[0]!.enabled, false);
    toggleWeapon(g, g.player.weapons[1]!.uid);
    assert.equal(g.player.weapons[1]!.enabled, true);
    assert.equal(g.player.systems.weapons.power, 0);
    assert.deepEqual(fed(g), [false, true]);
  });

  it("still powers the next weapon after a reorder", () => {
    const g = boot();
    lay(g, ["BEAM_3", "LASER_BURST_1"], [true, true], 1, 0);
    assert.deepEqual(fed(g), [false, true]);
    reorderWeapons(g, 1, 0);
    assert.equal(g.player.weapons[0]!.defId, "LASER_BURST_1");
    assert.deepEqual(fed(g), [true, false]);
    powerUp(g, "weapons");
    assert.equal(g.player.systems.weapons.power, 5);
    assert.deepEqual(fed(g), [true, true]);
  });

  it("covers a halved weapon with the whole halved cost, and a seal feeds nothing", () => {
    const g = boot();
    lay(g, ["LASER_BURST_1"], [true], 0, 0);
    halvePlayerSystems(g, ["weapons"]);
    powerUp(g, "weapons");
    assert.equal(g.player.systems.weapons.power, 2);
    assert.deepEqual(fed(g), [true]);
    halvePlayerSystems(g, []);

    const sealed = boot();
    lay(sealed, ["LASER_BURST_3"], [true], 2, 0);
    sealPlayerWeapons(sealed.player);
    const power = sealed.player.systems.weapons.power;
    powerUp(sealed, "weapons");
    assert.equal(sealed.player.systems.weapons.power, power);
    assert.deepEqual(fed(sealed), [false]);
    powerDown(sealed, "weapons");
    assert.equal(sealed.player.systems.weapons.power, 0);
    assert.equal(sealed.player.weapons[0]!.enabled, false);
  });

  it("moves shields by a layer and the other mains by one bar, including after ion", () => {
    const g = boot();
    const shields = g.player.systems.shields;
    shields.level = 8;
    place(g, "shields", 0);
    g.player.reactor = 30;
    shields.power = 0;
    for (const pair of [2, 4, 6, 8]) {
      powerUp(g, "shields");
      assert.equal(shields.power, pair);
    }
    powerUp(g, "shields");
    assert.equal(shields.power, 8);
    place(g, "shields", 1);
    shields.power = 0;
    powerUp(g, "shields");
    assert.equal(shields.power, 1);
    assert.equal(bars(shields, 1), 2);
    powerDown(g, "shields");
    assert.equal(shields.power, 0);
    place(g, "shields", 2);
    shields.power = 0;
    assert.equal(bars(shields, 2), 2);
    powerDown(g, "shields");
    assert.equal(shields.power, 0);
    assert.equal(bars(shields, 2), 2);

    for (const id of ["engines", "oxygen", "medbay"] as const) {
      const sys = g.player.systems[id];
      sys.level = 3;
      sys.damage = 0;
      sys.ion = [];
      sys.power = 0;
      delete sys.want;
      g.player.reactor = 30;
      powerUp(g, id);
      assert.equal(sys.power, 1, id);
      powerDown(g, id);
      assert.equal(sys.power, 0, id);
      sys.power = 3;
      applyIon(g.player, id, 2);
      assert.equal(sys.power, 1, id);
      powerUp(g, id);
      assert.equal(sys.power, 1, id);
      sys.ion = [];
      powerUp(g, id);
      assert.equal(sys.power, 2, id);
    }
  });

  it("routes repaired bars back without a click, and leaves an ion lock for a click", () => {
    const g = boot();
    lay(g, ["BEAM_3"], [true], 4, 0);
    const sys = g.player.systems.weapons;
    hurtSystem(g.player, "weapons", sys.level);
    assert.equal(sys.power, 0);
    assert.equal(sys.want, 4);
    assert.equal(g.player.weapons[0]!.enabled, true);
    sys.damage = 0;
    g.phase = "map";
    g.paused = false;
    g.userPaused = false;
    step(g, 0.05);
    assert.equal(g.phase, "map");
    assert.equal(sys.power, 4);
    assert.equal(sys.want, undefined);
    assert.deepEqual(fed(g), [true]);

    lay(g, ["BEAM_3"], [true], 4, 0);
    sys.level = 4;
    applyIon(g.player, "weapons", 4);
    assert.equal(sys.power, 0);
    assert.equal(sys.want, undefined);
    sys.ion = [];
    step(g, 0.05);
    assert.equal(sys.power, 0);
    assert.equal(g.player.weapons[0]!.enabled, true);
    powerUp(g, "weapons");
    assert.equal(sys.power, 4);
    assert.deepEqual(fed(g), [true]);
  });

  it("keeps spare power non-negative across a seeded run of power clicks", () => {
    const g = boot();
    lay(g, ["BEAM_2", "LASER_BURST_3", "LASER_BURST_1"], [false, false, false], 0, 0);
    place(g, "weapons", 1);
    const rng = mulberry(0x5eed);
    const failures: string[] = [];
    for (let i = 0; i < 80; i++) {
      const roll = rng();
      const op = roll % 5;
      if (op === 0) powerUp(g, "weapons");
      else if (op === 1) powerDown(g, "weapons");
      else if (op === 2) toggleWeapon(g, g.player.weapons[roll % 3]!.uid);
      else if (op === 3) depowerWeapon(g, g.player.weapons[roll % 3]!.uid);
      else reorderWeapons(g, roll % 3, (roll >> 2) % 3);
      const sys = g.player.systems.weapons;
      const spare = sparePower(g.player);
      const mask = fed(g);
      if (spare < 0) failures.push(`step ${i} spare ${spare}`);
      if (sys.power < 0 || sys.power > cap(sys)) failures.push(`step ${i} power ${sys.power}`);
      mask.forEach((on, index) => {
        if (on && !g.player.weapons[index]!.enabled) failures.push(`step ${i} fed dark ${index}`);
      });
    }
    assert.equal(failures.length, 0, failures.join("\n"));
  });
});

function boot(): Game {
  const g = createGame(3, "PLAYER_SHIP_HARD");
  g.player.reactor = 30;
  for (const id of MAINS) {
    const sys = g.player.systems[id];
    sys.level = Math.max(sys.level, id === "weapons" ? 8 : 4);
    sys.damage = 0;
    sys.ion = [];
    sys.power = 0;
    delete sys.want;
    delete sys.zoltanHeld;
  }
  for (const kit of Object.values(g.player.kits)) if (kit) kit.power = 0;
  g.crew = g.crew.filter((c) => !c.id.startsWith("fuzz-z"));
  return g;
}

function lay(g: Game, ids: string[], enabled: boolean[], power: number, zoltans: number) {
  for (const id of MAINS) {
    const sys = g.player.systems[id];
    sys.power = 0;
    sys.damage = 0;
    sys.ion = [];
    delete sys.want;
    delete sys.zoltanHeld;
  }
  for (const kit of Object.values(g.player.kits)) if (kit) kit.power = 0;
  delete g.player.storm;
  g.player.reactor = 30;
  const sys = g.player.systems.weapons;
  sys.level = 8;
  sys.power = power;
  g.player.weapons = ids.map((defId, i) => gun(defId, `${defId}-${i}`, enabled[i]!));
  place(g, "weapons", zoltans);
}

function place(g: Game, id: SysId, n: number) {
  g.crew = g.crew.filter((c) => !c.id.startsWith("fuzz-z"));
  const room = g.player.rooms.find((r) => r.system === id);
  assert.ok(room, id);
  for (let i = 0; i < n; i++) g.crew.push(spark(room.id, `fuzz-z${i}`));
}

function gun(defId: string, uid: string, enabled: boolean): WeaponInst {
  return { uid, defId, charge: 0, enabled, autofire: false, target: enabled ? uid : null };
}

function spark(room: string, id: string): Crew {
  return {
    id,
    name: id,
    side: "player",
    aboard: "player",
    hp: 70,
    maxHp: 70,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
    kin: "energy",
  };
}

function cost(id: string): number {
  const power = weaponDef(id)?.power;
  assert.equal(typeof power, "number", id);
  return power!;
}

function fed(g: Game): boolean[] {
  return powerMask(g.player, zoltanBars(g.crew, g.player, "player", "weapons"));
}

function cap(sys: { level: number; damage: number; ion: unknown[] }): number {
  return Math.max(0, sys.level - sys.damage - sys.ion.length);
}

function reactorUsed(g: Game): number {
  let n = 0;
  for (const id of MAINS) if (isMain(id)) n += g.player.systems[id].power;
  for (const kit of Object.values(g.player.kits)) if (kit) n += kit.power;
  return n;
}

function maskAt(g: Game, power: number, enabled: boolean[]): boolean[] {
  const sys = g.player.systems.weapons;
  const savedPower = sys.power;
  const saved = g.player.weapons.map((w) => w.enabled);
  sys.power = power;
  g.player.weapons.forEach((w, i) => {
    w.enabled = enabled[i]!;
  });
  const mask = fed(g);
  sys.power = savedPower;
  g.player.weapons.forEach((w, i) => {
    w.enabled = saved[i]!;
  });
  return mask;
}

function sameFlagProgress(g: Game): boolean {
  const sys = g.player.systems.weapons;
  const room = Math.min(sparePower(g.player), cap(sys) - sys.power);
  if (room <= 0) return false;
  const enabled = g.player.weapons.map((w) => w.enabled);
  const before = maskAt(g, sys.power, enabled);
  for (let k = 1; k <= room; k++) {
    const after = maskAt(g, sys.power + k, enabled);
    const gained = after.some((on, i) => on && !before[i]);
    const kept = before.every((on, i) => !on || after[i]);
    if (gained && kept) return true;
  }
  return false;
}

function noteUp(g: Game, note: (msg: string) => void) {
  const sys = g.player.systems.weapons;
  const beforePower = sys.power;
  const beforeEnabled = g.player.weapons.map((w) => w.enabled);
  const beforeFed = fed(g);
  const targets = g.player.weapons.map((w) => w.target ?? null);
  const progress = sameFlagProgress(g);
  powerUp(g, "weapons");
  const afterFed = fed(g);
  const label = tag(g, beforePower);
  if (sparePower(g.player) < 0) note(`${label} up spare`);
  if (sys.power < 0 || sys.power > cap(sys)) note(`${label} up power ${sys.power}`);
  afterFed.forEach((on, i) => {
    if (on && !g.player.weapons[i]!.enabled) note(`${label} up fed while off ${i}`);
  });
  beforeFed.forEach((on, i) => {
    if (!on) return;
    if (!afterFed[i] || !g.player.weapons[i]!.enabled) note(`${label} up dropped fed ${i}`);
    if (g.player.weapons[i]!.target !== targets[i]) note(`${label} up cleared aim ${i}`);
  });
  g.player.weapons.forEach((w, i) => {
    if (w.enabled && !beforeEnabled[i] && !afterFed[i]) note(`${label} up enabled dark ${i}`);
  });
  if (!progress) return;
  const gained = afterFed.some((on, i) => on && !beforeFed[i]);
  if (!gained || sys.power === beforePower) note(`${label} up stuck`);
}

function noteDown(g: Game, note: (msg: string) => void) {
  const sys = g.player.systems.weapons;
  const beforePower = sys.power;
  const beforeEnabled = g.player.weapons.map((w) => w.enabled);
  const beforeFed = fed(g);
  const targets = g.player.weapons.map((w) => w.target ?? null);
  let right = -1;
  for (let i = beforeFed.length - 1; i >= 0; i--) {
    if (beforeEnabled[i] && beforeFed[i]) {
      right = i;
      break;
    }
  }
  powerDown(g, "weapons");
  const afterFed = fed(g);
  const label = tag(g, beforePower);
  if (sparePower(g.player) < 0) note(`${label} down spare`);
  if (sys.power < beforePower && sys.power < 0) note(`${label} down negative`);
  if (sys.power > beforePower) note(`${label} down rose ${beforePower}->${sys.power}`);
  if (sys.power > cap(sys)) note(`${label} down over cap`);
  afterFed.forEach((on, i) => {
    if (on && !g.player.weapons[i]!.enabled) note(`${label} down fed while off ${i}`);
  });
  if (right < 0) {
    if (beforePower <= 0) {
      if (sys.power !== beforePower) note(`${label} down changed empty power`);
      g.player.weapons.forEach((w, i) => {
        if (w.enabled !== beforeEnabled[i]) note(`${label} down changed empty flag ${i}`);
      });
      return;
    }
    if (sys.power !== 0) note(`${label} down left dark bars ${sys.power}`);
    if (afterFed.some(Boolean)) note(`${label} down left a fed gun`);
    return;
  }
  if (g.player.weapons[right]!.enabled) note(`${label} down left ${right} on`);
  if (g.player.weapons[right]!.target != null) note(`${label} down kept aim ${right}`);
  beforeFed.forEach((on, i) => {
    if (!on || i === right) return;
    if (!afterFed[i] || !g.player.weapons[i]!.enabled) note(`${label} down dropped fed ${i}`);
    if (g.player.weapons[i]!.target !== targets[i]) note(`${label} down cleared aim ${i}`);
  });
}

function noteToggle(g: Game, index: number, note: (msg: string) => void) {
  const sys = g.player.systems.weapons;
  const beforePower = sys.power;
  const beforeEnabled = g.player.weapons.map((w) => w.enabled);
  const beforeFed = fed(g);
  const room = Math.min(sparePower(g.player), cap(sys) - sys.power);
  let need: number | null = null;
  for (let k = 0; k <= Math.max(0, room); k++) {
    const flags = beforeEnabled.slice();
    flags[index] = true;
    const after = maskAt(g, beforePower + k, flags);
    const kept = beforeFed.every((on, i) => !on || after[i]);
    if (after[index] && kept) {
      need = k;
      break;
    }
  }
  toggleWeapon(g, g.player.weapons[index]!.uid);
  const label = tag(g, beforePower);
  if (need == null) {
    if (sys.power !== beforePower) note(`${label} toggle moved power`);
    g.player.weapons.forEach((w, i) => {
      if (w.enabled !== beforeEnabled[i]) note(`${label} toggle moved flag ${i}`);
    });
    return;
  }
  if (sys.power !== beforePower + need) note(`${label} toggle power ${sys.power} want +${need}`);
  if (!g.player.weapons[index]!.enabled || !fed(g)[index]) note(`${label} toggle missed ${index}`);
  g.player.weapons.forEach((w, i) => {
    if (i !== index && w.enabled !== beforeEnabled[i]) note(`${label} toggle flipped ${i}`);
  });
}

function tag(g: Game, power: number): string {
  const ids = g.player.weapons.map((w) => `${w.defId}:${w.enabled ? 1 : 0}`).join(",");
  const z = zoltanBars(g.crew, g.player, "player", "weapons");
  return `${ids} z${z} p${power}`;
}

function layouts(): string[][] {
  const out: string[][] = [];
  const walk = (left: number, acc: string[]) => {
    if (left === 0) {
      out.push([...acc]);
      return;
    }
    for (const id of COSTS) {
      acc.push(id);
      walk(left - 1, acc);
      acc.pop();
    }
  };
  for (let n = 1; n <= 3; n++) walk(n, []);
  return out;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}
