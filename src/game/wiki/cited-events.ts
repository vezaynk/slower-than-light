import type { Beacon, Difficulty, Game, GameEvent } from "../types.ts";
import { mediumScrapBand } from "../content.ts";
import { adjustScrap } from "../extras/index.ts";
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
import { allMantisCrew, between, humanBoarders, mantisBoarders, plasmaHumanBoarders, rockBoarders, slugBoarders, zoltanBoarders } from "./surrender.ts";

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

/** Lanius fight with friendly ASB support: "Anti-Ship Battery on your side." */
export function citedFriendlyAsb(id: string): boolean {
  return id === "c:lanius-fight-with-friendly-asb-support:0";
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
            "tier": "Auto-ship",
            "asteroid": true
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
    "body": "What appeared to be a single damaged ship is in fact two ships that have smashed into each other... there is a flurry of comm signals and damage, and it's hard to determine what occurred. The vessels appear to be... Engi? They look locked together by the impact and can't free themselves.",
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
      },
      {
        "id": "c:engi-smashed-ships:2",
        "label": "Have your Engi crewmember hail the vessel and assess the damage.",
        "fx": [
          {
            "k": "note",
            "text": "Random resources with some scrap."
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
    "body": "For a moment you assume it's a glitch, but no... you've found a Federation military ship! They hail you and, after some probing, reveal that they deserted the Federation fleet before stumbling into this sector while seeking refuge.",
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
    "body": "The Mantis ship in this system looks like its distress beacon is malfunctioning... likely due to the Lanius ship mining their hull and sub-systems! It doesn't look like the Mantis ship will last much longer.",
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
    "body": "You immediately do a short-range scan after arriving at the beacon. It appears to be coming from a small civilian vessel under fire from a Lanius ship. Not all Lanius are content with simply scavenging the wrecks of previous battles.",
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
      },
      {
        "id": "c:lanius-ship-attacking-civilian-distress:2",
        "label": "Have your crew admonish their captain.",
        "fx": [
          {
            "k": "note",
            "text": "A Lanius crewmember starts a fight or powers the ship down."
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
      },
      {
        "id": "c:lanius-ship-in-rich-debris-field:3",
        "label": "Engage the auto-pilot and safely harvest the debris.",
        "fx": [
          {
            "k": "note",
            "text": "Improved Piloting at level 2 pays medium scrap with resources."
          }
        ]
      },
      {
        "id": "c:lanius-ship-in-rich-debris-field:4",
        "label": "Engage the auto-pilot and safely harvest the debris.",
        "fx": [
          {
            "k": "note",
            "text": "Advanced Piloting at level 3 pays high scrap with resources."
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
      },
      {
        "id": "c:lanius-ship-salvager:2",
        "label": "Request some scrap.",
        "fx": [
          {
            "k": "note",
            "text": "A Lanius crewmember may receive medium scrap only, a scoff, or nothing."
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
    "body": "You cross paths with a Mantis ship that looks to have had dozens of layers of armor-plating added over what must have been a hundred year career. Its captain is legendary thief KazaaakplethKilik. Your crew look frightened.",
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
    "body": "You receive a request, \"All of our military ships have been destroyed or damaged during the rebellion. However, there have been reports of a Mantis war camp only a few jumps from us. Can you help?\"",
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
    "body": "You see a civilian space station with heavy damage. You receive a message, \"We've been hit hard by the war. We need more drone parts to speed up our repairs. We'll buy some from you if you have extra.\"",
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
    "body": "There is a black market hub here. You receive a message, \"These are dangerous times. If you have extra military-grade explosives, we'll gladly pay you for them.\"",
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
    "body": "You are immediately hailed by a dangerous looking ship. \"I'm feeling generouss today. I shall allow you to choose your own death. Which do you like leasst: shields, oxygen, or weaponsss?\"",
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
    "body": "The slugs here use a tactic you hoped you'd never see: They sabotage your oxygen production system and then charge fire-weapons - you're going to suffocate!",
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
    "body": "You come across a space station under construction. You receive a message from their command tower, \"Greetings. We recently lost contact with a cargo ship that was set to deliver more construction materials. Could you help us figure out what happened to them?\"",
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
    "body": "The Engi are awaiting you at the beacon, with their weapons on-line! They explain a computer virus that is wanted for hostile acts against the Engi (multiple counts of binary scrambling, nano-dissolution, and variable interference) is aboard your vessel. They insist they must destroy your ship to prevent the virus from escaping!",
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
    "body": "You pick up a Zoltan life raft floating in space. Its inhabitant asks you to retake his ship from the pirates who recently commandeered it. \"I'm certain it is clear,\" he concludes, \"that you must not destroy my vessel in the process.\"",
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
    "body": "You come to a quiet part of Zoltan space and encounter an ancient Zoltan wise man who has managed to harness the power of a spatial rift, but seems to have been driven completely mad by the power. \"Choose your doom,\" he demands. This is all part of a day's work.",
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

type TradeRes = "fuel" | "missiles" | "parts";

// Trade resources. The page prints six intros and four offers, and no odds.
// INFERRED: each intro is equally likely, and each of the four offers is equally likely.
const TRADE_RESOURCE_INTROS = [
  `You arrive at a quiet spaceport and are immediately hailed by another ship at port with a "once in a lifetime deal!"`,
  "You jump into a sector filled with civilian activity. Your scan the various advertisement channels while waiting for your FTL to charge, and are intrigued by a grey-market shipwright.",
  "Your ship is flooded with advertisement transmissions from nearby merchants as soon as you arrive at this beacon. You arbitrarily pick one to examine in detail.",
  "Despite the barren area, a trader has set up shop at this beacon. He presents his offer.",
  "The beacon at first glance seems home to a junk yard. Upon closer inspection, it reveals itself to be a ramshackle market. One trader has a deal that catches your eye.",
  "A pawn broker has set up shop at this obscure beacon. He might be offering something worth looking at.",
];

const TRADE_RESOURCE_OFFERS: { pay: TradeRes; cost: [number, number]; get: TradeRes; gain: [number, number] }[] = [
  { pay: "parts", cost: [1, 2], get: "fuel", gain: [5, 10] },
  { pay: "fuel", cost: [1, 2], get: "missiles", gain: [4, 5] },
  { pay: "missiles", cost: [2, 3], get: "parts", gain: [2, 3] },
  { pay: "missiles", cost: [2, 4], get: "fuel", gain: [4, 10] },
];

const TRADE_RESOURCES_TAKE = /^c:trade-resources:take:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/;

// Trade resources in nebula. One intro and the same four offers, and no odds.
// INFERRED: each offer is equally likely. The numbers are rolled once and stay on Trade.
const TRADE_RESOURCES_NEBULA_INTRO =
  "It's hard to see why, but this beacon is apparently a tourist destination. One of the ships at the small station is offering a deal.";

const TRADE_RESOURCES_NEBULA_TAKE =
  /^c:trade-resources-in-nebula:take:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/;

function tradeTake(id: string): RegExpExecArray | null {
  return TRADE_RESOURCES_TAKE.exec(id) ?? TRADE_RESOURCES_NEBULA_TAKE.exec(id);
}

function tradeNote(id: TradeRes, n: number): string {
  const word = id === "fuel" ? "Fuel" : id === "missiles" ? "Missiles" : "Drone parts";
  return `${word}: ${n}.`;
}

function tradeResourcesEvent(g: Game, title: string): GameEvent {
  const intro = TRADE_RESOURCE_INTROS[between(g, [0, 5])]!;
  const offer = TRADE_RESOURCE_OFFERS[between(g, [0, 3])]!;
  const cost = between(g, offer.cost);
  const gain = between(g, offer.gain);
  const sentence = `You lose ${cost} ${RES_WORD[offer.pay]} and receive ${gain} ${RES_WORD[offer.get]}.`;
  return {
    title,
    body: `${intro} ${sentence}`,
    choices: [
      { id: `c:trade-resources:take:${offer.pay}:${cost}:${offer.get}:${gain}`, label: "Trade." },
      { id: "c:trade-resources:4", label: "Ignore." },
    ],
  };
}

function tradeResourcesNebulaEvent(g: Game, title: string): GameEvent {
  const offer = TRADE_RESOURCE_OFFERS[between(g, [0, 3])]!;
  const cost = between(g, offer.cost);
  const gain = between(g, offer.gain);
  const sentence = `You lose ${cost} ${RES_WORD[offer.pay]} and receive ${gain} ${RES_WORD[offer.get]}.`;
  return {
    title,
    body: `${TRADE_RESOURCES_NEBULA_INTRO} ${sentence}`,
    choices: [
      { id: `c:trade-resources-in-nebula:take:${offer.pay}:${cost}:${offer.get}:${gain}`, label: "Trade." },
      { id: "c:trade-resources-in-nebula:4", label: "Ignore." },
    ],
  };
}

/** True when this id is one of the wired choices, including a price the ship cannot pay. */
export function citedOwns(id: string): boolean {
  return findChoice(id) != null || tradeTake(id) != null;
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

export type LaniusTraderRes = "fuel" | "missiles" | "parts";
export type LaniusTraderOffer = { res: LaniusTraderRes; cost: number; scrap: number };

// Lanius trader. One offer is shown before the choice. Three resources, no odds. INFERRED: equal.
// Base scrap is 15-30 fuel, 20-40 missiles, 20-40 drone parts. A Lanius asks again for 20-35, 25-50, and 25-50.
const LANIUS_TRADER_BASE: Record<LaniusTraderRes, [number, number]> = {
  fuel: [15, 30],
  missiles: [20, 40],
  parts: [20, 40],
};
const LANIUS_TRADER_BETTER: Record<LaniusTraderRes, [number, number]> = {
  fuel: [20, 35],
  missiles: [25, 50],
  parts: [25, 50],
};

export function rollLaniusTrader(g: Game, better: boolean): LaniusTraderOffer {
  const kinds: LaniusTraderRes[] = ["fuel", "missiles", "parts"];
  const res = kinds[between(g, [0, 2])]!;
  const [lo, hi] = (better ? LANIUS_TRADER_BETTER : LANIUS_TRADER_BASE)[res];
  return { res, cost: between(g, [3, 7]), scrap: between(g, [lo, hi]) };
}

export function laniusTraderOfferText(offer: LaniusTraderOffer): string {
  const word = offer.res === "parts" ? "drone parts" : offer.res;
  return `You lose ${offer.cost} ${word} and receive ${offer.scrap} scrap.`;
}

export function laniusTraderTakeId(offer: LaniusTraderOffer): string {
  return `q:lanius-trader:take:${offer.res}:${offer.cost}:${offer.scrap}`;
}

// Pirate fight. The page prints five intros and then a default Pirate ship fight, and it prints no odds.
// INFERRED: the five intros are equally likely.
const PIRATE_FIGHT_INTROS = [
  "As you jump into the system a pirate advances on your position. They are refusing all hails. Prepare for a fight.",
  `Soon after arriving in the system you are hailed by a small cruiser. "What good fortune that we happen to run into each other. Nothing personal, but you have some information we need!"`,
  `At first it appears you've arrived in an empty system, but a ship appears from behind a planet and hails you: "Haha! I am the dread pirate Tuco, prepare to die!"`,
  `The only other ship at this beacon messages you: "Finally, after months of waiting, someone has fallen into our trap!"`,
  "You barely have time to register jump completion before your ship warns you of an incoming ship with weapons hot.",
];

// Rebel checkpoint. Four intros and four hide labels, no odds. INFERRED: equal.
const REBEL_CHECKPOINT_INTROS = [
  "A rather large fleet of civilian ships are held up at this Beacon. It appears to be a Rebel checkpoint; everyone is being inspected for possible ties to the Federation. No one has noticed you yet.",
  "Another Rebel checkpoint is monitoring this location. A number of civilian ships are awaiting inspection, any of them could be Federation loyalists. The Rebels haven't noticed you yet.",
  "A Rebel space station and single fighter is monitoring this Beacon for Federation activity. A number of civilian ships are docked, awaiting inspection by the Rebels and possible detainment if they are Federation loyalists. The Rebels haven't noticed you yet.",
  "It looks like this Beacon is home to a Rebel checkpoint. They're stopping and searching any ship that passes through. Civilians are being harassed, and Federation members are detained. The Rebels haven't noticed you yet.",
];
// Pirate fight near pulsar. Three printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-near-pulsar:0.
const PIRATE_PULSAR_INTROS = [
  "Sensors go wild as a nearby pulsar is detected. While you are attempting to recalibrate the FTL drive, a pirate sneaks up on your ship, weapons charging. Prepare for a fight!",
  "You arrive to find a pulsar dominating the view screen. You see a small silhouette pass in front of the star. Before you can ponder what it is, warning signals go off. It appears to be a ship in a firing trajectory!",
  "A small research station orbits a nearby pulsar. It appears largely abandoned, but you detect power signatures flaring up as soon as you're in scanning distance. A small combat ship launches from the station. Pirates!",
];

// Rock fight. Eight printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight:0.
const ROCK_FIGHT_INTROS = [
  "You encounter a Rock vessel and attempt to open trading frequencies, but they take it as an act of cultural transgression and open fire.",
  "You jump into the middle of a Rock excavation project on a nearby moon. Unimpressed with your intrusion they move to defend themselves!",
  `You intercept chatter from an approaching Rock ship: "Weapons, moving in to engage, arm the tubes." There is no talking to these guys.`,
  "As you jump in, a vast figure appears on the view-screen. The Rock captain rubs the green, moss-like appendage on his chin and then orders his crew to open fire.",
  `It looks quiet, but you realize your computer is being scanned. A hidden Rock vessel hails you: "Why do you fill your computer with lies?! These are not the holy words!" Before you can interject they open fire.`,
  "You notice a Rock ship performing combat exercises. However, they quickly change their course to engage your ship. They apparently treat unregistered alien ships as handy target practice.",
  "A loud 'thud' resounds through the ship after jump completion - you've just shunted a Rock fighter and he's already preparing to fire!",
  "You're intercepted by a Rock salvage operation. They don't seem to mind that you're still on board while they junk your ship.",
];

// Rebel fight (Lanius). Six printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-lanius:0.
const LANIUS_REBEL_INTROS = [
  `You intercept discussions between a Rebel patrol and a human mining colony, "...we realize you're scared but all reports indicate the metal bastards target abandoned settlements only. If we relocated our fleets based on every request from backwater... wait, what's that..." Before you can react, the channel is cut and the Rebel ship moves in to attack.`,
  `You arrive to see a number of Rebel ships attempting to dissuade Lanius scavenger ships from "acquiring" their forward station. A passing Rebel patrol ship spots you and moves in to intercept.`,
  `A Rebel scout patrols near the beacon. "Hah! I knew you would try to sneak through this sector as soon as I heard it had become treacherous. Surrender!"`,
  "You arrive at the beacon and notice a small Rebel ship chasing Lanius scavengers away from a wrecked Rebel battleship. As soon as the Rebel notices you and moves in to attack, the Lanius ships return to their prey like flies on garbage.",
  `A Rebel messages you. "Who would have thought the most wanted ship in the quadrant would just happen by my station? Prepare to meet your maker."`,
  "Your arrival coincides almost exactly with that of a Rebel ship. It's hard to know who is more surprised, but there is no option but to fight.",
];

// Rock fight with boarders. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight-with-boarders:0.
const ROCK_BOARDER_INTROS = [
  "You passively scan a small Rock station that is next to the beacon. However they must not have appreciated your curiosity. A Rock ship pulls away from the station and you register an incoming teleporter signal as well!",
  "You find a Rock ship docked with a damaged Mantis fighter. Before you have a chance to hail them, the ship moves in to attack you and you register teleporter symbols from the disabled ship. They're using Mantis tech to board you!",
];

// Auto-ship fight. Nine printed intros, no odds. INFERRED: equal. The fight stays c:auto-ship-fight:0.
// Auto-ship warning prints the same nine lines. That fight stays c:auto-ship-warning:0.
const AUTO_SHIP_FIGHT_INTROS = [
  "You discover one of the Rebel's autonomous scouts. The ship's AI wastes no time in engaging your ship.",
  `Your ship is hailed: "This is an automated message. Resisting our takeover is pointless. Prepare to die." It appears this Rebel ship is run by an AI.`,
  "A Rebel autonomous scout is exploring this beacon. You attempt to hide behind a nearby moon, but the ship finds you and begins its assault.",
  "The AI of a nearby small Rebel scout immediately identifies you as a threat and engages.",
  "A Rebel ship moves in to engage. You attempt to open communications, but realize the futility of that action when you see the ship is run by an AI.",
  "This must be one of the Rebels' unmanned scout ships. Looks like there's no way around a fight.",
  "Another unmanned ship patrols this area. You prepare the ship for combat.",
  "This beacon is being patrolled by a unmanned scout. A fight is unavoidable.",
  "A small shuttle appears on the local radar. Turns out it is a Rebel automated scout!",
];

// Rebel fight with boarders. Four printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-with-boarders:0.
const REBEL_BOARDER_INTROS = [
  `You receive a message from a nearby Rebel station, "You have a lot of guts passing through our space, I'll give you that." He turns giving an order, "Kill their crew, I want that ship intact."`,
  `Your sensors warn of an incoming Rebel ship at the same time as you hear the telltale signs of a teleporter. You hear someone taunt from within the ship, "Ready to die? I sure am ready to get a promotion!"`,
  `Incoming message, "Hello Captain," says a Rebel in an officer's garb. "How very generous of you to turn yourself in. Prepare to be boarded. Come quietly and we may be lenient."`,
  `You receive a message on a low-band channel. "You're surrounded, just like the last of your Federation friends. Just die already." The enemy has teleported onto your ship!`,
];

// Rock fight with boarders in asteroid field. Two printed intros, no odds. INFERRED: equal.
// The fight stays c:rock-fight-with-boarders-in-asteroid-field:0, which already beams 1-2 Rock boarders inside an asteroid field.
const ROCK_BOARDER_ASTEROID_INTROS = [
  "You arrive in an asteroid field and immediately begin evasive maneuvers when a loud clunk reverberates through the ship. At first you think the hull has been hit, but the noise came from some Rock intruders teleporting aboard the ship!",
  "Your shields are being taxed as they deflect the debris from an asteroid field. As you weave your way between the rocks, you happen upon a Rock pirate stronghold. You register teleport signatures and hear shouts aboard the ship.",
];

// Lanius fight. Eleven printed intros, one repeated, no odds. INFERRED: equal, so the repeated line is twice as likely.
// The fight stays c:lanius-fight:0. Default Lanius rewards are not a separate payout.
const LANIUS_FIGHT_INTROS = [
  `You receive a message on a wide band frequency, originating from an approaching Lanius ship. It appears not to be directed at you, but your translator does its best all the same: "... metallic opportunity... acquisition... by force..." Looks like you're in for a fight.`,
  "Sensors indicate a small Lanius cruiser in the process of salvaging another small Lanius ship. Before you have a chance to wonder what caused them to turn on each other, the survivor notices you and moves in to attack.",
  "Shortly after your arrival, a Lanius ship jumps near the beacon. It begins to move slowly toward you. You open wide band communication channels, attempting to make contact. However, it either ignores you or is unable to receive the messages. As they get closer you issue the order to charge weapons and find they do the same.",
  "A military Lanius vessel stops repurposing an abandoned satellite as soon as you jump in. It blocks all hails and powers its weapons.",
  "The beacon is surrounded by many tiny Lanius crafts, surely only capable of holding one occupant. Perhaps they are some kind of forward scout searching for 'metallic opportunities'? As you consider this, a much larger Lanius vessel moves in to engage you, and the scout ships scatter in all directions.",
  "You arrive to see a well-armed Lanius craft preparing to salvage a badly damaged Rebel patrol ship. Noticing your arrival, the Lanius greedily moves in to intercept its second target of the day.",
  "As you arrive in the system, your proximity alarm begins screaming: there is a Lanius ship right on top of you! Before you have a chance to hail, they open fire!",
  "As you are getting your bearings, another ship suddenly arrives at the beacon - it's the Lanius, and they've marked your ship for salvage!",
  "At first everything seems quiet, then your scanners pick up a ship approaching at high speed - the Lanius have detected your arrival and are powering up their weapons!",
  "You have stumbled across a mining expedition - unfortunately, the miners are the Lanius, and they've chosen your ship as their target!",
  "As you are getting your bearings, another ship suddenly arrives at the beacon - it's the Lanius, and they've marked your ship for salvage!",
];

// Mantis fight (Engi). Four printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight-engi:0. Default Mantis rewards are not a separate payout.
const MANTIS_FIGHT_ENGI_INTROS = [
  "A mixed radar signal turns out to be a Mantis attack ship scavenging the remains of an Engi carrier. They turn and fight.",
  "You come across a Mantis raider taking pot shots at a defenceless Engi supply station. Discovering its weapons aren't much of a match for the station's armour, it turns on your ship. Battle stations!",
  "The area looks clear, and you prepare to jump off, but a Mantis scout jumps in behind you! They're as surprised as you are, but their weapons are already online.",
  "You find a Mantis ship harrying a small squad of Engi. They make it to the node and jump off, leaving you toe to toe with their pursuer!",
];

// Mantis fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight-in-nebula:0. Default Mantis rewards are not a separate payout.
// The storm words are the printed lines. They do not arm an ion storm.
const MANTIS_NEBULA_INTROS = [
  "Nebulas are known to be popular Mantis hunting grounds. Information you would have done well to heed here.",
  "You detect a Mantis expedition vessel returning home with its haul. So determined are they, in fact, that they don't wait to see if you're hostile before firing.",
  `A Mantis ship, lost in the storm, hails you. "Sensors are out. We have no local telemetry. We will take yours." You detect a power increase in their weapons systems.`,
  `A Mantis ship hails you through the storm: "These are sacred Urggghtnag clan hunting grounds. You are prey." Shields up!`,
  "You notice a Mantis attack ship ducking between the clouds of swirling space stuff; it's hunting you. You try to get the jump and move in to attack.",
];

// Mantis fight. Twenty printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight:0. Default Mantis rewards are not a separate payout.
const MANTIS_FIGHT_INTROS = [
  "A Mantis military ship appears on local radar alongside the remains of a human freighter. Prepare for a hostile encounter!",
  `A Mantis military scout hails your ship. "Foolish alien! Your kind has stifled our greatness for too long! You will rue the day you backed the Federation!"`,
  `A small Mantis cruiser is broadcasting a repeating message on a wide-band frequency, "All non-Mantis ships that enter our territory are forfeit. Lower your shields and surrender if you value your lives."`,
  "You detect a small military outpost and a few freighters nearby. This mineral rich planet in an isolated location would be perfect for an illegal Mantis mining operation. As you consider your options, a ship launches from the outpost. Prepare for a fight.",
  "You discover yet another unlicensed and uncharted Mantis colony. They certainly waste no time expanding their claims. A Mantis ship moves to intercept you before you can jump away.",
  "A Mantis military scout seems to have just finished a salvage op on a nearby wreck. They have no time to waste with warnings and appear to wish to fight.",
  `A small military craft hails you and a Mantis captain appears on your receiver. "All local human colonies have been punished for the Federation's transgressions. Submit to processing."`,
  "A nearby Mantis ship begins aggressive maneuvers. You prepare for the worst.",
  "A stream of clicks and gurgling comes on the comm from a hostile Mantis scout. The universal translator might be on the blink, but his intent is obvious.",
  "The Mantis ship is pleased to see you, and fires up its weapon systems.",
  "You recognize the outline of a Mantis ship against the blackness. Engage!",
  "Something red looms. It's the Mantis.",
  `A Mantis vessel hails you. "This hail is merely a distraction!" You notice their shields and weapons have come online.`,
  "You notice a flurry of laser fire glance by the port window. The Mantis are upon you.",
  `The Mantis hail you. Their captain says, "I claim this vessel for my clan. Good hunting!"`,
  "A Mantis female comes on the vidscreen. The females don't make it to authority unless they're particularly vicious. You power the weapons.",
  "A Mantis ship with the markings of a warrior tribe breaks position and attacks!",
  `A Mantis ship hails: "Ah! Fine prey. Fine prey! We honor you with our most eviscerating arsenal!" You sense a cloud to this silver lining and power the weapons.`,
  "Children on Earth are told terrible tales of the blood red Mantis invasion ships - much like the one bearing down on you now - which once threatened the planet. You order weapons free!",
  `A youthful-looking Mantis captain hails. "You, prey, must know. Your death, Kaaazthwak's final kill before maturity. Kaaazthwak pay respects." Seems respects in Mantis culture are paid with lasers.`,
];

// Mantis fight choice. Six printed intros, no odds. INFERRED: equal.
// Attack stays c:mantis-fight-choice:0. Conceal and cloaking are quests.ts.
const MANTIS_CHOICE_INTROS = [
  "You're greeted by a rare sight: a Mantis ship that appears not to have noticed you.",
  "For once, you see the Mantis before they see you.",
  "When they see the Mantis warship waiting in ambush at your intended coordinates, your crew is relieved to note you've jumped someway off the mark.",
  `You overhear Mantis comm chatter: "Negative, I have killed more humans!" You gulp noticeably, but luckily they don't see you yet.`,
  `You overhear Mantis comm chatter: "The one on the right is starting to rot. Take him down. Take off his fingers. Put him out of the airlock." They certainly don't seem to be friendly...`,
  `You overhear Mantis comm chatter: "Agreed. Next ship is your turn. Good hunting." They don't see you yet.`,
];

// Mantis ship attacking civilian. Five printed intros, no odds. INFERRED: equal.
// Aid stays c:mantis-ship-attacking-civilian:0. Stay out stays :1. The three stay-out sentences are quests.ts.
const MANTIS_CIVILIAN_INTROS = [
  "You spot a Mantis ship hunting in the distance.",
  `A Mantis ship engaging a civilian hails you. Sparks fly about his cockpit as he yells, "Stay out of this human! Else you are next!"`,
  "Local sensors pick up two ships engaged in a heated battle. It seems the Mantis military ship will surely defeat its prey.",
  "A Mantis vessel flashes past your view-screen, weapons and engines at full. A tiny blip on the sensor readout marks its quarry.",
  "You pick up a distress call from a civilian ship. It's being chased by a Mantis ship!",
];

// Pirate ship attacking civilian. Six printed intros, no odds. INFERRED: equal.
// Aid stays c:pirate-ship-attacking-civilian:0. Stay out stays :1. The stay-out sentence is quests.ts.
const PIRATE_CIVILIAN_INTROS = [
  "You arrive in the system to see a pirate ship pursuing a civilian ship. You detect messages from the civilian ship on a distress frequency.",
  "Scanners indicate that a battle is taking place nearby. It seems that someone is under attack by space pirates.",
  "You detect two ships, one chasing the other... Scanners show the pursuer is a pirate!",
  "There are only two ships within range and they seem to be engaged in battle. One of them has the markings of a space pirate.",
  `You arrive at the next beacon only to immediately be hailed by a small shuttle. "Help us! We are being attacked by pirates!"`,
  "You come out of the jump to see laser blasts coming from the other side of the beacon. It looks like someone is under attack from pirates.",
];

// Pirate ship attacking civilian (Lanius). Three printed intros, no odds. INFERRED: equal.
// Attack stays c:pirate-ship-attacking-civilian-lanius:0. Avoid stays :1.
const LANIUS_PIRATE_CIVILIAN_INTROS = [
  `You discover an abandoned mining facility in the process of being 'acquired' by the Lanius. However, you immediately receive a call from a civilian transport vessel, "Help! We were trying to escape before the Lanius came only to be caught by pirates!" You see a lone pirate ship boarding the civilian craft.`,
  "A pirate ship emerges from hiding after you and another ship jump into the area. Sensors show the pirates ran a quick scan of your ship's weapon system before flying off to pursue the unarmed civilian ship.",
  `A pirate ship is firing on the small ships docked at a refueling station. They are broadcasting on a wide band channel. You catch the captain's rant mid-speed, "...saw you trading with those damned scavengers. I'll show you what happens when you try and undercut the Red Giant gang!"`,
];

// Pirate fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:pirate-fight-in-nebula:0. Default rewards. No nebula environment is added.
const NEBULA_PIRATE_INTROS = [
  "As you drift through the nebula an unmarked vessel descends from the clouds and into your wake. Their weapons come online.",
  `A pirate ship pulls out of the ether and hails: "You know what I love about this part of the galaxy? The explorers! You always carry such fine loot." They lock weapons.`,
  "As you coast through the nebula a pirate ship matches your course and closes the distance. Better to pick your battleground, but beggars can't be choosers.",
  "A hostile vessel descends from out of the nebula. Combat stations!",
  "You try to read the ID of a ship ahead in the fog, but it's too thick to penetrate. You have your answer when the ship turns, weapons hot!",
];

// Rebel fight in nebula. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-in-nebula:0. Default rewards. No nebula environment is added.
const NEBULA_REBEL_INTROS = [
  "You cross paths with an advance scout of the Rebel fleet searching this section of the nebula for your ship.",
  "A ship bearing Rebel colors can be seen waiting near the beacon. They must have been waiting for you, since they engage immediately.",
  "The Rebels must have anticipated you would try to lose them within the nebula. A scout is waiting for you at the beacon.",
  "It looks like you will be unable to avoid the Rebels by traveling through the nebula. A Rebel ship is waiting for you near the beacon.",
  "Shortly after you arrive, a Rebel ship jumps nearby. There looks to be no escape. Prepare for a fight!",
  "Newton-knows what brings this Rebel ship so far out; its captain hails, but does a double take when he identifies your ship. They open fire.",
  "A Rebel ship hails, but you don't take chances in conditions like this. You block the frequency and prepare to engage.",
];

// Auto-ship fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:auto-ship-fight-in-nebula:0. The destroyed reward is quests.ts. No nebula environment is added.
const NEBULA_AUTO_INTROS = [
  "You cross paths with an advance scout of the Rebel fleet searching this section of the nebula for your ship.",
  "You jump into a calmer part of the nebula. However, your relief fades as a Rebel scout jumps to the beacon and moves in to attack.",
  "The tangled wrecks of many ships wait in dormancy here. You see lights flicker on what looks like debris. A Rebel scout bursts out of the wreckage!",
  "This drone isn't looking for you. Perhaps it's scouting ahead for the Rebel expansion or maybe they're seeking to use this nebula for cover. Regardless, it identifies you as hostile.",
  "It's worrying that the Rebels have penetrated so deep into uncharted space, even if it is only an unmanned craft. It arms its weapons; you should do the same.",
];

// Zoltan fight. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:zoltan-fight:0. Default rewards. No extra payout is added here.
const ZOLTAN_FIGHT_INTROS = [
  `A Zoltan ship makes contact. "The nature of the day is rotational. The fever is emaciated. The reason is-" They've caught some nasty deep space dementia. Before you can consider finding help for them, they open fire.`,
  "You're surprised when a stationary Zoltan ship opens fire. It appears there are aggressive pugilists even among the 'enlightened'.",
  `You receive a message, "This area is off limits. Submit your ship to processing." It's only one guard ship in a lonely beacon. You decide to fight your way out.`,
  "You discover a number of Zoltan civilian ships fighting off pirates. Unfortunately one ship mistakes your purpose and moves in to attack! They are refusing all communication; you have no choice but to fight.",
  "Like many areas in Zoltan space, the residents of this sector prepared well for Galactic war. The military here seem to have given up reasoning with foreigners, preferring instead to attack on sight!",
  "A Zoltan ship is waiting at this beacon. They request your identification, but radiation from the sun in this system is disrupting your communications. They take your silence for aggression and move in to attack.",
  `The Zoltan ship patrolling this area hails you: "This area is off limits. Secrecy is vital." They power their weapons.`,
];

// Crystal fight. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:crystal-fight:0. The unique surrender is surrender.ts.
const CRYSTAL_FIGHT_INTROS = [
  "You arrive near a fleet of crystal ships, civilian or mercantile from the looks of them. You pause to scan one but they react immediately and send an escort to fight you off. Prepare to engage!",
  "You arrive at the Beacon and are immediately greeted by an automatic message or warning of some kind. The translator can't seem to discern its purpose but after a few short moments an alarm goes off and a hostile ship jumps in!",
  `You receive a message, "Hah. It looks like another worthless alien-filled craft. Prepare to meet your maker!" Weapon locks detected.`,
  `A Crystalline ship messages you, "I've heard tales that our isolation has finally ended. As a warrior I must demand to test my skills against you!" Before you can respond they move in to attack.`,
  "You arrive in a busy sector. At first no one pays any mind to your alien ship but soon you're registering a number of scan signatures. You get the feeling you're not wanted here just seconds before registering enemy weapon locks!",
  "You jump next to a node busy with traffic, but before long all nearby ships notice you and keep their distance, uncertain of your allegiance. After an awkward standoff, a military ship breaks away from the rest and charges you.",
  "A barrage of rasps and clicks is broadcast over the comm; the universal translator understands little, but the words 'aliens', 'allowed' and 'no' come through quite clearly. You'll have to prove your right to be here in combat!",
];

// Rebel fight among Rebel fleet. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-among-rebel-fleet:0. The low scrap and medium scrap payouts are not added here.
const REBEL_FLEET_INTROS = [
  "Although you were expecting the Rebels, you never imagined their fleet could have grown so fast. Your scanners can hardly register them all before a fighter stationed nearby moves in to attack.",
  "This system is flooded with Rebel warships. Luckily your ship's signature is disguised as a civilian transport. Most heavy vessels ignore you but a small fighter is approaching with weapons hot!",
  "You arrive to find a Rebel battalion encircling a nearby planet, launching landing parties. A small scout moves toward your position. Prepare for a fight!",
  "As soon as you arrive you find yourself in the debris of a fierce battle. However, only Rebel warships remain and you find yourself immediately under attack.",
  "Shots fly by and your computer registers multiple weapon locks as soon as you arrive. Evasive action!",
  "What was once a great series of space stations is now nothing but a small ring of debris around the nearby moon. There's no time to mourn the dead; an enemy approaches!",
  "The Federation seems to have put up a good fight. A number of Rebel ships lie broken or wounded. However their overwhelming numbers force the remaining Federation forces to retreat. Hopefully you can get away in time as well.",
];

// Rebel fight among Federation and Rebel fleets. Six printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-among-federation-and-rebel-fleets:0. Escape and the scrap payouts stay elsewhere.
const FEDERATION_FLEET_INTROS = [
  "You arrive in the middle of a raging battle. Both sides are taking heavy losses. A small squadron flies past and a fighter breaks off, moving toward your position.",
  "Two fleets fight nearby. You try to skirt around the edges of the battle and keep out of weapons range, but a Rebel scout spots you and moves in.",
  "It's hard to tell who is winning the nearby battle. Before you have a chance to figure it out, a fighter moves in to attack.",
  "The sheer scale of the destruction in the distance is almost breath-taking. Unfortunately, your position as an independent observer doesn't last for long!",
  "The destruction in the distance is almost awe-inspiring. However you're dragged back to reality as Sensors indicate you are under attack.",
  "You don't have any time to worry about the battle in the distance. The fight is coming to you really quickly!",
];

// Lanius ship attacking civilian. Three printed intros, no odds. INFERRED: equal.
// Attack stays c:lanius-ship-attacking-civilian:0. Avoid stays the nothing choice.
const LANIUS_CIVILIAN_INTROS = [
  `You immediately receive a message upon arrival, "Help! These metal bastards have gone crazy!" The communication originates from the hull of a partially dismantled ship which lies among a number of other destroyed ships. The violent Lanius ship responsible for this carnage is advancing on the survivors.`,
  "You scan the area after arriving at this system. A Lanius ship is in fast pursuit of an unarmed civilian ship. It's hard to say if it's truly a threat since its weapons are not charging.",
  "You arrive at the location of a recent battle. Judging from the debris, some settlers attempted to fight off a number of small Lanius ships, although it's impossible to say who instigated the aggression. A few skirmishes can be seen in the distance, but more notably a lone Lanius ship is firing on a heavily damaged civilian vessel.",
];

// Lanius ship salvager. Five printed intros, no odds. INFERRED: equal.
// Attack stays c:lanius-ship-salvager:0. Leave stays :1. The Lanius scrap request stays :2.
const LANIUS_SALVAGER_INTROS = [
  "You come across a single Lanius ship salvaging a small civilian craft. You cannot tell if they attacked the craft or just happened upon it.",
  "There are remnants of a fierce battle here. Scattered among the hulks are small Lanius craft, slowly breaking apart the wrecks. One of the ships is close enough that you could probably attack it without immediately alerting the others.",
  "When you arrive at the beacon you discover what must have been remnants of a large battle. However the vast majority of metal has been striped from the ships, only various plastic and other materials float in a ring around a planet. A lone Lanius ship moves between the wreckage looking for more salvage.",
  "A small asteroid belt is near this jump beacon. It must be mineral-rich since a Lanius ship is docked on a large rock, slowly absorbing parts of it. You could probably get their attention pretty easily.",
  "A Lanius ship is slowly salvaging what remains of a small research station. It's hard to say if it was abandoned or attacked by the Lanius.",
];

// The mercenary. Six printed intros, no odds. INFERRED: equal.
// Delay stays c:the-mercenary:0. Fight stays :1. Decline stays :2.
const MERCENARY_INTROS = [
  "You find a mercenary for hire at this Beacon. Their unique skills can sometimes prove to be useful.",
  `A mercenary hails you: "Greetings, friend! We've heard tell of your quest and are here to offer our valuable services."`,
  `There's a ship with pirate markings orbiting the nearby planet. You receive his hail: "Anything is possible, for the right price"`,
  `The captain of this ship claims he can provide "services" as long as you've got the scrap.`,
  "Mercenaries are swarming the galaxy now, knowing that their less-than-legal services are in demand during this period of unrest. One is waiting at this beacon and hails you.",
  `A ship hails you: "Good sir! It seems you're having some troubles with the Rebels. I'd like to help you, but I can't afford the upkeep required on this hunk of junk I'm flying... maybe we can come to an arrangement?"`,
];

// Rebel ship supplying civilians. Five printed intros, no odds. INFERRED: equal.
// Attack stays c:rebel-ship-supplying-civilians:0. Leave stays :1. The steal choice is not added.
const REBEL_SUPPLY_INTROS = [
  "You stumble across a Rebel ship distributing supplies to local civilian colonies. It's probably not anything military grade, but every little bit helps...",
  "You find a Rebel combat ship that has been reassigned as an emergency supply vessel. The local civilians are apparently in need of help, and the Rebels are rising to the occasion.",
  "The Rebels in this system are doing supply runs for the local space stations. These civilians have likely been out of supply for months due to the war and are in desperate need.",
  "Civilian colonists loyal to the Rebel cause are present on a nearby planet. It looks like they are currently receiving a supply shipment. Could be useful.",
  "Because of the war, thousands of colonists have had their supply lines disrupted and have found themselves in dire straits. It seems in this system, the Rebels are sympathetic and are distributing what little supplies they can spare.",
];

// Rebel ship attacking Federation loyalists. Three printed intros, no odds. INFERRED: equal.
// Aid stays c:rebel-ship-attacking-federation-loyalists:0. Escape stays :1.
const REBEL_LOYALIST_INTROS = [
  "Upon arriving at this beacon, you detect a distress call. Local scans reveal that a Federation transport is under attack from a Rebel scout!",
  "You immediately notice a Rebel ship chasing what appears to be a civilian transport. However you are detecting chatter on an encrypted Federation channel... That transport is carrying Federation loyalists!",
  "Your sensors are picking up a distress call on an encrypted Federation channel. You eventually find a Federation scout being chased by a Rebel fighter!",
];

// Pirate briber. Three printed intros, no odds. INFERRED: equal.
// Accept stays c:pirate-briber:0. Attack stays c:pirate-briber:1.
const PIRATE_BRIBER_INTROS = [
  `You come across a pirate in hot pursuit of an unidentified ship. You quickly receive a transmission from the pirate: "Stay out of this fight and we'll make it worth your while."`,
  "An unidentified ship is badly damaged and still being assaulted by a space pirate. The victim begins a distress message until the pirate cuts in and offers to split the bounty if you sit tight.",
  `A missile shoots across your bow when the jump completes. Your scans quickly reveal a ship with pirate markings pursuing an unknown vessel. The pirate hails you: "Damn it, we weren't expecting company. Stay out of this and you could profit."`,
];

// Slug fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:slug-fight-in-nebula:0. No nebula environment is added. Surrender stays the Slug row.
const NEBULA_SLUG_INTROS = [
  "Your sensors are no match for the Slug's telepathic abilities - a ship you never even saw opens fire from astern!",
  "The Slug vessel you encounter here has obviously made a big score and is looking to test its new armaments. They picked the wrong ship to attack.",
  `A Slug passenger ship hails: "Please, your worthy alien highnessesss, we are unarmed and sseeking asssylum." You approach cautiously, and weapons immediately spring from their hull!`,
  "A Slug ship - a rogue, you suspect - approaches, but when he sees you're Federation he thinks better of the sneak attack and fires everything he has.",
  "Direct attacks are not preferred by the Slugs, but of the three you see at this beacon, one has the brass to make a move on your position!",
];

// Escort civilians. Three printed intros, no odds. INFERRED: equal.
// Accept stays the low fuel and the quest marker. Decline stays nothing.
const ESCORT_CIVILIAN_INTROS = [
  `After a short time you receive a message, "Hello. I hope it's not a bother, but I'm looking for an escort to a nearby system. This region is quite dangerous and our ship is not well-armed."`,
  `There is a single ship at this beacon. They hail you, "We could really use some help. Our FTL navigation system is shot. Can you help us get to a nearby station where they can patch us up?"`,
  `"Hello," your communicator opens a hail from a nearby ship. "Our weapon systems are malfunctioning and we're too afraid of pirates to travel home unassisted. Can you escort us?"`,
];

// Trade fuel for drone parts. Three printed intros, no odds. INFERRED: equal.
// The trade stays lose 2-4 fuel for 1-3 drone parts. Reject stays nothing.
const FUEL_FOR_DRONES_INTROS = [
  `A nearby space station hails you. "Greetings! Your arrival is most fortuitous. We recently came across some extra drones. If you have some fuel, perhaps we can make a deal?"`,
  `A strange vessel approaches. A digital message appears on your view-screen: "This is an automated merchant. Refill this vessel with fuel and it will supply you with drones."`,
  `You arrive in the sector and are greeted by a science vessel waiting by the beacon. They hail you, "We find ourselves low on fuel and have a proposition."`,
];

// Rock pirates fight near sun. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight-near-sun:0.
const ROCK_PIRATE_SUN_INTROS = [
  "Unusual solar activity in this region means you need to get out, quick. The Rock pirate nearby apparently thinks otherwise as they move to attack your ship.",
  `A Rock ship is silhouetted against a sun in supernova. They hail: "Even out here you follow us! We only wish to be left alone!" Out of panic or anger, they charge their weapons.`,
];

// Rock pirates fight in asteroid field. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight-in-asteroid-field:0.
const ROCK_PIRATE_ASTEROID_INTROS = [
  "Minute fissures in the shields spark and crackle as the ship jumps into the wake of a huge asteroid. More asteroids follow, as does a lost and aggressive Rock pirate ship.",
  "You exit the jump surrounded by dirt and rocks. Before long a blast is deflected by your shield, but that was no asteroid... Incoming pirate!",
];

// Rock fight in asteroid field. Three printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight-in-asteroid-field:0.
const ROCK_ASTEROID_INTROS = [
  "A Rock mining vessel is harvesting the mineral-rich asteroids in this locality, and their scouts take your presence to be a transgression. Battle stations!",
  "A rookie Rock cargo ship has taken its orders too literally and took the most direct route to their destination... right through an asteroid field. They're confused and fire wildly as you jump in.",
  `The captain of a Rock freighter lost in the asteroid field hails you: "Our co-ordinates led us here, but only death greets us. What must be must be. Death to all." You power up the battle systems and wonder how long they've been stuck here.`,
];

// Rebel fight (Slug). Three printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-slug:0.
const SLUG_REBEL_INTROS = [
  "As you arrive at the beacon, a hostile ship immediately registers on your scanners. You didn't expect to see Rebels extending their reach into Slug territory. Charge the weapons!",
  "You jump into empty space and are relieved to see your sensors blink back to life. However, you are less pleased to see them immediately register a rebel ship on an approach vector!",
  `You receive a message from a nearby ship, "Looks like our intelligence was correct! Sneaking through the clouds with the Slugs... No one can hide from the rebellion!"`,
];

// Pirate fight (Slug). Three printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-slug:0.
const SLUG_PIRATE_INTROS = [
  "There appears to be a pirate ship nearby. Be on your guard; anyone trying to hunt in Slug territory is either formidable or deeply stupid, and in space, either can be dangerous.",
  `"We knew anyone foolish enough to try and sneak through a Slug nebula would stick to open space. Yield your goods and we may let you live." You cut the transmission in lieu of a response.`,
  "Before you can take a moment's rest from the ever present nebulas in this sector, a pirate ship appears behind you and opens fire.",
];

// Pirate fight (Lanius). Five printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-lanius:0.
const LANIUS_PIRATE_INTROS = [
  `An upgraded pirate ship sits among the remains of a number of Lanius ships. It hails you, "These punks think they can jus' waltz in here into our sector? Obnoxious, right? Well, I'm sure you know the routine, let's do this."`,
  `The pirate ship patrolling this sector has been busy. The debris of several Rebel scouts and at least one civilian ship litter the area. "Welcome, welcome, there's room for one more!" The over-confident pirate hails you as he charges his weapons and moves in to attack.`,
  "A pirate ship appears to be threatening a small refugee ship near the beacon. Upon seeing you jump in, it turns to approach. The civilian wastes no time and jumps away, but that appears only to harden the pirate's resolve.",
  "Debris from a number of battleships are scattered around the beacon. As you approach the area a pirate ship thrusts itself through the hulks to attack. It must be using the metal to lure the Lanius into a trap.",
  "The pirate sees you before you see him... prepare for a fight!",
];

// Pirate fight (Zoltan). Five printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-zoltan:0.
const ZOLTAN_PIRATE_INTROS = [
  `"Emergency, all ships in range, we are under attack!" The frequency matches a nearby Zoltan ship; you move in on their pursuer. They take your intervention as a cue to jump away. Cowards.`,
  "You jump just in time to witness a Zoltan ship's FTL drive overload. In their final moments they implore you not to get involved, but it's too late - their attacker is already upon you!",
  "Despite their precautions, pirates have begun to harass the local Zoltan settlements across this sector. One such pirate spots your ship and moves in to attack.",
  "A ship with pirate markings demand that you surrender. These are sad times when even Zoltan space is beset by pirates. You doubt these fools will be missed.",
  "You spot a pirate ship looting a small Zoltan cruiser. They spot you and move in to attack before your FTL drive has a chance to recharge.",
];

// Rock pirates fight. Three printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight:0.
const ROCK_PIRATE_INTROS = [
  "As a naturally warlike species with few inter-galactic diplomatic ties, the Rock people have garnered quite a reputation as fearsome pirates. You stumble across one of their ships and they promptly live up to type.",
  "A Rock ship flies past your windows and you recognize outcast decorations on the hull. These must be pirates!",
  "A motley collection of Rock ships are stationed around this beacon - they look to have resorted to a pirate's life. Defensive maneuvers!",
];

// Rebel fight near pulsar. Three printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-near-pulsar:0.
const REBEL_PULSAR_INTROS = [
  `A Rebel captain appears on the screen. "I thought we had been doomed to backwater assignments. This is my chance to get back in Command's good graces! Charge the weapons!"`,
  "A small rebel research station overlooks a pulsating star. Before you can react a Rebel ship spots you and moves in to attack.",
  "You arrive at an infrequently used beacon close to a pulsar. Before long a Rebel ship happens to jump nearby. Looks like you'll have to fight.",
];

// Rebel fight. Ten printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight:0.
const REBEL_FIGHT_INTROS = [
  `Your ship is hailed. "We've found you at last. Prepare to die!"`,
  "A small Rebel ship is docked at a small station. You try to lay low but it spots you. Power up the weapons!",
  "A Rebel ship has been patrolling this region. As soon as you arrive it begins its assault.",
  `A Rebel ship hails you: "Federation scum! We've waited a long time for this!"`,
  `You receive a transmission: "Sorry sir, this is nothing personal but we're under orders." The Rebel ship's weapons go hot.`,
  "By the time you notice the Rebel ship behind the beacon, it's too late to avoid a fight.",
  `A Rebel ship hails. "We did not fight a war to let a single Federation ship shatter our dreams of a better galaxy!" He locks weapons.`,
  `A Rebel ship approaches cautiously. "Personally," says the captain, "I'd have stuck with the Federation. But I'm a soldier, sir, and I'm no use without a war to fight. Raise your shields!"`,
  `You're hailed by a Rebel ship: "When the rebellion is complete you'll see the safer world we provide. Well, you won't, but you get the point." They arm weapons.`,
  "A Rebel ship is guarding this beacon. You order a pursuit course and prepare to scratch up one more.",
];

// Rebel ship attacking civilians in Last Stand. Five printed intros, no odds. INFERRED: equal. Both choices stay.
const LAST_STAND_CIVILIAN_INTROS = [
  "A number of large transports are being pursued by a Rebel bombing squadron. One bomber has managed to slip through the defensive fire, and is poised to wreak among the enormous yet vulnerable transports. There's time for you to advance and take it out!",
  "Shots fly by your port windows followed by a Rebel scout in pursuit of a damaged cruiser. Should we move in to engage?",
  "There seems to be a small Federation colony under attack by a Rebel forward scout. Will you protect them?",
  "A battle rages nearby between small fighters; apparently fighting over a space station. The Federation appears to be losing ships fast. Shall we assist them?",
  "A civilian ship is broadcasting a request for assistance on a secure Federation channel. They are being harassed by Rebel scouts. Will you respond?",
];

const REBEL_CHECKPOINT_HIDE = [
  "Fly behind a moon and stay hidden.",
  "Shut down all non-vital systems and stay hidden.",
  "Stay quiet and hope they don't notice you.",
  "Stay out of their way and charge your FTL drive.",
];

export function citedEvent(g: Game, b: Beacon): GameEvent | null {
  const ev = matchEvent(b);
  if (!ev) return null;
  if (ev.slug === "lanius-trader") {
    const offer = rollLaniusTrader(g, false);
    return {
      title: ev.dest,
      body: laniusTraderOfferText(offer),
      choices: [
        { id: laniusTraderTakeId(offer), label: "Agree to the exchange." },
        { id: "c:lanius-trader:3", label: "Decline" },
        { id: "c:lanius-trader:4", label: "Ask for an alternative trade." },
      ],
    };
  }
  // Auto-ship near radar station. Combat Drone Mark I or II, or an Anti-Ship Beam Drone.
  if (ev.slug === "auto-ship-near-radar-station") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-near-radar-station:2", label: "Send a drone to distract the automated ship." },
      ],
    };
  }
  // Auto-ship near storage station in nebula. Cloaking, Improved Cloaking, Hacking, and Improved Hacking.
  if (ev.slug === "auto-ship-near-storage-station-in-nebula") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-near-storage-station-in-nebula:2", label: "Attempt to stealthily access the space station." },
        { id: "c:auto-ship-near-storage-station-in-nebula:3", label: "Use your stealth to access the space station." },
        { id: "c:auto-ship-near-storage-station-in-nebula:4", label: "Try to hack the station to prevent an alert." },
        { id: "c:auto-ship-near-storage-station-in-nebula:5", label: "Hack the station to prevent an alert." },
      ],
    };
  }
  // Pirate ship attacking civilian distress. Improved Weapons is Weapon Control level 6+.
  if (ev.slug === "pirate-ship-attacking-civilian-distress") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:pirate-ship-attacking-civilian-distress:2", label: "Fire a warning shot from your strongest weapon." },
      ],
    };
  }
  // Zoltan security checkpoint. Profiling, a Slug, and Mind Control. The attack stays the fight.
  if (ev.slug === "zoltan-security-checkpoint") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:zoltan-security-checkpoint:1", label: "Submit to profiling." },
        { id: "c:zoltan-security-checkpoint:2", label: "Have your Slug talk them into letting you go." },
        { id: "c:zoltan-security-checkpoint:3", label: "Make the guards believe they have already checked your crew today." },
      ],
    };
  }
  // Escort civilians FTL haywire. Advanced FTL Navigation uploads the route. Leading them stays the low scrap and the marker.
  if (ev.slug === "escort-civilians-ftl-haywire") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:escort-civilians-ftl-haywire:2", label: "Have your navigation software calculate and upload route instructions to their ship." },
      ],
    };
  }
  // Slug drink. Drink, and a Rock crewmember poses as captain. Refuse stays the fight.
  if (ev.slug === "slug-drink") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "c:slug-drink:1", label: "Drink." },
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:slug-drink:2", label: "Have your Rockman pose as captain." },
      ],
    };
  }
  // Rock ship in plasma storm. A Rock crewmember leads them out.
  if (ev.slug === "rock-ship-in-plasma-storm") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:rock-ship-in-plasma-storm:2", label: "Offer to lead them out of the nebula." },
      ],
    };
  }
  // Deactivated Auto-ship. Download, and Sensors level 3. The strip choice is already on the card.
  if (ev.slug === "deactivated-auto-ship") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "c:deactivated-auto-ship:1", label: "Attempt to download the ship's data stores." },
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:deactivated-auto-ship:2", label: "Remotely scan the ship." },
      ],
    };
  }
  // Auto-ship fight in plasma storm. Engines 3-5, Engines 6+, and Cloaking.
  if (ev.slug === "auto-ship-fight-in-plasma-storm") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-fight-in-plasma-storm:1", label: "Attempt to out-run it." },
        { id: "c:auto-ship-fight-in-plasma-storm:2", label: "Attempt to out-run it." },
        { id: "c:auto-ship-fight-in-plasma-storm:3", label: "Use your cloaking to escape." },
      ],
    };
  }
  // Auto-ship near storage station. Cloaking is a blue option.
  if (ev.slug === "auto-ship-near-storage-station") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-near-storage-station:2", label: "Attempt to cloak and access the cache." },
      ],
    };
  }
  // Auto-ship near sensor station. Sensors level 3 and a Crew Teleporter are blue options.
  if (ev.slug === "auto-ship-near-sensor-station") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-near-sensor-station:2", label: "Use your sensors to attempt to access the data." },
        { id: "c:auto-ship-near-sensor-station:3", label: "Beam directly onto the station to try to avoid detection." },
      ],
    };
  }
  // Trade resources. One rolled offer is shown before Trade or Ignore. Not the nebula page.
  if (ev.slug === "trade-resources") return tradeResourcesEvent(g, ev.dest);
  // Trade resources in nebula. One intro, then one rolled offer. Trade or Ignore. No scrap.
  if (ev.slug === "trade-resources-in-nebula") return tradeResourcesNebulaEvent(g, ev.dest);
  // Pirate smuggler. {{Blue Option|Weapons|level=6+}}. The button stays visible.
  if (ev.slug === "pirate-smuggler") {
    return {
      title: ev.dest,
      body: "A pirate ship arrives shortly after you. Judging from the fact that it is attempting to avoid your ship, you assume that it's a smuggler trying to stay away from beacons.",
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:pirate-smuggler:2", label: "Activate your advanced weapons threateningly." },
      ],
    };
  }
  // Pirate fight. One of the five printed intros. The fight stays c:pirate-fight:0.
  if (ev.slug === "pirate-fight") {
    return {
      title: ev.dest,
      body: PIRATE_FIGHT_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:pirate-fight:0", label: "Fight a Pirate ship" }],
    };
  }
  // Pirate fight in nebula. One of the five printed intros. The fight stays c:pirate-fight-in-nebula:0.
  if (ev.slug === "pirate-fight-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_PIRATE_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel fight in nebula. One of the seven printed intros. The fight stays c:rebel-fight-in-nebula:0.
  if (ev.slug === "rebel-fight-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_REBEL_INTROS[between(g, [0, 6])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Auto-ship fight in nebula. One of the five printed intros. The fight stays c:auto-ship-fight-in-nebula:0.
  if (ev.slug === "auto-ship-fight-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_AUTO_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rock atheists. {{Blue Option|Improved Sensors|level=2+}}. The button stays visible.
  if (ev.slug === "rock-atheists") {
    return {
      title: ev.dest,
      body: "You encounter a small craft with minimal propulsion; its Rock crew-member explains that the Rock home-world is run on lies and propaganda that keep the populace in check, and that they want no part of it.",
      choices: [
        { id: "c:rock-atheists:0", label: "Tell them their god sent them here to join your crew." },
        { id: "c:rock-atheists:1", label: "Promise to share with them the truths they've been denied." },
        { id: "c:rock-atheists:2", label: "Show them to your data suite." },
      ],
    };
  }
  // Pirate ship selling drones. Hail, then dock. The unnamed schematic is not a button.
  if (ev.slug === "pirate-ship-selling-drones") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "q:pirate-drones:hail", label: "Hail the ship." },
        { id: "c:pirate-ship-selling-drones:1", label: "Attack him before he can attack!" },
        { id: "c:pirate-ship-selling-drones:2", label: "Quickly prepare to jump away." },
      ],
    };
  }
  // Rebel fight (Lanius). One of the six printed intros. The fight stays c:rebel-fight-lanius:0.
  if (ev.slug === "rebel-fight-lanius") {
    return {
      title: ev.dest,
      body: LANIUS_REBEL_INTROS[between(g, [0, 5])]!,
      choices: [{ id: "c:rebel-fight-lanius:0", label: "Fight a Rebel ship" }],
    };
  }
  // Rock fight with boarders. One of the two printed intros. The fight stays c:rock-fight-with-boarders:0.
  if (ev.slug === "rock-fight-with-boarders") {
    return {
      title: ev.dest,
      body: ROCK_BOARDER_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-fight-with-boarders:0", label: "Fight a Rock ship" }],
    };
  }
  // Auto-ship fight. One of the nine printed intros. The fight stays c:auto-ship-fight:0.
  if (ev.slug === "auto-ship-fight") {
    return {
      title: ev.dest,
      body: AUTO_SHIP_FIGHT_INTROS[between(g, [0, 8])]!,
      choices: [{ id: "c:auto-ship-fight:0", label: "Fight an Auto-ship" }],
    };
  }
  // Auto-ship warning. The page shares those nine intros. The fight stays c:auto-ship-warning:0.
  if (ev.slug === "auto-ship-warning") {
    return {
      title: ev.dest,
      body: AUTO_SHIP_FIGHT_INTROS[between(g, [0, 8])]!,
      choices: [{ id: "c:auto-ship-warning:0", label: "Fight an Auto-ship that is running away" }],
    };
  }
  // Rebel fight with boarders. One of the four printed intros. The fight stays c:rebel-fight-with-boarders:0.
  if (ev.slug === "rebel-fight-with-boarders") {
    return {
      title: ev.dest,
      body: REBEL_BOARDER_INTROS[between(g, [0, 3])]!,
      choices: [{ id: "c:rebel-fight-with-boarders:0", label: "Fight a Rebel ship" }],
    };
  }
  // Rock fight with boarders in asteroid field. One of the two printed intros. The fight stays c:rock-fight-with-boarders-in-asteroid-field:0.
  if (ev.slug === "rock-fight-with-boarders-in-asteroid-field") {
    return {
      title: ev.dest,
      body: ROCK_BOARDER_ASTEROID_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-fight-with-boarders-in-asteroid-field:0", label: "Fight a Rock ship" }],
    };
  }
  // Lanius fight. One of the eleven printed intros, including the repeated line. The fight stays c:lanius-fight:0.
  if (ev.slug === "lanius-fight") {
    return {
      title: ev.dest,
      body: LANIUS_FIGHT_INTROS[between(g, [0, 10])]!,
      choices: [{ id: "c:lanius-fight:0", label: "Fight a Lanius ship" }],
    };
  }
  // Mantis fight (Engi). One of the four printed intros. The fight stays c:mantis-fight-engi:0.
  if (ev.slug === "mantis-fight-engi") {
    return {
      title: ev.dest,
      body: MANTIS_FIGHT_ENGI_INTROS[between(g, [0, 3])]!,
      choices: [{ id: "c:mantis-fight-engi:0", label: "Fight a Mantis ship" }],
    };
  }
  // Mantis fight in nebula. One of the five printed intros. The fight stays c:mantis-fight-in-nebula:0.
  if (ev.slug === "mantis-fight-in-nebula") {
    return {
      title: ev.dest,
      body: MANTIS_NEBULA_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:mantis-fight-in-nebula:0", label: "Fight a Mantis ship" }],
    };
  }
  // Mantis fight. One of the twenty printed intros. The fight stays c:mantis-fight:0.
  if (ev.slug === "mantis-fight") {
    return {
      title: ev.dest,
      body: MANTIS_FIGHT_INTROS[between(g, [0, 19])]!,
      choices: [{ id: "c:mantis-fight:0", label: "Fight a Mantis ship" }],
    };
  }
  // Mantis fight choice. One of the six printed intros. Attack, conceal, and cloaking stay on the def.
  if (ev.slug === "mantis-fight-choice") {
    return {
      title: ev.dest,
      body: MANTIS_CHOICE_INTROS[between(g, [0, 5])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Mantis ship attacking civilian. One of the five printed intros. Both printed choices stay.
  if (ev.slug === "mantis-ship-attacking-civilian") {
    return {
      title: ev.dest,
      body: MANTIS_CIVILIAN_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate ship attacking civilian. One of the six printed intros. Both printed choices stay.
  if (ev.slug === "pirate-ship-attacking-civilian") {
    return {
      title: ev.dest,
      body: PIRATE_CIVILIAN_INTROS[between(g, [0, 5])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate ship attacking civilian (Lanius). One of the three printed intros. Both printed choices stay.
  if (ev.slug === "pirate-ship-attacking-civilian-lanius") {
    return {
      title: ev.dest,
      body: LANIUS_PIRATE_CIVILIAN_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Zoltan fight. One of the seven printed intros. The fight stays c:zoltan-fight:0.
  if (ev.slug === "zoltan-fight") {
    return {
      title: ev.dest,
      body: ZOLTAN_FIGHT_INTROS[between(g, [0, 6])]!,
      choices: [{ id: "c:zoltan-fight:0", label: "Fight a Zoltan ship" }],
    };
  }
  // Crystal fight. One of the seven printed intros. The fight stays c:crystal-fight:0.
  if (ev.slug === "crystal-fight") {
    return {
      title: ev.dest,
      body: CRYSTAL_FIGHT_INTROS[between(g, [0, 6])]!,
      choices: [{ id: "c:crystal-fight:0", label: "Fight a Crystal ship (default rewards)" }],
    };
  }
  // Rebel fight among Rebel fleet. One of the seven printed intros. The fight stays c:rebel-fight-among-rebel-fleet:0.
  if (ev.slug === "rebel-fight-among-rebel-fleet") {
    return {
      title: ev.dest,
      body: REBEL_FLEET_INTROS[between(g, [0, 6])]!,
      choices: [{ id: "c:rebel-fight-among-rebel-fleet:0", label: "Fight a Rebel ship" }],
    };
  }
  // The mercenary. One of the six printed intros. Delay, Fight, and Decline stay the existing choices.
  if (ev.slug === "the-mercenary") {
    return {
      title: ev.dest,
      body: MERCENARY_INTROS[between(g, [0, 5])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel ship supplying civilians. One of the five printed intros. Attack and Leave stay the existing choices.
  if (ev.slug === "rebel-ship-supplying-civilians") {
    return {
      title: ev.dest,
      body: REBEL_SUPPLY_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel ship attacking Federation loyalists. One of the three printed intros. Aid and Escape stay the existing choices.
  if (ev.slug === "rebel-ship-attacking-federation-loyalists") {
    return {
      title: ev.dest,
      body: REBEL_LOYALIST_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate briber. One of the three printed intros. Accept and Attack stay the existing choices.
  if (ev.slug === "pirate-briber") {
    return {
      title: ev.dest,
      body: PIRATE_BRIBER_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Slug fight in nebula. One of the five printed intros. The fight stays c:slug-fight-in-nebula:0.
  if (ev.slug === "slug-fight-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_SLUG_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:slug-fight-in-nebula:0", label: "Fight a Slug ship" }],
    };
  }
  // Lanius ship attacking civilian. One of the three printed intros. Attack and Avoid stay the existing choices.
  if (ev.slug === "lanius-ship-attacking-civilian") {
    return {
      title: ev.dest,
      body: LANIUS_CIVILIAN_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Lanius ship salvager. One of the five printed intros. Attack, Leave, and the scrap request stay the existing choices.
  if (ev.slug === "lanius-ship-salvager") {
    return {
      title: ev.dest,
      body: LANIUS_SALVAGER_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel fight among Federation and Rebel fleets. One of the six printed intros. The fight stays the existing choice.
  if (ev.slug === "rebel-fight-among-federation-and-rebel-fleets") {
    return {
      title: ev.dest,
      body: FEDERATION_FLEET_INTROS[between(g, [0, 5])]!,
      choices: [{ id: "c:rebel-fight-among-federation-and-rebel-fleets:0", label: "Fight a Rebel ship" }],
    };
  }
  // Escort civilians. One of the three printed intros. Accept and Decline stay the existing choices.
  if (ev.slug === "escort-civilians") {
    return {
      title: ev.dest,
      body: ESCORT_CIVILIAN_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Trade fuel for drone parts. One of the three printed intros. The trade and the reject stay the existing choices.
  if (ev.slug === "trade-fuel-for-drone-parts") {
    return {
      title: ev.dest,
      body: FUEL_FOR_DRONES_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rock pirates fight near sun. One of the two printed intros. The fight stays c:rock-pirates-fight-near-sun:0.
  if (ev.slug === "rock-pirates-fight-near-sun") {
    return {
      title: ev.dest,
      body: ROCK_PIRATE_SUN_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-pirates-fight-near-sun:0", label: "Fight a Rock pirate ship" }],
    };
  }
  // Rock pirates fight in asteroid field. One of the two printed intros. The fight stays c:rock-pirates-fight-in-asteroid-field:0.
  if (ev.slug === "rock-pirates-fight-in-asteroid-field") {
    return {
      title: ev.dest,
      body: ROCK_PIRATE_ASTEROID_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-pirates-fight-in-asteroid-field:0", label: "Fight a Rock pirate ship" }],
    };
  }
  // Rock fight in asteroid field. One of the three printed intros. The fight stays c:rock-fight-in-asteroid-field:0.
  if (ev.slug === "rock-fight-in-asteroid-field") {
    return {
      title: ev.dest,
      body: ROCK_ASTEROID_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rock-fight-in-asteroid-field:0", label: "Fight a Rock ship" }],
    };
  }
  // Rebel fight (Slug). One of the three printed intros. The fight stays c:rebel-fight-slug:0.
  if (ev.slug === "rebel-fight-slug") {
    return {
      title: ev.dest,
      body: SLUG_REBEL_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rebel-fight-slug:0", label: "Fight a Rebel ship" }],
    };
  }
  // Pirate fight (Slug). One of the three printed intros. The fight stays c:pirate-fight-slug:0.
  if (ev.slug === "pirate-fight-slug") {
    return {
      title: ev.dest,
      body: SLUG_PIRATE_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:pirate-fight-slug:0", label: "Fight a Pirate ship" }],
    };
  }
  // Pirate fight (Lanius). One of the five printed intros. The fight stays c:pirate-fight-lanius:0.
  if (ev.slug === "pirate-fight-lanius") {
    return {
      title: ev.dest,
      body: LANIUS_PIRATE_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:pirate-fight-lanius:0", label: "Fight a Pirate ship" }],
    };
  }
  // Pirate fight (Zoltan). One of the five printed intros. The fight stays c:pirate-fight-zoltan:0.
  if (ev.slug === "pirate-fight-zoltan") {
    return {
      title: ev.dest,
      body: ZOLTAN_PIRATE_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:pirate-fight-zoltan:0", label: "Fight a Pirate ship" }],
    };
  }
  // Rock pirates fight. One of the three printed intros. The fight stays c:rock-pirates-fight:0.
  if (ev.slug === "rock-pirates-fight") {
    return {
      title: ev.dest,
      body: ROCK_PIRATE_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rock-pirates-fight:0", label: "Fight a Rock pirate ship" }],
    };
  }
  // Rebel fight near pulsar. One of the three printed intros. The fight stays c:rebel-fight-near-pulsar:0.
  if (ev.slug === "rebel-fight-near-pulsar") {
    return {
      title: ev.dest,
      body: REBEL_PULSAR_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rebel-fight-near-pulsar:0", label: "Fight a Rebel ship" }],
    };
  }
  // Rock fight. One of the eight printed intros. The fight stays c:rock-fight:0.
  if (ev.slug === "rock-fight") {
    return {
      title: ev.dest,
      body: ROCK_FIGHT_INTROS[between(g, [0, 7])]!,
      choices: [{ id: "c:rock-fight:0", label: "Fight a Rock ship" }],
    };
  }
  // Pirate fight near pulsar. One of the three printed intros. The fight stays c:pirate-fight-near-pulsar:0.
  if (ev.slug === "pirate-fight-near-pulsar") {
    return {
      title: ev.dest,
      body: PIRATE_PULSAR_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:pirate-fight-near-pulsar:0", label: "Fight a Pirate ship" }],
    };
  }
  // Rebel fight. One of the ten printed intros. The fight stays c:rebel-fight:0.
  if (ev.slug === "rebel-fight") {
    return {
      title: ev.dest,
      body: REBEL_FIGHT_INTROS[between(g, [0, 9])]!,
      choices: [{ id: "c:rebel-fight:0", label: "Fight a Rebel ship" }],
    };
  }
  // Rebel checkpoint. The bribe amount is a whole number from 10 to 15, shown on the button.
  if (ev.slug === "rebel-checkpoint") {
    const cost = between(g, [10, 15]);
    return {
      title: ev.dest,
      body: REBEL_CHECKPOINT_INTROS[between(g, [0, 3])]!,
      choices: [
        { id: "c:rebel-checkpoint:0", label: "Fend for yourself, attack, and escape." },
        { id: `q:rebel-checkpoint:bribe:${cost}`, label: `Bribe the Rebels to release the civilian ships. [${cost} scrap]` },
        { id: "c:rebel-checkpoint:1", label: REBEL_CHECKPOINT_HIDE[between(g, [0, 3])]! },
      ],
    };
  }
  // Lanius trader with translator. Same one shown base trade. No better-band blue option.
  if (ev.slug === "lanius-trader-with-translator") {
    const offer = rollLaniusTrader(g, false);
    return {
      title: ev.dest,
      body: laniusTraderOfferText(offer),
      choices: [
        { id: `q:lanius-translator:take:${offer.res}:${offer.cost}:${offer.scrap}`, label: "Agree to the exchange." },
        { id: "c:lanius-trader-with-translator:3", label: "Decline" },
        { id: "c:lanius-trader-with-translator:4", label: "Decline but ask about their translation device." },
      ],
    };
  }
  // Rebel ship attacking civilians in Last Stand. One of the five printed intros. Both choices stay.
  if (ev.slug === "rebel-ship-attacking-civilians-in-last-stand") {
    return {
      title: ev.dest,
      body: LAST_STAND_CIVILIAN_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  return {
    title: ev.dest,
    body: ev.body,
    choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

export function citedChoiceDisabled(g: Game, id: string): string | null {
  const take = tradeTake(id);
  if (take) {
    const pay = take[1] as TradeRes;
    const cost = Number(take[2]);
    if (stock(g, pay) < cost) return `Need ${cost} ${RES_WORD[pay]}`;
    return null;
  }
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

/**
 * Sell missiles for scrap: "Thank you, this will help greatly."
 * Sell drone parts for scrap: "Thank you for your business."
 * Trivia on both pages: Scrap Recovery Arm and Repair Arm change the scrap reward.
 * The percents are Augmentations. These pages do not print them.
 */
function sellStationThanks(id: string): string | null {
  if (
    id === "c:sell-missiles-for-scrap:0" ||
    id === "c:sell-missiles-for-scrap:1" ||
    id === "c:sell-missiles-for-scrap:2"
  ) {
    return "\"Thank you, this will help greatly.\"";
  }
  if (
    id === "c:sell-drone-parts-for-scrap:0" ||
    id === "c:sell-drone-parts-for-scrap:1" ||
    id === "c:sell-drone-parts-for-scrap:2"
  ) {
    return "\"Thank you for your business.\"";
  }
  return null;
}

/** True only after the choice is applied. A shortfall returns false and changes nothing. */
export function citedChoose(ctx: CitedChoice, id: string): boolean {
  const take = tradeTake(id);
  if (take) {
    const g = ctx.g;
    const pay = take[1] as TradeRes;
    const cost = Number(take[2]);
    const get = take[3] as TradeRes;
    const gain = Number(take[4]);
    if (stock(g, pay) < cost) return false;
    spend(g, pay, cost);
    if (get === "fuel") g.fuel += gain;
    else if (get === "missiles") g.missiles += gain;
    else g.player.parts += gain;
    ctx.note(tradeNote(pay, -cost));
    ctx.note(tradeNote(get, gain));
    ctx.resolve();
    return true;
  }
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
    const thanks = gn.id === "scrap" ? sellStationThanks(id) : null;
    if (thanks) {
      // Score: Scrap Recovery Arm's bonus is not eligible. Repair Arm's cut stays in the eligible amount.
      const got = adjustScrap(g, gn.n);
      if (got > 0) g.scrap += got;
      if (gn.n > 0) g.scrapCollected = (g.scrapCollected ?? 0) + gn.n;
      ctx.note(thanks);
      ctx.note(`You receive ${got} scrap.`);
      continue;
    }
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
    // "1-2 rock boarders beam aboard your ship" (Rock fight with boarders in asteroid field).
    // INFERRED: the count is an inclusive whole number. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:rock-fight-with-boarders:0") rockBoarders(g, 1, 3);
    if (id === "c:rock-fight-with-boarders-in-asteroid-field:0") rockBoarders(g, 1, 2);
    // "2-3 mantis boarders beam aboard your ship" (Mantis outcasts).
    // INFERRED: inclusive 2..3. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:mantis-outcasts:0") mantisBoarders(g, 2, 3);
    // "3-4 zoltan boarders beam aboard your ship" (Zoltan border police).
    // INFERRED: inclusive 3..4. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:zoltan-border-police:0") zoltanBoarders(g, 3, 4);
    // "2-3 human boarders beam aboard your ship" (Rebel fight with boarders).
    // INFERRED: inclusive 2..3. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:rebel-fight-with-boarders:0") humanBoarders(g, 2, 3, "human boarders beam aboard your ship.");
    // "2 slug boarders beam aboard your ship" (Slug hacker (medical)).
    if (id === "c:slug-hacker-medical:0") slugBoarders(g, 2, 2, "slug boarders beam aboard your ship.");
    // "crew entirely composed of Mantis" (Mantis ship-collectors; Zoltan ship follows Mantis ship; Legendary thief KazaaakplethKilik).
    if (id === "c:mantis-ship-collectors:0" || id === "c:zoltan-ship-follows-mantis-ship:1" || id === "c:legendary-thief-kazaaakplethkilik:0") allMantisCrew(g);
    return true;
  }
  // "3-4 human boarders beam aboard your ship" (Boarders: Humans in plasma storm). No enemy ship.
  if (id === "c:boarders-humans-in-plasma-storm:0") {
    plasmaHumanBoarders(g);
    return true;
  }
  ctx.resolve();
  return true;
}
