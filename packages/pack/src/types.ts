/** The shot family a blueprint names. The sim fires these six. */
export type WeaponKind = "laser" | "missile" | "ion" | "beam" | "flak" | "bomb";

/**
 * A weapon the sim can fire. The campaign rows are today's WeaponDef, plus the beam
 * length, swipe speed, crew damage, and shield pierce that used to live beside it.
 */
export type WeaponBlueprint = {
  id: string;
  name: string;
  kind: WeaponKind;
  power: number;
  charge: number;
  shots: number;
  gap: number;
  damage: number;
  ion: number;
  fire: number;
  breach: number;
  ammo: boolean;
  price: number;
  blurb: string;
  /** Beam length in tiles. Absent means the authored beam table. */
  lengthTiles?: number;
  /** FTL beam speed column. Absent means the authored speed table. */
  speed?: number;
  /** Flat crew-damage HP when this blueprint states one. */
  crewDamage?: number;
  /** Shield layers this shot bypasses. Absent means the authored pierce table. */
  pierce?: number;
};

/**
 * A crew race. Stat fields match extras/kin.ts. The flags are the id branches
 * the sim used for Zoltan power, the death burst, Lanius drain, Slug sight,
 * mind-control immunity, Crystal lockdown, and fire-fighting.
 */
export type CrewDef = {
  id: string;
  name: string;
  hp: number;
  move: number;
  repair: number;
  fight: number;
  suffocate: number;
  fireTaken: number;
  bonusPower: number;
  hasDeathExplosion: boolean;
  drainsOxygen: boolean;
  detectsLifeforms: boolean;
  resistsMindControl: boolean;
  lockdown: boolean;
  lockCooldown: number;
  fireRepairMultiplier: number;
};

/** A store listing. Effect code still switches on the campaign ids. */
export type AugmentDef = {
  id: string;
  name: string;
  detail: string;
  cost: number;
};

/** A drone schematic listing. Power, cooldown, and speed stay in the effect code. */
export type DroneDef = {
  id: string;
  name: string;
  cost: number;
};

/** Where a purchased system is installed. Power and the starting level stay in the effect code. */
export type SystemSlot = "sys" | "kit";

/** A store listing for one single-price system. */
export type SystemDef = {
  id: string;
  name: string;
  cost: number;
  slot: SystemSlot;
};

/** A hangar layout letter. Room tiles stay in the layout tables. */
export type HullLayout = "A" | "B" | "C";

/** One starting crew seat. The kin id is a crew-pack id. */
export type HullCrewDef = {
  kin: string;
  room: string;
};

/**
 * A kit fitted at the start of a run.
 * Power and the effect stay in the kit code. An id the ship cannot install is stored and then skipped.
 */
export type HullKitDef = {
  level: number;
  power: number;
  target?: string | null;
  loadout?: string[];
  on?: boolean;
};

/**
 * A player hull. Levels and starting cargo are the record.
 * Unlock gates, room geometry, and system effects stay in code.
 */
export type HullDef = {
  id: string;
  cruiser: string;
  layout: HullLayout;
  name: string;
  quote: string;
  unlock: string;
  source: string;
  reactor: number;
  fuel: number;
  missiles: number;
  parts: number;
  systems: Record<string, [number, number]>;
  weapons: string[];
  crew: HullCrewDef[];
  kits: Record<string, HullKitDef>;
  augments: string[];
  unfitted: string[];
};

/**
 * A sector on the chart. Depth gates and the once-only ids stay in the chart code.
 * `notes` are the page lines. Beacon odds stay in the mix code.
 */
export type SectorDef = {
  id: string;
  name: string;
  group: string;
  notes: string[];
};

/**
 * One line on a store shelf. Resource kinds are fuel, missiles, parts, and repair.
 * Crew hires use kind `crew`. Any other kind is stored and left off the shelf.
 * A repair line's `min` is the hull points. Its cost is stored; the sector rate prices it.
 */
export type StoreLine = {
  id: string;
  kind: string;
  name: string;
  cost: number;
  min: number;
  max: number;
};

/**
 * A store. `sections` are the kinds it may roll. Unknown kinds are stored and skipped.
 * Weapon, drone, augment, and system shelves still draw from those catalogs.
 * Section count, the systems coin-flip, and drone stand-ins stay in the store code.
 */
export type StoreDef = {
  id: string;
  name: string;
  /** Items in one rolled section. */
  slot: number;
  /** Weapons offered when that section rolls. */
  weapons: number;
  sections: string[];
  lines: StoreLine[];
};

/**
 * One scrap price on a system tune. `level` is the level already owned.
 * The next purchase spends `cost` and raises the system by one.
 */
export type TuneStep = {
  level: number;
  cost: number;
};

/**
 * Upgrade scrap and the level a store purchase installs.
 * These records are not store rows. Engines, oxygen, weapons, and piloting
 * have tunes and do not appear on the system shelf.
 * Reactor bands and kit upgrade tables stay in code.
 */
export type TuneDef = {
  id: string;
  /** Level written when the system is bought. Shields is 2. */
  start: number;
  costs: TuneStep[];
};

export type EventResource = "scrap" | "fuel" | "missiles" | "parts";

export type EventTier = "low" | "medium" | "high";

export type EventItem = "weapon" | "augment" | "drone";

/**
 * One result on a choice. The sim applies these kinds.
 * `quest` names a marker. The sim still picks the beacon.
 * `goto` opens another event as the next card.
 * `close` ends a fight without salvage, the way a surrender does.
 * A win, an escape, and a branch that still rolls stay procedures.
 */
export type EventEffect =
  | { k: "res"; id: EventResource; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: EventTier; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  | { k: "item"; item: EventItem }
  | { k: "quest"; id: string }
  | { k: "goto"; id: string }
  | { k: "close" }
  | { k: "nothing" };

/** A button on an event page. The id is what `choose` receives. */
export type EventChoice = {
  id: string;
  label: string;
  fx: EventEffect[];
};

/** What a scripted surrender hands over. The sim still rolls the amounts. */
export type SurrenderReward =
  | { k: "crew"; race?: string }
  | { k: "stuff"; tier?: EventTier }
  | { k: "fuel-repairs"; repairs: number }
  | { k: "weapon"; name: string }
  | { k: "standard"; tier: EventTier; race?: string }
  | { k: "scrap"; tier: EventTier; unnamed?: EventItem }
  | { k: "none" };

/** A button stored on a surrender offer. The id is what `choose` receives. */
export type SurrenderChoice = {
  id: string;
  label: string;
};

/**
 * A fight page's own surrender offer.
 * `chance` is the percent. `low` and `high` are the hull band, as a percent of max hull.
 * The sim still checks the hull and still hands the reward over.
 */
export type SurrenderOfferDef = {
  chance: number;
  low: number;
  high: number;
  reward: SurrenderReward;
  hail: string;
  accept: string;
  refuse: string;
  /** Several hails with equal odds. One is shown in place of `hail`. */
  hails?: string[];
  /** Accepting pays the reward and the fight goes on. */
  continues?: boolean;
  /** The card shows only the accept choice. */
  forced?: boolean;
  /** Accepting places this quest marker. The sim still picks the beacon. */
  quest?: string;
  /** The sentence on the reward card after accepting. */
  result?: string;
  /** Accepting opens this card while the enemy is still there. */
  card?: { body: string; choices: SurrenderChoice[] };
  /** A third button on the surrender card. */
  extra?: SurrenderChoice;
};

/**
 * A beacon page. `id` is the page slug. `flag` is what a beacon stores.
 * `dest` is the title. An arrival page uses flag `quest:` plus the quest id and an empty sector list.
 * A fight page can carry a `surrender` offer. Sector depth gates stay in code.
 * The sim still picks the beacon a marker lands on, and still checks the hull.
 */
export type EventDef = {
  id: string;
  dest: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  /** Opening sentences. The sim still picks one. Stored when a page has more than one. */
  texts?: string[];
  choices: EventChoice[];
  surrender?: SurrenderOfferDef;
};

/** One page on a filler list. `id` is the event slug. `unique` pages appear once per sector. */
export type FillerEntry = {
  id: string;
  unique: boolean;
};

/**
 * An ordered list of filler pages. The id is the list name (`filler`, `distress`, and the rest).
 * Appending a list replaces that id. A new id is added at the end. The sim still skips a unique page already on the map.
 */
export type FillerListDef = {
  id: string;
  entries: FillerEntry[];
};

/**
 * Sentences for a beacon where nothing happens.
 * `nebula` marks the two quiet-nebula pages. Other pages are chosen by sector name.
 * Civilian is the first plain page, so an unlisted sector uses it.
 */
export type EmptyBeaconDef = {
  id: string;
  dest: string;
  sectors: string[];
  texts: string[];
  nebula?: boolean;
};

export type ContentPack = {
  crew?: CrewDef[];
  weapons?: WeaponBlueprint[];
  augments?: AugmentDef[];
  drones?: DroneDef[];
  systems?: SystemDef[];
  hulls?: HullDef[];
  sectors?: SectorDef[];
  stores?: StoreDef[];
  tunes?: TuneDef[];
  events?: EventDef[];
  lists?: FillerListDef[];
  empties?: EmptyBeaconDef[];
};
