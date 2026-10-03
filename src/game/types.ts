import type { KinId } from "./extras/kin.ts";
import type { EscapePlan } from "./wiki/escape.ts";

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

export type SystemState = {
  level: number;
  power: number;
  damage: number;
  /** Seconds left on each ion point. One point locks one bar for 5s. */
  ion: number[];
  fix: number;
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
};

export type Door = {
  a: string;
  b: string | "void";
  open: boolean;
  /** Hits left before a boarder breaks a blast door. */
  hp: number;
  /** Seconds a broken door stays stuck open. */
  stuck: number;
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
  think: number;
  tone: number;
  /** Hangar uniform swatch from crew-look.ts. Absent falls back to `tone`. */
  uniform?: number;
  skills?: Partial<Record<SkillName, number>>;
  /** Lineage id from extras/kin.ts. Absent means the baseline row. */
  kin?: KinId;
  /** Seconds left fighting for the other side. */
  leashed?: number;
  /** Seconds until a clone finishes. Set only while this body is waiting. */
  cloneIn?: number;
  /** Seconds this body cannot act. Hacking Stun sets this for the pulse. */
  stun?: number;
  /** Seconds until this Crystal can coat a room again. Absent means ready, or not a Crystal. */
  lockCool?: number;
};

export type WeaponInst = {
  uid: string;
  defId: string;
  charge: number;
  enabled: boolean;
  autofire: boolean;
  /**
   * Weapon Control, Overview: Ctrl on this slot reverses the all-weapons autofire setting.
   * Absent means the slot follows autofireAll.
   */
  autoInvert?: boolean;
  target: string | null;
};

export type Shot = {
  id: string;
  kind: WeaponKind;
  from: "player" | "enemy" | "env";
  damage: number;
  ion: number;
  fireChance: number;
  breachChance: number;
  targetRoom: string;
  beamRooms?: string[];
  /** Weapon id, when the shot was launched from a mount. Tests may set it. */
  defId?: string;
  wait: number;
  t: number;
  duration: number;
  label?: string;
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
  /** Seconds of the active effect left. */
  left: number;
  /** Seconds until it can be started again. */
  cool: number;
  /** Aimed room id or system id. */
  target: string | null;
  on: boolean;
  /** Module scratch timer (shield-drop cadence, drone shot cadence). */
  aux: number;
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
  | "vengeance";

export type Ship = {
  name: string;
  hull: number;
  hullMax: number;
  reactor: number;
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
  /** Enemy hulls: the wiki class this ship was rolled from (wiki/enemy-ships.ts). */
  classId?: string;
  /** Faction page the class comes from, and whether this is the pirate version. */
  faction?: string;
  pirate?: boolean;
  /** AI-Controlled Rebel Ships: "Automated ships are unmanned." Systems run without crew. */
  automated?: boolean;
  /** Enemy systems installed per the wiki that the sim does not run yet (drones, hacking, cloaking, …). */
  unwired?: { id: string; level: number }[];
  /** Enemy hull has a Crew Teleporter, so it can board. */
  boards?: boolean;
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
  /** Weapon currently receiving a target click. */
  armed: string | null;
  /** Weapon Control, Overview: the cursor is in targeting mode. */
  targeting: boolean;
  /** Weapon Control, Overview: autofire for every weapon. A slot's autoInvert reverses that. */
  autofireAll: boolean;
  mode: "crew" | "vent";
  event: GameEvent | null;
  stock: StockItem[] | null;
  reward: { scrap: number; note: string } | null;
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
  asbT: number;
  boardTimer: number;
  bossSurge: number;
  /** Gate Ram stage. 1, then 2, then 3. Each stage has its own hull pool. */
  ramStage: 1 | 2 | 3;
  flee: number;
  /** Enemy escape progress, 0 to 1, against enemyEscape.seconds. Moves only while enemyEscape.running. */
  enemyFlee: number;
  /** How the current enemy tries to jump away (wiki/escape.ts). Null outside a fight. */
  enemyEscape?: EscapePlan | null;
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
  /** Score page: beacons visited. The starting beacon counts. */
  beaconsVisited: number;
  /** Sectors page chart. Empty until the exit beacon opens it. */
  sectorMap: boolean;
  route: SectorNode[];
  routeHere: string;
  /** Hull chosen in the hangar. Restart uses it. */
  hullId?: string;
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
  /** Installed augments. Three is the cap. */
  augments: AugmentId[];
};
