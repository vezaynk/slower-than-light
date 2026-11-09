/**
 * Out-of-fuel pages that are not already in cited-events.ts.
 * These pages name no sector. Nothing here places a beacon.
 * Which page plays is ftl.dat's NO_FUEL and NO_FUEL_DISTRESS lists
 * (`packages/catalog/src/pack/base.ts`). Duplicate list rows are the weights.
 * The wait-fail pages are FUEL_NOTHING and FUEL_NOTHING_DISTRESS there.
 *
 * EXTRA_EVENTS is only pages that are not already in cited-events.ts and that
 * keep at least one choice with one stated outcome. A choice with several
 * results is omitted. Blue options are not granted. Crew, a map reveal, and an
 * upgrade are not granted. No page kept here gives an unnamed weapon, schematic, or augment.
 *
 * The pages below join those lists only. They name no sector. Their cards
 * are built in cited-missing.ts.
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
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Rebel fleet delay]]
    flag: "cited:no-fuel-rebel-fleet-delay",
    aliases: ["No fuel: Rebel fleet delay", "Fuel Fleet Delay", "Fuel Fleet delay"],
    sectors: [],
    body: "",
    choices: [
      {
        id: "c:no-fuel-rebel-fleet-delay:0",
        // Wiki citations:
        // > "Rebel Fleet pursuit is delayed for 1 jump." — [[No fuel: Rebel fleet delay]]
        // > "Another out of fuel event occurs." — [[No fuel: Rebel fleet delay]]
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
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: friendly refugee]]
    // > "While it doesn't have much fuel to spare, it recognizes you are part of the Federation and offers to split its remaining fuel with you." — [[No fuel: friendly refugee]]
    flag: "cited:no-fuel-friendly-refugee",
    aliases: ["No fuel: friendly refugee", "Friendly Refugee", "Friendly refugee"],
    sectors: [],
    body: "While it doesn't have much fuel to spare, it recognizes you are part of the Federation and offers to split its remaining fuel with you.",
    choices: [
      {
        id: "c:no-fuel-friendly-refugee:0",
        // Wiki citations:
        // > "You receive medium fuel." — [[No fuel: friendly refugee]]
        label: "You receive medium fuel",
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
  const slug = dest
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    dest,
    slug,
    flag: `cited:${slug}`,
    aliases: [dest],
    sectors: [],
    body: "",
    choices: [{ id: `c:${slug}:0`, label: "Continue", fx: [{ k: "nothing" }] }],
  };
}
