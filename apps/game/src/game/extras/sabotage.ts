import { hurtKit, hurtSystem, log, noteCombatPoint, shakeShip, zoltanBars } from "../sim.ts";
import type { Crew, Game, Room, Ship } from "../types.ts";
import { sideOf } from "./leash.ts";
import { artilleryGun, hurtArtillery } from "../wiki/flagship-systems.ts";

/**
 * Fires: "0.08 system damage per second for each fire in a room (same as a single boarder)".
 * Template:Crew races (comparison): "System sabotage damage is the same for all crew and cannot be increased".
 * Crew skills, Combat skill: "always 12.5 seconds per crew for one system bar, regardless of the crew type or skills."
 */
export const SABOTAGE_RATE = 0.08;

/**
 * Boarding, "Combat": "When boarders are in a system room without hostile crew, they start sabotaging the system".
 * Boarding, "Combat": "Crew must not be moving in order to damage a target."
 * A boarder is crew aboard a ship whose effective side is not that ship's owner.
 * INFERRED: a mind-controlled crew member uses its effective side (Mind Control, "Overview": it is an ally of
 * its holder and "treated as an intruder" by its own crew). A leashed enemy on its own ship sabotages it; a leashed
 * player crew member aboard the player ship sabotages the player. A player crew member leashed while boarding the
 * enemy stops sabotaging and instead counts as a defender there.
 * INFERRED: a stunned boarder does not sabotage. A stunned defender still blocks sabotage (it is hostile crew in the room).
 */
function sabotageCounts(
  g: Game,
  aboard: "player" | "enemy",
  r: Room,
): { boarders: number; defenders: number; striking: Crew[] } {
  let boarders = 0;
  let defenders = 0;
  const striking: Crew[] = [];
  for (const c of g.crew as Crew[]) {
    if (c.aboard !== aboard || c.room !== r.id || c.hp <= 0 || c.path.length !== 0) continue;
    if (sideOf(c) === aboard) defenders++;
    else if ((c.stun ?? 0) <= 0) {
      boarders++;
      striking.push(c);
    }
  }
  return { boarders, defenders, striking };
}

/** Level and damage of the room's system or kit, or null if the room houses nothing that can be sabotaged. */
function target(ship: Ship, r: Room): { level: number; damage: number } | null {
  // @agent:flagship. A flagship artillery room is its own system (wiki/flagship-systems.ts artilleryGun).
  const gun = artilleryGun(ship, r.id);
  if (gun) return { level: ship.systems.weapons.level, damage: gun.damage };
  if (r.system) {
    const sys = ship.systems[r.system];
    if (!sys || sys.level <= 0) return null;
    return { level: sys.level, damage: sys.damage };
  }
  if (r.kit) {
    const kit = ship.kits[r.kit];
    if (!kit || kit.level <= 0) return null;
    return { level: kit.level, damage: kit.damage ?? 0 };
  }
  return null;
}

function sabotageShip(g: Game, ship: Ship, aboard: "player" | "enemy", dt: number) {
  for (const r of ship.rooms) {
    const { boarders, defenders, striking } = sabotageCounts(g, aboard, r);
    // Boarding, "Combat": "Sabotage progress is reset once there are no boarders or fires in the room."
    if (boarders === 0 && r.fire <= 0) {
      if (r.sabotage) r.sabotage = 0;
      continue;
    }
    const t = target(ship, r);
    // INFERRED: a fully destroyed system builds no further progress, so it costs hull only once per destruction.
    if (!t || t.damage >= t.level) {
      if (r.sabotage) r.sabotage = 0;
      continue;
    }
    // Boarding, "Combat": "Sabotage from boarders and fires adds up, increasing the overall progress."
    // Fires: each fire in a room deals the same 0.08/s as one boarder, whether or not crew stand there.
    // INFERRED: r.fire is this tree's fire count (each new fire adds 1, spread adds 0.5, cap 3), so a fractional
    // value contributes proportionally. INFERRED: boarders held up by hostile crew pause, not reset, the bar.
    const working = defenders > 0 ? 0 : boarders;
    // Crew skills, lead: "including inflicting sabotage damage to systems" is the same for every race.
    const rate = SABOTAGE_RATE * (working + Math.max(0, r.fire));
    if (rate <= 0) continue;
    r.sabotage = (r.sabotage ?? 0) + rate * dt;
    if (r.sabotage < 1) continue;
    // Boarding, "Combat": "When the bar is filled, the system takes 1 damage".
    // Crew skills, Combat: "one point of experience for ... damaging one system level" on "the sabotage tick".
    // "Your mind-controlled crew also gains combat experience for damaging your ship systems."
    // A fire can fill the bar and is not a crew member, so it grants nothing. A paused boarder is not the tick.
    // INFERRED: each boarder still sabotaging on that tick receives the point. The page names one tick.
    const credit = working > 0 ? striking : [];
    r.sabotage = 0;
    if (r.system) {
      if (!hurtArtillery(ship, r.id, 1))
        hurtSystem(ship, r.system, 1, zoltanBars(g.crew, ship, aboard, "shields"));
    } else if (r.kit) hurtKit(ship, r.kit, 1);
    for (const c of credit) noteCombatPoint(g, c);
    r.flash = Math.max(r.flash, 0.3);
    const after = target(ship, r);
    if (after && after.damage >= after.level) {
      // Boarding, "Combat": "if a system is completely destroyed by the sabotage, the ship takes 1 hull damage."
      // Fires: "Rock Plating and Titanium System Casing do not protect hull and systems from fire damage."
      // INFERRED: no hull or system negation applies to boarder sabotage either.
      ship.hull = Math.max(0, ship.hull - 1);
      // Per the user: fires (and boarders) destroying a system shake the ship like any other hull damage.
      if (ship === g.player) shakeShip(g);
      log(g, `${r.title} destroyed by sabotage.`);
    }
  }
}

/** Boarders and fires sabotage the system in their room on both ships. */
export function tickSabotage(g: Game, dt: number) {
  // Per the user: a fire on the player's ship damages its system with or without a fight on.
  sabotageShip(g, g.player, "player", dt);
  if (g.phase === "combat" && g.enemy) sabotageShip(g, g.enemy, "enemy", dt);
}

/** Boarding with no enemy hull: the same 0.08/s, on the player ship only. */
export function tickPlayerSabotage(g: Game, dt: number) {
  sabotageShip(g, g.player, "player", dt);
}

const BOARDER_DRONES = new Set(["board", "ionintruder"]);

/** A crew boarder standing in this room and able to attack: not walking, not stunned. Mind control uses sideOf. */
function crewAttacking(g: Game, aboard: "player" | "enemy", roomId: string): boolean {
  for (const c of g.crew) {
    if (c.aboard !== aboard || c.room !== roomId || c.hp <= 0 || c.path.length !== 0) continue;
    if (sideOf(c) !== aboard && (c.stun ?? 0) <= 0) return true;
  }
  return false;
}

/** A boarding drone or ion intruder already inside this room. In flight, stunned, or walking does not count. */
function droneAttacking(g: Game, aboard: "player" | "enemy", roomId: string): boolean {
  if (aboard === "enemy") {
    const kit = g.player.kits.swarm;
    if (!kit?.on || kit.room !== roomId || !kit.target || !BOARDER_DRONES.has(kit.target))
      return false;
    if ((kit.stun ?? 0) > 0 || (kit.path?.length ?? 0) > 0) return false;
    return kit.hp == null || kit.hp > 0;
  }
  for (const unit of g.enemy?.kits.swarm?.drones ?? []) {
    if (!unit.alive || unit.room !== roomId || !BOARDER_DRONES.has(unit.kind)) continue;
    if ((unit.fly ?? 0) > 0 || (unit.stun ?? 0) > 0 || (unit.path?.length ?? 0) > 0) continue;
    if ((unit.hp ?? 1) <= 0) continue;
    return true;
  }
  return false;
}

/**
 * Boarders are in this system's room and able to attack it.
 * `id` is a system id, a kit id, or an artillery room id.
 * A fire alone is not a boarder. Defenders do not clear the attack; they only pause sabotage.
 */
export function systemUnderBoarders(
  g: Game,
  ship: Ship,
  aboard: "player" | "enemy",
  id: string,
): boolean {
  for (const r of ship.rooms) {
    if (r.system !== id && r.kit !== id && r.id !== id) continue;
    if (crewAttacking(g, aboard, r.id) || droneAttacking(g, aboard, r.id)) return true;
  }
  return false;
}
