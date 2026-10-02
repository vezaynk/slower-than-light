import type { KinId } from "./extras/kin.ts";

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
  x: number;
  y: number;
  w: number;
  h: number;
  o2: number;
  fire: number;
  breach: number;
  breachFix: number;
  fireTick: number;
  flash: number;
  venting: boolean;
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
  skills?: Partial<Record<SkillName, number>>;
  /** Lineage id from extras/kin.ts. Absent means the baseline row. */
  kin?: KinId;
  /** Seconds left fighting for the other side. */
  leashed?: number;
  /** Seconds until a clone finishes. Set only while this body is waiting. */
  cloneIn?: number;
  /** Seconds this body cannot act. Hacking Stun sets this for the pulse. */
  stun?: number;
};

export type WeaponInst = {
  uid: string;
  defId: string;
  charge: number;
  enabled: boolean;
  autofire: boolean;
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
  | "pulseeye";

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
  /** Optional kits bought onto this hull. Empty on a fresh Lark. */
  kits: Partial<Record<KitId, Kit>>;
  /** Drone parts. Spent by the spike and the swarm. */
  parts: number;
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

export type Phase =
  | "title"
  | "map"
  | "event"
  | "store"
  | "combat"
  | "reward"
  | "victory"
  | "defeat";

export type StockItem = {
  id: string;
  kind: "fuel" | "missiles" | "weapon" | "repair";
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
  /** Enemy jump charge, 0 to 1. Engines, "FTL Charge Times", doubled by the FTL Jammer. */
  enemyFlee: number;
  picking: boolean;
  outcome: string;
  jumps: number;
  kills: number;
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
