import type { Crew, EnemyBoarding, Game, Kit, Ship } from "../types";
import { seatKits } from "../layouts.ts";
import { cooldownLocksPower, enemyEscapeView, kitBars, kitIonLocked, log, noteZoltanKits, rand, roomById, sparePower } from "../sim.ts";
import { bypassZoltan } from "../wiki/cited-bypass.ts";
import { mendOnSend } from "./moreaugs.ts";
import { heldByEnemy } from "./leash.ts";
import { veilBlocks } from "./veil.ts";

/** Crew Teleporter wiki, "System Upgrades": level 1 cost is 90. */
const INSTALL_COST = 90;

/** Crew Teleporter wiki, "System Upgrades": level 3 is 10 sec, level 2 is 15 sec, level 1 is 20 sec. */
function cooldown(level: number): number {
  if (level >= 3) return 10;
  if (level === 2) return 15;
  return 20;
}

/** Crew Teleporter wiki, "System Upgrades": the level 2 row costs 30, the level 3 row costs 60. */
function upgradeCost(level: number): number | null {
  if (level === 1) return 30;
  if (level === 2) return 60;
  return null;
}

function sling(g: Game): Kit | undefined {
  return g.player.kits.sling;
}

function blank(): Kit {
  return {
    id: "sling",
    level: 1,
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

/**
 * Crew Teleporter wiki, "Overview": a use needs the system powered, then it waits out its cooldown.
 * INFERRED: power must already equal the system level. The page never states a reactor-bar count.
 */
function canRun(kit: Kit): boolean {
  // Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars).
  // INFERRED: "full power" is every undamaged bar, and at least one must work.
  return kitBars(kit) >= kit.level - (kit.damage ?? 0) && kitBars(kit) > 0 && kit.cool <= 0;
}

function arm(kit: Kit, target: string | null) {
  kit.aux = 0;
  kit.target = target;
  kit.on = false;
  kit.left = 0;
  kit.cool = cooldown(kit.level);
}

function livingOnLark(g: Game): Crew[] {
  return g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
}

/**
 * Crew Teleporter wiki, "Overview": send as many crew as there are pads.
 * INFERRED: the cap is 2, from "Ships can have only 2-tile Teleporter rooms."
 * That sentence also names four-person rooms (Mantis B, Mantis C, Crystal B); this pick never uses 4.
 * Selected crew go first (even the lone pilot). Otherwise medbay, then any room.
 * The only person in piloting stays put when someone else can go. The page states neither of those orders.
 */
function pickCrew(g: Game): Crew[] {
  const living = livingOnLark(g);
  if (living.length === 0) return [];

  const pilots = living.filter((c) => c.room === "p-pilot");
  const lonePilot = pilots.length === 1 && living.length > 1 ? pilots[0] : null;
  const selected = g.selected ? (living.find((c) => c.id === g.selected) ?? null) : null;

  const picked: Crew[] = [];
  if (selected) picked.push(selected);

  const medbay = living.filter((c) => c.room === "p-medbay");
  const rest = living.filter((c) => c.room !== "p-medbay");
  for (const c of [...medbay, ...rest]) {
    if (picked.length >= 2) break;
    if (picked.includes(c)) continue;
    if (lonePilot && c === lonePilot && c !== selected) continue;
    picked.push(c);
  }
  return picked;
}

/** Crew Teleporter wiki, "System Upgrades": spends the level 1 cost of 90. */
export function installSling(g: Game) {
  if (g.player.kits.sling) return;
  if (g.scrap < INSTALL_COST) return;
  g.scrap -= INSTALL_COST;
  g.player.kits.sling = blank();
  seatKits(g.player); // Kit room (layouts.ts): a bought system takes its hull's room.
  log(g, "Teleporter fitted to the Lark.");
}

/** Crew Teleporter wiki, "System Upgrades": pays the next row, 30 then 60. */
export function upgradeSling(g: Game) {
  const kit = sling(g);
  if (!kit) return;
  const cost = upgradeCost(kit.level);
  if (cost == null || g.scrap < cost) return;
  g.scrap -= cost;
  kit.level += 1;
  log(g, `Sling raised to level ${kit.level}.`);
}

/**
 * Crew Teleporter wiki, "Overview".
 * INFERRED: one bar is added or removed at a time, and power stops at the system level.
 * The page never states a reactor-bar count.
 */
export function toggleSlingPower(g: Game) {
  const kit = sling(g);
  if (!kit || cooldownLocksPower(kit)) return;
  // Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars).
  if (kit.power < kit.level - (kit.damage ?? 0) && sparePower(g.player) > 0) {
    kit.power += 1;
    return;
  }
  if (kit.power > 0) kit.power -= 1;
}

/**
 * Crew Teleporter wiki, "Overview": send crew onto the enemy ship, then the system cools down.
 * INFERRED: the pad count is 2 ("only 2-tile Teleporter rooms"). Cooldown seconds are under "System Upgrades".
 */
export function sendSling(g: Game, roomId: string) {
  const kit = sling(g);
  if (!kit) return;
  noteZoltanKits(g);
  // Zoltans: the Crew Teleporter cannot be activated if it is ionized. A Zoltan bar does not clear that lock.
  if (kitIonLocked(kit)) return;
  if (!canRun(kit) && kit.cool <= 0) {
    log(g, "Teleporter has no power.");
    return;
  }
  if (kit.cool > 0) {
    log(g, "Teleporter is still cooling.");
    return;
  }
  if (g.phase !== "combat" || !g.enemy || !roomById(g.enemy, roomId)) {
    log(g, "No hull to teleport onto.");
    return;
  }
  const crew = pickCrew(g);
  if (crew.length < 1) {
    log(g, "No one to teleport.");
    return;
  }
  // Zoltan Shield: the bubble prevents boarding. Bypass lets crew teleport through and does not spend the bubble.
  if ((g.enemy.zoltan ?? 0) > 0 && !(g.augments.includes("bypass") && bypassZoltan("crew") === "pass")) {
    log(g, "Their Zoltan Shield blocks the teleporter.");
    return;
  }
  for (const c of crew) {
    c.aboard = "enemy";
    c.room = roomId;
    c.path = [];
    c.move = 0;
    // Augmentations, "Crew Augmentations", Reconstructive Teleport: a send heals to full.
    if (mendOnSend(g)) c.hp = c.maxHp;
  }
  arm(kit, roomId);
  log(g, `Teleporter sends ${crew.map((c) => c.name).join(" and ")}.`);
}

/**
 * Crew Teleporter wiki, "Overview": bring crew back, then cool down ("System Upgrades" for the seconds).
 * The heading says "Can retrieve up to 4 crew"; this pull has no cap of 4.
 * They are always set down in the medbay. The page says overflow crew go to adjacent rooms and does not name the medbay.
 */
export function recallSling(g: Game) {
  const kit = sling(g);
  if (!kit) return;
  noteZoltanKits(g);
  // Zoltans: the Crew Teleporter cannot be activated if it is ionized.
  if (kitIonLocked(kit)) return;
  if (!canRun(kit)) {
    if (kit.cool <= 0) log(g, "Teleporter has no power.");
    else if (kit.cool > 0) log(g, "Teleporter is still cooling.");
    return;
  }
  // Mind Control: "A player cannot teleport own mind-controlled crew from the enemy ship".
  const away = g.crew.filter((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0 && !heldByEnemy(c));
  if (away.length < 1) {
    log(g, "No one to pull back.");
    return;
  }
  for (const c of away) {
    c.aboard = "player";
    // Kit room: Crew Teleporter, "Overview": "Retrieved crew that cannot fit in the teleporter room will be placed in
    // adjacent room(s)". The medbay landing stays where there is one; hulls without a medbay room use the pads.
    c.room = roomById(g.player, "p-medbay") ? "p-medbay" : (g.player.rooms.find((r) => r.kit === "sling")?.id ?? g.player.rooms[0].id);
    c.path = [];
    c.move = 0;
    if (mendOnSend(g)) c.hp = c.maxHp;
  }
  arm(kit, null);
  log(g, "Teleporter pulls them back.");
}

/**
 * Backup Battery, Overview, the IN DANGER note: combat, being boarded, solar flares, pulsars,
 * asteroid fields, and a hostile anti-ship battery.
 * The Ship page's nebula and ion-storm banner is not that list.
 */
export function shipInDanger(g: Game): boolean {
  if (g.phase === "combat") return true;
  if (g.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0)) return true;
  // INFERRED: g.asb is the hostile battery. The sim does not store a separate friendly battery.
  return !!(g.asteroid || g.pulsar || g.flare || g.asb);
}

/**
 * Crew Teleporter wiki, "Overview": "When your ship is not in danger, the cooldown is reset instantly."
 * Only the player's teleporter. The enemy bullet list does not say this.
 */
export function relaxSling(g: Game) {
  if (shipInDanger(g)) return;
  const kit = sling(g);
  if (!kit || kit.cool <= 0) return;
  kit.cool = 0;
  log(g, "Teleporter is ready.");
}

/**
 * Crew Teleporter wiki, "Overview": the system ionizes itself between uses.
 * "System Upgrades" sets that wait at 20, 15, or 10 seconds. This only counts the timer down while in danger.
 */
export function tickSling(g: Game, dt: number) {
  relaxSling(g);
  if (!shipInDanger(g)) return;
  const kit = sling(g);
  if (!kit || kit.cool <= 0) return;
  kit.cool -= dt;
  if (kit.cool < 0) kit.cool = 0;
}

/**
 * Crew Teleporter wiki, "Overview": crew left on the enemy ship when either ship jumps are permanently lost.
 * INFERRED: that loss is stored as 0 hp. The page does not state a hit-point value.
 */
export function onJumpSling(g: Game) {
  for (const c of g.crew) {
    if (c.side !== "player" || c.aboard !== "enemy" || c.hp <= 0) continue;
    c.hp = 0;
    log(g, `${c.name} is lost on the other hull.`);
  }
}

// ---------------------------------------------------------------------------------------------
// Enemy Crew Teleporter. Crew Teleporter wiki, "Enemy Crew Teleporter" (the bullet list under that heading).
// ---------------------------------------------------------------------------------------------

/** The enemy teleporter room id (enemy-gen.ts names the room after its kit). */
const PADS = "e-teleporter";

/**
 * Crew Teleporter, "Enemy Crew Teleporter": "When their crew is low on health (below 25% HP)."
 * Strictly below, as the page words it.
 */
const RECALL_HP = 0.25;

/**
 * INFERRED: a crew member needs at least half health to join a boarding party. The page gives no
 * send threshold; this keeps a crew member that was just pulled back at under 25% from being sent
 * straight back before it heals.
 */
const SEND_HP = 0.5;

/** Crew Teleporter, "Enemy Crew Teleporter": "...the remaining timer is less than 15 seconds." */
const RECALL_ESCAPE_SECONDS = 15;

/** Crew Teleporter, "Enemy Crew Teleporter": "...three or more completely broken systems." */
const RECALL_BROKEN = 3;

/** The enemy hull's working teleporter kit, or undefined when it has none (or no pad room). */
function enemySling(g: Game): Kit | undefined {
  const ship = g.enemy;
  const kit = ship?.kits.sling;
  if (!ship || !kit || kit.level <= 0 || !roomById(ship, PADS)) return undefined;
  return kit;
}

/**
 * Crew Teleporter, "Enemy Crew Teleporter": "The enemy ships will usually send their crew as boarders
 * to the player ship, if the circumstances and the crew count allows, 2 times." ... "The Rebel Elite
 * ships can send their boarders 3 or 4 times."
 * INFERRED: 3 or 4 is an even roll per fight. The page does not weight them.
 */
function boardingLimit(g: Game, ship: Ship): number {
  if (/^elite-/.test(ship.classId ?? "")) return rand(g) < 0.5 ? 3 : 4;
  return 2;
}

function boardingPlan(g: Game, ship: Ship): EnemyBoarding {
  if (!ship.boarding) ship.boarding = { sent: 0, limit: boardingLimit(g, ship), party: [], away: [], home: {} };
  return ship.boarding;
}

/** Room graph walk over interior doors, the same rule sim.ts uses for crew orders. */
function route(ship: Ship, from: string, to: string): string[] | null {
  if (from === to) return [];
  const prev = new Map<string, string | null>([[from, null]]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const d of ship.doors) {
      if (d.b === "void") continue;
      const n = d.a === cur ? d.b : d.b === cur ? d.a : null;
      if (!n || prev.has(n)) continue;
      prev.set(n, cur);
      if (n === to) {
        const path: string[] = [];
        let w: string | null = to;
        while (w && w !== from) {
          path.push(w);
          w = prev.get(w) ?? null;
        }
        return path.reverse();
      }
      q.push(n);
    }
  }
  return null;
}

/** Sets a walk with the regular crew movement in sim.ts (moveCrew steps along c.path). */
function walkTo(ship: Ship, c: Crew, dest: string) {
  if (c.room === dest) {
    c.path = [];
    c.move = 0;
    return;
  }
  if (c.path.length && c.path[c.path.length - 1] === dest) return;
  const path = route(ship, c.room, dest);
  if (!path) return;
  c.path = path;
  c.move = 0;
}

/**
 * Crew Teleporter, "Enemy Crew Teleporter": "When the enemy ship has three or more completely broken
 * systems." INFERRED: completely broken means damage at or above the installed level. Systems and
 * subsystem kits both count, since the page says "systems" and the teleporter itself is one.
 */
export function enemyBrokenSystems(ship: Ship): number {
  let n = 0;
  for (const sys of Object.values(ship.systems)) if (sys.level > 0 && sys.damage >= sys.level) n += 1;
  for (const kit of Object.values(ship.kits)) if (kit && kit.level > 0 && (kit.damage ?? 0) >= kit.level) n += 1;
  return n;
}

/**
 * Crew Teleporter, "Enemy Crew Teleporter": "If the player has active Zoltan Shield (which prevents
 * hostile teleportation), the enemy ship will not keep their crew standing on the teleporter pads."
 * The Zoltan Shield Bypass augment is the player's, so it never helps the enemy here.
 */
function zoltanBlocks(g: Game): boolean {
  return (g.player.zoltan ?? 0) > 0;
}

/**
 * Crew Teleporter: "Cloaking prevents hostile crew from teleporting onto or from the opposing ship
 * (e.g. ... enemy crew cannot teleport onto or from a cloaked player ship)."
 */
function playerCloaked(g: Game): boolean {
  return veilBlocks(g, "enemy");
}

/**
 * Crew Teleporter, "Enemy Crew Teleporter": "This cooldown takes between 20 and 10 seconds, depending on
 * the system upgrade level." A use also needs the system working (at least one undamaged, powered bar).
 */
function ready(kit: Kit): boolean {
  // Zoltans: an ionized Crew Teleporter cannot be activated.
  if (kitIonLocked(kit)) return false;
  return kitBars(kit) > 0 && kit.cool <= 0;
}

/**
 * Crew Teleporter, "Mind Control and Crew Teleporter": "the enemy cannot teleport their mind-controlled
 * crew from the player's ship." INFERRED: a mind-controlled crew member on its own hull is not sent either.
 */
function leashed(c: Crew): boolean {
  return (c.leashed ?? 0) > 0;
}

function aliveById(g: Game, id: string): Crew | undefined {
  return g.crew.find((c) => c.id === id && c.hp > 0 && c.side === "enemy");
}

/**
 * INFERRED: where a crew member walks after leaving the pads or being pulled back. A hurt one
 * (under the send threshold) goes to the medbay if the hull has one; anyone else returns to the station
 * they left. The page says the enemy pulls crew back "to heal" only in an editor comment.
 */
function goHome(ship: Ship, b: EnemyBoarding, c: Crew) {
  const medbay = ship.systems.medbay?.level > 0 ? ship.rooms.find((r) => r.system === "medbay") : undefined;
  const dest = c.hp < c.maxHp * SEND_HP && medbay ? medbay.id : (b.home[c.id] ?? c.room);
  walkTo(ship, c, dest);
}

/**
 * Crew Teleporter, "Enemy Crew Teleporter": "The enemy ship will recall its boarding party (or separate
 * boarders, if they are not in the same room at the moment of recall) in several circumstances".
 * - "When their crew is low on health (below 25% HP)." INFERRED: the hurt boarder is pulled with any
 *   party member in its room, per "separate boarders, if they are not in the same room".
 * - "When the enemy ship is running away and the remaining timer is less than 15 seconds." Everyone.
 * - "When the enemy ship has three or more completely broken systems." Everyone.
 * INFERRED: a recall is a teleporter use, so it needs working bars and no cooldown, and starts the
 * cooldown. Basis, "Hacking pulse and Crew Teleporter": a forced recall puts "the system on cooldown if
 * anyone was successfully recalled". Zoltan Shields and the player's cloak block it ("Zoltan Shields
 * block teleportation"; cloaking blocks teleporting "onto or from a cloaked player ship").
 * "(note that this does not apply ... to the boarders carried over from previous beacons)": only crew this
 * teleporter sent this fight (b.away) are ever recalled.
 */
function recallBoarders(g: Game, ship: Ship, kit: Kit, b: EnemyBoarding) {
  if (!b.away.length) return;
  const crew = b.away.map((id) => aliveById(g, id)).filter((c): c is Crew => !!c && !leashed(c));
  if (!crew.length) return;
  const escape = enemyEscapeView(g);
  const fleeing = escape != null && escape.left < RECALL_ESCAPE_SECONDS;
  const wrecked = enemyBrokenSystems(ship) >= RECALL_BROKEN;
  let pull: Crew[];
  if (fleeing || wrecked) pull = crew;
  else {
    const hurt = crew.filter((c) => c.hp < c.maxHp * RECALL_HP);
    pull = crew.filter((c) => hurt.some((h) => h.room === c.room));
  }
  if (!pull.length) return;
  if (!ready(kit) || zoltanBlocks(g) || playerCloaked(g)) return;
  for (const c of pull) {
    c.aboard = "enemy";
    c.room = PADS;
    c.path = [];
    c.move = 0;
    c.think = 0;
    goHome(ship, b, c);
  }
  b.away = b.away.filter((id) => !pull.some((c) => c.id === id));
  kit.cool = cooldown(kit.level);
  log(g, pull.length > 1 ? "They pull their boarders back." : "They pull a boarder back.");
}

/** True while a recall circumstance holds for the whole party, so no new party is sent into it (INFERRED). */
function recallWeather(g: Game, ship: Ship): boolean {
  const escape = enemyEscapeView(g);
  return (escape != null && escape.left < RECALL_ESCAPE_SECONDS) || enemyBrokenSystems(ship) >= RECALL_BROKEN;
}

/**
 * INFERRED party size: up to 2 (the pads, "Ships can have only 2-tile Teleporter rooms"), keeping 1 crew
 * home when the hull has 3 or fewer aboard and 2 when it has 4 or more. The pilot always stays.
 * Basis: the Flagship "will send all its crew except for 1 or 2 crewmembers" (same section); the
 * regular "if ... the crew count allows" gives no number.
 * INFERRED: one party at a time. A new one forms only after the last is recalled or dead.
 * INFERRED: healthiest first, at least half health.
 */
function formParty(g: Game, ship: Ship, b: EnemyBoarding) {
  if (b.sent >= b.limit || b.away.length > 0 || b.party.length > 0) return;
  const home = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0 && !leashed(c));
  const keep = home.length >= 4 ? 2 : 1;
  const size = Math.min(2, home.length - keep);
  if (size <= 0) return;
  const pilot = ship.rooms.find((r) => r.system === "pilot")?.id ?? "e-pilot";
  const picks = home
    .filter((c) => c.room !== pilot && c.hp >= c.maxHp * SEND_HP)
    .sort((a, z) => z.hp / z.maxHp - a.hp / a.maxHp)
    .slice(0, size);
  if (!picks.length) return;
  for (const c of picks) {
    // A crew member still walking back from an earlier trip keeps that station as home.
    b.home[c.id] = c.path.length ? c.path[c.path.length - 1] : c.room;
    walkTo(ship, c, PADS);
  }
  b.party = picks.map((c) => c.id);
}

/**
 * Crew Teleporter, "Enemy Crew Teleporter": "Unlike the player, the enemy waits till their crew is
 * standing on the teleporter pads and only then sends them to the player ship."
 * INVENTED: the party lands together in one random player room (the page does not say where).
 */
function sendParty(g: Game, ship: Ship, kit: Kit, b: EnemyBoarding) {
  const party = b.party.map((id) => aliveById(g, id)).filter((c): c is Crew => !!c);
  if (!party.length) return;
  // Everyone keeps walking until they stand on the pads.
  for (const c of party) if (c.room !== PADS && c.path.length === 0) walkTo(ship, c, PADS);
  if (!party.every((c) => c.room === PADS && c.path.length === 0)) return;
  if (!ready(kit)) return;
  const landing = g.player.rooms[Math.floor(rand(g) * g.player.rooms.length)]?.id;
  if (!landing) return;
  for (const c of party) {
    c.aboard = "player";
    c.room = landing;
    c.path = [];
    c.move = 0;
    // sim.ts wanderBoarders takes over once this runs out.
    c.think = 2;
  }
  b.away.push(...party.map((c) => c.id));
  b.party = [];
  b.sent += 1;
  kit.cool = cooldown(kit.level);
  log(g, "Boarders on the hull.");
}

/**
 * Enemy boarding, called from sim.ts boarders(). Crew Teleporter, "Enemy Crew Teleporter".
 * INFERRED: nothing starts until g.boardTimer (9 s, set in startCombat for a hull with a teleporter) runs out;
 * then the party walks to the pads. The page gives no opening delay.
 * The enemy's teleporter cooldown is counted down here (tickSling counts only the player's).
 */
export function tickEnemyBoarding(g: Game, dt: number) {
  const ship = g.enemy;
  const kit = enemySling(g);
  if (!ship || !kit) {
    if (g.boardTimer > 0) g.boardTimer = Math.max(0, g.boardTimer - dt);
    return;
  }
  if (kit.cool > 0) kit.cool = Math.max(0, kit.cool - dt);
  if (g.boardTimer > 0) {
    g.boardTimer = Math.max(0, g.boardTimer - dt);
    if (g.boardTimer > 0) return;
  }
  const b = boardingPlan(g, ship);
  b.away = b.away.filter((id) => {
    const c = aliveById(g, id);
    return !!c && c.aboard === "player";
  });
  // A party member that died, was mind-controlled, or fell under the recall line leaves the party.
  b.party = b.party.filter((id) => {
    const c = aliveById(g, id);
    if (!c || c.aboard !== "enemy") return false;
    if (leashed(c) || c.hp < c.maxHp * RECALL_HP) {
      goHome(ship, b, c);
      return false;
    }
    return true;
  });

  recallBoarders(g, ship, kit, b);

  // Crew Teleporter, "Enemy Crew Teleporter": "...the enemy ship will not keep their crew standing on the
  // teleporter pads. But as soon the Zoltan Shield is down and the circumstances allow, the enemy ship will
  // order its crew to board the player ship."
  if (zoltanBlocks(g)) {
    if (b.party.length) {
      for (const id of b.party) {
        const c = aliveById(g, id);
        if (c) goHome(ship, b, c);
      }
      b.party = [];
      log(g, "The Zoltan Shield stops the boarders.");
    }
    return;
  }
  if (recallWeather(g, ship)) return;
  formParty(g, ship, b);
  // INFERRED: a player cloak holds the party on the pads (the page names no step-off for cloaking).
  if (playerCloaked(g)) return;
  sendParty(g, ship, kit, b);
}
