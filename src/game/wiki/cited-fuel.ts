import { tx } from "../../i18n/index.ts";
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
 * The six pages below join the wait roll only. They name no sector. Their cards
 * are built in cited-missing.ts. Both wait fails ("Nothing happens.") stay out.
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
        label: tx("wiki.cited-fuel.rebel-fleet-pursuit-is-delayed-for"),
        fx: [
          // "Rebel Fleet pursuit is delayed for 1 jump."
          { k: "fleet", n: 1 },
          // "Another out of fuel event occurs."
          { k: "note", text: tx("wiki.cited-fuel.another-out-of-fuel-event-occurs") },
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
    body: tx("wiki.cited-fuel.while-it-doesn-t-have-much"),
    choices: [
      {
        id: "c:no-fuel-friendly-refugee:0",
        label: tx("wiki.cited-fuel.you-receive-medium-fuel"),
        fx: [
          // "You receive {{tooltip|medium|2-4}} [[Rewards#Fuel only|fuel]]."
          { k: "res", id: "fuel", sign: 1, lo: 2, hi: 4 },
        ],
      },
    ],
  },
  fuelStub("No fuel: Slug fuel trader"),
  fuelStub("No fuel: drifting debris"),
  fuelStub("No fuel: fuel trader (distress off)"),
  fuelStub("No fuel: fuel trader (distress on)"),
  fuelStub("No fuel: prepare to dock"),
  fuelStub("No fuel: refugee trading"),
];

function fuelStub(dest: string): CitedEventDef {
  const slug = dest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    dest,
    slug,
    flag: `cited:${slug}`,
    aliases: [dest],
    sectors: [],
    body: "",
    choices: [{ id: `c:${slug}:0`, label: tx("wiki.cited-missing.continue"), fx: [{ k: "nothing" }] }],
  };
}

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
  // {{Locations|outoffuel=distresson}}
  "No fuel: Slug fuel trader": "distresson",
  // {{Locations|outoffuel=distressoff}}
  "No fuel: drifting debris": "distressoff",
  // {{Locations|outoffuel=distressoff}}
  "No fuel: fuel trader (distress off)": "distressoff",
  // {{Locations|outoffuel=distresson}}
  "No fuel: fuel trader (distress on)": "distresson",
  // {{Locations|outoffuel=distressboth}}
  "No fuel: prepare to dock": "distressboth",
  // {{Locations|outoffuel=distresson}}
  "No fuel: refugee trading": "distresson",
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
    tx("wiki.cited-fuel.no-ship-is-in-scanning-range"),
    tx("wiki.cited-fuel.your-waiting-yields-nothing-while-the"),
    tx("wiki.cited-fuel.a-freighter-suddenly-arrives-nearby-they"),
    tx("wiki.cited-fuel.small-traffic-passes-within-a-short"),
    tx("wiki.cited-fuel.the-only-ship-within-hailing-range"),
    tx("wiki.cited-fuel.as-you-wait-a-small-asteroid"),
    tx("wiki.cited-fuel.you-begin-to-wonder-if-turning"),
    tx("wiki.cited-fuel.you-contemplate-the-vastness-of-space"),
    tx("wiki.cited-fuel.the-prolonged-wait-in-empty-space"),
    tx("wiki.cited-fuel.cabin-fever-begins-to-spread-among"),
    tx("wiki.cited-fuel.long-range-scanners-detect-a-small"),
  ],
  on: [
    tx("wiki.cited-fuel.you-contemplate-that-it-is-fortunate"),
    tx("wiki.cited-fuel.nothing-happens-your-calls-go-unanswered"),
    tx("wiki.cited-fuel.the-distress-beacon-s-light-is"),
    tx("wiki.cited-fuel.no-ships-jump-into-the-sector"),
    tx("wiki.cited-fuel.a-few-passing-ships-seem-oblivious"),
    tx("wiki.cited-fuel.a-few-civilian-ships-are-within"),
    tx("wiki.cited-fuel.no-ships-pass-through-the-area"),
  ],
};

/**
 * Per the user: waiting with no fuel plays an out-of-fuel page for the distress beacon's state.
 * No fuel: wait fail (distress off), Trivia: "This event has a 36.4% chance of occurring when you wait at a beacon with
 * your distress beacon off." (distress on): "16.7% chance ... with your distress beacon on." No fuel: Rebel fleet
 * delay: "9% chance of occurring when you wait at a beacon with your distress beacon off." Category:Out of Fuel
 * Distress ON Events lists 11 pages and OFF lists 8, each including its wait fail. The printed shares fit every other
 * page weighing 1 and the wait fail 2 (on: 2/12 = 16.7%) or 4 (off: 4/11 = 36.4%, one page 1/11 = 9%). INFERRED from
 * that arithmetic: the other pages share the rest equally. The wait fails stay out of that roll. A fail returns one of
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
