import type { KinId } from "./extras/kin.ts";
import type { EscapePlan } from "./wiki/escape.ts";
import type { SurrenderPlan } from "./wiki/surrender.ts";
import type { FlagshipState } from "./wiki/flagship-systems.ts";

export type SysId =
  | "shields"
  | "engines"
  | "oxygen"
  | "medbay"
  | "weapons"
  | "pilot"
  | "sensors"
  | "doors";

export type WeaponKind = "laser" | "missile" | "ion" | "beam" | "flak" | "bomb";

/** A point on a hull grid, in tile units. The integer part is the cell. */
export type BeamPoint = { x: number; y: number };

/** Player beam swipe. Both ends are clicks on the enemy ship, in tile space. */
export type BeamLine = { a: BeamPoint; b: BeamPoint };

export type SystemState = {
  level: number;
  power: number;
  damage: number;
  /** Seconds left on each ion point. One point locks one bar for 5s. */
  ion: number[];
  fix: number;
  /**
   * Reactor bars a standing Zoltan presence has already replaced.
   * Shields peel pairs and do not put them back. Engines, the medbay, and oxygen
   * replace a full system and do not put them back. Weapons put them back from spare
   * when the Zoltans leave a system that is no longer full.
   */
  zoltanHeld?: number;
};

export type Room = {
  id: string;
  title: string;
  system: SysId | null;
  /** Subsystem kit housed in this room (enemy hulls from enemy-gen.ts). Weapon hits damage it. */
  kit?: KitId;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Cells inside the box that are hull, not floor. */
  omit?: { x: number; y: number }[];
  o2: number;
  fire: number;
  breach: number;
  breachFix: number;
  fireTick: number;
  flash: number;
  venting: boolean;
  /** Seconds of crystal coating left. Absent means the room is not coated. */
  lock?: number;
  /**
   * Crystal Lockdown: this coating was already up when a hacking drone attached.
   * When it melts, the room's doors are left with 4 hits. A pulse during the coating,
   * or another lockdown, clears it.
   */
  lockHack?: boolean;
  /** Boarding, "Combat": sabotage bar (0..1) from boarders and fires. At 1 the room's system takes 1 damage. Absent means 0. */
  sabotage?: number;
  /**
   * @agent:hacking. Player rooms only: an enemy hacking drone is latched onto this room's system ("latched"),
   * or its pulse is running ("pulse"). Written each combat tick by extras/spike.ts; ShipView draws it.
   */
  hacked?: "latched" | "pulse";
};

export type Door = {
  a: string;
  b: string | "void";
  open: boolean;
  /** Hits left before a boarder breaks a blast door. */
  hp: number;
  /**
   * Crystal Lockdown coating hits still left. Separate from `hp`: the coating resets blast-door
   * health, and the door level does not change the coating. Absent means this door is not coated.
   */
  coat?: number;
  /** Seconds a broken door stays stuck open. */
  stuck: number;
  /**
   * @agent:hacking. Locked by a hack (extras/spike.ts). Hacking, "Overview": "Hacked doors are equivalent to
   * level 3 blast doors" for the hacked ship's crew. Boarding, "Doors": boarders and mind-controlled crew pass.
   */
  hacked?: boolean;
};

/** One orange bar on a hangar cutaway. Side is the edge of cell (x, y). */
export type DoorSide = "n" | "e" | "s" | "w";

export type DoorMark = {
  x: number;
  y: number;
  side: DoorSide;
};

export type SkillName = "pilot" | "engines" | "weapons" | "shields" | "repair" | "combat";

export type Crew = {
  id: string;
  name: string;
  side: "player" | "enemy";
  aboard: "player" | "enemy";
  hp: number;
  maxHp: number;
  room: string;
  path: string[];
  move: number;
  /**
   * Tile "x,y" the sprite starts this hop from.
   * A fresh order records the tile they were standing on. Later hops record the doorway.
   * Absent means the front standing tile. Cleared when the walk finishes.
   */
  via?: string;
  /**
   * Boarding party management: place in the destination room. Lower stands at the front
   * and is struck first. Set when this body is ordered. Absent sorts as 0.
   */
  file?: number;
  /**
   * Teleporter pad "x,y" this body was ordered onto.
   * Absent means they were not given a pad, so a send leaves them behind.
   */
  pad?: string;
  /**
   * INFERRED from the controls list (Save Stations / Return to Stations).
   * The room this crew member was standing in on the player ship when stations were saved.
   */
  station?: string;
  think: number;
  tone: number;
  /** Hangar uniform swatch from crew-look.ts. Absent falls back to `tone`. */
  uniform?: number;
  skills?: Partial<Record<SkillName, number>>;
  /** Lineage id from extras/kin.ts. Absent means the baseline row. */
  kin?: KinId;
  /** Seconds left fighting for the other side. */
  leashed?: number;
  /** Mind Control health boost (+15 at level 2, +30 at level 3) added to maxHp and hp while leashed (extras/leash.ts). */
  leashBoost?: number;
  /** Seconds until a clone finishes. Set only while this body is waiting. */
  cloneIn?: number;
  /**
   * Crew skills, Combat: "killing cloned crew ... doesn't grant experience."
   * Set when a Clone Bay returns this body. Absent means the original.
   */
  cloned?: boolean;
  /** Clone Bay queue position, either side (lower clones first, "one-by-one"). Set only while `cloneIn` is set. */
  cloneSeq?: number;
  /** Seconds this body cannot act. Hacking Stun sets this for the pulse. */
  stun?: number;
  /**
   * Seconds since this crew's last blow. Boarding, Combat: damage is per hit, "every few moments".
   * INFERRED: the pause is 1 second. Absent means the pause has not started.
   */
  swing?: number;
  /** Seconds until this Crystal can coat a room again. Absent means ready, or not a Crystal. */
  lockCool?: number;
  /**
   * Boarders: Humans (Abandoned): these humans have Emergency Respirators.
   * The note names the augment; the 50% is the printed half (INFERRED on the boarder, not a hull augment).
   */
  lungs?: boolean;
};

export type WeaponInst = {
  uid: string;
  defId: string;
  /**
   * Progress of the shot currently charging, from 0 to 1.
   * A charger (Ion Charger, Laser Charger, Laser Charger (S), Laser Charger Mark II)
   * uses this for one shot. The bank lives in `loaded`. Every other gun still fills
   * one bar for its whole volley.
   */
  charge: number;
  /**
   * Finished charger shots waiting to fire. Absent means 0.
   * Ion (Weapons), Ion Charger, and Laser (Weapons), the three charger rows:
   * each shot charges on its own, and a click fires however many are stored.
   */
  loaded?: number;
  enabled: boolean;
  autofire: boolean;
  /**
   * Weapon Control, Overview: Ctrl on this slot reverses the all-weapons autofire setting.
   * Absent means the slot follows autofireAll.
   */
  autoInvert?: boolean;
  target: string | null;
  /**
   * Bomb (Weapons), lead: a bomb aimed at your own ship. Absent or false means the enemy hull.
   * Other weapons cannot set it.
   */
  own?: boolean;
  /**
   * Drawn swipe, in the enemy hull's tile space. The rooms on this segment are the shot.
   * Absent until the player has clicked both ends. Enemy beams do not set it.
   */
  beamLine?: BeamLine | null;
  /**
   * Chain step. Absent is the first printed step.
   * Laser (Weapons): Chain Burst 16/13/10/7, Chain Vulcan 11.1 down to 1.1.
   * Ion (Weapons): Chain Ion deals 1, then 2, 3, and 4 ion. Its charge stays 14 seconds.
   * Losing power resets this. A cloak pause does not.
   */
  chain?: number;
  /**
   * Crew skills, Weapons: seconds left to turn this gun off and drop the shot that just trained.
   * INFERRED: 0.15. The page prints no duration. A beam flight is 0.32s, so the shot has not landed.
   */
  muzzle?: number;
  /** Shot ids from the launch that opened `muzzle`. */
  muzzleShots?: string[];
};

export type Shot = {
  id: string;
  kind: WeaponKind;
  from: "player" | "enemy" | "env";
  /**
   * Environmental Hazards, Asteroid Field: an env shot aimed at one hull.
   * Absent keeps the old rule, so an env shot still hits the player.
   */
  at?: "player" | "enemy";
  damage: number;
  ion: number;
  fireChance: number;
  breachChance: number;
  targetRoom: string;
  beamRooms?: string[];
  /** Player swipe in the target hull's tile space. The flight draws this segment. */
  beamLine?: BeamLine;
  /** Weapon id, when the shot was launched from a mount. Tests may set it. */
  defId?: string;
  /**
   * Bomb (Weapons), lead: this bomb was aimed at the shooter's own hull.
   * Absent means the other hull, which is every non-bomb shot.
   */
  own?: boolean;
  /**
   * Missile (Weapons), ===Swarm Missiles===: this shot's long-side tile is not a room.
   * applyImpact deals nothing. Absent means the shot still aims at targetRoom.
   */
  offRoom?: boolean;
  wait: number;
  t: number;
  duration: number;
  label?: string;
  /**
   * @agent:flagship. Chance (0..1) to stun the crew in the struck room. Only the stage-3 Power Surge lasers set it
   * ("The Rebel Flagship", "Final stage" / "Power Surge": "20% stun"); sim.ts strikeRoom rolls it.
   */
  stunChance?: number;
};

export type KitId =
  | "veil"
  | "sling"
  | "spike"
  | "swarm"
  | "leash"
  | "cradle"
  | "cell"
  | "lance"
  | "flak";

export type Kit = {
  id: KitId;
  level: number;
  /** Reactor bars currently fed into this kit. Subsystems stay at 0. */
  power: number;
  /**
   * Living Zoltans in this kit's room. Stamped by noteZoltanKits. Not reactor power.
   * Wiki page "Zoltans": one yellow bar, and it is not removed by ion.
   */
  zoltan?: number;
  /**
   * Seconds left on each ion point. Zoltans: Cloaking, Hacking, Mind Control, and Crew Teleporter
   * cannot be activated while any point remains. Same 5s point as a system, up to 5. Absent means none.
   */
  ion?: number[];
  /** Seconds of the active effect left. */
  left: number;
  /** Seconds until it can be started again. */
  cool: number;
  /** Aimed room id or system id. */
  target: string | null;
  on: boolean;
  /** Module scratch timer (shield-drop cadence, drone shot cadence). */
  aux: number;
  /**
   * Combat drone orbit, degrees. Drone Control, "Combat Drones (offensive drones)":
   * the drone flies to a new angle and fires when it arrives. Absent until that flight starts.
   */
  heading?: number;
  /** Destination angle for the flight in `left`. Absent until a leg is chosen. */
  bearing?: number;
  /** Bars knocked out by weapon hits on the kit's room (enemy hulls). Absent means 0. */
  damage?: number;
  /** Repair progress on the next damaged bar, in crew-seconds. */
  fix?: number;
  /** System Repair drone's room. Absent until that crew drone is deployed. */
  room?: string;
  /** Rooms the System Repair drone has not entered yet. */
  path?: string[];
  /** Progress toward the next room, from 0 to 1. */
  move?: number;
  /**
   * System Repair: the system room this drone was standing in when power came back.
   * That system is finished before any higher-priority job. Absent means it is not stuck.
   */
  stick?: string;
  /** System Repair: walking back to Drone Control, and not taking a new job until it arrives. */
  home?: boolean;
  /** System Repair: power was off, so the next powered tick reassesses from the room it is in. */
  hold?: boolean;
  /**
   * Zoltans, lead: Zoltan ids already in this room during the current cooldown.
   * A new arrival replaces one locked reactor bar. Absent means this cooldown has not been seen yet.
   */
  swap?: string[];
  /**
   * Reactor bars Zoltans have displaced in Drone Control while the system is full.
   * Same stamp as SystemState.zoltanHeld. Leaving restores them from spare.
   */
  zoltanHeld?: number;
  /**
   * @agent:drones. Enemy Drone Control: the schematics this hull fields this fight (enemy-gen.ts).
   * Absent on the player kit and on hand-built test kits, which keep the single `target` drone.
   */
  loadout?: string[];
  /** @agent:drones. Enemy drones deployed this fight, one per loadout slot. Absent until the first combat tick. */
  drones?: DroneUnit[];
  /**
   * Player turned this deployed drone off.
   * Zoltans: while Zoltan power alone fully powers the schematic, that switch does nothing.
   * Absent means it is not manually depowered.
   */
  idle?: boolean;
  /** @agent:drones. Seconds the player's deployed drone is stunned (enemy Anti-Combat Drone). */
  stun?: number;
  /** @agent:drones. Seconds elapsed in the player drone's current ion stun (swarm.ts ionHitsKit). Absent otherwise. */
  ionT?: number;
  /** @agent:drones. Seconds until the player can redeploy after a drone was destroyed (swarm.ts REDEPLOY_S). */
  lost?: number;
  /**
   * System Repair Drone: set when that drone is destroyed. A redeploy ignores fires in other rooms
   * until Drone Control has no damage. Absent means this deployment was not a rebuild.
   */
  coldFires?: boolean;
  /**
   * System Repair Drone, dying animation. Drone Control: it briefly keeps repairing, preserves the
   * bar already underway, and ignores intruders. Absent means it is not in that animation.
   */
  dying?: boolean;
  /** Ion Intruder health while that schematic is deployed. Drone Control: "Health: 125 HP". */
  hp?: number;
  /**
   * Ion Intruder: a blast door took damage since the last pulse.
   * Drone Control: "Will skip its cooldown if it attacked a blast door ... beforehand."
   */
  doorHit?: boolean;
  /** The door already counted for that skip, so the same door does not skip again. */
  doorChew?: string;
  /** @agent:hacking. Enemy hacking drone: seconds of flight left. Absent while no drone is flying (extras/spike.ts). */
  hackFly?: number;
  /** @agent:hacking. Enemy hacking drone: the full flight time rolled at launch, for flight progress in the fx. */
  hackFlyTotal?: number;
  /** @agent:hacking. Enemy hacking drone: latched onto the player hull on `target`. */
  hackLatched?: boolean;
  /**
   * @agent:hacking. Backup Battery only: reactor bars an enemy Hacking pulse takes away right now (extras/spike.ts sets
   * it, extras/cell.ts subtracts it). Hacking wiki, "Overview" (Backup Battery): "temporarily removes two regular power
   * bars from reactor". Absent means 0.
   */
  drained?: number;
  /**
   * Backup Battery, Overview: ion points that arrived at `ionAt`.
   * Two 1-ion sources at the same time cover a level 2 battery.
   * INFERRED: a later game time does not add. The maximum gap is an HTML to-do, so this is not a numbered window.
   * These are not a system ion track, and the page says that single point has no ion mark in the GUI.
   */
  ionAt?: number;
  /** Points counted at `ionAt`. Absent means none. */
  ionN?: number;
  /** @agent:hacking. Player crew id an enemy Mind Control hack is holding this pulse. */
  hackHeld?: string;
  /**
   * @agent:hack-rules. Player Hacking only: a launch picked while paused, committed on the next unpaused tick
   * (extras/spike.ts). Hacking wiki, "Choosing your hacking target": "Once the game is unpaused, this choice is permanent".
   */
  hackQueued?: boolean;
};

/**
 * @agent:drones. One drone an enemy Drone Control has deployed (extras/swarm.ts).
 * Drone Control, Overview: "Enemies can have up to 4 active drones".
 */
export type DroneUnit = {
  /** Stable id. CombatFx keys the orbit and the shot muzzle on it. */
  id: string;
  /** Schematic id, the same strings as Kit.target ("striker", "ward", "beam2", "ionintruder", …). */
  kind: string;
  /** False once destroyed. `cool` then counts the redeploy delay. */
  alive: boolean;
  /** True while Drone Control bars cover it this tick. */
  powered: boolean;
  /** Shot, swipe, or pulse cadence, in seconds accumulated. */
  aux: number;
  /** Combat drone's current orbit angle, in degrees. Absent until the first leg. */
  heading?: number;
  /** Combat drone's destination angle. The leg length is `left`. */
  bearing?: number;
  /** Defense cooldown or target-acquire wait; for a dead drone, the redeploy delay. */
  cool: number;
  /** Seconds of stun left (Anti-Combat Drone, ion). */
  stun?: number;
  /** Seconds elapsed in the current ion stun. Absent when the stun is not from ion. */
  ionT?: number;
  /** Seconds left flying to the player hull (boarding drone, Ion Intruder). */
  fly?: number;
  /** Player room it is in (boarders), or the room the last swipe hit (beams, for the fx). */
  room?: string;
  /** Boarding drone / Ion Intruder health. */
  hp?: number;
  /** Ion Intruder pulse wait or overcharger layer wait, in seconds. */
  left?: number;
  /** Boarding drone progress toward the next broken system bar. */
  fix?: number;
  /** Ion Intruder rooms still to enter. Absent means it is not walking. */
  path?: string[];
  /** Ion Intruder progress toward the next room, from 0 to 1. */
  move?: number;
  /** System Repair: system room to finish first after power returns. */
  stick?: string;
  /** System Repair: walking back to Drone Control without taking a new job. */
  home?: boolean;
  /** System Repair: saw a tick with no power, so the next powered tick reassesses. */
  hold?: boolean;
  /**
   * System Repair Drone: set when that drone is destroyed. A redeploy ignores fires in other rooms
   * until Drone Control has no damage.
   */
  coldFires?: boolean;
  /**
   * System Repair Drone, dying animation. Drone Control: it briefly keeps repairing, preserves the
   * bar already underway, and ignores intruders. Absent means it is not in that animation.
   */
  dying?: boolean;
  /** A blast door took damage since the last pulse. Consumed when the cooldown is skipped. */
  doorHit?: boolean;
  /** The door already counted for that skip. */
  doorChew?: string;
  /** Seconds since the last shot or swipe, for the fx. */
  fired?: number;
};

export type AugmentId =
  | "feed"
  | "echo"
  | "quiet"
  | "hot"
  | "weld"
  | "baffle"
  | "coil"
  | "spool"
  | "hook"
  | "keel"
  | "casing"
  | "falsebuoy"
  | "glass"
  | "lung"
  | "squall"
  | "tap"
  | "jammer"
  | "recover"
  | "stun"
  | "dna"
  | "mend"
  | "pulseeye"
  | "medbot"
  | "gel"
  | "pheromone"
  | "nav"
  | "scrambler"
  | "booster"
  | "bypass"
  | "vengeance"
  | "stasis";

/** Crew Teleporter, "Enemy Crew Teleporter": one enemy hull's boarding bookkeeping (extras/sling.ts). */
export type EnemyBoarding = {
  /** Boardings sent this fight. */
  sent: number;
  /** Most boardings this hull may send: 2, or 3–4 for a Rebel Elite. */
  limit: number;
  /** Crew ids walking to, or standing on, the teleporter pads. */
  party: string[];
  /** Crew ids this teleporter sent aboard the player, and which it can recall. */
  away: string[];
  /** Station room each boarder left, so recalled crew walk back to it. */
  home: Record<string, string>;
};

export type Ship = {
  name: string;
  hull: number;
  hullMax: number;
  reactor: number;
  /**
   * Environmental Hazards, Plasma/ion Storm: this hull's reactor runs at half efficiency, rounded up.
   * Backup Battery, Overview: the battery bars are not part of that half. Absent means the reactor is whole.
   */
  storm?: boolean;
  systems: Record<SysId, SystemState>;
  rooms: Room[];
  doors: Door[];
  weapons: WeaponInst[];
  ammo: number;
  shieldNow: number;
  shieldCharge: number;
  cols: number;
  rows: number;
  /**
   * Orange bars from the hangar picture. Absent means every shared wall has a door,
   * which is the Lark grid. Interior bars share one door per room pair.
   */
  doorMarks?: DoorMark[];
  /** Optional kits bought onto this hull. Empty on a fresh Lark. */
  kits: Partial<Record<KitId, Kit>>;
  /** Drone parts. Spent by the spike and the swarm. */
  parts: number;
  /**
   * Zoltan Shield points left. Absent means the ship has no such augment.
   * 0 means the 5-point bubble is depleted until the next FTL jump.
   */
  zoltan?: number;
  /**
   * Drone Control, Shield Overcharger: "Overcharged shields are lost when making FTL jump."
   * True only when this bubble was created while zoltan was absent.
   * A bubble that was already present, including a depleted 0, is not marked.
   * PARTIAL: points added onto an existing bubble are not subtracted. The page gives no ledger.
   */
  zoltanOver?: boolean;
  /** Enemy hulls: the wiki class this ship was rolled from (wiki/enemy-ships.ts). */
  classId?: string;
  /** Faction page the class comes from, and whether this is the pirate version. */
  faction?: string;
  pirate?: boolean;
  /** AI-Controlled Rebel Ships: "Automated ships are unmanned." Systems run without crew. */
  automated?: boolean;
  /**
   * @agent:hacking. Enemy hulls: the system or kit id the player's hacking drone is latched onto (extras/spike.ts).
   * Hacking wiki, "Choosing your hacking target": "When the drone reaches the enemy ship, it latches onto the hull".
   * Lives on the enemy ship, so it leaves with it. Absent while no player drone is attached.
   */
  hackDrone?: string;
  /**
   * @agent:hack-rules. Enemy hulls: the system or kit id the player's hacking drone is flying at (extras/spike.ts).
   * Lives on the enemy ship so a drone still in flight is lost with it. Absent while no player drone is in flight.
   */
  hackFlying?: string;
  /** Enemy systems installed per the wiki that the sim does not run yet (drones, hacking, cloaking, …). */
  unwired?: { id: string; level: number }[];
  /** Enemy hull has a Crew Teleporter, so it can board. */
  boards?: boolean;
  /** Enemy Crew Teleporter plan for this fight (extras/sling.ts). Absent until the hull first acts on it. */
  boarding?: EnemyBoarding;
  /** @agent:crewai. Enemy hulls: the crew AI's posts and tasks for this fight (extras/crewai.ts). Absent until it first plans. */
  crewAi?: CrewAiState;
  /** @agent:flagship. Rebel Flagship only: stage, Power Surge, and AI-takeover state (wiki/flagship-systems.ts). */
  flagship?: FlagshipState;
};

/** @agent:crewai. One enemy crew task (extras/crewai.ts). `room` is the destination room id. */
export type CrewAiTask = { kind: "heal" | "flee" | "shields" | "defend" | "fire" | "repair"; room: string };

/** @agent:crewai. Enemy crew AI state on an enemy hull (extras/crewai.ts). */
export type CrewAiState = {
  /** Seconds until the next plan. */
  t: number;
  /** Crew id -> station room id the crew returns to when idle. */
  post: Record<string, string>;
  /** Crew id -> the task it is on. Absent means idle (at or walking to its post). */
  task: Record<string, CrewAiTask>;
};

export type BeaconKind =
  | "start"
  | "empty"
  | "hostile"
  | "store"
  | "event"
  | "distress"
  | "nebula"
  | "cache"
  | "exit"
  | "boss";

export type Beacon = {
  id: string;
  col: number;
  row: number;
  links: string[];
  kind: BeaconKind;
  visited: boolean;
  resolved: boolean;
  name: string;
  tier: string;
  flag: string;
  asteroid: boolean;
  /**
   * Environmental Hazards, Anti-Ship Battery: an out-of-fuel wait that the fleet overtakes removes the nebula environment.
   * The beacon kind stays nebula. Absent means that environment is still there.
   */
  cleared?: boolean;
  /**
   * @agent:quests. Beacons, "Quest (marker) beacon": the quest this beacon holds (wiki/quests.ts QUESTS key).
   * Drawn as 'QUEST' on the map from any distance. Absent on every other beacon.
   */
  quest?: string;
};

/** Between-sector chart. Names and colors come from the Sectors page. */
export type SectorNode = {
  id: string;
  name: string;
  group: "civilian" | "hostile" | "nebula" | "last-stand";
  col: number;
  row: number;
  links: string[];
};

export type Phase =
  | "title"
  | "map"
  | "event"
  | "store"
  | "combat"
  | "reward"
  | "victory"
  | "defeat";

/** Score, lead formula: Easy, Normal, or Hard. D is 1, 1.25, or 1.5. */
export type Difficulty = "easy" | "normal" | "hard";

export type StockItem = {
  id: string;
  kind: "fuel" | "missiles" | "parts" | "weapon" | "repair" | "system" | "augment" | "drone" | "crew";
  ref: string;
  name: string;
  detail: string;
  cost: number;
  amount: number;
};

export type FloatText = {
  id: string;
  text: string;
  life: number;
  x: number;
  y: number;
};

export type GameEvent = {
  title: string;
  body: string;
  choices: { id: string; label: string }[];
};

export type Game = {
  seed: number;
  uid: number;
  phase: Phase;
  paused: boolean;
  sector: number;
  sectorName: string;
  beacons: Beacon[];
  here: string;
  fleet: number;
  /** Augmentations, Distraction Buoys: the next fleet advance is skipped. 0 means none waiting. */
  buoyDelay: number;
  scrap: number;
  fuel: number;
  missiles: number;
  player: Ship;
  enemy: Ship | null;
  crew: Crew[];
  shots: Shot[];
  log: string[];
  selected: string | null;
  /**
   * Player crew in the current selection. The last id is `selected` (lockdown, teleporter preference).
   * Absent on an older save means only `selected` is selected.
   */
  squad?: string[];
  /** Weapon currently receiving a target click. */
  armed: string | null;
  /** Weapon Control, Overview: the cursor is in targeting mode. */
  targeting: boolean;
  /** First click of a player beam, in enemy tile space. Null until that click. */
  beamAnchor: BeamPoint | null;
  /** Weapon Control, Overview: autofire for every weapon. A slot's autoInvert reverses that. */
  autofireAll: boolean;
  mode: "crew" | "vent";
  event: GameEvent | null;
  stock: StockItem[] | null;
  /** @agent:surrender. `res` lists non-scrap resources on the reward card (surrender cargo, stalemate fuel). */
  reward: { scrap: number; note: string; res?: { fuel?: number; missiles?: number; parts?: number } } | null;
  pending: string | null;
  tutorial: boolean;
  hint: boolean;
  hitstop: number;
  trauma: number;
  floaters: FloatText[];
  sfx: string[];
  time: number;
  asteroid: boolean;
  asb: boolean;
  asteroidT: number;
  /**
   * Environmental Hazards, Asteroid Field: seconds until the next rock.
   * Scales with this ship's shield system level. 0 until that field is armed.
   * The seconds are INFERRED.
   */
  asteroidWait?: number;
  /** Seconds into the current anti-ship battery phase. */
  asbT: number;
  /**
   * Environmental Hazards, ==Anti-Ship Battery (ASB)==.
   * "warn" is the 15–20s warning. "shot" is the 5–10s wait for the real projectile.
   */
  asbPhase: "warn" | "shot";
  /** Seconds the current phase runs. 0 until that battery is armed. */
  asbWait: number;
  /**
   * Environmental Hazards, ==Pulsar==. True when the fight's event page sets pulsar=true.
   * Absent on a save from before that clock, which is the same as off.
   */
  pulsar?: boolean;
  /** Seconds into the current 11–18s pulsar cycle. */
  pulsarT?: number;
  /** Length of the current cycle. The warning is the last 5 seconds. 0 until armed. */
  pulsarWait?: number;
  /** True after this cycle's warning has been logged. */
  pulsarWarned?: boolean;
  /**
   * Environmental Hazards, ==Class-M Red Giant Star==. True when the fight's event page sets redgiant=true.
   * Absent on a save from before that clock, which is the same as off.
   */
  flare?: boolean;
  /** Seconds into the current 28–34s flare cycle. */
  flareT?: number;
  /** Length of the current cycle. The warning is the last 5 seconds. 0 until armed. */
  flareWait?: number;
  /** True after this cycle's warning has been logged. */
  flareWarned?: boolean;
  boardTimer: number;
  bossSurge: number;
  /** Gate Ram stage. 1, then 2, then 3. Each stage has its own hull pool. */
  ramStage: 1 | 2 | 3;
  /**
   * @agent:flagship. Rebel Flagship stage and surviving crew after the player jumps away mid-fight
   * (wiki/flagship-systems.ts rememberFlagship). Absent before the first retreat and after a stage-1 retreat.
   */
  flagshipMemo?: import("./wiki/flagship-systems.ts").FlagshipMemo;
  flee: number;
  /** Enemy escape progress, 0 to 1, against enemyEscape.seconds. Moves only while enemyEscape.running. */
  enemyFlee: number;
  /** How the current enemy tries to jump away (wiki/escape.ts). Null outside a fight. */
  enemyEscape?: EscapePlan | null;
  /** @agent:surrender. Surrender offer state for the current enemy (wiki/surrender.ts). */
  enemySurrender?: SurrenderPlan | null;
  /** @agent:surrender. Anti-stalemate clock: seconds below the hull threshold since the enemy last lost hull. */
  stalemate?: { ship: string; hull: number; quiet: number } | null;
  /** Rebel Fleet: a fleeing scout or auto-ship got away, so the next fleet advance is doubled. */
  pursuitDouble?: boolean;
  picking: boolean;
  outcome: string;
  jumps: number;
  kills: number;
  /** Score, lead formula: Easy 1, Normal 1.25, Hard 1.5. Missing on an old save means Normal. */
  difficulty: Difficulty;
  /** Score page: scrap gained during the run. Starting scrap is not included. */
  scrapCollected: number;
  /**
   * Manpower: event offers that upgrade the reactor do not count against the achievement.
   * Bars added by those offers. Absent means none. The upgrades tab does not add to this.
   */
  reactorEvent?: number;
  /** Score page: beacons visited. The starting beacon counts. */
  beaconsVisited: number;
  /** Sectors page chart. Empty until the exit beacon opens it. */
  sectorMap: boolean;
  /**
   * Sectors, Hidden Crystal Worlds: a restart while in that sector. This run's exit does not open the chart.
   * INVENTED: the page names no saved flag.
   */
  crystalRestart?: boolean;
  route: SectorNode[];
  routeHere: string;
  /** Hull chosen in the hangar. Restart uses it. */
  hullId?: string;
  /** @agent:unlocks. Hull ids an event outcome unlocked this run (unlocks.ts grantUnlock). The store persists them. */
  unlocked?: string[];
  /** Title TUTORIAL. Game Over uses the training sentence only for this run. */
  training: boolean;
  manual: boolean;
  shipSheet: boolean;
  muted: boolean;
  lowHull: boolean;
  /** Beacon the last-sector ship currently occupies. */
  ramId: string | null;
  /** Jumps remaining before that ship moves. */
  ramClock: number;
  /**
   * The Rebel Flagship: flagship jumps already spent while it is on the Federation base.
   * INFERRED: the jump that lands there is not one of those three.
   */
  ramAtBase?: number;
  /** Installed augments. Three is the cap. */
  augments: AugmentId[];
  /**
   * @agent:drones. Recent shots, rocks, and stray defense fire that struck an external drone (swarm.ts). Each entry
   * ages in tickSwarm and drops after DRONE_BLAST_S, for a CombatFx burst at the orbit. Absent until the first hit.
   */
  droneBlasts?: DroneBlast[];
  /** @agent:quests. Quests pushed to the next sector ("Added a quest marker to the next sector!"), wiki/quests.ts. */
  questsNext?: string[];
  /** @agent:quests. Slug of the event page that started the current fight (startCombat's `event`), for page win rewards. */
  fightEvent?: string | null;
  /**
   * Boarders: Humans (Abandoned): faction of the last fight.
   * A hungry-human beacon after a Lanius ship gives those boarders Emergency Respirators.
   * INFERRED: remembered until the next startCombat, so a repeat before another fight still has it.
   */
  lastFaction?: string;
};

/** @agent:drones. One drone struck by a shot (swarm.ts noteBlast). */
export type DroneBlast = {
  /** Whose drone was struck. */
  side: "player" | "enemy";
  /** Schematic id of the drone. */
  kind: string;
  /** Enemy DroneUnit id; absent for the player's single drone. */
  unitId?: string;
  /** Which hull the drone orbits. */
  at: "player-orbit" | "enemy-orbit";
  /** What struck it. */
  by: "shot" | "rock" | "defense";
  /** "down" destroyed, "ion" stunned by an ion shot. */
  result: "down" | "ion";
  /** Seconds since the hit. */
  age: number;
};
