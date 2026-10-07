import type { Beacon, Difficulty, Game, GameEvent } from "../types.ts";
import { mediumScrapBand } from "../content.ts";
import { EXTRA_EVENTS as AUTO_EVENTS } from "./cited-events-auto.ts";
import { EXTRA_EVENTS as CIVILIAN_AL } from "./cited-events-civilian-al.ts";
import { EXTRA_EVENTS as CIVILIAN_MZ } from "./cited-events-civilian-mz.ts";
import { EXTRA_EVENTS as CIVILIAN_NEXT } from "./cited-events-civilian-next.ts";
import { EXTRA_EVENTS as CRYSTAL_EVENTS } from "./cited-events-crystal.ts";
import { EXTRA_EVENTS as CRYSTAL_NEXT } from "./cited-events-crystal-next.ts";
import { EXTRA_EVENTS as ENGI_EVENTS } from "./cited-events-engi.ts";
import { EXTRA_EVENTS as ENGI_NEXT } from "./cited-events-engi-next.ts";
import { EXTRA_EVENTS as FUEL_EVENTS } from "./cited-fuel.ts";
import { EXTRA_EVENTS as LANIUS_EVENTS } from "./cited-events-lanius.ts";
import { EXTRA_EVENTS as MANTIS_EVENTS } from "./cited-events-mantis.ts";
import { EXTRA_EVENTS as MANTIS_ROCK } from "./cited-events-mantis-rock.ts";
import { EXTRA_EVENTS as PIRATE_EVENTS } from "./cited-events-pirate.ts";
import { EXTRA_EVENTS as PIRATE_NEXT } from "./cited-events-pirate-next.ts";
import { EXTRA_EVENTS as REBEL_EVENTS } from "./cited-events-rebel.ts";
import { EXTRA_EVENTS as REBEL_NEXT } from "./cited-events-rebel-next.ts";
import { EXTRA_EVENTS as ROCK_EVENTS } from "./cited-events-rock.ts";
import { EXTRA_EVENTS as SLUG_EVENTS } from "./cited-events-slug.ts";
import { EXTRA_EVENTS as SLUG_NEXT } from "./cited-events-slug-next.ts";
import { EXTRA_EVENTS as ZOLTAN_EVENTS } from "./cited-events-zoltan.ts";
import { EXTRA_EVENTS as ZOLTAN_NEXT } from "./cited-events-zoltan-next.ts";
// @agent:surrender. Ship surrender Events pages; their random branches run in wiki/surrender.ts.
import { EXTRA_EVENTS as SURRENDER_PAGES } from "./cited-events-surrender.ts";
// @agent:quests-a. Opening cards of the sector-special quest openers; their branches run in wiki/quests-a.ts.
import { EXTRA_EVENTS as QUEST_A_PAGES } from "./quests-a-pages.ts";
import { EXTRA_EVENTS as QUEST_B_PAGES } from "./cited-events-quests-b.ts"; // @agent:quests-b. Branches in wiki/quests-b.ts.
// @agent:beacon-mix. Per-sector beacon composition from the Sectors page.
import { mixBeacons } from "./beacon-mix.ts";
import { markRuwenEntry } from "./ruwen-entry.ts";
// Rock fight with boarders. Called only from citedChoose, after ctx.fight (surrender.ts imports sim.ts).
import { rockBoarders } from "./surrender.ts";

/** Pirate engine hacker: "Fight the Pirate ship with your Engines limited to level 1." */
export function citedEngineCap(id: string): number | null {
  if (id === "c:pirate-engine-hacker:0") return 1;
  return null;
}

/** Auto-ship carrying shield virus: "Fight an Auto-ship with your Shields halved" and "rounds down against you". */
export function citedShieldHalf(id: string): boolean {
  return id === "c:auto-ship-carrying-shield-virus:0";
}

/**
 * Slug hacker (choice): "Shields halved", "Oxygen system halved", or "Weapon Control halved".
 * The Engi virus: "Engines and Shields systems halved".
 * Each tooltip says "rounds down against you".
 */
/**
 * Slug hacker (doors): "Fight a Slug ship with your Door System offline."
 * Slug hacker (oxygen): "Fight a Slug ship with your Oxygen system offline."
 * Slug hacker (medical): "Medbay / Clone Bay offline."
 */
export function citedSystemOff(id: string): Array<"doors" | "oxygen" | "medbay"> | null {
  if (id === "c:slug-hacker-doors:0") return ["doors"];
  if (id === "c:slug-hacker-oxygen:0") return ["oxygen"];
  if (id === "c:slug-hacker-medical:0") return ["medbay"];
  return null;
}

export function citedSystemHalf(id: string): Array<"shields" | "oxygen" | "weapons" | "engines"> | null {
  if (id === "c:slug-hacker-choice:0") return ["shields"];
  if (id === "c:slug-hacker-choice:1") return ["oxygen"];
  if (id === "c:slug-hacker-choice:2") return ["weapons"];
  // The Engi virus: "Engines and Shields systems halved" and "rounds down against you".
  if (id === "c:the-engi-virus:0") return ["engines", "shields"];
  return null;
}

/**
 * Event pages whose opening choice states a number, a scrap tier, or a fight.
 * Engi cache stays in sim.ts. A page that only says "a random amount" is absent.
 * Blue options, crew, map reveals, upgrades, and unnamed items are not granted.
 * Template:Scrap rewards low and high columns are the WIKI-SPEC section 14 table.
 * Medium uses mediumScrapBand.
 */

type ResId = "scrap" | "fuel" | "missiles" | "parts";

type Fx =
  | { k: "res"; id: ResId; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  | { k: "nothing" };

type ChoiceDef = { id: string; label: string; fx: Fx[] };

type EventDef = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: ChoiceDef[];
};

/** Template:Scrap rewards, Low column, sectors 1–8. Easy, Normal, Hard. */
const SCRAP_LOW: Record<Difficulty, [number, number][]> = {
  easy: [[10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35], [28, 39], [31, 44]],
  normal: [[7, 10], [10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35], [28, 39]],
  hard: [[7, 10], [7, 10], [10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35]],
};

/** Template:Scrap rewards, High column, sectors 1–8. Easy, Normal, Hard. */
const SCRAP_HIGH: Record<Difficulty, [number, number][]> = {
  easy: [[27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79], [74, 88], [81, 97]],
  normal: [[19, 23], [27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79], [74, 88]],
  hard: [[19, 23], [19, 23], [27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79]],
};

const RES_WORD: Record<ResId, string> = {
  scrap: "scrap",
  fuel: "fuel",
  missiles: "missiles",
  parts: "drone parts",
};

const CORE_EVENTS: EventDef[] = [
  {
    "dest": "Auto-ship attacking civilian",
    "slug": "auto-ship-attacking-civilian",
    "flag": "cited:auto-ship-attacking-civilian",
    "aliases": [
      "Auto-ship attacking civilian",
      "Rebel Scout Pursuing Civilian Ship"
    ],
    "sectors": [
      "Civilian Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold"
    ],
    "body": "You come across a Rebel automated scout ship pursuing a civilian ship, weapons engaged.",
    "choices": [
      {
        "id": "c:auto-ship-attacking-civilian:0",
        "label": "Aid the civilian ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-attacking-civilian:1",
        "label": "Stay out of it",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Auto-ship attacking outpost",
    "slug": "auto-ship-attacking-outpost",
    "flag": "cited:auto-ship-attacking-outpost",
    "aliases": [
      "Auto-ship attacking outpost"
    ],
    "sectors": [
      "Civilian Sector",
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "You detect an automated Rebel scout attacking a small refueling outpost.",
    "choices": [
      {
        "id": "c:auto-ship-attacking-outpost:0",
        "label": "Intervene to defend the outpost",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-attacking-outpost:1",
        "label": "Avoid the conflict",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Auto-ship carrying shield virus",
    "slug": "auto-ship-carrying-shield-virus",
    "flag": "cited:auto-ship-carrying-shield-virus",
    "aliases": [
      "Auto-ship carrying shield virus"
    ],
    "sectors": [
      "Civilian Sector"
    ],
    "body": "Your hacking system automatically counters the digital assault and you move in to fight the ship.",
    "choices": [
      {
        "id": "c:auto-ship-carrying-shield-virus:0",
        "label": "Continue",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Auto-ship fight (Crystal)",
    "slug": "auto-ship-fight-crystal",
    "flag": "cited:auto-ship-fight-crystal",
    "aliases": [
      "Auto-ship fight (Crystal)",
      "Crystal Auto Fight"
    ],
    "sectors": [
      "Hidden Crystal Worlds"
    ],
    "body": "The Rebels must have sent their automated scouts to find you. One jumps in and immediately moves to attack.",
    "choices": [
      {
        "id": "c:auto-ship-fight-crystal:0",
        "label": "Fight an Auto-ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Auto-ship fight in asteroid field",
    "slug": "auto-ship-fight-in-asteroid-field",
    "flag": "cited:auto-ship-fight-in-asteroid-field",
    "aliases": [
      "Auto-ship fight in asteroid field"
    ],
    "sectors": [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold"
    ],
    "body": "You arrive in an asteroid belt to discover that a Rebel automated-scout has been stationed here. Prepare for a fight!",
    "choices": [
      {
        "id": "c:auto-ship-fight-in-asteroid-field:0",
        "label": "Fight an Auto-ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Auto-ship fight in nebula",
    "slug": "auto-ship-fight-in-nebula",
    "flag": "cited:auto-ship-fight-in-nebula",
    "aliases": [
      "Auto-ship fight in nebula",
      "Auto-ship in nebula"
    ],
    "sectors": [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:auto-ship-fight-in-nebula:0",
        "label": "Fight an Auto-ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Auto-ship fight near sun",
    "slug": "auto-ship-fight-near-sun",
    "flag": "cited:auto-ship-fight-near-sun",
    "aliases": [
      "Auto-ship close to star",
      "Auto-ship fight near sun",
      "Auto-ship near sun"
    ],
    "sectors": [
      "Civilian Sector"
    ],
    "body": "You arrive at the beacon to find yourself dangerously close to a star. An automated Rebel ship, impervious to the heat, moves in to engage.",
    "choices": [
      {
        "id": "c:auto-ship-fight-near-sun:0",
        "label": "Fight an Auto-ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Auto-ship near radar station",
    "slug": "auto-ship-near-radar-station",
    "flag": "cited:auto-ship-near-radar-station",
    "aliases": [
      "Auto-ship near radar station"
    ],
    "sectors": [
      "Rebel Controlled Sector",
      "Rebel Stronghold"
    ],
    "body": "A Rebel automated ship sits dormant near a Rebel forward radar station.",
    "choices": [
      {
        "id": "c:auto-ship-near-radar-station:0",
        "label": "Approach the station",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-near-radar-station:1",
        "label": "Keep your distance and wait for the FTL to charge",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Auto-ship near sensor station",
    "slug": "auto-ship-near-sensor-station",
    "flag": "cited:auto-ship-near-sensor-station",
    "aliases": [
      "Auto-ship near sensor station",
      "Rebel Auto-ship near sensor station",
      "Rebel Automated Ship Near Sensor Station"
    ],
    "sectors": [
      "Civilian Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold"
    ],
    "body": "You detect a Rebel automated ship nearby. It does not engage and seems to be patrolling around a long-range sensor station.",
    "choices": [
      {
        "id": "c:auto-ship-near-sensor-station:0",
        "label": "Attack the automated ship to get to the sensor station",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-near-sensor-station:1",
        "label": "Avoid provoking the ship",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Auto-ship near storage station in nebula",
    "slug": "auto-ship-near-storage-station-in-nebula",
    "flag": "cited:auto-ship-near-storage-station-in-nebula",
    "aliases": [
      "Auto-ship near small space-station",
      "Auto-ship near storage station in nebula"
    ],
    "sectors": [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "An advance <!-- [sic] -->rebel automated ship remains stationed near a small Rebel space-station. However, without functioning sensors it is impossible to tell what is inside.",
    "choices": [
      {
        "id": "c:auto-ship-near-storage-station-in-nebula:0",
        "label": "Attack the automated ship to get to the station",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-near-storage-station-in-nebula:1",
        "label": "Avoid provoking the ship",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Auto-ship warning",
    "slug": "auto-ship-warning",
    "flag": "cited:auto-ship-warning",
    "aliases": [
      "Auto-ship warning",
      "Rebel Auto-Ship Warning"
    ],
    "sectors": [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:auto-ship-warning:0",
        "label": "Fight an Auto-ship that is running away",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Boarders: Humans in plasma storm",
    "slug": "boarders-humans-in-plasma-storm",
    "flag": "cited:boarders-humans-in-plasma-storm",
    "aliases": [
      "Boarders in Plasma Storm",
      "Boarders: Humans in plasma storm",
      "Human boarders in plasma storm"
    ],
    "sectors": [
      "Civilian Sector",
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:boarders-humans-in-plasma-storm:0",
        "label": "You receive medium scrap with resources",
        "fx": [
          {
            "k": "tier",
            "tier": "medium",
            "resources": true
          },
          {
            "k": "note",
            "text": "Boarders named on the page are not applied."
          }
        ]
      }
    ]
  },
  {
    "dest": "Crystal fight with surrender offer (Human crew)",
    "slug": "crystal-fight-with-surrender-offer-human-crew",
    "flag": "cited:crystal-fight-with-surrender-offer-human-crew",
    "aliases": [
      "Crystal fight with surrender offer (Human crew)"
    ],
    "sectors": [
      "Hidden Crystal Worlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:crystal-fight-with-surrender-offer-human-crew:0",
        "label": "Fight a Crystal ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Crystal ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Crystal fight with surrender offer (hull repairs)",
    "slug": "crystal-fight-with-surrender-offer-hull-repairs",
    "flag": "cited:crystal-fight-with-surrender-offer-hull-repairs",
    "aliases": [
      "Crystal fight with surrender offer (hull repairs)",
      "Crystal ship convoy fight",
      "Large Convoy"
    ],
    "sectors": [
      "Hidden Crystal Worlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:crystal-fight-with-surrender-offer-hull-repairs:0",
        "label": "Fight a Crystal ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Crystal ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Crystal ship attacking Federation loyalists",
    "slug": "crystal-ship-attacking-federation-loyalists",
    "flag": "cited:crystal-ship-attacking-federation-loyalists",
    "aliases": [
      "Crystal attacking Federation loyalists",
      "Crystal ship attacking Federation loyalists"
    ],
    "sectors": [
      "Hidden Crystal Worlds"
    ],
    "body": "There appears to be a fight going on nearby. A Crystalline border guard is chasing a small Federation ship!",
    "choices": [
      {
        "id": "c:crystal-ship-attacking-federation-loyalists:0",
        "label": "Save the Federation ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Crystal ship"
          }
        ]
      },
      {
        "id": "c:crystal-ship-attacking-federation-loyalists:1",
        "label": "Prepare to leave",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Crystalline ship messaging about Rebels",
    "slug": "crystalline-ship-messaging-about-rebels",
    "flag": "cited:crystalline-ship-messaging-about-rebels",
    "aliases": [
      "Crystalline Ship Messaging About Rebels",
      "Crystalline ship messaging about Rebels"
    ],
    "sectors": [
      "Hidden Crystal Worlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:crystalline-ship-messaging-about-rebels:0",
        "label": "Give them your flight plans",
        "fx": [
          {
            "k": "fleet",
            "n": 1,
            "faster": true
          },
          {
            "k": "tier",
            "tier": "high"
          }
        ]
      },
      {
        "id": "c:crystalline-ship-messaging-about-rebels:1",
        "label": "Refuse",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Deactivated Auto-ship",
    "slug": "deactivated-auto-ship",
    "flag": "cited:deactivated-auto-ship",
    "aliases": [
      "Deactivated Auto-ship",
      "Deactivated Rebel Automated Scout"
    ],
    "sectors": [
      "Abandoned Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "You find a Rebel automated scout floating near this beacon. Despite its pristine condition, it appears to be de-activated.",
    "choices": [
      {
        "id": "c:deactivated-auto-ship:0",
        "label": "Don't risk activating it, and just strip the ship for any useful scrap",
        "fx": [
          {
            "k": "tier",
            "tier": "low"
          }
        ]
      }
    ]
  },
  {
    "dest": "Engi distress Rebel fight",
    "slug": "engi-distress-rebel-fight",
    "flag": "cited:engi-distress-rebel-fight",
    "aliases": [
      "Engi distress",
      "Engi distress Rebel fight",
      "Rebel Attacking Engi",
      "Rebel attacking poorly equipped Engi"
    ],
    "sectors": [
      "Engi Controlled Sector",
      "Engi Homeworlds"
    ],
    "body": "The distress signal originates at a small Engi ship under attack by a rebel fighter - but when they see Federation markings they turn to attack!",
    "choices": [
      {
        "id": "c:engi-distress-rebel-fight:0",
        "label": "Fight the Rebel Ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel Ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Engi smashed ships",
    "slug": "engi-smashed-ships",
    "flag": "cited:engi-smashed-ships",
    "aliases": [
      "Engi smashed ships",
      "Two Smashed Ships"
    ],
    "sectors": [
      "Engi Controlled Sector",
      "Engi Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:engi-smashed-ships:0",
        "label": "Attempt to help the ships by prying them apart",
        "fx": [
          {
            "k": "fight",
            "tier": "Engi ship"
          }
        ]
      },
      {
        "id": "c:engi-smashed-ships:1",
        "label": "Ignore the damaged vessels",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Escort civilians FTL haywire",
    "slug": "escort-civilians-ftl-haywire",
    "flag": "cited:escort-civilians-ftl-haywire",
    "aliases": [
      "Escort FTL haywire civilian ship",
      "Escort civilians FTL haywire"
    ],
    "sectors": [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:escort-civilians-ftl-haywire:0",
        "label": "Lead them to their destination",
        "fx": [
          {
            "k": "tier",
            "tier": "low"
          },
          // @agent:quests. The page's quest marker is added after this choice (wiki/quests.ts questAfterCited).
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:escort-civilians-ftl-haywire:1",
        "label": "Decline",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Federation deserters",
    "slug": "federation-deserters",
    "flag": "cited:federation-deserters",
    "aliases": [
      "Federation Deserters",
      "Federation deserters"
    ],
    "sectors": [
      "Hidden Crystal Worlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:federation-deserters:0",
        "label": "Attack the traitors",
        "fx": [
          {
            "k": "fight",
            "tier": "Federation ship"
          }
        ]
      },
      {
        "id": "c:federation-deserters:1",
        "label": "Leave them be",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Free drone schematic",
    "slug": "free-drone-schematic",
    "flag": "cited:free-drone-schematic",
    "aliases": [
      "Free Drone Schematic",
      "Free drone schematic"
    ],
    "sectors": [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Hidden Crystal Worlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:free-drone-schematic:0",
        "label": "You receive low scrap",
        "fx": [
          {
            "k": "tier",
            "tier": "low"
          },
          {
            "k": "note",
            "text": "The page's item is not added."
          }
        ]
      }
    ]
  },
  {
    "dest": "Free scrap with resources",
    "slug": "free-scrap-with-resources",
    "flag": "cited:free-scrap-with-resources",
    "aliases": [
      "Free scrap with resources"
    ],
    "sectors": [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:free-scrap-with-resources:0",
        "label": "You receive medium scrap with resources",
        "fx": [
          {
            "k": "tier",
            "tier": "medium",
            "resources": true
          }
        ]
      }
    ]
  },
  {
    "dest": "Free scrap with resources (Lanius)",
    "slug": "free-scrap-with-resources-lanius",
    "flag": "cited:free-scrap-with-resources-lanius",
    "aliases": [
      "Free scrap with resources (Lanius)",
      "Lanius free stuff"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:free-scrap-with-resources-lanius:0",
        "label": "You receive high scrap with resources",
        "fx": [
          {
            "k": "tier",
            "tier": "high",
            "resources": true
          }
        ]
      }
    ]
  },
  {
    "dest": "Lanius fight with friendly ASB support",
    "slug": "lanius-fight-with-friendly-asb-support",
    "flag": "cited:lanius-fight-with-friendly-asb-support",
    "aliases": [
      "Anti-Ship Battery Firing on Lanius Ships",
      "Lanius fight with friendly ASB support"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "After the fight",
    "choices": [
      {
        "id": "c:lanius-fight-with-friendly-asb-support:0",
        "label": "Fight a Lanius ship with an Anti-Ship Battery on your side",
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          },
          {
            "k": "note",
            "text": "The page's anti-ship battery is not applied."
          }
        ]
      }
    ]
  },
  {
    "dest": "Lanius ship absorbing automated scout",
    "slug": "lanius-ship-absorbing-automated-scout",
    "flag": "cited:lanius-ship-absorbing-automated-scout",
    "aliases": [
      "Lanius absorbing automated scout",
      "Lanius ship absorbing automated scout"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "You come across a Lanius ship in the process of absorbing a Rebel automated scout. If you scare off the Lanius you could probably make use of it.",
    "choices": [
      {
        "id": "c:lanius-ship-absorbing-automated-scout:0",
        "label": "Fight the ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-absorbing-automated-scout:1",
        "label": "Leave them alone",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Lanius ship attacking Mantis",
    "slug": "lanius-ship-attacking-mantis",
    "flag": "cited:lanius-ship-attacking-mantis",
    "aliases": [
      "Lanius ship attacking Mantis",
      "Ship Being Mined by Lanius"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:lanius-ship-attacking-mantis:0",
        "label": "Attack the Lanius ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-attacking-mantis:1",
        "label": "Leave the Mantis to their fate",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Lanius ship attacking Rock",
    "slug": "lanius-ship-attacking-rock",
    "flag": "cited:lanius-ship-attacking-rock",
    "aliases": [
      "Lanius attacking Rock",
      "Lanius ship attacking Rock"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "A distress beacon pulses weakly from a Rockman ship in this system... their hull (and their crew) are being mined by the Lanius, lasers and weapons tearing through the ship!",
    "choices": [
      {
        "id": "c:lanius-ship-attacking-rock:0",
        "label": "Attack the Lanius ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-attacking-rock:1",
        "label": "Leave the Rockmen to their fate",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Lanius ship attacking civilian",
    "slug": "lanius-ship-attacking-civilian",
    "flag": "cited:lanius-ship-attacking-civilian",
    "aliases": [
      "Lanius Attacking Civilian",
      "Lanius ship attacking civilian"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:lanius-ship-attacking-civilian:0",
        "label": "Attack the Lanius ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-attacking-civilian:1",
        "label": "Avoid the conflict",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Lanius ship attacking civilian distress",
    "slug": "lanius-ship-attacking-civilian-distress",
    "flag": "cited:lanius-ship-attacking-civilian-distress",
    "aliases": [
      "Lanius attacking civilian distress",
      "Lanius ship attacking civilian distress"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:lanius-ship-attacking-civilian-distress:0",
        "label": "Fight the Lanius ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-attacking-civilian-distress:1",
        "label": "Avoid the conflict",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Lanius ship in rich debris field",
    "slug": "lanius-ship-in-rich-debris-field",
    "flag": "cited:lanius-ship-in-rich-debris-field",
    "aliases": [
      "Lanius ship in rich debris field"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "Your scans have picked up a Lanius vessel in this system: it appears to be navigating a rich debris field, harvesting the minerals.",
    "choices": [
      {
        "id": "c:lanius-ship-in-rich-debris-field:0",
        "label": "Attempt to harvest some for yourself",
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-in-rich-debris-field:1",
        "label": "Attack the vessel",
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-in-rich-debris-field:2",
        "label": "Ignore the vessel",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Lanius ship salvager",
    "slug": "lanius-ship-salvager",
    "flag": "cited:lanius-ship-salvager",
    "aliases": [
      "Lanius Salvaging Small Asteroid Belt",
      "Lanius ship salvager"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:lanius-ship-salvager:0",
        "label": "Attack the ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-salvager:1",
        "label": "Leave them alone",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Lanius trader",
    "slug": "lanius-trader",
    "flag": "cited:lanius-trader",
    "aliases": [
      "Lanius trader"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:lanius-trader:0",
        "label": "You lose 3-7 fuel and receive 15-30 scrap",
        "fx": [
          {
            "k": "res",
            "id": "fuel",
            "sign": -1,
            "lo": 3,
            "hi": 7
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 15,
            "hi": 30
          }
        ]
      },
      {
        "id": "c:lanius-trader:1",
        "label": "You lose 3-7 missiles and receive 20-40 scrap",
        "fx": [
          {
            "k": "res",
            "id": "missiles",
            "sign": -1,
            "lo": 3,
            "hi": 7
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 20,
            "hi": 40
          }
        ]
      },
      {
        "id": "c:lanius-trader:2",
        "label": "You lose 3-7 drone parts and receive 20-40 scrap",
        "fx": [
          {
            "k": "res",
            "id": "parts",
            "sign": -1,
            "lo": 3,
            "hi": 7
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 20,
            "hi": 40
          }
        ]
      },
      {
        "id": "c:lanius-trader:3",
        "label": "Decline",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Lanius trader with translator",
    "slug": "lanius-trader-with-translator",
    "flag": "cited:lanius-trader-with-translator",
    "aliases": [
      "Lanius Merchant",
      "Lanius Merchant with Improved Translator",
      "Lanius trader with translator"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:lanius-trader-with-translator:0",
        "label": "You lose 3-7 fuel and receive 15-30 scrap",
        "fx": [
          {
            "k": "res",
            "id": "fuel",
            "sign": -1,
            "lo": 3,
            "hi": 7
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 15,
            "hi": 30
          }
        ]
      },
      {
        "id": "c:lanius-trader-with-translator:1",
        "label": "You lose 3-7 missiles and receive 20-40 scrap",
        "fx": [
          {
            "k": "res",
            "id": "missiles",
            "sign": -1,
            "lo": 3,
            "hi": 7
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 20,
            "hi": 40
          }
        ]
      },
      {
        "id": "c:lanius-trader-with-translator:2",
        "label": "You lose 3-7 drone parts and receive 20-40 scrap",
        "fx": [
          {
            "k": "res",
            "id": "parts",
            "sign": -1,
            "lo": 3,
            "hi": 7
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 20,
            "hi": 40
          }
        ]
      },
      {
        "id": "c:lanius-trader-with-translator:3",
        "label": "Decline",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Legendary thief KazaaakplethKilik",
    "slug": "legendary-thief-kazaaakplethkilik",
    "flag": "cited:legendary-thief-kazaaakplethkilik",
    "aliases": [
      "KazaaakplethKilik",
      "Legendary Thief KazaaakplethKilik Random Event",
      "Legendary thief KazaaakplethKilik"
    ],
    "sectors": [
      "Mantis Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:legendary-thief-kazaaakplethkilik:0",
        "label": "Prepare to fight",
        "fx": [
          {
            "k": "fight",
            "tier": "Mantis ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Mantis outcasts",
    "slug": "mantis-outcasts",
    "flag": "cited:mantis-outcasts",
    "aliases": [
      "Mantis outcasts"
    ],
    "sectors": [
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "The Mantis outcasts sometimes make the mistake of taking the Zoltan for easy game. A scout moves in to attack while a boarding party beams aboard from a nearby transport!",
    "choices": [
      {
        "id": "c:mantis-outcasts:0",
        "label": "2-3 mantis boarders beam aboard your ship and you fight a Mantis Ship (default rewards)",
        "fx": [
          {
            "k": "fight",
            "tier": "Mantis Ship"
          },
          {
            "k": "note",
            "text": "Boarders named on the page are not applied."
          }
        ]
      }
    ]
  },
  {
    "dest": "Mantis ship attacking Crystal",
    "slug": "mantis-ship-attacking-crystal",
    "flag": "cited:mantis-ship-attacking-crystal",
    "aliases": [
      "Mantis ship attacking Crystal"
    ],
    "sectors": [
      "Hidden Crystal Worlds"
    ],
    "body": "You discover a number of civilian ships fleeing the area. Shots are fired and you find the assailant; a Mantis ship is attacking one of the smaller ships!",
    "choices": [
      {
        "id": "c:mantis-ship-attacking-crystal:0",
        "label": "Attack the Mantis",
        "fx": [
          {
            "k": "fight",
            "tier": "Mantis Ship"
          }
        ]
      },
      {
        "id": "c:mantis-ship-attacking-crystal:1",
        "label": "Ignore them",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Mantis war camp",
    "slug": "mantis-war-camp",
    "flag": "cited:mantis-war-camp",
    "aliases": [
      "Mantis War Camp",
      "Mantis war camp"
    ],
    "sectors": [
      "Civilian Sector",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:mantis-war-camp:0",
        "label": "Pledge to do what you can",
        "fx": [
          {
            "k": "tier",
            "tier": "medium"
          },
          // @agent:quests. The page's quest marker is added after this choice (wiki/quests.ts questAfterCited).
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:mantis-war-camp:1",
        "label": "Apologize and decline",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "No fuel: Auto-ship warning",
    "slug": "no-fuel-auto-ship-warning",
    "flag": "cited:no-fuel-auto-ship-warning",
    "aliases": [
      "No fuel: Auto-ship fight",
      "No fuel: Auto-ship warning"
    ],
    "sectors": [],
    "body": "A ship responding to your distress moves in. Unfortunately it turns out to be an automated Rebel scout. It immediately reverses thrust after scanning your ship.",
    "choices": [
      {
        "id": "c:no-fuel-auto-ship-warning:0",
        "label": "Fight an Auto-ship that is running away",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "No fuel: Engi ship repair",
    "slug": "no-fuel-engi-ship-repair",
    "flag": "cited:no-fuel-engi-ship-repair",
    "aliases": [
      "Fuel Engi Ship Repair",
      "No fuel: Engi ship repair"
    ],
    "sectors": [],
    "body": "",
    "choices": [
      {
        "id": "c:no-fuel-engi-ship-repair:0",
        "label": "Make the trade",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 10,
            "hi": 20
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 4,
            "hi": 6
          }
        ]
      },
      {
        "id": "c:no-fuel-engi-ship-repair:1",
        "label": "Ignore them",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "No fuel: Mantis fight",
    "slug": "no-fuel-mantis-fight",
    "flag": "cited:no-fuel-mantis-fight",
    "aliases": [
      "Mantis Fuel Attack",
      "No fuel: Mantis fight"
    ],
    "sectors": [],
    "body": "",
    "choices": [
      {
        "id": "c:no-fuel-mantis-fight:0",
        "label": "Fight a Mantis ship that is running away",
        "fx": [
          {
            "k": "fight",
            "tier": "Mantis ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "No fuel: Rebel fight",
    "slug": "no-fuel-rebel-fight",
    "flag": "cited:no-fuel-rebel-fight",
    "aliases": [
      "No fuel: Rebel assistant hails",
      "No fuel: Rebel fight"
    ],
    "sectors": [],
    "body": "",
    "choices": [
      {
        "id": "c:no-fuel-rebel-fight:0",
        "label": "Fight a Rebel ship that is running away",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "No fuel: Slug fuel depot",
    "slug": "no-fuel-slug-fuel-depot",
    "flag": "cited:no-fuel-slug-fuel-depot",
    "aliases": [
      "No fuel: Slug fuel depot",
      "Slugman Fuel Depot"
    ],
    "sectors": [],
    "body": "A mobile Slugman fuel depot enters scanning range. \"My prices are fair, but I ask one thing - do not insult me with negotiation!\" You check out his price list.",
    "choices": [
      {
        "id": "c:no-fuel-slug-fuel-depot:0",
        "label": "Buy 5 fuel for 50 scrap",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 50,
            "hi": 50
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 5,
            "hi": 5
          }
        ]
      },
      {
        "id": "c:no-fuel-slug-fuel-depot:1",
        "label": "Buy 10 fuel for 95 scrap. (BEST DEAL!)",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 95,
            "hi": 95
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 10,
            "hi": 10
          }
        ]
      },
      {
        "id": "c:no-fuel-slug-fuel-depot:2",
        "label": "Negotiate",
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "No fuel: automated refueling ship",
    "slug": "no-fuel-automated-refueling-ship",
    "flag": "cited:no-fuel-automated-refueling-ship",
    "aliases": [
      "Automated Re-Fueling Ship",
      "No fuel: automated refueling ship"
    ],
    "sectors": [],
    "body": "",
    "choices": [
      {
        "id": "c:no-fuel-automated-refueling-ship:0",
        "label": "Request emergency fuel reserves",
        "fx": [
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 1,
            "hi": 3
          }
        ]
      },
      {
        "id": "c:no-fuel-automated-refueling-ship:1",
        "label": "Buy 5 fuel for 20 scrap",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 20,
            "hi": 20
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 5,
            "hi": 5
          }
        ]
      },
      {
        "id": "c:no-fuel-automated-refueling-ship:2",
        "label": "Buy 2 fuel for 8 scrap",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 8,
            "hi": 8
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 2,
            "hi": 2
          }
        ]
      },
      {
        "id": "c:no-fuel-automated-refueling-ship:3",
        "label": "Attack the automated ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "No fuel: explore the system",
    "slug": "no-fuel-explore-the-system",
    "flag": "cited:no-fuel-explore-the-system",
    "aliases": [
      "Explore the System",
      "No fuel: explore the system"
    ],
    "sectors": [],
    "body": "Although your lack of fuel cells prevents your ship from jumping, you can still use your impulse engines. Will you spend some time exploring the nearby system?",
    "choices": [
      {
        "id": "c:no-fuel-explore-the-system:0",
        "label": "Trade 20 scrap for 5 fuel",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 20,
            "hi": 20
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 5,
            "hi": 5
          }
        ]
      },
      {
        "id": "c:no-fuel-explore-the-system:1",
        "label": "Trade 10 scrap for 2 fuel",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 10,
            "hi": 10
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 2,
            "hi": 2
          }
        ]
      },
      {
        "id": "c:no-fuel-explore-the-system:2",
        "label": "Trade 5 scrap for 1 fuel",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 5,
            "hi": 5
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 1,
            "hi": 1
          }
        ]
      },
      {
        "id": "c:no-fuel-explore-the-system:3",
        "label": "Stay near the beacon",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Pirate briber",
    "slug": "pirate-briber",
    "flag": "cited:pirate-briber",
    "aliases": [
      "Pirate briber"
    ],
    "sectors": [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:pirate-briber:0",
        "label": "Accept their bribe",
        "fx": [
          {
            "k": "tier",
            "tier": "low",
            "resources": true
          }
        ]
      },
      {
        "id": "c:pirate-briber:1",
        "label": "Try to be a hero. Attack the pirate",
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Pirate ship attacking civilian (Lanius)",
    "slug": "pirate-ship-attacking-civilian-lanius",
    "flag": "cited:pirate-ship-attacking-civilian-lanius",
    "aliases": [
      "Pirate ship attacking civilian (Lanius)"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:pirate-ship-attacking-civilian-lanius:0",
        "label": "Attack the pirate",
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:pirate-ship-attacking-civilian-lanius:1",
        "label": "Avoid the conflict",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Pirate ship attacking civilian distress",
    "slug": "pirate-ship-attacking-civilian-distress",
    "flag": "cited:pirate-ship-attacking-civilian-distress",
    "aliases": [
      "Civilian ship chased by Pirate (distress)",
      "Pirate ship attacking civilian distress"
    ],
    "sectors": [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula"
    ],
    "body": "The distress beacon is coming from a civilian ship. It appears it is being chased by a pirate.",
    "choices": [
      {
        "id": "c:pirate-ship-attacking-civilian-distress:0",
        "label": "Aid the civilian ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:pirate-ship-attacking-civilian-distress:1",
        "label": "Stay out of it",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Pirate ship selling drones",
    "slug": "pirate-ship-selling-drones",
    "flag": "cited:pirate-ship-selling-drones",
    "aliases": [
      "Drones salesman",
      "Pirate ship selling drones"
    ],
    "sectors": [
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "A ship with conspicuous pirate markings is orbiting a nearby moon, broadcasting a simple message claiming to have equipment available for sale.",
    "choices": [
      {
        "id": "c:pirate-ship-selling-drones:0",
        "label": "Buy some Drone parts",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 25,
            "hi": 25
          },
          {
            "k": "res",
            "id": "parts",
            "sign": 1,
            "lo": 5,
            "hi": 5
          }
        ]
      },
      {
        "id": "c:pirate-ship-selling-drones:1",
        "label": "Attack him before he can attack!",
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:pirate-ship-selling-drones:2",
        "label": "Quickly prepare to jump away",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Pirate ship selling weapon",
    "slug": "pirate-ship-selling-weapon",
    "flag": "cited:pirate-ship-selling-weapon",
    "aliases": [
      "Black Market Weapon Trader",
      "Pirate arms dealer",
      "Pirate ship selling weapon"
    ],
    "sectors": [
      "Civilian Sector",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula"
    ],
    "body": "A black market weapons trader spins you a tale of the dangers of the nebula before pushing his wares.",
    "choices": [
      {
        "id": "c:pirate-ship-selling-weapon:0",
        "label": "Attack the ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:pirate-ship-selling-weapon:1",
        "label": "Ignore the ship",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rebel checkpoint",
    "slug": "rebel-checkpoint",
    "flag": "cited:rebel-checkpoint",
    "aliases": [
      "Rebel Civilian Checkpoint",
      "Rebel checkpoint"
    ],
    "sectors": [
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:rebel-checkpoint:0",
        "label": "Fend for yourself, attack, and escape",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-checkpoint:1",
        "label": "Fly behind a moon and stay hidden",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rebel fight among Federation and Rebel fleets",
    "slug": "rebel-fight-among-federation-and-rebel-fleets",
    "flag": "cited:rebel-fight-among-federation-and-rebel-fleets",
    "aliases": [
      "Rebel fight among Federation and Rebel fleets"
    ],
    "sectors": [
      "The Last Stand"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:rebel-fight-among-federation-and-rebel-fleets:0",
        "label": "Fight a Rebel ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rebel fight in plasma storm",
    "slug": "rebel-fight-in-plasma-storm",
    "flag": "cited:rebel-fight-in-plasma-storm",
    "aliases": [
      "Rebel fight in plasma storm"
    ],
    "sectors": [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "You arrive in the middle of a plasma storm. Despite the harsh conditions, a Rebel scout seems to be waiting for you.",
    "choices": [
      {
        "id": "c:rebel-fight-in-plasma-storm:0",
        "label": "Fight a Rebel ship (default rewards)",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rebel ship attacking Crystal ship",
    "slug": "rebel-ship-attacking-crystal-ship",
    "flag": "cited:rebel-ship-attacking-crystal-ship",
    "aliases": [
      "Crystalline Ship Engaged with Rebel",
      "Rebel ship attacking Crystal ship"
    ],
    "sectors": [
      "Hidden Crystal Worlds"
    ],
    "body": "Crystal shards fly past the screen as soon as you arrive. Checking the scanners, it looks like a crystalline ship is engaged with a Rebel!",
    "choices": [
      {
        "id": "c:rebel-ship-attacking-crystal-ship:0",
        "label": "Attack the Rebel",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-attacking-crystal-ship:1",
        "label": "Attack the Crystalline ship",
        "fx": [
          {
            "k": "fleet",
            "n": 1,
            "faster": true
          },
          {
            "k": "fight",
            "tier": "Crystal ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-attacking-crystal-ship:2",
        "label": "Ignore them",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rebel ship attacking Federation loyalists",
    "slug": "rebel-ship-attacking-federation-loyalists",
    "flag": "cited:rebel-ship-attacking-federation-loyalists",
    "aliases": [
      "Federation Ship in Need of Aid",
      "Rebel ship attacking Federation loyalists"
    ],
    "sectors": [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:rebel-ship-attacking-federation-loyalists:0",
        "label": "Aid the Federation ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-attacking-federation-loyalists:1",
        "label": "Use this chance to escape",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rebel ship attacking civilians in Last Stand",
    "slug": "rebel-ship-attacking-civilians-in-last-stand",
    "flag": "cited:rebel-ship-attacking-civilians-in-last-stand",
    "aliases": [
      "Rebel Attacking Civilians in Last Stand",
      "Rebel ship attacking civilians in Last Stand"
    ],
    "sectors": [
      "The Last Stand"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:rebel-ship-attacking-civilians-in-last-stand:0",
        "label": "Prepare to fight the Rebel ship!",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-attacking-civilians-in-last-stand:1",
        "label": "There's no time, get ready to jump",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rebel ship attacking refueling outpost",
    "slug": "rebel-ship-attacking-refueling-outpost",
    "flag": "cited:rebel-ship-attacking-refueling-outpost",
    "aliases": [
      "Rebel ship attacking refueling outpost"
    ],
    "sectors": [
      "Civilian Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "The Last Stand"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:rebel-ship-attacking-refueling-outpost:0",
        "label": "Intervene to defend the outpost",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-attacking-refueling-outpost:1",
        "label": "Avoid the conflict",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rebel ship supplying civilians",
    "slug": "rebel-ship-supplying-civilians",
    "flag": "cited:rebel-ship-supplying-civilians",
    "aliases": [
      "Rebel ship supplying civilians",
      "Rebels Supplying Civilians"
    ],
    "sectors": [
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:rebel-ship-supplying-civilians:0",
        "label": "Attack the Rebels",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-supplying-civilians:1",
        "label": "Leave them be",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rebel shipyard",
    "slug": "rebel-shipyard",
    "flag": "cited:rebel-shipyard",
    "aliases": [
      "Rebel Flagship Construction",
      "Rebel shipyard"
    ],
    "sectors": [
      "Rebel Stronghold"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:rebel-shipyard:0",
        "label": "Look around",
        "fx": [
          {
            "k": "fight",
            "tier": "second Rebel Flagship"
          }
        ]
      },
      {
        "id": "c:rebel-shipyard:1",
        "label": "Leave immediately",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rebel transport ship",
    "slug": "rebel-transport-ship",
    "flag": "cited:rebel-transport-ship",
    "aliases": [
      "Rebel transport ship"
    ],
    "sectors": [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "You spot a small rebel ship nearby. It seems to have been re-fitted for transport rather than combat. It does not seem to want to engage you and your ship.",
    "choices": [
      {
        "id": "c:rebel-transport-ship:0",
        "label": "Demand the surrender of their goods",
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-transport-ship:1",
        "label": "Avoid the ship",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Refueling platform",
    "slug": "refueling-platform",
    "flag": "cited:refueling-platform",
    "aliases": [
      "Orbiting Small Platform",
      "Refueling platform"
    ],
    "sectors": [
      "Abandoned Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:refueling-platform:0",
        "label": "Accept it",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 5,
            "hi": 10
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 5,
            "hi": 5
          }
        ]
      }
    ]
  },
  {
    "dest": "Refueling station",
    "slug": "refueling-station",
    "flag": "cited:refueling-station",
    "aliases": [
      "Refuel Station",
      "Refueling station"
    ],
    "sectors": [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Hidden Crystal Worlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "A ship re-fueling station is stationed at this beacon. We can purchase fuel here.",
    "choices": [
      {
        "id": "c:refueling-station:0",
        "label": "Buy 6 Fuel for 12 Scrap",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 12,
            "hi": 12
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 6,
            "hi": 6
          }
        ]
      },
      {
        "id": "c:refueling-station:1",
        "label": "Buy 3 Fuel for 6 Scrap",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 6,
            "hi": 6
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 3,
            "hi": 3
          }
        ]
      },
      {
        "id": "c:refueling-station:2",
        "label": "Buy 1 Fuel for 2 Scrap",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 2,
            "hi": 2
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 1,
            "hi": 1
          }
        ]
      },
      {
        "id": "c:refueling-station:3",
        "label": "Ignore the station",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rock atheists",
    "slug": "rock-atheists",
    "flag": "cited:rock-atheists",
    "aliases": [
      "Rock Deserters",
      "Rock atheists"
    ],
    "sectors": [
      "Rock Controlled Sector",
      "Rock Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:rock-atheists:0",
        "label": "Tell them their god sent them here to join your crew",
        "fx": [
          {
            "k": "fight",
            "tier": "Rock ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Rock ship in plasma storm",
    "slug": "rock-ship-in-plasma-storm",
    "flag": "cited:rock-ship-in-plasma-storm",
    "aliases": [
      "Rock Armoured Transport",
      "Rock ship in plasma storm"
    ],
    "sectors": [
      "Uncharted Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:rock-ship-in-plasma-storm:0",
        "label": "Repugnant? Arm the weapons!",
        "fx": [
          {
            "k": "fight",
            "tier": "Rock ship"
          }
        ]
      },
      {
        "id": "c:rock-ship-in-plasma-storm:1",
        "label": "Leave",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Sell drone parts for scrap",
    "slug": "sell-drone-parts-for-scrap",
    "flag": "cited:sell-drone-parts-for-scrap",
    "aliases": [
      "Sell drone parts for scrap"
    ],
    "sectors": [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:sell-drone-parts-for-scrap:0",
        "label": "Sell 3 drone parts for 12 scrap",
        "fx": [
          {
            "k": "res",
            "id": "parts",
            "sign": -1,
            "lo": 3,
            "hi": 3
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 12,
            "hi": 12
          }
        ]
      },
      {
        "id": "c:sell-drone-parts-for-scrap:1",
        "label": "Sell 6 drone parts for 24 scrap",
        "fx": [
          {
            "k": "res",
            "id": "parts",
            "sign": -1,
            "lo": 6,
            "hi": 6
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 24,
            "hi": 24
          }
        ]
      },
      {
        "id": "c:sell-drone-parts-for-scrap:2",
        "label": "Sell 12 drone parts for 48 scrap",
        "fx": [
          {
            "k": "res",
            "id": "parts",
            "sign": -1,
            "lo": 12,
            "hi": 12
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 48,
            "hi": 48
          }
        ]
      },
      {
        "id": "c:sell-drone-parts-for-scrap:3",
        "label": "Ignore the station",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Sell missiles for scrap",
    "slug": "sell-missiles-for-scrap",
    "flag": "cited:sell-missiles-for-scrap",
    "aliases": [
      "Sell missiles for scrap",
      "Trade: sell missiles for scrap"
    ],
    "sectors": [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:sell-missiles-for-scrap:0",
        "label": "Sell 5 missiles for 15 scrap",
        "fx": [
          {
            "k": "res",
            "id": "missiles",
            "sign": -1,
            "lo": 5,
            "hi": 5
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 15,
            "hi": 15
          }
        ]
      },
      {
        "id": "c:sell-missiles-for-scrap:1",
        "label": "Sell 10 missiles for 30 scrap",
        "fx": [
          {
            "k": "res",
            "id": "missiles",
            "sign": -1,
            "lo": 10,
            "hi": 10
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 30,
            "hi": 30
          }
        ]
      },
      {
        "id": "c:sell-missiles-for-scrap:2",
        "label": "Sell 15 missiles for 45 scrap",
        "fx": [
          {
            "k": "res",
            "id": "missiles",
            "sign": -1,
            "lo": 15,
            "hi": 15
          },
          {
            "k": "res",
            "id": "scrap",
            "sign": 1,
            "lo": 45,
            "hi": 45
          }
        ]
      },
      {
        "id": "c:sell-missiles-for-scrap:3",
        "label": "Ignore the station",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Slaver (friendly)",
    "slug": "slaver-friendly",
    "flag": "cited:slaver-friendly",
    "aliases": [
      "Friendly Slaver",
      "Slaver (friendly)"
    ],
    "sectors": [
      "Abandoned Sector",
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "You recognize the ship as a well known slave trader. He hails you and offers you \"laborers\" for cheap.",
    "choices": [
      {
        "id": "c:slaver-friendly:0",
        "label": "Attack the slaver scum",
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:slaver-friendly:1",
        "label": "Ignore the slaver and continue on your way",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Slaver (hostile)",
    "slug": "slaver-hostile",
    "flag": "cited:slaver-hostile",
    "aliases": [
      "Pirate Slaver",
      "Slaver (hostile)"
    ],
    "sectors": [
      "Civilian Sector",
      "Pirate Controlled Sector"
    ],
    "body": "An especially well-armed pirate ship approaches you. \"Hand over one of your crew and the rest can go unharmed.\"",
    "choices": [
      {
        "id": "c:slaver-hostile:0",
        "label": "We will never surrender one of our crew to slavers!",
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Slug drink",
    "slug": "slug-drink",
    "flag": "cited:slug-drink",
    "aliases": [
      "Slug drink"
    ],
    "sectors": [
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:slug-drink:0",
        "label": "Refuse",
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Slug hacker (choice)",
    "slug": "slug-hacker-choice",
    "flag": "cited:slug-hacker-choice",
    "aliases": [
      "Dangerous Looking Ship",
      "Dangerous looking slug ship",
      "Slug hacker (choice)"
    ],
    "sectors": [
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:slug-hacker-choice:0",
        "label": "Shields",
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-choice:1",
        "label": "Oxygen",
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-choice:2",
        "label": "Weapons",
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-choice:3",
        "label": "Offer 35 scrap to leave you alone",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 35,
            "hi": 35
          }
        ]
      }
    ]
  },
  {
    "dest": "Slug hacker (doors)",
    "slug": "slug-hacker-doors",
    "flag": "cited:slug-hacker-doors",
    "aliases": [
      "Slug doors hacker",
      "Slug hacker (doors)"
    ],
    "sectors": [
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "Your hacking system automatically counters the digital assault and you move in to fight the ship.",
    "choices": [
      {
        "id": "c:slug-hacker-doors:0",
        "label": "Continue",
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Slug hacker (medical)",
    "slug": "slug-hacker-medical",
    "flag": "cited:slug-hacker-medical",
    "aliases": [
      "Slug hacker (medical)"
    ],
    "sectors": [
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:slug-hacker-medical:0",
        "label": "Continue",
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          },
          {
            "k": "note",
            "text": "Boarders named on the page are not applied."
          }
        ]
      }
    ]
  },
  {
    "dest": "Slug hacker (oxygen)",
    "slug": "slug-hacker-oxygen",
    "flag": "cited:slug-hacker-oxygen",
    "aliases": [
      "Slug Sabotage Oxygen System",
      "Slug hacker (oxygen)",
      "Slug oxygen hacker"
    ],
    "sectors": [
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:slug-hacker-oxygen:0",
        "label": "Continue",
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "Space station under construction",
    "slug": "space-station-under-construction",
    "flag": "cited:space-station-under-construction",
    "aliases": [
      "Space Station Under Construction",
      "Space station under construction"
    ],
    "sectors": [
      "Civilian Sector"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:space-station-under-construction:0",
        "label": "Offer your help",
        "fx": [
          {
            "k": "res",
            "id": "fuel",
            "sign": 1,
            "lo": 2,
            "hi": 4
          },
          {
            "k": "res",
            "id": "missiles",
            "sign": 1,
            "lo": 0,
            "hi": 4
          },
          {
            "k": "res",
            "id": "parts",
            "sign": 1,
            "lo": 0,
            "hi": 2
          },
          // @agent:quests. The page's quest marker is added after this choice (wiki/quests.ts questAfterCited).
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:space-station-under-construction:1",
        "label": "Decline",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "The Engi virus",
    "slug": "the-engi-virus",
    "flag": "cited:the-engi-virus",
    "aliases": [
      "Engi virus",
      "The Engi Virus",
      "The Engi virus"
    ],
    "sectors": [
      "Engi Controlled Sector",
      "Engi Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:the-engi-virus:0",
        "label": "Hold on! Let us try to purge the system code!",
        "fx": [
          {
            "k": "fight",
            "tier": "Engi ship"
          }
        ]
      },
      {
        "id": "c:the-engi-virus:1",
        "label": "Attack the Engi vessel!",
        "fx": [
          {
            "k": "fight",
            "tier": "Engi ship"
          }
        ]
      }
    ]
  },
  {
    "dest": "The mercenary",
    "slug": "the-mercenary",
    "flag": "cited:the-mercenary",
    "aliases": [
      "The Mercenary",
      "The mercenary"
    ],
    "sectors": [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:the-mercenary:0",
        "label": "Hire the mercenary to delay the Rebels",
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 10,
            "hi": 25
          },
          {
            "k": "fleet",
            "n": 2,
            "lastStand": true
          }
        ]
      },
      {
        "id": "c:the-mercenary:1",
        "label": "Fight the ship",
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:the-mercenary:2",
        "label": "You have no need of his services",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Zoltan retake the ship",
    "slug": "zoltan-retake-the-ship",
    "flag": "cited:zoltan-retake-the-ship",
    "aliases": [
      "Zoltan Life Raft",
      "Zoltan retake the ship"
    ],
    "sectors": [
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:zoltan-retake-the-ship:0",
        "label": "Engage the pirates",
        "fx": [
          {
            "k": "fight",
            "tier": "Zoltan pirate ship"
          }
        ]
      },
      {
        "id": "c:zoltan-retake-the-ship:1",
        "label": "Leave",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  },
  {
    "dest": "Zoltan wise man",
    "slug": "zoltan-wise-man",
    "flag": "cited:zoltan-wise-man",
    "aliases": [
      "Zoltan wise man"
    ],
    "sectors": [
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds"
    ],
    "body": "",
    "choices": [
      {
        "id": "c:zoltan-wise-man:0",
        "label": "Mantis",
        "fx": [
          {
            "k": "fight",
            "tier": "Mantis ship"
          }
        ]
      },
      {
        "id": "c:zoltan-wise-man:1",
        "label": "Slug",
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:zoltan-wise-man:2",
        "label": "Rockmen",
        "fx": [
          {
            "k": "fight",
            "tier": "Rock ship"
          }
        ]
      }
    ]
  },
  {
    // Boarders: Humans (Abandoned). unique=false is one beacon (INFERRED: the same once-per-sector stamp).
    // The page prints no button. The red line is the label (INFERRED). No ship (LRSmap=noship).
    "dest": "Boarders: Humans (Abandoned)",
    "slug": "boarders-humans-abandoned",
    "flag": "cited:boarders-humans-abandoned",
    "aliases": [
      "Weak and hungry human boarders",
      "Weak and hungry Human intruders"
    ],
    "sectors": [
      "Abandoned Sector"
    ],
    "body": "An image of some weak and hungry humans comes onto your screen. \"Those metal bastards think they can just absorb half of our engines and leave us here to die? I hope you understand the need to take your ship by force.\"",
    "choices": [
      {
        "id": "c:boarders-humans-abandoned:0",
        "label": "3-4 human boarders beam aboard your ship",
        "fx": [
          {
            "k": "nothing"
          }
        ]
      }
    ]
  }
];

/** Sector pages from the parallel slices, plus out-of-fuel pages that name no sector. Empty sectors are not stamped. */
const EVENTS: EventDef[] = [
  ...CORE_EVENTS,
  ...CIVILIAN_AL,
  ...CIVILIAN_MZ,
  ...CRYSTAL_EVENTS,
  ...ENGI_EVENTS,
  ...MANTIS_EVENTS,
  ...PIRATE_EVENTS,
  ...REBEL_EVENTS,
  ...ROCK_EVENTS,
  ...SLUG_EVENTS,
  ...ZOLTAN_EVENTS,
  ...FUEL_EVENTS,
  ...CIVILIAN_NEXT,
  ...REBEL_NEXT,
  ...LANIUS_EVENTS,
  ...ENGI_NEXT,
  ...SLUG_NEXT,
  ...AUTO_EVENTS,
  ...CRYSTAL_NEXT,
  ...PIRATE_NEXT,
  ...ZOLTAN_NEXT,
  ...MANTIS_ROCK,
  // @agent:surrender.
  ...SURRENDER_PAGES,
  // @agent:quests-a.
  ...QUEST_A_PAGES,
  ...QUEST_B_PAGES, // @agent:quests-b.
];

function band(g: Game, tier: "low" | "medium" | "high"): [number, number] {
  if (tier === "medium") return mediumScrapBand(g.difficulty, g.sector);
  const table = tier === "low" ? SCRAP_LOW : SCRAP_HIGH;
  const row = table[g.difficulty] ?? table.normal;
  return row[Math.min(7, Math.max(0, g.sector - 1))];
}

function stock(g: Game, id: ResId): number {
  if (id === "scrap") return g.scrap;
  if (id === "fuel") return g.fuel;
  if (id === "missiles") return g.missiles;
  return g.player.parts;
}

function spend(g: Game, id: ResId, n: number) {
  if (id === "scrap") g.scrap -= n;
  else if (id === "fuel") g.fuel -= n;
  else if (id === "missiles") g.missiles -= n;
  else g.player.parts -= n;
}

function findChoice(id: string): ChoiceDef | null {
  for (const ev of EVENTS) {
    for (const c of ev.choices) if (c.id === id) return c;
  }
  return null;
}

/** True when this id is one of the wired choices, including a price the ship cannot pay. */
export function citedOwns(id: string): boolean {
  return findChoice(id) != null;
}

// @agent:beacon-mix. Read-only view for beacon-mix.test.ts: the cited pages that name a sector.
export function citedPagesFor(sectorName: string): readonly Readonly<EventDef>[] {
  return EVENTS.filter((ev) => ev.sectors.includes(sectorName));
}

function matchEvent(b: Beacon): EventDef | null {
  for (const ev of EVENTS) {
    if (b.flag === ev.flag || b.flag === ev.slug) return ev;
    if (b.name === ev.dest || ev.aliases.includes(b.name)) return ev;
  }
  return null;
}

const PLACE_KIND = ["event", "empty", "distress", "nebula", "cache", "hostile"] as const;

/** One beacon per cited page, only in a sector the page names. Does not touch a beacon that already has a flag. */
/** Seeded order for one sector's events (FNV-1a over seed, sector and flag); keeps g.seed's rolls untouched. */
function stampKey(g: Game, flag: string): number {
  let h = 2166136261 ^ g.seed ^ (g.sector * 0x9e3779b1);
  for (let i = 0; i < flag.length; i++) h = Math.imul(h ^ flag.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function stampCitedEvents(g: Game) {
  // Placed in a per-run seeded order rather than table order: in table order the free beacons ran out
  // before most of each sector's list (e.g. 11 of 56 Civilian Sector events), so later events never appeared.
  const mine = EVENTS.filter((ev) => ev.sectors.includes(g.sectorName));
  mine.sort((a, b) => stampKey(g, a.flag) - stampKey(g, b.flag));
  // @agent:beacon-mix. Sectors, "Beacons:" lists: the free beacons are re-dealt by the sector's counts and
  // this seeded order fills hostile/neutral/distress/items slots (wiki/beacon-mix.ts). The loop below only
  // runs for a sector name the page does not list.
  if (mixBeacons(g, mine)) {
    markRuwenEntry(g);
    return;
  }
  for (const ev of mine) {
    if (g.beacons.some((b) => b.flag === ev.flag)) continue;
    const pool = g.beacons.filter(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss" && b.kind !== "store" && !b.flag,
    );
    let spot: Beacon | undefined;
    for (const kind of PLACE_KIND) {
      spot = pool.find((b) => b.kind === kind);
      if (spot) break;
    }
    if (!spot) continue;
    spot.flag = ev.flag;
    spot.kind = "event";
    spot.asteroid = false;
    spot.name = ev.dest;
  }
  markRuwenEntry(g);
}

export function citedEvent(_g: Game, b: Beacon): GameEvent | null {
  const ev = matchEvent(b);
  if (!ev) return null;
  return {
    title: ev.dest,
    body: ev.body,
    choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

export function citedChoiceDisabled(g: Game, id: string): string | null {
  const choice = findChoice(id);
  if (!choice) return null;
  for (const fx of choice.fx) {
    if (fx.k === "res" && fx.sign < 0 && stock(g, fx.id) < fx.lo) {
      return `Need ${fx.lo} ${RES_WORD[fx.id]}`;
    }
  }
  return null;
}

export type CitedChoice = {
  g: Game;
  resolve: () => void;
  fight: (tier: string, asteroid?: boolean) => void;
  scrap: (n: number) => void;
  note: (text: string) => void;
  irand: (n: number) => number;
};

function roll(ctx: CitedChoice, lo: number, hi: number): number {
  if (hi <= lo) return lo;
  return lo + ctx.irand(hi - lo + 1);
}

/** True only after the choice is applied. A shortfall returns false and changes nothing. */
export function citedChoose(ctx: CitedChoice, id: string): boolean {
  const choice = findChoice(id);
  if (!choice) return false;
  const g = ctx.g;
  const costs: { id: ResId; n: number }[] = [];
  const gains: { id: ResId; n: number }[] = [];
  for (const fx of choice.fx) {
    if (fx.k !== "res") continue;
    const n = roll(ctx, fx.lo, fx.hi);
    if (fx.sign < 0) {
      if (stock(g, fx.id) < n) return false;
      costs.push({ id: fx.id, n });
    } else gains.push({ id: fx.id, n });
  }
  for (const c of costs) spend(g, c.id, c.n);
  for (const gn of gains) {
    if (gn.id === "scrap") ctx.scrap(gn.n);
    else if (gn.id === "fuel") g.fuel += gn.n;
    else if (gn.id === "missiles") g.missiles += gn.n;
    else g.player.parts += gn.n;
    const word = gn.id === "scrap" ? "Scrap" : gn.id === "fuel" ? "Fuel" : gn.id === "missiles" ? "Missiles" : "Drone parts";
    ctx.note(`${word}: ${gn.n}.`);
  }
  for (const fx of choice.fx) {
    if (fx.k !== "tier") continue;
    const [lo, hi] = band(g, fx.tier);
    const n = roll(ctx, lo, hi);
    ctx.scrap(n);
    const name = fx.tier === "low" ? "Low" : fx.tier === "high" ? "High" : "Medium";
    ctx.note(`${name} scrap: ${n}.`);
    if (fx.resources) ctx.note("Resource amounts are not stated.");
  }
  for (const fx of choice.fx) {
    if (fx.k !== "hull") continue;
    if (fx.n >= 0) g.player.hull = Math.min(g.player.hullMax, g.player.hull + fx.n);
    else g.player.hull = Math.max(0, g.player.hull + fx.n);
    ctx.note(fx.n >= 0 ? `Hull repairs: ${fx.n}.` : `Hull damage: ${-fx.n}.`);
  }
  for (const fx of choice.fx) {
    if (fx.k !== "fleet") continue;
    const last = !!fx.lastStand && (g.sector === 8 || g.sectorName === "The Last Stand");
    if (fx.faster) {
      g.fleet += fx.n;
      ctx.note(`Rebel Fleet pursuit is doubled for ${fx.n} ${fx.n === 1 ? "jump" : "jumps"}.`);
    } else if (fx.double) {
      g.fleet *= 2;
      ctx.note("Rebel Fleet pursuit is doubled.");
    } else if (last) {
      ctx.note("No effect in The Last Stand.");
    } else {
      g.fleet = Math.max(0, g.fleet - fx.n);
      ctx.note(`Rebel Fleet is delayed for ${fx.n} turns.`);
    }
  }
  for (const fx of choice.fx) {
    if (fx.k === "note") ctx.note(fx.text);
  }
  if (g.player.hull <= 0) {
    g.phase = "defeat";
    g.outcome = g.training ? "tutorial" : "hull";
    g.paused = true;
    g.event = null;
    return true;
  }
  const fight = choice.fx.find((fx) => fx.k === "fight");
  if (fight && fight.k === "fight") {
    ctx.fight(fight.tier, fight.asteroid ? true : undefined);
    // "1-3 rock boarders beam aboard your ship" (Rock fight with boarders).
    // INFERRED: inclusive 1..3. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:rock-fight-with-boarders:0") rockBoarders(g, 1, 3);
    return true;
  }
  ctx.resolve();
  return true;
}
