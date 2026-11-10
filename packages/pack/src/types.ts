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
  /** `<short>` line. The hangar and the offer card show it beside the title. */
  short?: string;
  /** `<desc>` when a tooltip already occupies `blurb`. */
  detail?: string;
  /** `<flavorType>`, the weapon family the card names. */
  flavor?: string;
  /** Beam length in tiles. Absent means the authored beam table. */
  lengthTiles?: number;
  /** FTL beam speed column. Absent means the authored speed table. */
  speed?: number;
  /** Flat crew-damage HP when this blueprint states one. */
  crewDamage?: number;
  /** `<sp>`: shield layers this shot bypasses. Absent means none. */
  pierce?: number;
  /** `<weaponArt>` name in the animation document. Absent uses the blueprint id. */
  art?: string;
  /** `<image>` projectile animation name. `<time>` on that anim is its duration, not the volley gap. */
  image?: string;
  /** `<rarity>`. A RANDOM grant skips 0 and weights the rest by `6 - rarity`. */
  rarity?: number;
  /**
   * `<bp>`. FTL's executable reads it beside cost and rarity (the strings sit together), but nothing shows what it
   * does. It is kept for the round trip and the game does not read it.
   */
  bp?: number;
  /**
   * `<hullBust>`. When set, a hit on a systemless room deals twice the blueprint's hull damage.
   * The integer is the flag. The doubled figure is `damage * 2`, not this number.
   */
  hullBust?: number;
  /** `<stunChance>` already divided by 10. `2` in the file is 0.2. */
  stunChance?: number;
  /**
   * `<persDamage>` as written. When the tag is present, `crewDamage` is this number times 15.
   * A negative value heals. It wins over a `<crewDamage>` child.
   */
  persDamage?: number;
  /** `<sysDamage>`. System bars. A bomb's `<damage>` stays hull and is often 0. */
  sysDamage?: number;
  /** `<radius>` in archive pixels. Landing odds do not treat it as a pixel circle. */
  radius?: number;
  /** `<chargeLevels>`. The charger bank. `<shots>` stays the volley when this is absent. */
  chargeLevels?: number;
  /** `<iconImage>` path. The weapon card shows that file. */
  icon?: string;
  /** `<launchSounds>` names, in file order. */
  launchSounds?: string[];
  /** `<hitShipSounds>` names, in file order. */
  hitShipSounds?: string[];
  /** `<hitShieldSounds>` names, in file order. */
  hitShieldSounds?: string[];
  /** `<missSounds>` names, in file order. */
  missSounds?: string[];
  /** `<spin>` degrees per second. The sprite turns. The landing does not. */
  spin?: number;
  /** `<drone_targetable>`. 1 means a Mark I defense drone may shoot this blueprint's shot. */
  droneTargetable?: number;
  /** `<boost>`. Cooldown subtracts seconds. Damage adds ion when ion is already above 0, and hull damage otherwise. Step 0 is the blueprint's own number. */
  boost?: { type: "cooldown" | "damage"; amount: number; count: number };
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
  /** Player-facing blurb from an archive crewBlueprint. Absent on a stats-only row. */
  detail?: string;
  /** `<short>` line. The crew card shows it with the blurb. The title stays the name. */
  short?: string;
  /** `<powerList>` lines, in file order. The crew card shows them under the blurb. */
  powers?: string[];
  /** Hire price from an archive crewBlueprint. Absent on a stats-only row. */
  cost?: number;
  /**
   * `<rarity>`: the race's default rarity, 0 (never drawn) or 1 (common) to 5 (rare). A sector's `<rarityList>`
   * overrides it while the player is in that sector. Absent reads as 0.
   */
  rarity?: number;
  /**
   * `<colorList>` from an archive crewBlueprint: one list per `<layer>`, in order. Layer N tints
   * `img/people/<id>_layerN.png`, drawn over the untinted base sheet. Absent on a stats-only row.
   */
  colors?: CrewColor[][];
  /**
   * `<bp>`. FTL's executable reads it beside cost and rarity (the strings sit together), but nothing shows what it
   * does. It is kept for the round trip and the game does not read it.
   */
  bp?: number;
};

/** One `<color>` of a crew colour layer. r, g, b are 0 to 255; a is 0 to 1. */
export type CrewColor = { r: number; g: number; b: number; a: number };

/** A store listing. Effect code still switches on the campaign ids. */
export type AugmentDef = {
  id: string;
  name: string;
  detail: string;
  cost: number;
  /** `<rarity>`. A RANDOM grant skips 0 and weights the rest by `6 - rarity`. */
  rarity?: number;
  /** `<value>`. The effect switch still decides what this magnitude scales. */
  value?: number;
  /** `<stackable>`. A duplicate that is not stackable pays 25 scrap instead of fitting. */
  stackable?: boolean;
};

/** A drone schematic. Cooldown is milliseconds, the unit the blueprint writes. */
export type DroneDef = {
  id: string;
  name: string;
  cost: number;
  /** `<short>` line on the schematic card. */
  short?: string;
  /** `<desc>` on the schematic card. */
  detail?: string;
  /** `<droneImage>` stem. Pictures are `img/ship/drones/<image>_base.png`, `_on.png`, and `_charged.png`. */
  image?: string;
  /** The blueprint carries `NOLOC`. That drone's room stays hidden from the other ship. */
  noloc?: boolean;
  /** `<rarity>`. A RANDOM grant skips 0 and weights the rest by `6 - rarity`. */
  rarity?: number;
  /**
   * `<bp>`. FTL's executable reads it beside cost and rarity (the strings sit together), but nothing shows what it
   * does. It is kept for the round trip and the game does not read it.
   */
  bp?: number;
  /** `<type>`: COMBAT, DEFENSE, BOARDER, SHIELD, REPAIR, SHIP_REPAIR, BATTLE. */
  type?: string;
  /** `<power>`. Bars the drone needs while it flies. */
  power?: number;
  /** `<cooldown>` in milliseconds. */
  cooldown?: number;
  /**
   * `<target>` on a DEFENSE drone: what it shoots beside missiles and asteroids. LASERS adds lasers and ions (Defense
   * Drone Mark II); DRONES shoots drones only (Anti-Combat Drone). Absent is the Mark I screen.
   */
  target?: string;
  /** `<speed>`. Orbit and travel use this. A boarding drone's attack interval stays in the sim. */
  speed?: number;
  /** `<dodge>`. */
  dodge?: number;
  /** `<weaponBlueprint>` id, when the drone names the gun it fires. */
  weapon?: string;
};

/** Where a purchased system is installed. The starting level stays on the tune. */
export type SystemSlot = "sys" | "kit";

/** The events a sector's start and exit beacons open when the sector names none. */
export type BeaconEvents = {
  start?: string;
  finish?: string;
  finishNebula?: string;
};

/** A store listing for one single-price system. `detail` is the archive's factual line. */
export type SystemDef = {
  id: string;
  name: string;
  cost: number;
  slot: SystemSlot;
  /** Factual install line from the archive. Absent on a stats-only row. */
  detail?: string;
  /** `<maxPower>`. The highest level this system can reach. */
  max?: number;
};

/** A hangar layout letter. Unlock rules use this letter. A loaded hull names its layout file. */
export type HullLayout = "A" | "B" | "C";

/** The `<img x y w h>` box from `data/<layout>.xml`, in archive pixels. */
export type HullPicture = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** One x,y pair from a ship drawing: a glow, or a cloak or floor offset. */
export type HullOffset = {
  x: number;
  y: number;
};

/**
 * One `<gibN>` inside `<explosion>`.
 * `x` and `y` are pixels of the ship image. The flight numbers are the drawing's own ranges.
 */
export type HullGib = {
  id: number;
  x: number;
  y: number;
  velocityMin: number;
  velocityMax: number;
  directionMin: number;
  directionMax: number;
  angularMin: number;
  angularMax: number;
};

/** The drawing children besides the image box and the weapon mounts. */
export type HullSheet = {
  glow?: HullOffset;
  cloakOffset?: HullOffset;
  floorOffset?: HullOffset;
  gibs?: HullGib[];
};

/** Direction a weapon shifts when it is powered. The archive spells these five. */
export type HullMountSlide = "up" | "down" | "left" | "right" | "no";

/**
 * One `<mount>` in `data/<layout>.xml`.
 * `x` and `y` are pixels of that ship's image, from the top left.
 * `slide` is omitted when the drawing file omits it.
 */
export type HullMount = {
  x: number;
  y: number;
  rotate: boolean;
  mirror: boolean;
  gib: number;
  slide?: HullMountSlide;
};

/** One rectangle from a layout file. `id` is the room index the blueprint names. */
/** One room from a layout file: its index and box. What a room holds is on the blueprint's installs. */
export type HullRoom = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * One door from a layout file.
 * `a` and `b` are room indexes. -1 is vacuum.
 * `vertical` is 1 when the door sits on a vertical wall.
 */
export type HullDoor = {
  x: number;
  y: number;
  a: number;
  b: number;
  vertical: number;
};

/**
 * The four ELLIPSE integers, in file order. `w` and `h` are the shield's radii in archive pixels,
 * so the shield image is twice that size. `x` and `y` move the center.
 */
export type HullEllipse = {
  w: number;
  h: number;
  x: number;
  y: number;
};

/**
 * A room grid from `data/<layout>.txt`.
 * `x` and `y` are the offsets. `vertical` is the VERTICAL integer.
 * `cols` and `rows` are the hangar grid. That file does not store them.
 */
export type HullGrid = {
  x?: number;
  y?: number;
  vertical?: number;
  horizontal?: number;
  ellipse?: HullEllipse;
  cols?: number;
  rows?: number;
  rooms: HullRoom[];
  doors: HullDoor[];
};

/**
 * One system on an archive ship.
 * The tag is the system id. `power` is the bars. `room` is the layout room index.
 * An omitted start is fitted. `start` false is a slot the ship can buy.
 */
export type HullInstall = {
  id: string;
  power: number;
  room?: number;
  start: boolean;
  max?: number;
  weapon?: string;
  img?: string;
};

/** Starting crew from `<crewCount>`. `class` is the race id. There is no seat. */
export type HullCrewCount = {
  amount: number;
  class: string;
  max?: number;
};

/** One `<blueprintList>`. A ship names it from weaponList or droneList `load`. */
export type BlueprintListDef = {
  id: string;
  names: string[];
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
  /** Archive weapon blueprint when this kit is artillery. */
  weapon?: string;
};

/**
 * A ship blueprint, as ftl.dat's <shipBlueprint> carries it: levels, counts, and the starting cargo.
 * Powered bars, kits, crew seats, and room names are not on the record; hull-fit's startingFit works them out.
 * Unlock gates and system effects stay in code.
 * `layout` is the archive layout file name. It is not coerced.
 */
export type HullDef = {
  id: string;
  /** `<class>`. */
  cruiser: string;
  layout: string;
  name: string;
  /** `<desc>`. */
  quote: string;
  unlock: string;
  /** `<maxPower amount>`. */
  reactor: number;
  /** `<weaponList missiles>`. */
  missiles: number;
  /** `<droneList drones>`: drone parts. */
  parts: number;
  weapons: string[];
  augments: string[];
  /** Hull points from `<health amount>`. */
  health?: number;
  /** Base image id. Cloak, shield, and floor are the other image ids. */
  img?: string;
  /**
   * Exterior box from `data/<layout>.xml`, in archive pixels.
   * One room cell is 35 pixels. The bytes stay on the path map.
   */
  picture?: HullPicture;
  /** Weapon hardpoints from that same drawing file. */
  mounts?: HullMount[];
  /** `<glowOffset>` from that drawing. The iPad build is what uses it. */
  glow?: HullOffset;
  /** `<offsets><cloak>` from that drawing, in archive pixels. */
  cloakOffset?: HullOffset;
  /** `<offsets><floor>` from that drawing, in archive pixels. */
  floorOffset?: HullOffset;
  /** `<explosion>` pieces from that drawing. */
  gibs?: HullGib[];
  cloak?: string;
  shield?: string;
  floor?: string;
  /** Room grid for `layout`, when that text file was passed in. */
  grid?: HullGrid;
  /** Systems as the archive lists them. */
  installs?: HullInstall[];
  /** Starting crew counts. Seated crew stay in `crew`. */
  crewCounts?: HullCrewCount[];
  /** Drone blueprint ids from droneList. */
  drones?: string[];
  /** weaponList load id, when the ship names a list instead of each weapon. */
  weaponLoad?: string;
  /** weaponList count. The generator stops after this many guns. */
  weaponCount?: number;
  /** droneList load id. */
  droneLoad?: string;
  /** droneList count. The generator stops after this many schematics. */
  droneCount?: number;
  weaponSlots?: number;
  droneSlots?: number;
  minSector?: number;
  maxSector?: number;
  /** `<boardingAI>`. Sabotage or invasion. Unset when the tag is absent or not one of those. */
  boardingAI?: "sabotage" | "invasion";
  /**
   * `<surrender chance min max>` on this blueprint. `chance` is a percent. `min` and `max` are a percent of max hull.
   * Chance 0 never offers. Absent, the fight uses the faction row. A layout-less blueprint of the same name is that
   * row, and this field wins over it.
   */
  surrender?: { chance: number; min: number; max: number };
};

/** One beacon quota. `id` is an event or an event list. */
export type SectorQuota = {
  id: string;
  min: number;
  max: number;
};

/** One crew race the sector offers, and its rarity. */
export type SectorRarity = {
  id: string;
  rarity: number;
};

/**
 * A sector on the chart. Depth gates and the once-only ids stay in the chart code.
 * `notes` are the page lines. Beacon odds stay in the mix code.
 * Archive quotas, tracks, and the starting event are their own fields.
 */
export type SectorDef = {
  id: string;
  name: string;
  group: string;
  notes: string[];
  /** Short label, when the archive names one. */
  short?: string;
  /** Earliest sector index. */
  minSector?: number;
  /** The archive marks this sector once-only. */
  unique?: boolean;
  /** Event that opens the sector. */
  startEvent?: string;
  /** `<finishEvent>`, a private tag FTL ignores: the exit beacon's event in this sector. */
  finishEvent?: string;
  /** `<finishEvent nebula="true">`: the exit beacon's event when that exit sits in a nebula. */
  finishNebulaEvent?: string;
  /** Music track ids. */
  tracks?: string[];
  /** How many beacons draw each event. These are not page lines. */
  quotas?: SectorQuota[];
  /**
   * `<rarityList>`: blueprint rarities this sector sets over each blueprint's own `<rarity>`. Crew races and items
   * share the list.
   */
  rarities?: SectorRarity[];
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
 * Reactor bands stay a formula in upgradeCost. Charge times stay in the effect code.
 */
export type TuneDef = {
  id: string;
  /** Level written when the system is bought. Shields is 2. */
  start: number;
  costs: TuneStep[];
  /** `<maxPower>`. An owned level at or above this has no next purchase. */
  max?: number;
};

export type EventResource = "scrap" | "fuel" | "missiles" | "parts";

export type EventTier = "low" | "medium" | "high";

/** A Hyperspace reward level. MED is this game's medium tier. */
export type RewardLevel = "LOW" | "MED" | "HIGH";

/** A resource inside `<rewards>`. Drone parts use the Hyperspace name. */
export type RewardKind = "scrap" | "fuel" | "missiles" | "droneparts";

/**
 * Scrap scaling for one difficulty.
 * Absent `difficulty` is normal. 0 is easy and 2 is hard.
 * `difficultyAmount` is added to the sector index before the sector step.
 */
export type RewardScaling = {
  difficulty?: 0 | 2;
  baseAmount: number;
  sectorAmount: number;
  difficultyAmount: number;
};

/** An absolute or thousandths band at one reward level. Scrap values are thousandths of the scaled amount. */
export type ResourceReward = {
  kind: RewardKind;
  level: RewardLevel;
  min: number;
  max: number;
};

/** One resource a named reward pays. Absent `level` means the tier the caller asked for. */
export type RewardResource = {
  name: RewardKind;
  level?: RewardLevel;
};

/** A named reward such as standard, stuff, or fuel. The bonus is chance out of roll. */
export type NamedReward = {
  name: string;
  resources: RewardResource[];
  minResources?: number;
  maxResources?: number;
  bonus?: { roll: number; chance: number };
};

/**
 * The shared reward table.
 * Scrap bands are derived. Fuel, missiles, and drone parts are the absolute min and max.
 */
export type RewardTable = {
  scaling: RewardScaling[];
  resources: ResourceReward[];
  rewards: NamedReward[];
};

/**
 * A faction's default surrender offer.
 * `chance` is the percent. `min` and `max` are the hull band, as a percent of max hull.
 */
export type FactionSurrender = {
  id: string;
  chance: number;
  min: number;
  max: number;
};

/**
 * Gap `<shipBlueprint name>` › `<escape chance min max>`: a faction's default hull-triggered escape.
 * `chance` is the percent, rolled once when hull first drops to a point drawn in the `min`–`max` band (percent of max
 * hull). A faction with no row never runs on its own; a ship event's `<escape>` still can.
 */
export type FactionEscape = {
  id: string;
  chance: number;
  min: number;
  max: number;
};

/**
 * Gap `<escapeTimers hull lastFuel>`: seconds of charging FTL's executable gives an escaping enemy when nothing else
 * names a timer. `hull` is a hull-triggered run, and a ship event's `<escape>` with no `timer`. `lastFuel` is every
 * hostile after you jump with your last fuel.
 */
export type EscapeTimers = {
  hull?: number;
  lastFuel?: number;
};

/**
 * Gap `<stalemate threshold seconds fuel>`: the anti-stalemate break-off FTL's executable hard-codes.
 * `threshold` is the percent of max hull below which a quiet fight can end. `seconds` is how long the enemy must go
 * without losing hull. `fuel` is what the player is granted. A missing value warns and uses FTL's (40, 60, 2).
 * Boss and elite never surrender because their blueprint ids name `<surrender chance="0">`, not because of a tier check.
 */
export type Stalemate = {
  threshold?: number;
  seconds?: number;
  fuel?: number;
};

/**
 * Gap `<aiTarget easy normal hardRoom hardAny evasion oxygen artillery>`: enemy weapon targeting numbers FTL's
 * executable hard-codes (xftl combat-ai, PrioritizeSystem). `easy` and `normal` are the chance a shot picks from the
 * system list. `hardRoom` is the share of Hard shots that pick no system; `hardAny` is the share that pick any
 * installed system; the rest pick the priority list. `evasion` is the dodge percent above which Engines and Piloting
 * are listed (strictly greater). `oxygen` is the average oxygen below which Oxygen is listed (strictly less).
 * `artillery` is seconds of charge below which Artillery is listed (strictly less). A missing value warns and uses
 * FTL's number.
 */
export type AiTarget = {
  easy?: number;
  normal?: number;
  hardRoom?: number;
  hardAny?: number;
  evasion?: number;
  oxygen?: number;
  artillery?: number;
};

/**
 * Gap `<overchargerWaits layer0 layer1 layer2 layer3 layer4>`: seconds a Shield Overcharger waits before adding one
 * Zoltan Shield layer, when that many layers already exist. FTL's executable hard-codes 8/10/13/16/20. Five or more
 * layers have no wait. Power and speed stay on the droneBlueprint (`<power>`, `<speed>`).
 */
export type OverchargerWaits = {
  layer0?: number;
  layer1?: number;
  layer2?: number;
  layer3?: number;
  layer4?: number;
};

/**
 * Gap `<ionIntruder ion stun pulseMin pulseMax>`: the Ion Intruder's pulse. `ion` is ion damage, `stun` is seconds
 * the crew stays stunned, and each pulse waits uniformly between `pulseMin` and `pulseMax` seconds. Power and the
 * space speed stay on the droneBlueprint.
 */
export type IonIntruderRule = {
  ion?: number;
  stun?: number;
  pulseMin?: number;
  pulseMax?: number;
};

/**
 * Gap `<shipWeapons ship>` › `<anyOf>`: weapons FTL's executable forces onto a ship the data does not arm.
 * `anyOf` is the weapon ids, in document order. The fight keeps one it already rolled; otherwise it fits one of them.
 * A ship with no row keeps FTL's list, with one warning.
 */
export type ShipWeapons = {
  ship: string;
  anyOf: string[];
};

/**
 * Gap `<crystalVengeance chance damage breach stunChance stun>`: Crystal Vengeance. `chance` is the probability
 * (0 to 1) that a hull hit breaks off a shard. The shard does `damage` hull, has `breach` chance to breach, and
 * `stunChance` to stun for `stun` seconds. Ignoring shields, facing evasion, and being shot down by a defense
 * drone are the shot's behaviour, not numbers.
 */
export type CrystalVengeanceRule = {
  chance?: number;
  damage?: number;
  breach?: number;
  stunChance?: number;
  stun?: number;
};

/**
 * Gap `<cargoSlots slots>`: how many weapons and drone schematics the cargo hold keeps.
 * FTL's executable hard-codes 4. A missing value warns and uses 4.
 */
export type CargoSlots = {
  slots?: number;
};

/**
 * Gap `<bonusItem weapon augment drone>`: relative weights when a bonus reward draws a weapon, an augmentation, or a
 * drone schematic. Rewards does not split the three, so each weight is 1. A kind whose pool is empty is not drawn.
 * Zero is a real weight: that kind is never drawn. A missing weight warns and uses 1.
 */
export type BonusItemWeights = {
  weapon?: number;
  augment?: number;
  drone?: number;
};

/** One bubble band of the asteroid field. `bubbles` 1 is 0–1 bubbles, 2 and 3 are that many, 4 is 4+. */
export type AsteroidTiming = {
  bubbles: number;
  break: [number, number];
  wave1: [number, number];
  wave2: [number, number];
  spawn1: [number, number];
  spawn2: [number, number];
};

/**
 * Gap `<asteroidField fire breach>` › `<timing bubbles …>`: the asteroid state machine FTL's executable hard-codes
 * (xftl doc/asteroids). `fire` and `breach` are the chances a rock starts that side effect; fire is checked first.
 * A missing value warns and uses FTL's row.
 */
export type AsteroidField = {
  fire?: number;
  breach?: number;
  timings?: AsteroidTiming[];
};

/**
 * Gap `<pulsar cycleMin cycleMax warn shieldLow shieldHigh ionBase ionPerPower>`: the pulsar FTL's executable
 * hard-codes. The cycle is uniform from `cycleMin` to `cycleMax`. The warning leads the pulse by `warn` seconds.
 * A Zoltan Shield spends `shieldLow` or `shieldHigh` (even split). Ion on a main system is
 * `floor(ionBase + ionPerPower * power)`. A missing value warns and uses FTL's number.
 */
export type PulsarRules = {
  cycleMin?: number;
  cycleMax?: number;
  warn?: number;
  shieldLow?: number;
  shieldHigh?: number;
  ionBase?: number;
  ionPerPower?: number;
};

/**
 * Gap `<droneOrbit minSep speedScale stopRadius firePause beamHold>`: combat-drone flight FTL's executable
 * hard-codes (xftl doc/combat-drone). The blueprint `<speed>` is not here. A missing value warns and uses FTL's
 * number.
 */
export type DroneOrbit = {
  /** Degrees. The next stop must be at least this far from the last, and the comparison does not wrap. */
  minSep?: number;
  /** Pixels per second is blueprint speed times the shield semi-major axis, divided by this. */
  speedScale?: number;
  /** Stop circle, in semi-major units. */
  stopRadius?: number;
  /** Seconds the drone sits on the stop before it fires. */
  firePause?: number;
  /** Extra seconds a beam drone waits while the beam finishes. */
  beamHold?: number;
};

/**
 * Gap `<sectorMap>`: beacon-map and Rebel-fleet numbers FTL's executable hard-codes (xftl doc/sector-map).
 * One tag, one attribute per number. `cols`×`rows` is the grid (6×4). `cell` is the cell size in px (110).
 * `margin` is the inset inside a cell: xftl prints 10, and the stand-in ships 28 so neighbouring beacons stay
 * tappable. `empty` is the chance a cell is skipped (0.2). `yMax` clamps beacon y (415). `topRightY` is the
 * minimum y of the two top-right cells (30). `link` is how far adjacent beacons connect (165). The danger
 * circle has radius `dangerRadius` (767), starts at `startX` (−959), and moves `step` px per fleet step (64);
 * its centre height is uniform from `dangerYMin` to `dangerYMax` (50–300). The exit sits in columns
 * `exitColMin`–`exitColMax` (4–5), at least `exitMinJumps` (5) from the start, and the pick gives up after
 * `tries` (16). The Federation base is columns `fedColMin`–`fedColMax` (2–3) and exactly `fedJumps` (4) away
 * on Easy/Normal, or `fedHardColMin`–`fedHardColMax` (3–4) and `fedHardJumpsMin`–`fedHardJumpsMax` (5–6) on
 * Hard. The flagship uses the exit columns and must be `flagshipJumpsMin`–`flagshipJumpsMax` (3–5) jumps from
 * the base. A missing value warns and uses FTL's; a missing margin uses 10. Connecting a split map and
 * diagonal adjacency are not numbers.
 */
export type SectorMap = {
  cols?: number;
  rows?: number;
  cell?: number;
  margin?: number;
  empty?: number;
  yMax?: number;
  topRightY?: number;
  link?: number;
  dangerRadius?: number;
  startX?: number;
  step?: number;
  dangerYMin?: number;
  dangerYMax?: number;
  exitColMin?: number;
  exitColMax?: number;
  exitMinJumps?: number;
  tries?: number;
  fedColMin?: number;
  fedColMax?: number;
  fedHardColMin?: number;
  fedHardColMax?: number;
  fedJumps?: number;
  fedHardJumpsMin?: number;
  fedHardJumpsMax?: number;
  flagshipJumpsMin?: number;
  flagshipJumpsMax?: number;
};

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
  | { k: "fight"; tier: string; asteroid?: boolean; autoBlueprint?: string }
  | { k: "note"; text: string }
  | { k: "item"; item: EventItem }
  | { k: "quest"; id: string }
  | { k: "goto"; id: string }
  | { k: "close" }
  | { k: "nothing" };

/** A resource named on a trade or Lanius row. */
export type OfferRes = "fuel" | "missiles" | "parts";

/** What a fuel-trader row asks the ship to pay. */
export type OfferPay = "parts" | "missiles" | "scrap";

/**
 * One row of a table the card rolls when it opens.
 * The sim still picks the row, then rolls the bands inside it.
 * A fuel page stores the high list and the second-visit list.
 * A Lanius page stores the base band and, on the trader, the better band.
 */
export type OfferRow =
  | { k: "trade"; pay: OfferRes; cost: [number, number]; get: OfferRes; gain: [number, number] }
  | {
      k: "fuel";
      band: "high" | "pt2";
      fuel: [number, number];
      pay: OfferPay;
      amt: [number, number];
    }
  | {
      k: "lanius";
      band: "base" | "better";
      res: OfferRes;
      cost: [number, number];
      scrap: [number, number];
    }
  | { k: "supply"; missiles: [number, number]; parts: [number, number]; fuel: [number, number] };

/**
 * One entry of a list the card draws when it opens.
 * A repeated hull entry is a heavier weight. The sim still draws with between.
 * A label is a button sentence. A count is a number and the word that fills a sentence.
 */
export type RollEntry =
  | { k: "hull"; id: string }
  | { k: "label"; text: string }
  | { k: "count"; n: number; word: string };

/**
 * One whole opening a page draws when the card opens.
 * The sim still draws one with between. The button handlers stay in code.
 */
/** Which handler claims a packed lock. The reqs stay on the choice. */
export type LockOwner = "filler" | "missing" | "cited" | "quest";

export type EventCard = {
  body: string;
  choices: {
    id: string;
    label: string;
    reqs?: ChoiceReq[];
    gift?: ChoiceGift;
    owner?: LockOwner;
  }[];
};

/**
 * Fuel this button pays when its handler grants the gift.
 * A fixed amount has the same ends, and that grant does not roll.
 * A positive resource effect is a separate payment and stays on the choice.
 */
export type ChoiceGift = { k: "fuel"; lo: number; hi: number };

/**
 * One lock on a button, checked in order.
 * The first failure's text is the refusal. The handler stays in code.
 * A crew lock is a living crewmember of that race.
 * A system lock is a minimum installed level. A band is an inclusive range.
 * A family is missile, ion, or beam. A drone id selects that schematic's own check.
 * A stock lock is scrap, missiles, fuel, or drone parts when the price is not already an effect.
 */
export type ChoiceReq =
  | { k: "crew"; id: string; text: string }
  | { k: "system"; id: string; level: number; text: string }
  | { k: "band"; id: string; lo: number; hi: number; text: string }
  | { k: "augment"; id: string; text: string }
  | { k: "weapon"; id: string; text: string }
  | { k: "family"; id: string; text: string }
  | { k: "drone"; id: string; text: string }
  | { k: "list"; id: string; text: string }
  | { k: "stock"; id: string; n: number; text: string }
  | { k: "attr"; id: string; text: string; min?: number; max?: number };

/**
 * `<environment type>` on an archive event.
 * PDS `target` is who the battery shoots. Omitted target shoots this ship.
 */
export type ArchiveEnvironment = {
  type: "asteroid" | "nebula" | "pulsar" | "sun" | "storm" | "PDS";
  target?: "player" | "enemy" | "all";
};

/**
 * A ship an archive page or choice loads.
 * A tag with a load or a hostile attribute is kept. Omitted hostile is hostile.
 */
export type ArchiveShip = {
  load?: string;
  hostile: boolean;
  /** `<ship auto_blueprint>`: a blueprintList id, or a ship blueprint id. */
  autoBlueprint?: string;
  /** `<ship asteroid>`: the fight opens in an asteroid field. */
  asteroid?: boolean;
};

/** An archive `<autoReward>`. The numeric bands stay in the rewards table. */
export type ArchiveReward = {
  level: string;
  name: string;
};

/** Archive boarders. `class` is the race id. */
export type ArchiveBoarders = {
  min: number;
  max: number;
  class?: string;
};

/** A named blueprint an archive page grants. A nameless weapon, drone, or augment stays an item effect. */
/** The six crew skills, as `<crewMember>` names them. */
export type CrewSkillName = "pilot" | "engines" | "shields" | "weapons" | "repair" | "combat";

export const CREW_SKILL_NAMES: readonly CrewSkillName[] = [
  "pilot",
  "engines",
  "shields",
  "weapons",
  "repair",
  "combat",
];

export type ArchiveGrant = {
  kind: "weapon" | "drone" | "augment" | "crew";
  id: string;
  amount?: number;
  /** A person's name when the archive names the crewmember. The race stays on `id`. */
  name?: string;
  /**
   * Skill levels (0-2) a granted crewmember joins with: `all_skills` sets every skill, a named skill attribute
   * (`pilot="1"`) sets that one and wins over `all_skills`.
   */
  skills?: Partial<Record<CrewSkillName, number>>;
};

/**
 * One `<status>`, `<upgrade>`, `<removeCrew>`, or `<remove>`, in document order.
 * `status.system` is the archive system id. `upgrade.system` may also be `reactor`.
 */
export type ArchiveAlter =
  | {
      k: "status";
      type: "clear";
      target: "player" | "enemy";
      system: string;
      /** Clear ignores amount. A tag that omits it does not store 0. */
      amount?: number;
    }
  | {
      k: "status";
      type: "limit" | "divide" | "loss";
      target: "player" | "enemy";
      system: string;
      amount: number;
    }
  | { k: "upgrade"; system: string; amount: number }
  | { k: "removeCrew"; clone: boolean; text?: string }
  | { k: "remove"; name: string };

/**
 * One `<quest>`, `<secretSector>`, `<distressBeacon>`, `<repair>`, `<fleet>`,
 * `<reveal_map>`, or `<unlockShip>`, in document order.
 * `unlockShip.id` is an index into the loaded pack's player ship blueprints.
 */
export type ArchiveMark =
  | { k: "quest"; event: string }
  | { k: "secretSector" }
  | { k: "distressBeacon" }
  | { k: "repair" }
  | { k: "fleet" }
  | { k: "revealMap" }
  | { k: "unlockShip"; id: number };

/** A button on an event page. The id is what `choose` receives. */
export type EventChoice = {
  id: string;
  label: string;
  fx: EventEffect[];
  /** Locks checked in order. The first failure's text is the refusal. */
  reqs?: ChoiceReq[];
  /** The handler that claims this button's lock. Other handlers leave it alone. */
  owner?: LockOwner;
  /** Fuel the handler pays. A positive resource effect is a different payment. */
  gift?: ChoiceGift;
  /** The archive hides this button until its requirement is met. Exact `hidden="true"` only. */
  hidden?: boolean;
  /** Inclusive floor from `lvl`, or from `min_level` when `lvl` is absent. */
  minLevel?: number;
  /** Inclusive ceiling from `max_lvl`. */
  maxLevel?: number;
  /** `max_group`. Siblings that share it keep one row. */
  maxGroup?: number;
  /** `blue="false"`. A met requirement is blue text unless this is false. */
  blue?: false;
  /** autoReward on the result page. */
  reward?: ArchiveReward;
  /** A ship that is not a fight. A hostile ship with a load is a fight effect. A hostile ship with no load stays here. */
  ship?: ArchiveShip;
  /** Named blueprints the result grants. */
  grants?: ArchiveGrant[];
  /** Boarders the result beams aboard. */
  boarders?: ArchiveBoarders;
  /** `<environment>` on the result. */
  environment?: ArchiveEnvironment;
  /** `<status>`, `<upgrade>`, `<removeCrew>`, and `<remove>`, in document order. */
  alters?: ArchiveAlter[];
  /** Quest, secret sector, and map marks, in document order. */
  marks?: ArchiveMark[];
  /** `<img>` text. The event card shows that file when the pack has it. */
  img?: string;
  /** Choices on the result page. */
  choices?: EventChoice[];
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
 * A band the handler rolls at its existing call site.
 * `id` names the price. A fixed band has the same ends and does not roll.
 * A missing price omits that button and pays nothing.
 * A button that shows the amount still reads it from the choice id.
 */
export type EventPrice = { id: string; k: "scrap" | "fuel"; lo: number; hi: number };

/**
 * A printed range the handler rolls at its existing call site.
 * A fixed band has the same ends and does not roll.
 * A missing band pays or grants nothing and does not roll.
 * An upgrade row is the same id with a scrap band and a level band.
 */
export type EventBand = {
  id: string;
  k: "scrap" | "fuel" | "missiles" | "parts" | "level";
  lo: number;
  hi: number;
};

/**
 * One scrap band for a specialty at the level already owned.
 * A row with no level applies whenever the code still offers that specialty.
 * A fixed band does not roll. The handler still reads the amount from the choice id.
 */
export type TradeStep = { id: string; level?: number; lo: number; hi: number };

/** One payment taken when the picked count does not match. A fixed band does not roll. */
export type GradePay = { k: "scrap" | "fuel" | "parts"; lo: number; hi: number };

/**
 * The page compares the picked count with the count the card rolled.
 * A match hires this crew. A miss pays these bands, in order.
 * A fixed band does not roll. The handler still reads both numbers from the choice id.
 */
export type EventGrade = {
  hire: string;
  pays: GradePay[];
};

/**
 * A beacon page. `id` is the datafile id, and `flag` is that same id.
 * `dest` is the title. An arrival page uses id `arrive-` plus the quest id.
 * A fight page can carry a `surrender` offer. Sector depth gates stay in code.
 * The sim still picks the beacon a marker lands on, and still checks the hull.
 */
/** One line of a `<textList>`. `load` names another list and is drawn when the page is shown. */
export type OpeningLine = { text: string } | { load: string };

/** A `<textList name>`. Later documents replace the same id. */
export type TextListDef = {
  id: string;
  lines: OpeningLine[];
};

export type EventDef = {
  id: string;
  dest: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  /** Opening sentences. The sim still picks one. Stored when a page has more than one. */
  texts?: string[];
  /**
   * Opening lines when a text list entry is itself a list.
   * A flat list is expanded into `texts`. Each nested load stays one draw.
   */
  openings?: OpeningLine[];
  /** Offer rows. The sim still picks one and still rolls the numbers inside it. */
  offers?: OfferRow[];
  /**
   * One list the card draws with between. A repeated hull is a heavier weight.
   * Stored when a page has at least one entry.
   */
  rolls?: RollEntry[];
  /**
   * Bands rolled onto buttons when the card opens.
   * A fixed band has the same ends and does not roll.
   * The handler still reads the amount from the choice id.
   */
  prices?: EventPrice[];
  /**
   * Printed ranges the handler rolls at its existing call site.
   * A fixed band does not roll. A missing band pays or grants nothing and does not roll.
   * An upgrade row is the same id with a scrap band and a level band.
   */
  bands?: EventBand[];
  /**
   * Scrap bands for a specialty at the level already owned.
   * The sim still picks one specialty the ship can buy, then rolls that band.
   * A fixed band does not roll. The handler still reads the amount from the choice id.
   */
  trades?: TradeStep[];
  /**
   * A match hires this crew. A miss pays these bands, in order.
   * A fixed band does not roll.
   * The handler still compares the two numbers on the choice id.
   */
  grade?: EventGrade;
  /**
   * Whole opening cards. The sim still draws one with between.
   * Stored when a page has at least one. Button handlers stay in code.
   */
  cards?: EventCard[];
  choices: EventChoice[];
  surrender?: SurrenderOfferDef;
  /**
   * Page-level results that already have an effect.
   * A loaded ship, an autoReward, and boarders stay on their own fields.
   */
  fx?: EventEffect[];
  /** The ship this page loads. */
  ship?: ArchiveShip;
  /** autoReward on this page. */
  reward?: ArchiveReward;
  /** Boarders this page spawns. */
  boarders?: ArchiveBoarders;
  /** Named blueprints this page grants. */
  grants?: ArchiveGrant[];
  /** `<store/>` on this page. Arriving opens a store. */
  store?: boolean;
  /** `<environment>` on this page. */
  environment?: ArchiveEnvironment;
  /** `<status>`, `<upgrade>`, `<removeCrew>`, and `<remove>`, in document order. */
  alters?: ArchiveAlter[];
  /** Quest, secret sector, and map marks, in document order. */
  marks?: ArchiveMark[];
  /** `<img>` text. The event card shows that file when the pack has it. */
  img?: string;
};

/** One ending of a root `<ship name>` event. Children are an inline page. A childless load is that event id. */
export type ShipEventEnding = {
  page?: EventDef;
  load?: string;
};

/**
 * Surrender or escape hull band.
 * `chance` is a probability from 0 to 1. Omitted chance is certain and is not stored.
 * `min` and `max` are hull points.
 */
export type ShipEventChance = ShipEventEnding & {
  chance?: number;
  min: number;
  max: number;
};

/** Escape band. `timer` is seconds, stored only when the attribute is present. */
export type ShipEventEscape = ShipEventChance & {
  timer?: number;
};

/** One weighted race inside a ship event's `<crew>` block. `prop` is a weight. */
export type ShipCrewRow = {
  race: string;
  prop: number;
};

/** `<weaponOverride count>`. `names` stay in document order. */
export type ShipWeaponOverride = {
  count: number;
  names: string[];
};

/**
 * Root `<ship name>` in the ship-event file.
 * `autoBlueprint` is a blueprintList id, or a ship blueprint id. Endings are optional.
 * The first `<crew>` block and the first `<weaponOverride>` win.
 */
export type ShipEventDef = {
  id: string;
  autoBlueprint?: string;
  surrender?: ShipEventChance;
  escape?: ShipEventEscape;
  destroyed?: ShipEventEnding;
  deadCrew?: ShipEventEnding;
  gotaway?: ShipEventEnding;
  /**
   * `<gotaway>` `<modifyPursuit amount="1">`. The next fleet advance counts twice.
   * It is not an immediate change to the fleet counter.
   */
  pursuit?: boolean;
  crew?: ShipCrewRow[];
  weaponOverride?: ShipWeaponOverride;
};

/**
 * One page on a filler list. `id` is the event slug.
 * `unique` pages appear once per sector.
 * An archive list can hold the page inline. `page` is that page.
 */
export type FillerEntry = {
  id: string;
  unique: boolean;
  page?: EventDef;
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

/**
 * When an achievement is earned, as the gap mod's private `<condition>` writes it. ftl.dat carries no conditions; FTL
 * keeps them in the executable. `value` names a reading the game takes (the sector number, a tally the run kept, a gauge
 * of the ship); with no bound it must be true or above 0, with `min` and `max` it must sit in that range.
 */
export type AchievementCondition =
  | { all: AchievementCondition[] }
  | { any: AchievementCondition[] }
  | { not: AchievementCondition }
  | { value: string; min?: number; max?: number };

/** One `<achievement>` from data/achievements.xml, plus the gap mod's condition. */
export type AchievementDef = {
  /** `<achievement id>`, such as ACH_SECTOR_5. */
  id: string;
  name: string;
  desc: string;
  /** `<shortname>` on the stats icon. */
  short?: string;
  /** `<ship>`: the ship blueprint (any of its layouts) the achievement can only be earned with. */
  ship?: string;
  /** `<multiDifficulty>`: the stats screen shows the difficulty it was earned on. */
  multiDifficulty?: boolean;
  /** `<img>`, an archive image path. */
  img?: string;
  /** Absent: the game has no way to tell when this one is earned. */
  condition?: AchievementCondition;
  /** Old localStorage id. The gap writes it so a save from before archive ids still counts. */
  slug?: string;
};

/** One campaign class and the ship blueprint a fight of that class asks for. */
export type ShipClassDef = {
  id: string;
  classId: string;
  blueprint: string;
  /** Pirate fight. Absent when the class has no pirate ship. */
  pirate?: string;
};

/**
 * Gap `<shipList name faction pirate>`: what a fight drawn from a blueprint list fields. FTL keeps this in its
 * executable: a ship has no faction field, but rules (surrender and escape odds, Slug and Rock hull rules) depend on one.
 * A list with a faction gives its ships that faction. A pirate list makes its ships pirates; their faction is the one a
 * faction list gives the blueprint, or the blueprint it is the pirate version of (`_P`, `_P_DLC`).
 */
export type ShipListRule = {
  id: string;
  faction?: string;
  pirate?: boolean;
};

export type ContentPack = {
  /** data/achievements.xml. */
  achievements?: AchievementDef[];
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
  /** Root `<ship name>` events: a hull list and the five endings. */
  shipEvents?: ShipEventDef[];
  lists?: FillerListDef[];
  /** Named weapon and drone pools from `<blueprintList>`. */
  blueprints?: BlueprintListDef[];
  /** `<textList>` rows. A page draws one line when it is shown. */
  textLists?: TextListDef[];
  /**
   * Campaign class id to the ship blueprint a fight asks for.
   * A real ftl.dat has no such tag; the gap writes the rows.
   */
  shipClasses?: ShipClassDef[];
  shipLists?: ShipListRule[];
  empties?: EmptyBeaconDef[];
  /** Shared scrap scaling and resource bands. Absent until a pack loads one. */
  rewards?: RewardTable;
  /** Faction surrender rows. A missing id does not offer. */
  factions?: FactionSurrender[];
  /** Faction escape rows. A missing id does not run. */
  escapes?: FactionEscape[];
  /** Default escape timers. Absent until a pack loads them. */
  escapeTimers?: EscapeTimers;
  /** Anti-stalemate break-off. Absent until a pack loads it. */
  stalemate?: Stalemate;
  /** Enemy weapon targeting numbers. Absent until a pack loads them. */
  aiTarget?: AiTarget;
  /** Shield Overcharger layer waits. Absent until a pack loads them. */
  overchargerWaits?: OverchargerWaits;
  /** Ion Intruder pulse. Absent until a pack loads it. */
  ionIntruder?: IonIntruderRule;
  /** Crystal Vengeance shard. Absent until a pack loads it. */
  crystalVengeance?: CrystalVengeanceRule;
  /**
   * Weapons an executable rule forces onto a named ship. Absent until a pack loads them.
   * A missing ship falls back to FTL's list.
   */
  shipWeapons?: ShipWeapons[];
  /** Cargo hold size. Absent until a pack loads it. */
  cargoSlots?: CargoSlots;
  /** Bonus-item kind weights. Absent until a pack loads them. */
  bonusItem?: BonusItemWeights;
  /** Asteroid field timings and side chances. Absent until a pack loads them. */
  asteroidField?: AsteroidField;
  /** Pulsar cycle, warning, shield spend, and ion. Absent until a pack loads them. */
  pulsar?: PulsarRules;
  /** Combat-drone orbit. Absent until a pack loads it. The blueprint `<speed>` is not this. */
  droneOrbit?: DroneOrbit;
  /** Beacon map and Rebel fleet circle. Absent until a pack loads it. */
  sectorMap?: SectorMap;
  /**
   * The archive is the factual stand-in. Item text states numbers.
   * A run can replace decision prose with outcomes.
   */
  facts?: boolean;
  /** Crew name pool and the syllables the name generator joins. */
  names?: { pool: string[]; syllables: string[] };
  /**
   * English `sectorname_CIVILIAN_SECTOR`.
   * Column 0 shows this while `STANDARD_SPACE` keeps its stored name.
   */
  civilianSectorTitle?: string;
  /**
   * A root `<beaconEvents>`, a private tag FTL ignores. FTL names these events in its executable.
   * The base mod writes FTL's names, so a real ftl.dat and the stand-in read the same defaults.
   * A sector's own `<startEvent>` or `<finishEvent>` wins over these.
   */
  beaconEvents?: BeaconEvents;
  /**
   * `text-<code>.xml` tables. English stays on the blueprints.
   * A `.append` file merges into the same code. The code is the filename, hyphens included.
   */
  locales?: LocaleTable[];
};

/** One `text-<code>.xml` table. English is not one of these. */
export type LocaleTable = {
  code: string;
  strings: Record<string, string>;
};
