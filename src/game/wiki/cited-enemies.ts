import type { Crew, Game, Ship, SysId } from "../types.ts";
import { WEAPONS } from "../content.ts";
import { FLAGSHIP_PHASES, type FlagshipPhase } from "./flagship.ts";
import { PHASE_BANDS, phaseOf } from "../extras/ram.ts";

/**
 * Adjust an already-built enemy hull with numbers the wiki states.
 * The room grid stays the one makeEnemy built. Do not invent a new grid.
 * Boss Laser and Boss Beam have no printed power, so they are not WeaponDefs.
 */
export function citedEnemy(g: Game, tier: string, ship: Ship, crew: Crew[]): void {
  if (tier === "elite") {
    // Rebel Fleet: jumping into the fleet fights a Rebel Elite.
    // Elite Fighter and Elite Assault print ranges, not one loadout, so the grid stays.
    ship.name = "Rebel Elite";
    return;
  }
  if (tier !== "boss") return;
  const phase = FLAGSHIP_PHASES.find((row) => row.phase === stageNow(g, ship));
  if (!phase) return;
  // Wiki page "The Rebel Flagship". The page's name, without the article.
  ship.name = "Rebel Flagship";
  if (phase.hull != null) {
    ship.hull = phase.hull;
    ship.hullMax = phase.hull;
  }
  const reactor = printedReactor(phase);
  if (reactor != null) ship.reactor = reactor;
  const bubble = printedZoltan(phase);
  if (bubble != null) ship.zoltan = bubble;
  for (const system of phase.systems) {
    const id = ON_HULL[system.name];
    if (!id || system.level == null) continue;
    ship.systems[id].level = system.level;
    // Piloting spends no reactor. Power matches the printed level.
    if (id === "pilot") ship.systems[id].power = system.level;
  }
  const bars = artilleryBars(phase);
  if (bars != null) ship.systems.weapons.level = bars;
  fund(ship);
  ship.weapons = mount(g, phase.weapons);
  armMounted(ship);
  const humans = printedHumans(phase);
  if (humans != null) addHumans(g, ship, crew, humans);
}

/**
 * Systems this hull already has a room for.
 * Door, cloaking, medbay, hacking, drones, teleporter, and mind control
 * are on the phase row and are not rooms makeEnemy built.
 */
const ON_HULL: Partial<Record<string, SysId>> = {
  Piloting: "pilot",
  Shields: "shields",
  Engines: "engines",
  Oxygen: "oxygen",
};

/** Shields first, then the other mains. Guns take what the reactor has left. */
const DRAW: SysId[] = ["shields", "engines", "oxygen", "weapons"];

function stageNow(g: Game, ship: Ship): 1 | 2 | 3 {
  // ram.ts: PHASE_BANDS is null, so phaseOf is not a counter. Every hull reads as 1.
  const fromHull: 1 | 2 | 3 = PHASE_BANDS == null ? 1 : phaseOf(ship.hull, ship.hullMax);
  if (fromHull !== 1) return fromHull;
  // g.ramStage belongs to a fight already on the board. makeEnemy builds this
  // ship before startCombat assigns ramStage, and g.enemy is not this ship yet.
  if (g.phase === "combat" && g.enemy === ship && (g.ramStage === 2 || g.ramStage === 3)) {
    return g.ramStage;
  }
  return 1;
}

function printedZoltan(phase: FlagshipPhase): number | null {
  const note = phase.notes.find((line) => line.startsWith("General: the Zoltan Shield has "));
  const match = note?.match(/(\d+) health points/);
  return match ? Number(match[1]) : null;
}

function printedReactor(phase: FlagshipPhase): number | null {
  const note = phase.notes.find((line) => line.startsWith("General: Reactor "));
  const match = note?.match(/^General: Reactor (\d+)\.$/);
  return match ? Number(match[1]) : null;
}

/** One weapons bar. The note prints the same artillery level on every gun of that stage. */
function artilleryBars(phase: FlagshipPhase): number | null {
  const note = phase.notes.find((line) => line.startsWith("Weapons: system levels "));
  const match = note?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function printedHumans(phase: FlagshipPhase): number | null {
  const note = phase.notes.find((line) => line.startsWith("General: Crew "));
  const match = note?.match(/^General: Crew (\d+) Humans\.$/);
  return match ? Number(match[1]) : null;
}

function mount(g: Game, names: string[]) {
  const weapons = [];
  for (const name of names) {
    const def = Object.values(WEAPONS).find((weapon) => weapon.name === name);
    // Boss Laser and Boss Beam are absent: their pages print no power.
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
  const powered = Math.max(0, Math.min(shields.power, shields.level - shields.damage - shields.ion.length));
  // Shields, Overview: one bubble for every two powered levels.
  ship.shieldNow = Math.floor(powered / 2);
}

function armMounted(ship: Ship) {
  const sys = ship.systems.weapons;
  let pool = Math.max(0, Math.min(sys.power, sys.level - sys.damage - sys.ion.length));
  for (const weapon of ship.weapons) {
    const cost = WEAPONS[weapon.defId]?.power;
    if (cost == null || cost > pool) {
      weapon.enabled = false;
      continue;
    }
    weapon.enabled = true;
    pool -= cost;
  }
}

function addHumans(g: Game, ship: Ship, crew: Crew[], total: number) {
  const rooms = ship.rooms.map((room) => room.id);
  if (rooms.length === 0) return;
  let count = crew.filter((member) => member.side === "enemy").length;
  let seat = 0;
  while (count < total) {
    g.uid = (g.uid + 1) >>> 0;
    crew.push({
      id: "u" + g.uid,
      // "1st Stage" / "General": "Crew 11 Humans." No personal names are printed.
      name: "Human",
      side: "enemy",
      aboard: "enemy",
      hp: 100,
      maxHp: 100,
      room: rooms[seat % rooms.length] ?? rooms[0],
      path: [],
      move: 0,
      think: 0,
      tone: 0,
    });
    seat += 1;
    count += 1;
  }
}
