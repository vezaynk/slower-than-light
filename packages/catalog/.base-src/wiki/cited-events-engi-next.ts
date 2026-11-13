/**
 * Engi candidate pages whose own text states one opening outcome and a
 * sector. Redirects are not followed.
 * Engi cache is the stand-in's copy of ftl.dat's ENGI_FLEET_DELAY. The game plays it from the archive; the old
 * code page (apps/game wiki/engi-cache.ts) is gone.
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
  choices: {
    id: string;
    label: string;
    fx: CitedFx[];
    hidden?: boolean;
    reward?: { level: "LOW" | "MED" | "HIGH"; name: string };
  }[];
};

export const EXTRA_EVENTS: CitedEventDef[] = [
  {
    dest: "Engi cache",
    slug: "engi-cache",
    // Wiki citations:
    // > "{{Locations|Engi Controlled Sector|Engi Homeworlds|LRSmap=noship|unique=true}}" — [[Engi cache]]
    flag: "cited:engi-cache",
    aliases: ["Engi cache"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "You notice an Engi colony hiding on the other side of a nearby moon. It turns out they're excavating an equipment cache from the Federation-Mantis War, and they suggest it might be used to lure the pursuing rebel fleet.",
    choices: [
      {
        id: "c:engi-cache:0",
        // Wiki citations:
        // > "Booby trap the cache. &nbsp;[ {{Transaction|2|subtract_missiles}} ]" — [[Engi cache]]
        // > "Rebel Fleet is delayed for 2 turns." — [[Engi cache]]
        label: "Booby trap the cache.",
        fx: [
          {
            k: "note",
            text: "You transfer down some missile warheads and the Engi rig them to blow before setting a distress signal to attract the fleet's attention.",
          },
          { k: "res", id: "missiles", sign: -1, lo: 2, hi: 2 },
          { k: "fleet", n: 2 },
        ],
      },
      {
        id: "c:engi-cache:1",
        // Wiki citations:
        // > "You receive a drone schematic with medium scrap." — [[Engi cache]]
        // Rewards, "Drone": "A random drone schematic & T scrap." That is autoReward drone at the MED level.
        label: "Secure the cache.",
        fx: [
          {
            k: "note",
            text: "You have the Engi complete their excavations and bring the supplies on-board.",
          },
        ],
        hidden: true,
        reward: { level: "MED", name: "drone" },
      },
    ],
  },
];
