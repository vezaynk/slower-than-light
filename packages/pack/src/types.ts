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
  /** Player-facing blurb from an archive crewBlueprint. Absent on a stats-only row. */
  detail?: string;
  /** Hire price from an archive crewBlueprint. Absent on a stats-only row. */
  cost?: number;
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

/** A store listing for one single-price system. `detail` is the archive's factual line. */
export type SystemDef = {
  id: string;
  name: string;
  cost: number;
  slot: SystemSlot;
  /** Factual install line from the archive. Absent on a stats-only row. */
  detail?: string;
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

/** A button on an event page. The id is what `choose` receives. */
export type EventChoice = {
  id: string;
  label: string;
  fx: EventEffect[];
  /** Locks checked in order. The first failure's text is the refusal. */
  reqs?: ChoiceReq[];
  /** Fuel the handler pays. A positive resource effect is a different payment. */
  gift?: ChoiceGift;
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
  /**
   * The archive is the factual stand-in. Item text states numbers.
   * A run can replace decision prose with outcomes.
   */
  facts?: boolean;
  /** Crew name pool and the syllables the name generator joins. */
  names?: { pool: string[]; syllables: string[] };
};
