/**
 * Out-of-fuel pages. Template:Locations says an outoffuel page occurs when
 * you are out of fuel. The param is distresson, distressoff, or distressboth.
 * That is the whole selection rule. The template does not say which matching
 * page plays. citedFuelCandidates returns every match and does not pick one.
 * These pages name no sector. Nothing here places a beacon.
 *
 * EXTRA_EVENTS is only pages that are not already in cited-events.ts and that
 * keep at least one choice with one stated outcome. A choice with several
 * results is omitted. Blue options are not granted. Crew, a map reveal, and an
 * upgrade are not granted. No page kept here gives an unnamed weapon, schematic, or augment.
 *
 * Omitted: Slug fuel trader (the paid offer has two results; the single trade
 * is a Slug blue option). Drifting debris (the away team has several reports,
 * including a map reveal and a crew ransom). Both fuel-trader pages (each
 * trade choice lists several offers). Prepare to dock (each reply has several
 * results). Refugee trading (three random meetings, not one menu). Both wait
 * fails ("Nothing happens.").
 */

export type CitedFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  | { k: "nothing" };

export type CitedEventDef = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: { id: string; label: string; fx: CitedFx[] }[];
};

export const EXTRA_EVENTS: CitedEventDef[] = [
  {
    dest: "No fuel: Rebel fleet delay",
    slug: "no-fuel-rebel-fleet-delay",
    flag: "cited:no-fuel-rebel-fleet-delay",
    aliases: ["No fuel: Rebel fleet delay", "Fuel Fleet Delay", "Fuel Fleet delay"],
    sectors: [],
    body: "",
    choices: [
      {
        id: "c:no-fuel-rebel-fleet-delay:0",
        label: "Rebel Fleet pursuit is delayed for 1 jump",
        fx: [
          // "Rebel Fleet pursuit is delayed for 1 jump."
          { k: "fleet", n: 1 },
          // "Another out of fuel event occurs."
          { k: "note", text: "Another out of fuel event occurs." },
        ],
      },
    ],
  },
  {
    dest: "No fuel: friendly refugee",
    slug: "no-fuel-friendly-refugee",
    flag: "cited:no-fuel-friendly-refugee",
    aliases: ["No fuel: friendly refugee", "Friendly Refugee", "Friendly refugee"],
    sectors: [],
    body: "While it doesn't have much fuel to spare, it recognizes you are part of the Federation and offers to split its remaining fuel with you.",
    choices: [
      {
        id: "c:no-fuel-friendly-refugee:0",
        label: "You receive medium fuel",
        fx: [
          // "You receive {{tooltip|medium|2-4}} [[Rewards#Fuel only|fuel]]."
          { k: "res", id: "fuel", sign: 1, lo: 2, hi: 4 },
        ],
      },
    ],
  },
];

type OutOfFuel = "distresson" | "distressoff" | "distressboth";

type FuelPage = { dest: string; flag: string; outoffuel: OutOfFuel };

/**
 * The seven pages already in cited-events.ts, in that file's order.
 * Each outoffuel value is that page's Locations param.
 */
const WRITTEN: FuelPage[] = [
  // {{Locations|outoffuel=distresson}}
  { dest: "No fuel: Auto-ship warning", flag: "cited:no-fuel-auto-ship-warning", outoffuel: "distresson" },
  // {{Locations|outoffuel=distressoff}}
  { dest: "No fuel: Engi ship repair", flag: "cited:no-fuel-engi-ship-repair", outoffuel: "distressoff" },
  // {{Locations|outoffuel=distresson}}
  { dest: "No fuel: Mantis fight", flag: "cited:no-fuel-mantis-fight", outoffuel: "distresson" },
  // {{Locations|outoffuel=distresson}}
  { dest: "No fuel: Rebel fight", flag: "cited:no-fuel-rebel-fight", outoffuel: "distresson" },
  // {{Locations|outoffuel=distresson}}
  { dest: "No fuel: Slug fuel depot", flag: "cited:no-fuel-slug-fuel-depot", outoffuel: "distresson" },
  // {{Locations|outoffuel=distresson}}
  { dest: "No fuel: automated refueling ship", flag: "cited:no-fuel-automated-refueling-ship", outoffuel: "distresson" },
  // {{Locations|outoffuel=distressboth}}
  { dest: "No fuel: explore the system", flag: "cited:no-fuel-explore-the-system", outoffuel: "distressboth" },
];

/** Locations param for a page exported above. Not a sector and not a weight. */
const EXTRA_OUT: Record<string, OutOfFuel> = {
  // {{Random Events}} {{Locations|outoffuel=distressoff}}
  "No fuel: Rebel fleet delay": "distressoff",
  // {{Locations|outoffuel=distressoff}}
  "No fuel: friendly refugee": "distressoff",
};

/**
 * Every already-written or exported page whose outoffuel param matches.
 * distressboth matches both states. Order is the seven, then EXTRA_EVENTS.
 * The template does not say which matching page plays.
 */
export function citedFuelCandidates(distressOn: boolean): { flag: string; dest: string }[] {
  const pages: FuelPage[] = [
    ...WRITTEN,
    ...EXTRA_EVENTS.map((ev) => {
      const outoffuel = EXTRA_OUT[ev.dest];
      if (!outoffuel) throw new Error(`missing outoffuel for ${ev.dest}`);
      return { dest: ev.dest, flag: ev.flag, outoffuel };
    }),
  ];
  const side: OutOfFuel = distressOn ? "distresson" : "distressoff";
  return pages
    .filter((page) => page.outoffuel === side || page.outoffuel === "distressboth")
    .map((page) => ({ flag: page.flag, dest: page.dest }));
}

/** No fuel: wait fail (distress off) / (distress on): "The text for this event varies, and could be any of the following". */
const WAIT_FAIL: Record<"on" | "off", string[]> = {
  off: [
    "No ship is in scanning range and no one arrives at the beacon.",
    "Your waiting yields nothing while the fleet surely gets closer...",
    "A freighter suddenly arrives nearby. They are so close you can almost wave at them, but your hails are ignored and the ship quickly jumps away.",
    "Small traffic passes within a short distance of you, but no one responds to your hails.",
    "The only ship within hailing range appears to be a civilian vessel. However, it quickly leaves once it picks up your signal.",
    "As you wait, a small asteroid storm pelts softly against your shields and hull.",
    "You begin to wonder if turning on the beacon would be worth the risk of detection. The fleet slowly approaches.",
    "You contemplate the vastness of space.",
    "The prolonged wait in empty space is causing tension among the crew. Still no contact.",
    "Cabin fever begins to spread among your crew.",
    "Long range scanners detect a small settlement, but they refuse all contact.",
  ],
  on: [
    "You contemplate that it is fortunate the ship's life support system does not rely on FTL fuel cells.",
    "Nothing happens. Your calls go unanswered.",
    "The distress beacon's light is the only movement visible outside the ship.",
    "No ships jump into the sector...",
    "A few passing ships seem oblivious to your distress call and ignore all hails.",
    "A few civilian ships are within scanning range, yet none respond to your calls.",
    "No ships pass through the area.",
  ],
};

/**
 * Per the user: waiting with no fuel plays an out-of-fuel page for the distress beacon's state.
 * No fuel: wait fail (distress off), Trivia: "This event has a 36.4% chance of occurring when you wait at a beacon with
 * your distress beacon off." (distress on): "16.7% chance ... with your distress beacon on." No fuel: Rebel fleet
 * delay: "9% chance of occurring when you wait at a beacon with your distress beacon off." Category:Out of Fuel
 * Distress ON Events lists 11 pages and OFF lists 8, each including its wait fail. The printed shares fit every other
 * page weighing 1 and the wait fail 2 (on: 2/12 = 16.7%) or 4 (off: 4/11 = 36.4%, one page 1/11 = 9%). INFERRED from
 * that arithmetic: the other pages share the rest equally. Some are not built here (both fuel traders, the Slug fuel
 * trader, drifting debris, prepare to dock, refugee trading), so the built ones take their share. A fail returns one of
 * the page's printed lines, uniformly.
 */
export function rollFuelWait(roll: () => number, distressOn: boolean): { flag: string; dest: string } | { fail: string } {
  const r = roll();
  const failShare = distressOn ? 0.167 : 0.364;
  if (r < failShare) {
    const lines = WAIT_FAIL[distressOn ? "on" : "off"];
    return { fail: lines[Math.min(lines.length - 1, Math.floor(roll() * lines.length))]! };
  }
  const pages = citedFuelCandidates(distressOn);
  const delay = pages.find((page) => page.dest === "No fuel: Rebel fleet delay");
  if (!distressOn && delay && r < failShare + 0.09) return delay;
  const rest = pages.filter((page) => page !== delay);
  return rest[Math.min(rest.length - 1, Math.floor(roll() * rest.length))]!;
}
