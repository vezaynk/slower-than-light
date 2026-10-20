/**
 * Sectors-page beacon counts and the event-list classification the quotas are built from.
 * The running dealer reads the quotas this produces. It does not classify pages again.
 */

/**
 * Wiki page "Sectors": each sector type's "Beacons:" list, and
 * "Technical details of sector generation and events": every line draws a count between its min and max
 * (inclusive), and a sector's specific events (stores, homeworld events) sit at the top so they are always present.
 *
 * makeMap places the 19-24 beacons. Each line is rolled between its minimum and maximum, inclusive, then
 * that many free beacons (everything but the start and the exit) are filled before the next line. Once those
 * beacons are full, later lines are not placed. Nothing is scaled back to feed a later line, and a store roll
 * of 0 stays 0. Beacons left after the list take the neutral fallback.
 */

export type Slot =
  | "store"
  | "special"
  | "repair"
  | "items"
  | "neutral"
  | "empty"
  | "distress"
  | "hostile"
  | "quest"
  | "nebula"
  | "nebula-hostile"
  | "nebula-neutral"
  | "storm"
  | "boarder"
  | "environment";

/** One "Beacons:" bullet. `quote` is the bullet as the page prints it. `event` names a special event's page. */
export type MixLine = { slot: Slot; lo: number; hi: number; quote: string; event?: string };

const L = (slot: Slot, lo: number, hi: number, quote: string, event?: string): MixLine => ({
  slot,
  lo,
  hi,
  quote,
  event,
});

const CIVILIAN: MixLine[] = [
  L("store", 2, 3, "2-3 stores"),
  L("items", 2, 3, "2-3 various items"),
  L("neutral", 2, 4, "2-4 neutral encounters"),
  L("empty", 1, 2, "1-2 empty beacons"),
  L("distress", 1, 2, "1-2 distress beacons"),
  L("hostile", 6, 8, "6-8 hostile encounters"),
  L("quest", 0, 2, "0-2 quests"),
  L("nebula", 0, 8, "0-8 nebula spaces"),
];
const ENGI = (neutral: MixLine): MixLine[] => [
  L("store", 2, 3, "2-3 stores"),
  L("items", 5, 5, "5 various items"),
  L("empty", 1, 2, "1-2 empty beacons"),
  L("distress", 1, 3, "1-3 distress beacons"),
  L("quest", 1, 1, "1 quest"),
  neutral,
  L("hostile", 5, 7, "5-7 hostile encounters"),
];
const ZOLTAN: MixLine[] = [
  L("store", 2, 2, "2 stores"),
  L("empty", 1, 2, "1-2 empty beacons"),
  L("distress", 1, 2, "1-2 distress beacons"),
  L("nebula", 2, 6, "2-6 nebula spaces"),
  L("hostile", 6, 8, "6-8 hostile encounters"),
  L("boarder", 1, 2, "1-2 boarders"),
  L("items", 1, 2, "1-2 various items"),
  L("quest", 0, 1, "0-1 quests"),
  L("neutral", 5, 6, "5-6 neutral encounters"),
];
const MANTIS: MixLine[] = [
  L("store", 1, 2, "1-2 stores"),
  L("empty", 2, 3, "2-3 empty beacons"),
  L("distress", 1, 3, "1-3 distress beacons"),
  L("hostile", 6, 7, "6-7 hostile encounters"),
  L("boarder", 1, 2, "1-2 boarders"),
  L("items", 1, 2, "1-2 various items"),
  L("neutral", 6, 7, "6-7 neutral encounters"),
];
const REBEL = (quests: MixLine): MixLine[] => [
  L("store", 1, 2, "1-2 stores"),
  L("items", 1, 2, "1-2 various items"),
  L("hostile", 6, 8, "6-8 hostile encounters"),
  L("boarder", 1, 1, "1 boarder"),
  L("distress", 1, 2, "1-2 distress beacons"),
  L("nebula", 0, 5, "0-5 nebula spaces"),
  L("empty", 1, 2, "1-2 empty beacons"),
  quests,
  L("neutral", 5, 6, "5-6 neutral encounters"),
];
const ROCK: MixLine[] = [
  L("store", 2, 2, "2 stores"),
  L("empty", 2, 3, "2-3 empty beacons"),
  L("distress", 1, 2, "1-2 distress beacons"),
  L("hostile", 6, 8, "6-8 hostile encounters"),
  L("boarder", 1, 2, "1-2 boarders"),
  L("items", 1, 2, "1-2 various items"),
  L("quest", 0, 1, "0-1 quests"),
  L("neutral", 7, 8, "7-8 neutral encounters"),
];
const SLUG: MixLine[] = [
  L("store", 0, 1, "0-1 stores"),
  L("store", 2, 2, "2 nebula stores"),
  L("items", 0, 2, "0-2 various items"),
  L("empty", 0, 2, "0-2 empty beacons"),
  L("hostile", 1, 2, "1-2 hostile encounters"),
  L("distress", 3, 4, "3-4 distress beacons"),
  L("nebula", 2, 4, "2-4 empty nebula beacons"),
  L("nebula-hostile", 5, 7, "5-7 nebula hostile encounters"),
  L("storm", 1, 3, "1-3 storms"),
  L("nebula-neutral", 3, 5, "3-5 nebula neutral encounters"),
  L("neutral", 1, 2, "1-2 neutral encounters"),
];
const special = (name: string) => L("special", 1, 1, `1 [[${name}]] event`, name);

/** Keyed by the ftl.dat sector id that g.sectorId carries (sector_data.xml). */
export const SECTOR_MIX: Record<string, MixLine[]> = {
  STANDARD_SPACE: [
    L("nebula", 0, 4, "0-4 nebula beacons"),
    L("store", 1, 2, "1-2 stores"),
    L("items", 1, 1, "1 items / override_items events"),
    L("neutral", 2, 4, "2-4 neutral_civilian events"),
    L("empty", 1, 2, "1-2 empty beacons"),
    L("distress", 1, 2, "1-2 distress_beacon events"),
    L("hostile", 4, 6, "4-6 hostile_civilian events"),
    L("quest", 1, 1, "1 quests / override_quests event"),
    L("hostile", 2, 2, "2 hostile1 / override_hostile1 events"),
  ],
  CIVILIAN_SECTOR: CIVILIAN,
  ENGI_SECTOR: ENGI(L("neutral", 4, 6, "4-6 neutral encounters")),
  ENGI_HOME: [
    special("Engi fleet discussion"),
    ...ENGI(L("neutral", 5, 7, "5-7 neutral encounters")),
  ],
  // Wiki citations:
  // > "at one beacon per Zoltan sector" — [[Zoltan research facility#Trivia]]
  ZOLTAN_SECTOR: [special("Zoltan research facility"), ...ZOLTAN],
  ZOLTAN_HOME: [
    special("Zoltan research facility"),
    special("Unarmed Zoltan transport"),
    ...ZOLTAN,
  ],
  LANIUS_SECTOR: [
    L("store", 2, 2, "2 stores"),
    L("empty", 1, 2, "1-2 empty beacons"),
    L("distress", 1, 2, "1-2 distress beacons"),
    L("hostile", 5, 6, "5-6 hostile encounters"),
    L("environment", 1, 2, "1-2 hostile environment"),
    L("boarder", 1, 2, "1-2 boarders"),
    L("items", 2, 4, "2-4 various items"),
    L("quest", 0, 1, "0-1 quests"),
    L("neutral", 5, 6, "5-6 neutral encounters"),
  ],
  MANTIS_SECTOR: MANTIS,
  MANTIS_HOME: [special("Legendary thief KazaaakplethKilik"), ...MANTIS],
  PIRATE_SECTOR: REBEL(L("quest", 0, 1, "0-1 quests")),
  REBEL_SECTOR: REBEL(L("quest", 0, 2, "0-2 quests")),
  REBEL_SECTOR_MINIBOSS: [special("Rebel shipyard"), ...REBEL(L("quest", 0, 2, "0-2 quests"))],
  ROCK_SECTOR: ROCK,
  ROCK_HOME: [special("Ancient device"), special("Rock war vessel encounter"), ...ROCK],
  SLUG_SECTOR: SLUG,
  SLUG_HOME: [special("Slug Home Nebula surrender"), ...SLUG],
  NEBULA_SECTOR: [
    L("store", 0, 1, "0-1 stores"),
    L("items", 1, 3, "1-3 various items"),
    L("store", 1, 1, "1 nebula store"),
    L("nebula", 4, 4, "4 empty nebula beacons"),
    L("nebula-hostile", 5, 6, "5-6 nebula hostile encounters"),
    L("nebula-neutral", 7, 8, "7-8 nebula neutral encounters"),
    L("distress", 1, 3, "1-3 distress beacons"),
  ],
  CRYSTAL_HOME: [
    L("store", 2, 3, "2-3 stores"),
    L("items", 2, 2, "2 various items"),
    L("empty", 2, 2, "2 empty beacons"),
    L("hostile", 6, 10, "6-10 hostile encounters"),
    L("boarder", 1, 2, "1-2 boarders"),
    L("neutral", 12, 12, "12 neutral encounters"),
  ],
  FINAL: [
    L("store", 1, 1, "1 store"),
    L("repair", 3, 3, "3 repair stations"),
    L("hostile", 6, 6, "6 hostile encounters"),
    L("neutral", 7, 10, "7-10 neutral encounters"),
  ],
};

/** Hostile-group slots: a hostile cited event or a plain hostile beacon (sector-hostiles via enemy-gen). */
export const HOSTILE_SLOTS = new Set<Slot>([
  "hostile",
  "nebula-hostile",
  "storm",
  "boarder",
  "environment",
]);

/**
 * unique=false boarder pages. Template:Locations: "This event can occur multiple times per sector."
 * The sector's "1-2 boarders" line is that list, so both beacons can be the same event.
 */
export const REPEAT_BOARDERS: Record<string, string> = {
  LANIUS_SECTOR: "Boarders: Humans (Abandoned)",
  CRYSTAL_HOME: "Boarders: Crystal",
};

// ---- Classification -------------------------------------------------------------------------------------------

export type EventClass = "hostile" | "neutral" | "distress" | "items";

/** Template:EventList HOSTILE CIVILIAN and Template:EventList HOSTILE1 (and OVERRIDE_HOSTILE1, same rows). */
export const LIST_HOSTILE = [
  "Auto-ship attacking outpost",
  "Auto-ship fight near sun",
  "Pirate fight",
  "Pirate fight in asteroid field",
  "Pirate toll",
  "Pirate engine hacker",
  "Slaver (hostile)",
  "Pirate fight near sun",
  "Rebel fight",
  "Rebel ship attacking refueling outpost",
  "Rebel ship warning",
  "Auto-ship fight in asteroid field",
  "Auto-ship attacking civilian",
  "Auto-ship carrying shield virus",
  "Auto-ship warning",
  "Auto-ship fight",
];
/** Template:EventList NEUTRAL CIVILIAN, NEUTRAL EXIT and QUESTS. */
export const LIST_NEUTRAL = [
  "Large asteroid field",
  "Auto-ship near storage station",
  "Auto-ship near sensor station",
  "Slaver (friendly)",
  "The mercenary",
  "Pirate briber",
  "Pirate ship attacking civilian",
  "Remote settlement",
  "Rebel transport ship",
  "Plagued station",
  "Intelligent ponies",
  "Refueling platform",
  "Pirate ship selling drones",
  "Rebel checkpoint",
  "Rebel ship supplying civilians",
  "Refugee",
  "Rebel fight chance",
  "Battlefield wreckage",
  "Encrypted federation signal",
  "Settlement mercenary work",
  "Merchant's request",
  "Capture the ship",
  "Escort civilians",
  "Mantis war camp",
];
/** Template:EventList DISTRESS BEACON. */
export const LIST_DISTRESS = [
  "Asteroid belt distress",
  "Giant alien spiders",
  "Malfunctioning defense system",
  "Unknown disease on mining colony",
  "Fire on research station",
  "Crushed pirate",
  "Escort civilians FTL haywire",
  "Friendly ship out of fuel",
  "Pirate ship attacking civilian distress",
  "Refugee distress",
  "Refugee comms down",
  "Single life form on moon",
  "Pirate ship distress trap",
  "Slug ship boarding Rock ship",
  "Lanius empty distress beacon 1",
  "Lanius empty distress beacon 2",
  "Free scrap with resources (Zoltan)",
  "Engi research station",
];
/** Template:EventList ITEMS (and OVERRIDE_ITEMS, same rows). */
export const LIST_ITEMS = [
  "Free drone schematic",
  "Free weapon",
  "Free scrap with resources",
  "Trade fuel for drone parts",
  "Asteroid mining colony",
  "Refueling station",
  "Repair station",
  "Sell drone parts for scrap",
  "Sell missiles for scrap",
  "Crew hiring station",
  "Trade resources",
  "Trade scrap for upgrades",
  "Improve reactor for supplies",
];

/** The shape of a cited-events table row this module reads. */
export type MixEvent = {
  dest: string;
  flag: string;
  aliases: string[];
  choices: { fx: { k: string; sign?: number; n?: number }[] }[];
};

/**
 * 1. A wiki event list that names the page decides (hostile lists first: Auto-ship attacking outpost is also in
 *    NEUTRAL_EXIT, which is the exit list, not a sector list).
 * 2. Otherwise the page's own choices (INFERRED rule): no choice fights → neutral; every choice fights → hostile;
 *    some fight → hostile only when every other choice costs a resource or hull (a toll), else neutral.
 */
export function classifyEvent(ev: MixEvent): EventClass {
  const names = [ev.dest, ...ev.aliases];
  const listed = (list: string[]) => names.some((n) => list.includes(n));
  if (listed(LIST_HOSTILE)) return "hostile";
  if (listed(LIST_DISTRESS)) return "distress";
  if (listed(LIST_ITEMS)) return "items";
  if (listed(LIST_NEUTRAL)) return "neutral";
  const fights = ev.choices.map((c) => c.fx.some((f) => f.k === "fight"));
  if (!fights.some(Boolean)) return "neutral";
  const exits = ev.choices.filter((_, i) => !fights[i]);
  const costly = (c: MixEvent["choices"][number]) =>
    c.fx.some((f) => (f.k === "res" && f.sign === -1) || (f.k === "hull" && (f.n ?? 0) < 0));
  return exits.every(costly) ? "hostile" : "neutral";
}

/** Pages the dealer already repeats inside one sector. */
export const REPEAT_DESTS = new Set([
  "Escort civilians",
  "Engi ship attacked by Mantis ship",
  "Zoltan research facility",
]);

/** Zoltan research facility is capped at two beacons in a sector. */
export const REPEAT_CAP: Record<string, number> = {
  "Zoltan research facility": 2,
};
