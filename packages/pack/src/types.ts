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
  /** `<weaponArt>` name in the animation document. Absent uses the blueprint id. */
  art?: string;
  /** `<image>` projectile animation name. `<time>` on that anim is its duration, not the volley gap. */
  image?: string;
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
  /** Hire price from an archive crewBlueprint. Absent on a stats-only row. */
  cost?: number;
  /**
   * `<colorList>` from an archive crewBlueprint: one list per `<layer>`, in order. Layer N tints
   * `img/people/<id>_layerN.png`, drawn over the untinted base sheet. Absent on a stats-only row.
   */
  colors?: CrewColor[][];
};

/** One `<color>` of a crew colour layer. r, g, b are 0 to 255; a is 0 to 1. */
export type CrewColor = { r: number; g: number; b: number; a: number };

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
  /** `<droneImage>` stem. Pictures are `img/ship/drones/<image>_base.png`, `_on.png`, and `_charged.png`. */
  image?: string;
};

/** Where a purchased system is installed. Power and the starting level stay in the effect code. */
export type SystemSlot = "sys" | "kit";

/** A store listing for one single-price system. `detail` is the archive's factual line. */
export type SystemDef = {
  id: string;
  name: string;
  cost: number;
  slot: SystemSlot;
  /** Factual install line from the archive. Absent on a stats-only row. */
  detail?: string;
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

/** The four ELLIPSE integers, in file order: width, height, x, y. */
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
  /** Music track ids. */
  tracks?: string[];
  /** How many beacons draw each event. These are not page lines. */
  quotas?: SectorQuota[];
  /** Crew rarities. */
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
export type EventCard = {
  body: string;
  choices: { id: string; label: string; reqs?: ChoiceReq[]; gift?: ChoiceGift }[];
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
  | { k: "stock"; id: string; n: number; text: string };

/** A ship an archive page or choice loads. Omitted hostile is hostile. */
export type ArchiveShip = {
  load: string;
  hostile: boolean;
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
export type ArchiveGrant = {
  kind: "weapon" | "drone" | "augment" | "crew";
  id: string;
  amount?: number;
};

/** A button on an event page. The id is what `choose` receives. */
export type EventChoice = {
  id: string;
  label: string;
  fx: EventEffect[];
  /** Locks checked in order. The first failure's text is the refusal. */
  reqs?: ChoiceReq[];
  /** Fuel the handler pays. A positive resource effect is a different payment. */
  gift?: ChoiceGift;
  /** The archive hides this button until its requirement is met. */
  hidden?: boolean;
  /** autoReward on the result page. */
  reward?: ArchiveReward;
  /** A loaded ship that is not a fight. A hostile ship is a fight effect. */
  ship?: ArchiveShip;
  /** Named blueprints the result grants. */
  grants?: ArchiveGrant[];
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
  /** Named weapon and drone pools from `<blueprintList>`. */
  blueprints?: BlueprintListDef[];
  /** `<textList>` rows. A page draws one line when it is shown. */
  textLists?: TextListDef[];
  empties?: EmptyBeaconDef[];
  /** Shared scrap scaling and resource bands. Absent until a pack loads one. */
  rewards?: RewardTable;
  /** Faction surrender rows. A missing id does not offer. */
  factions?: FactionSurrender[];
  /**
   * The archive is the factual stand-in. Item text states numbers.
   * A run can replace decision prose with outcomes.
   */
  facts?: boolean;
  /** Crew name pool and the syllables the name generator joins. */
  names?: { pool: string[]; syllables: string[] };
};
