import type { Crew, Game, Ship, SysId } from "../types.ts";
import { hullDef, weaponDef } from "@stl/pack";
import { FLAGSHIP_ZOLTAN, GUN_ROOM, artilleryGun } from "./flagship-systems.ts";
import { flagshipHullId } from "./flagship-layout.ts";
import { PHASE_BANDS, phaseOf } from "../extras/ram.ts";

/**
 * Adjust an already-built enemy hull with numbers the wiki states.
 * The room grid stays the one makeEnemy built. Do not invent a new grid.
 * @agent:flagship. For the boss that grid is the traced cutaway (sim.ts flagshipStage, wiki/flagship-systems.ts).
 */
export function citedEnemy(g: Game, tier: string, ship: Ship, _crew: Crew[]): void {
  if (tier === "elite") {
    // Rebel Fleet: jumping into the fleet fights a Rebel Elite.
    // Elite Fighter and Elite Assault print ranges, not one loadout, so the grid stays.
    ship.name = "Rebel Elite";
    return;
  }
  if (tier !== "boss") {
    zoltanShipShield(g, ship);
    return;
  }
  const stage = stageNow(g, ship);
  // The stage's blueprint at the run's difficulty (BOSS_<stage>_<DIFFICULTY>_DLC): hull, reactor, system levels and
  // the artillery it fits. A pack without it leaves the built hull as it is.
  const hull = hullDef(flagshipHullId(stage, g.difficulty));
  if (!hull) return;
  // Wiki page "The Rebel Flagship". The page's name, without the article.
  ship.name = "Rebel Flagship";
  if (hull.health != null) {
    ship.hull = hull.health;
    ship.hullMax = hull.health;
  }
  ship.reactor = hull.reactor;
  if (stage === 3) ship.zoltan = FLAGSHIP_ZOLTAN;
  const fitted = new Map<string, number>();
  for (const install of hull.installs ?? []) {
    if (install.start === false) continue;
    fitted.set(install.id, install.power);
  }
  // A system the blueprint does not fit "was lost in the previous battle" ("2nd stage" / "Systems").
  for (const id of ON_HULL) {
    const level = fitted.get(id) ?? 0;
    ship.systems[id].level = level;
    // Piloting and the Door System are subsystems: they spend no reactor, so power matches the level.
    ship.systems[id].power = id === "pilot" || id === "doors" ? level : 0;
  }
  // Each artillery pod is its own system at its blueprint power ("<artillery power room weapon>"). The shared Weapons
  // level is the highest pod, for anything that reads the system as a whole.
  const pods = (hull.installs ?? []).flatMap((install) =>
    install.id === "artillery" && install.start !== false && install.weapon
      ? [{ weapon: install.weapon, level: install.power }]
      : [],
  );
  ship.systems.weapons.level = Math.max(0, ...pods.map((pod) => pod.level));
  fund(ship);
  ship.weapons = mount(
    g,
    pods.map((pod) => pod.weapon),
  );
  armMounted(ship);
  for (const pod of pods) {
    const gun = artilleryGun(ship, GUN_ROOM[pod.weapon] ?? "");
    if (gun) gun.level = pod.level;
  }
}

/**
 * Main systems the stage blueprint sets. Cloaking, Hacking, Drone, Teleporter and Mind Control are kits that
 * applyFlagshipSystems sets from the same blueprint.
 */
const ON_HULL: SysId[] = ["pilot", "shields", "engines", "oxygen", "medbay", "doors"];

/** Shields first, then the other mains. Guns take what the reactor has left. @agent:flagship: Medbay added. */
const DRAW: SysId[] = ["shields", "engines", "oxygen", "medbay", "weapons"];

/**
 * Zoltan Ships, lead: "All Zoltan ships (except in sector 1 on easy mode) have a Zoltan Shield,
 * which absorbs 5 points of damage and prevents boarding, hacking, and mind control."
 * The unarmed Energy Fighter (Peace) has no Zoltan Shield; that fight clears the bubble after this.
 */
function zoltanShipShield(g: Game, ship: Ship): void {
  if (ship.faction !== "zoltan") return;
  if (g.sector === 1 && g.difficulty === "easy") return;
  ship.zoltan = 5;
}

function stageNow(g: Game, ship: Ship): 1 | 2 | 3 {
  // ram.ts: PHASE_BANDS is null, so phaseOf is not a counter. Every hull reads as 1.
  const fromHull: 1 | 2 | 3 = PHASE_BANDS == null ? 1 : phaseOf(ship.hull, ship.hullMax);
  if (fromHull !== 1) return fromHull;
  // g.ramStage belongs to a fight already on the board. makeEnemy builds this
  // ship before startCombat assigns ramStage, and g.enemy is not this ship yet.
  if (g.phase === "combat" && g.enemy === ship && (g.ramStage === 2 || g.ramStage === 3)) {
    return g.ramStage;
  }
  // @agent:flagship. A flagship built at a remembered stage (player retreated and came back, sim.ts makeFlagship)
  // carries that stage on ship.flagship before it is in the fight.
  const stage = ship.flagship?.stage;
  if (stage === 2 || stage === 3) return stage;
  return 1;
}

function mount(g: Game, ids: string[]) {
  const weapons = [];
  for (const id of ids) {
    const def = weaponDef(id);
    if (!def) continue;
    g.uid = (g.uid + 1) >>> 0;
    weapons.push({
      uid: "u" + g.uid,
      defId: def.id,
      charge: 0,
      enabled: false,
      autofire: true,
      target: null,
    });
  }
  return weapons;
}

function fund(ship: Ship) {
  for (const id of DRAW) ship.systems[id].power = 0;
  let spare = Math.max(0, ship.reactor);
  for (const id of DRAW) {
    const sys = ship.systems[id];
    const room = Math.max(0, sys.level - sys.damage - sys.ion.length);
    const give = Math.min(room, spare);
    sys.power = give;
    spare -= give;
  }
  const shields = ship.systems.shields;
  const powered = Math.max(
    0,
    Math.min(shields.power, shields.level - shields.damage - shields.ion.length),
  );
  // Shields, Overview: one bubble for every two powered levels.
  ship.shieldNow = Math.floor(powered / 2);
}

function armMounted(ship: Ship) {
  // @agent:flagship. "The Flagship's 'weapons' are artillery systems, each located in its own room" and work "just
  // like the Federation Cruiser artillery system": no shared Weapons power pool, so every mounted gun is armed.
  // sim.ts powerMask / flagshipChargeSeconds run each on its own printed charge time.
  if (ship.flagship) {
    for (const weapon of ship.weapons) weapon.enabled = true;
    return;
  }
  const sys = ship.systems.weapons;
  let pool = Math.max(0, Math.min(sys.power, sys.level - sys.damage - sys.ion.length));
  for (const weapon of ship.weapons) {
    const cost = weaponDef(weapon.defId)?.power;
    if (cost == null || cost > pool) {
      weapon.enabled = false;
      continue;
    }
    weapon.enabled = true;
    pool -= cost;
  }
}
