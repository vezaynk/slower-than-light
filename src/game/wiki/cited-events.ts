import { tx } from "../../i18n/index.ts";
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
import { EXTRA_EVENTS as MISSING_EVENTS, missingCard, missingChoose, missingDisabled, missingOwns } from "./cited-missing.ts";
// @agent:beacon-mix. Per-sector beacon composition from the Sectors page.
import { mixBeacons } from "./beacon-mix.ts";
import { markRuwenEntry } from "./ruwen-entry.ts";
// Rock fight with boarders. Called only from citedChoose, after ctx.fight (surrender.ts imports sim.ts).
import { allMantisCrew, between, crystalBoarders, humanBoarders, joinCrew, mantisBoarders, plasmaHumanBoarders, rockBoarders, slugBoarders, zoltanBoarders } from "./surrender.ts";
import { grantRandomItem } from "./bonus-item.ts";

/** Pirate engine hacker: "Fight the Pirate ship with your Engines limited to level 1." */
export function citedEngineCap(id: string): number | null {
  if (id === "c:pirate-engine-hacker:0") return 1;
  // Slug repair station: "Engines limited to level 1."
  if (id === "c:slug-repair-engines:fight") return 1;
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
  // Slug repair station: "Weapon Control halved" and "rounds down against you".
  if (id === "c:slug-repair-half:fight") return ["weapons"];
  return null;
}

/**
 * Event pages whose opening choice states a number, a scrap tier, or a fight.
 * Engi cache stays in sim.ts. A page that only says "a random amount" is absent.
 * Blue options, crew, map reveals, and upgrades are not granted. An unnamed weapon, augmentation or
 * drone schematic is a random one (Rewards; the "item" fx, or grantRandomItem in a handler).
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
  /** Rewards, "Weapon" / "Augment" / "Drone": a random one the page does not name (bonus-item.ts grantRandomItem). */
  | { k: "item"; item: "weapon" | "augment" | "drone" }
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
    "body": tx("wiki.cited-events.you-come-across-a-rebel-automated"),
    "choices": [
      {
        "id": "c:auto-ship-attacking-civilian:0",
        "label": tx("wiki.cited-events.aid-the-civilian-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-attacking-civilian:1",
        "label": tx("wiki.cited-events.stay-out-of-it"),
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
    "body": tx("wiki.cited-events.you-detect-an-automated-rebel-scout"),
    "choices": [
      {
        "id": "c:auto-ship-attacking-outpost:0",
        "label": tx("wiki.cited-events.intervene-to-defend-the-outpost"),
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-attacking-outpost:1",
        "label": tx("wiki.cited-events.avoid-the-conflict"),
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
    "body": tx("wiki.cited-events.your-arrival-is-greeted-by-numerous"),
    "choices": [
      {
        "id": "c:auto-ship-carrying-shield-virus:0",
        "label": tx("wiki.cited-events.continue"),
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-carrying-shield-virus:1",
        "label": tx("wiki.cited-events.counter-the-remote-hacking"),
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  // Auto-ship fight (Crystal) has no choice. Arrival calls c:auto-ship-fight-crystal:0.
  // "Fight an Auto-ship." unique=true.
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
    "body": tx("wiki.cited-events.the-rebels-must-have-sent-their"),
    "choices": [
      {
        "id": "c:auto-ship-fight-crystal:0",
        "label": tx("wiki.cited-events.fight-an-auto-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  // Auto-ship fight in asteroid field has no choice. Arrival calls c:auto-ship-fight-in-asteroid-field:0.
  // "Fight an Auto-ship." asteroidfield=true. unique=false.
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
    "body": tx("wiki.cited-events.you-arrive-in-an-asteroid-belt"),
    "choices": [
      {
        "id": "c:auto-ship-fight-in-asteroid-field:0",
        "label": tx("wiki.cited-events.fight-an-auto-ship"),
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
  // Auto-ship fight in nebula has no choice. Arrival calls c:auto-ship-fight-in-nebula:0.
  // One of the five printed intros. "Fight an Auto-ship." nebula=true. unique=false.
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
        "label": tx("wiki.cited-events.fight-an-auto-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      }
    ]
  },
  // Auto-ship fight near sun has no choice. Arrival calls c:auto-ship-fight-near-sun:0.
  // "Fight an Auto-ship." redgiant=true. unique=true.
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
    "body": tx("wiki.cited-events.you-arrive-at-the-beacon-to"),
    "choices": [
      {
        "id": "c:auto-ship-fight-near-sun:0",
        "label": tx("wiki.cited-events.fight-an-auto-ship"),
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
    "body": tx("wiki.cited-events.a-rebel-automated-ship-sits-dormant"),
    "choices": [
      {
        "id": "c:auto-ship-near-radar-station:0",
        "label": tx("wiki.cited-events.approach-the-station"),
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-near-radar-station:1",
        "label": tx("wiki.cited-events.keep-your-distance-and-wait-for"),
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
    "body": tx("wiki.cited-events.you-detect-a-rebel-automated-ship"),
    "choices": [
      {
        "id": "c:auto-ship-near-sensor-station:0",
        "label": tx("wiki.cited-events.attack-the-automated-ship-to-get"),
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-near-sensor-station:1",
        "label": tx("wiki.cited-events.avoid-provoking-the-ship"),
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
    "body": tx("wiki.cited-events.an-advance-sic-rebel-automated-ship"),
    "choices": [
      {
        "id": "c:auto-ship-near-storage-station-in-nebula:0",
        "label": tx("wiki.cited-events.attack-the-automated-ship-to-get-2"),
        "fx": [
          {
            "k": "fight",
            "tier": "Auto-ship"
          }
        ]
      },
      {
        "id": "c:auto-ship-near-storage-station-in-nebula:1",
        "label": tx("wiki.cited-events.avoid-provoking-the-ship"),
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
        "label": tx("wiki.cited-events.fight-an-auto-ship-that-is"),
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
    "body": tx("wiki.cited-events.you-find-two-heavily-damaged-ships"),
    "choices": [
      {
        "id": "c:boarders-humans-in-plasma-storm:0",
        "label": tx("wiki.cited-events.you-receive-medium-scrap-with-resources"),
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
    "body": tx("wiki.cited-events.crystal-shards-fly-past-your-ship"),
    "choices": [
      {
        "id": "c:crystal-fight-with-surrender-offer-human-crew:0",
        "label": tx("wiki.cited-events.fight-a-crystal-ship"),
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
    "body": tx("wiki.cited-events.a-large-convoy-of-lumbering-civilian"),
    "choices": [
      {
        "id": "c:crystal-fight-with-surrender-offer-hull-repairs:0",
        "label": tx("wiki.cited-events.fight-a-crystal-ship"),
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
    "body": tx("wiki.cited-events.there-appears-to-be-a-fight"),
    "choices": [
      {
        "id": "c:crystal-ship-attacking-federation-loyalists:0",
        "label": tx("wiki.cited-events.save-the-federation-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Crystal ship"
          }
        ]
      },
      {
        "id": "c:crystal-ship-attacking-federation-loyalists:1",
        "label": tx("wiki.cited-events.prepare-to-leave"),
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
    "body": tx("wiki.cited-events.the-moment-you-arrive-you-notice"),
    "choices": [
      {
        "id": "c:crystalline-ship-messaging-about-rebels:0",
        "label": tx("wiki.cited-events.give-them-your-flight-plans"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:crystalline-ship-messaging-about-rebels:1",
        "label": tx("wiki.cited-events.accept-the-scrap-but-give-them"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:crystalline-ship-messaging-about-rebels:2",
        "label": tx("wiki.cited-events.accept-the-scrap-but-give-them-2"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:crystalline-ship-messaging-about-rebels:3",
        "label": tx("wiki.cited-events.refuse"),
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
    "body": tx("wiki.cited-events.you-find-a-rebel-automated-scout"),
    "choices": [
      {
        "id": "c:deactivated-auto-ship:0",
        "label": tx("wiki.cited-events.don-t-risk-activating-it-and"),
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
    "body": tx("wiki.cited-events.the-distress-signal-originates-at-a"),
    "choices": [
      {
        "id": "c:engi-distress-rebel-fight:0",
        "label": tx("wiki.cited-events.fight-the-rebel-ship"),
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
    "body": tx("wiki.cited-events.what-appeared-to-be-a-single"),
    "choices": [
      {
        "id": "c:engi-smashed-ships:0",
        "label": tx("wiki.cited-events.attempt-to-help-the-ships-by"),
        "fx": [
          {
            "k": "fight",
            "tier": "Engi ship"
          }
        ]
      },
      {
        "id": "c:engi-smashed-ships:1",
        "label": tx("wiki.cited-events.ignore-the-damaged-vessels"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:engi-smashed-ships:2",
        "label": tx("wiki.cited-events.have-your-engi-crewmember-hail-the"),
        "fx": [
          {
            "k": "note",
            "text": tx("wiki.cited-events.random-resources-with-some-scrap")
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
        "label": tx("wiki.cited-events.lead-them-to-their-destination"),
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
        "label": tx("wiki.cited-events.decline"),
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
    "body": tx("wiki.cited-events.for-a-moment-you-assume-it"),
    "choices": [
      {
        "id": "c:federation-deserters:2",
        "label": tx("wiki.cited-events.offer-supplies"),
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 15,
            "hi": 25
          },
          {
            "k": "res",
            "id": "fuel",
            "sign": -1,
            "lo": 1,
            "hi": 3
          }
        ]
      },
      {
        "id": "c:federation-deserters:0",
        "label": tx("wiki.cited-events.attack-the-traitors"),
        "fx": [
          {
            "k": "fight",
            "tier": "Federation ship"
          }
        ]
      },
      {
        "id": "c:federation-deserters:1",
        "label": tx("wiki.cited-events.leave-them-be"),
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
        "label": tx("wiki.cited-events.you-receive-a-drone-schematic-with"),
        "fx": [
          {
            "k": "tier",
            "tier": "low"
          },
          // Rewards, "Drone": "A random drone schematic & T scrap."
          {
            "k": "item",
            "item": "drone"
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
        "label": tx("wiki.cited-events.you-receive-medium-scrap-with-resources"),
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
    "body": tx("wiki.cited-events.you-stumble-across-a-badly-damaged"),
    "choices": [
      {
        "id": "c:free-scrap-with-resources-lanius:0",
        "label": tx("wiki.cited-events.you-receive-high-scrap-with-resources"),
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
    "body": tx("wiki.cited-events.after-the-fight"),
    "choices": [
      {
        "id": "c:lanius-fight-with-friendly-asb-support:0",
        "label": tx("wiki.cited-events.fight-a-lanius-ship-with-an"),
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
    "body": tx("wiki.cited-events.you-come-across-a-lanius-ship"),
    "choices": [
      {
        "id": "c:lanius-ship-absorbing-automated-scout:0",
        "label": tx("wiki.cited-events.fight-the-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-absorbing-automated-scout:1",
        "label": tx("wiki.cited-events.leave-them-alone"),
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
    "body": tx("wiki.cited-events.the-mantis-ship-in-this-system"),
    "choices": [
      {
        "id": "c:lanius-ship-attacking-mantis:0",
        "label": tx("wiki.cited-events.attack-the-lanius-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-attacking-mantis:1",
        "label": tx("wiki.cited-events.leave-the-mantis-to-their-fate"),
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
    "body": tx("wiki.cited-events.a-distress-beacon-pulses-weakly-from"),
    "choices": [
      {
        "id": "c:lanius-ship-attacking-rock:0",
        "label": tx("wiki.cited-events.attack-the-lanius-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-attacking-rock:1",
        "label": tx("wiki.cited-events.leave-the-rockmen-to-their-fate"),
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
        "label": tx("wiki.cited-events.attack-the-lanius-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-attacking-civilian:1",
        "label": tx("wiki.cited-events.avoid-the-conflict"),
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
    "body": tx("wiki.cited-events.you-immediately-do-a-short-range"),
    "choices": [
      {
        "id": "c:lanius-ship-attacking-civilian-distress:0",
        "label": tx("wiki.cited-events.fight-the-lanius-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-attacking-civilian-distress:1",
        "label": tx("wiki.cited-events.avoid-the-conflict"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:lanius-ship-attacking-civilian-distress:2",
        "label": tx("wiki.cited-events.have-your-crew-admonish-their-captain"),
        "fx": [
          {
            "k": "note",
            "text": tx("wiki.cited-events.a-lanius-crewmember-starts-a-fight")
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
    "body": tx("wiki.cited-events.your-scans-have-picked-up-a"),
    "choices": [
      {
        "id": "c:lanius-ship-in-rich-debris-field:0",
        "label": tx("wiki.cited-events.attempt-to-harvest-some-for-yourself"),
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-in-rich-debris-field:1",
        "label": tx("wiki.cited-events.attack-the-vessel"),
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-in-rich-debris-field:2",
        "label": tx("wiki.cited-events.ignore-the-vessel"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:lanius-ship-in-rich-debris-field:3",
        "label": tx("wiki.cited-events.engage-the-auto-pilot-and-safely"),
        "fx": [
          {
            "k": "note",
            "text": tx("wiki.cited-events.improved-piloting-at-level-2-pays")
          }
        ]
      },
      {
        "id": "c:lanius-ship-in-rich-debris-field:4",
        "label": tx("wiki.cited-events.engage-the-auto-pilot-and-safely"),
        "fx": [
          {
            "k": "note",
            "text": tx("wiki.cited-events.advanced-piloting-at-level-3-pays")
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
        "label": tx("wiki.cited-events.attack-the-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Lanius ship"
          }
        ]
      },
      {
        "id": "c:lanius-ship-salvager:1",
        "label": tx("wiki.cited-events.leave-them-alone"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:lanius-ship-salvager:2",
        "label": tx("wiki.cited-events.request-some-scrap"),
        "fx": [
          {
            "k": "note",
            "text": tx("wiki.cited-events.a-lanius-crewmember-may-receive-medium")
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
        "label": tx("wiki.cited-events.you-lose-3-7-fuel-and"),
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
        "label": tx("wiki.cited-events.you-lose-3-7-missiles-and"),
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
        "label": tx("wiki.cited-events.you-lose-3-7-drone-parts"),
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
        "label": tx("wiki.cited-events.decline"),
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
        "label": tx("wiki.cited-events.you-lose-3-7-fuel-and"),
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
        "label": tx("wiki.cited-events.you-lose-3-7-missiles-and"),
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
        "label": tx("wiki.cited-events.you-lose-3-7-drone-parts"),
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
        "label": tx("wiki.cited-events.decline"),
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
    "body": tx("wiki.cited-events.you-cross-paths-with-a-mantis"),
    "choices": [
      {
        "id": "c:legendary-thief-kazaaakplethkilik:0",
        "label": tx("wiki.cited-events.prepare-to-fight"),
        "fx": [
          {
            "k": "fight",
            "tier": "Mantis ship"
          }
        ]
      },
      {
        "id": "c:legendary-thief-kazaaakplethkilik:1",
        "label": tx("wiki.cited-events.attempt-to-hail-him"),
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
    "body": tx("wiki.cited-events.the-mantis-outcasts-sometimes-make-the"),
    "choices": [
      {
        "id": "c:mantis-outcasts:0",
        "label": tx("wiki.cited-events.2-3-mantis-boarders-beam-aboard"),
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
    "body": tx("wiki.cited-events.you-discover-a-number-of-civilian"),
    "choices": [
      {
        "id": "c:mantis-ship-attacking-crystal:0",
        "label": tx("wiki.cited-events.attack-the-mantis"),
        "fx": [
          {
            "k": "fight",
            "tier": "Mantis Ship"
          }
        ]
      },
      {
        "id": "c:mantis-ship-attacking-crystal:1",
        "label": tx("wiki.cited-events.ignore-them"),
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
    "body": tx("wiki.cited-events.you-receive-a-request-all-of"),
    "choices": [
      {
        "id": "c:mantis-war-camp:0",
        "label": tx("wiki.cited-events.pledge-to-do-what-you-can"),
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
        "label": tx("wiki.cited-events.apologize-and-decline"),
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
    "body": tx("wiki.cited-events.a-ship-responding-to-your-distress"),
    "choices": [
      {
        "id": "c:no-fuel-auto-ship-warning:0",
        "label": tx("wiki.cited-events.fight-an-auto-ship-that-is"),
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
        "label": tx("wiki.cited-events.make-the-trade"),
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
        "label": tx("wiki.cited-events.ignore-them"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:no-fuel-engi-ship-repair:2",
        "label": tx("wiki.cited-events.offer-to-help-repair-their-hull"),
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
        "label": tx("wiki.cited-events.fight-a-mantis-ship-that-is"),
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
        "label": tx("wiki.cited-events.fight-a-rebel-ship-that-is"),
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
    "body": tx("wiki.cited-events.a-mobile-slugman-fuel-depot-enters"),
    "choices": [
      {
        "id": "c:no-fuel-slug-fuel-depot:0",
        "label": tx("wiki.cited-events.buy-5-fuel-for-50-scrap"),
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
        "label": tx("wiki.cited-events.buy-10-fuel-for-95-scrap"),
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
        "label": tx("wiki.cited-events.negotiate"),
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
        "label": tx("wiki.cited-events.request-emergency-fuel-reserves"),
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
        "label": tx("wiki.cited-events.buy-5-fuel-for-20-scrap"),
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
        "label": tx("wiki.cited-events.buy-2-fuel-for-8-scrap"),
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
        "label": tx("wiki.cited-events.attack-the-automated-ship"),
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
    "body": tx("wiki.cited-events.although-your-lack-of-fuel-cells"),
    "choices": [
      {
        "id": "c:no-fuel-explore-the-system:0",
        "label": tx("wiki.cited-events.trade-20-scrap-for-5-fuel"),
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
        "label": tx("wiki.cited-events.trade-10-scrap-for-2-fuel"),
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
        "label": tx("wiki.cited-events.trade-5-scrap-for-1-fuel"),
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
        "label": tx("wiki.cited-events.stay-near-the-beacon"),
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
        "label": tx("wiki.cited-events.accept-their-bribe"),
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
        "label": tx("wiki.cited-events.try-to-be-a-hero-attack"),
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
        "label": tx("wiki.cited-events.attack-the-pirate"),
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:pirate-ship-attacking-civilian-lanius:1",
        "label": tx("wiki.cited-events.avoid-the-conflict"),
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
    "body": tx("wiki.cited-events.the-distress-beacon-is-coming-from"),
    "choices": [
      {
        "id": "c:pirate-ship-attacking-civilian-distress:0",
        "label": tx("wiki.cited-events.aid-the-civilian-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:pirate-ship-attacking-civilian-distress:1",
        "label": tx("wiki.cited-events.stay-out-of-it"),
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
    "body": tx("wiki.cited-events.a-ship-with-conspicuous-pirate-markings"),
    "choices": [
      {
        "id": "c:pirate-ship-selling-drones:0",
        "label": tx("wiki.cited-events.buy-some-drone-parts"),
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
        "label": tx("wiki.cited-events.attack-him-before-he-can-attack"),
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:pirate-ship-selling-drones:2",
        "label": tx("wiki.cited-events.quickly-prepare-to-jump-away"),
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
    "body": tx("wiki.cited-events.a-black-market-weapons-trader-spins"),
    "choices": [
      {
        "id": "c:pirate-ship-selling-weapon:0",
        "label": tx("wiki.cited-events.attack-the-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:pirate-ship-selling-weapon:1",
        "label": tx("wiki.cited-events.ignore-the-ship"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:pirate-ship-selling-weapon:2",
        "label": tx("wiki.cited-events.convince-him-to-make-it-a"),
        "fx": [
          {
            "k": "note",
            "text": tx("wiki.cited-events.a-declined-deal-or-a-pirate")
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
        "label": tx("wiki.cited-events.fend-for-yourself-attack-and-escape"),
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-checkpoint:1",
        "label": tx("wiki.cited-events.fly-behind-a-moon-and-stay"),
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
    // Arrival calls this fight. One of the six printed intros.
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
        "label": tx("wiki.cited-events.fight-a-rebel-ship"),
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
    "body": tx("wiki.cited-events.you-arrive-in-the-middle-of"),
    "choices": [
      {
        "id": "c:rebel-fight-in-plasma-storm:0",
        "label": tx("wiki.cited-events.fight-a-rebel-ship-default-rewards"),
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
    "body": tx("wiki.cited-events.crystal-shards-fly-past-the-screen"),
    "choices": [
      {
        "id": "c:rebel-ship-attacking-crystal-ship:0",
        "label": tx("wiki.cited-events.attack-the-rebel"),
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-attacking-crystal-ship:1",
        "label": tx("wiki.cited-events.attack-the-crystalline-ship"),
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
        "label": tx("wiki.cited-events.ignore-them"),
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
        "label": tx("wiki.cited-events.aid-the-federation-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-attacking-federation-loyalists:1",
        "label": tx("wiki.cited-events.use-this-chance-to-escape"),
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
        "label": tx("wiki.cited-events.prepare-to-fight-the-rebel-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-attacking-civilians-in-last-stand:1",
        "label": tx("wiki.cited-events.there-s-no-time-get-ready"),
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
    "body": tx("wiki.cited-events.you-detect-a-rebel-scout-on"),
    "choices": [
      {
        "id": "c:rebel-ship-attacking-refueling-outpost:0",
        "label": tx("wiki.cited-events.intervene-to-defend-the-outpost"),
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-attacking-refueling-outpost:1",
        "label": tx("wiki.cited-events.avoid-the-conflict"),
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
        "label": tx("wiki.cited-events.attack-the-rebels"),
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-ship-supplying-civilians:1",
        "label": tx("wiki.cited-events.leave-them-be"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:rebel-ship-supplying-civilians:2",
        "label": tx("wiki.cited-events.wait-and-steal-the-supplies-from"),
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
    "body": tx("wiki.cited-events.you-arrive-at-the-beacon-to-2"),
    "choices": [
      {
        "id": "c:rebel-shipyard:0",
        "label": tx("wiki.cited-events.look-around"),
        "fx": [
          {
            "k": "fight",
            "tier": "second Rebel Flagship"
          }
        ]
      },
      {
        "id": "c:rebel-shipyard:1",
        "label": tx("wiki.cited-events.leave-immediately"),
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
    "body": tx("wiki.cited-events.you-spot-a-small-rebel-ship"),
    "choices": [
      {
        "id": "c:rebel-transport-ship:0",
        "label": tx("wiki.cited-events.demand-the-surrender-of-their-goods"),
        "fx": [
          {
            "k": "fight",
            "tier": "Rebel ship"
          }
        ]
      },
      {
        "id": "c:rebel-transport-ship:1",
        "label": tx("wiki.cited-events.avoid-the-ship"),
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
    "body": tx("wiki.cited-events.a-small-platform-orbits-near-this"),
    "choices": [
      {
        "id": "c:refueling-platform:0",
        "label": tx("wiki.cited-events.dock-with-the-refueling-platform"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:refueling-platform:1",
        "label": tx("wiki.cited-events.ignore-the-refueling-platform"),
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
    "body": tx("wiki.cited-events.a-ship-re-fueling-station-is"),
    "choices": [
      {
        "id": "c:refueling-station:0",
        "label": tx("wiki.cited-events.buy-6-fuel-for-12-scrap"),
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
        "label": tx("wiki.cited-events.buy-3-fuel-for-6-scrap"),
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
        "label": tx("wiki.cited-events.buy-1-fuel-for-2-scrap"),
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
        "label": tx("wiki.cited-events.ignore-the-station"),
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
        "label": tx("wiki.cited-events.tell-them-their-god-sent-them"),
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
    "body": tx("wiki.cited-events.a-rock-armoured-transport-nearby-looks"),
    "choices": [
      {
        "id": "c:rock-ship-in-plasma-storm:0",
        "label": tx("wiki.cited-events.repugnant-arm-the-weapons"),
        "fx": [
          {
            "k": "fight",
            "tier": "Rock ship"
          }
        ]
      },
      {
        "id": "c:rock-ship-in-plasma-storm:1",
        "label": tx("wiki.cited-events.leave"),
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
    "body": tx("wiki.cited-events.you-see-a-civilian-space-station"),
    "choices": [
      {
        "id": "c:sell-drone-parts-for-scrap:0",
        "label": tx("wiki.cited-events.sell-3-drone-parts-for-12"),
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
        "label": tx("wiki.cited-events.sell-6-drone-parts-for-24"),
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
        "label": tx("wiki.cited-events.sell-12-drone-parts-for-48"),
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
        "label": tx("wiki.cited-events.ignore-the-station"),
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
    "body": tx("wiki.cited-events.there-is-a-black-market-hub"),
    "choices": [
      {
        "id": "c:sell-missiles-for-scrap:0",
        "label": tx("wiki.cited-events.sell-5-missiles-for-15-scrap"),
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
        "label": tx("wiki.cited-events.sell-10-missiles-for-30-scrap"),
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
        "label": tx("wiki.cited-events.sell-15-missiles-for-45-scrap"),
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
        "label": tx("wiki.cited-events.ignore-the-station"),
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
    "body": tx("wiki.cited-events.you-recognize-the-ship-as-a"),
    "choices": [
      {
        "id": "c:slaver-friendly:0",
        "label": tx("wiki.cited-events.attack-the-slaver-scum"),
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:slaver-friendly:1",
        "label": tx("wiki.cited-events.ignore-the-slaver-and-continue-on"),
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
    "body": tx("wiki.cited-events.an-especially-well-armed-pirate-ship"),
    "choices": [
      {
        "id": "c:slaver-hostile:2",
        "label": tx("wiki.cited-events.draw-straws-and-send-a-crew"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:slaver-hostile:0",
        "label": tx("wiki.cited-events.we-will-never-surrender-one-of"),
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:slaver-hostile:1",
        "label": tx("wiki.cited-events.attempt-to-out-run-the-slaver"),
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
    // Slug drink. The printed hail.
    "body": tx("wiki.cited-events.a-slug-captain-hails-and-invites"),
    "choices": [
      {
        "id": "c:slug-drink:0",
        "label": tx("wiki.cited-events.refuse"),
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
    "body": tx("wiki.cited-events.you-are-immediately-hailed-by-a"),
    "choices": [
      {
        "id": "c:slug-hacker-choice:0",
        "label": tx("wiki.cited-events.shields"),
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-choice:1",
        "label": tx("wiki.cited-events.oxygen"),
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-choice:2",
        "label": tx("wiki.cited-events.weapons"),
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-choice:3",
        "label": tx("wiki.cited-events.offer-35-scrap-to-leave-you"),
        "fx": [
          {
            "k": "res",
            "id": "scrap",
            "sign": -1,
            "lo": 35,
            "hi": 35
          }
        ]
      },
      {
        "id": "c:slug-hacker-choice:4",
        "label": tx("wiki.cited-events.counter-any-hack-attempt"),
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
    "body": tx("wiki.cited-events.there-are-few-more-vicious-beasts"),
    "choices": [
      {
        "id": "c:slug-hacker-doors:0",
        "label": tx("wiki.cited-events.continue"),
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-doors:1",
        "label": tx("wiki.cited-events.counter-the-remote-hacking"),
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
    "body": tx("wiki.cited-events.a-slug-ship-hails-you-we"),
    "choices": [
      {
        "id": "c:slug-hacker-medical:0",
        "label": tx("wiki.cited-events.continue"),
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-medical:1",
        "label": tx("wiki.cited-events.counter-the-remote-hacking"),
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-medical:2",
        "label": tx("wiki.cited-events.try-to-squeeze-some-extra-power"),
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
    "body": tx("wiki.cited-events.the-slugs-here-use-a-tactic"),
    "choices": [
      {
        "id": "c:slug-hacker-oxygen:0",
        "label": tx("wiki.cited-events.continue"),
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-oxygen:1",
        "label": tx("wiki.cited-events.try-to-squeeze-some-extra-power"),
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:slug-hacker-oxygen:2",
        "label": tx("wiki.cited-events.counter-the-remote-hacking"),
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
    "body": tx("wiki.cited-events.you-come-across-a-space-station"),
    "choices": [
      {
        "id": "c:space-station-under-construction:0",
        "label": tx("wiki.cited-events.offer-your-help"),
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
        "label": tx("wiki.cited-events.decline"),
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
    "body": tx("wiki.cited-events.the-engi-are-awaiting-you-at"),
    "choices": [
      {
        "id": "c:the-engi-virus:0",
        "label": tx("wiki.cited-events.hold-on-let-us-try-to"),
        "fx": [
          {
            "k": "fight",
            "tier": "Engi ship"
          }
        ]
      },
      {
        "id": "c:the-engi-virus:1",
        "label": tx("wiki.cited-events.attack-the-engi-vessel"),
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
        "label": tx("wiki.cited-events.hire-the-mercenary-to-delay-the"),
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
        "label": tx("wiki.cited-events.fight-the-ship"),
        "fx": [
          {
            "k": "fight",
            "tier": "Pirate ship"
          }
        ]
      },
      {
        "id": "c:the-mercenary:2",
        "label": tx("wiki.cited-events.you-have-no-need-of-his"),
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
    "body": tx("wiki.cited-events.you-pick-up-a-zoltan-life"),
    "choices": [
      {
        "id": "c:zoltan-retake-the-ship:0",
        "label": tx("wiki.cited-events.engage-the-pirates"),
        "fx": [
          {
            "k": "fight",
            "tier": "Zoltan pirate ship"
          }
        ]
      },
      {
        "id": "c:zoltan-retake-the-ship:1",
        "label": tx("wiki.cited-events.leave"),
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
    "body": tx("wiki.cited-events.you-come-to-a-quiet-part"),
    "choices": [
      {
        "id": "c:zoltan-wise-man:0",
        "label": tx("wiki.cited-events.mantis"),
        "fx": [
          {
            "k": "fight",
            "tier": "Mantis ship"
          }
        ]
      },
      {
        "id": "c:zoltan-wise-man:1",
        "label": tx("wiki.cited-events.slug"),
        "fx": [
          {
            "k": "fight",
            "tier": "Slug ship"
          }
        ]
      },
      {
        "id": "c:zoltan-wise-man:2",
        "label": tx("wiki.cited-events.rockmen"),
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
    // Boarders: Humans (Abandoned). Locations unique=false. Template:Locations: "This event can occur multiple times per sector."
    // Abandoned Sector, Beacons: "1-2 boarders" — both beacons can be this event (beacon-mix.ts).
    // The page prints no button. The red line is the outcome, applied on arrival. No ship (LRSmap=noship).
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
    "body": tx("wiki.cited-events.an-image-of-some-weak-and"),
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
  ...MISSING_EVENTS,
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
  tx("wiki.cited-events.you-arrive-at-a-quiet-spaceport"),
  tx("wiki.cited-events.you-jump-into-a-sector-filled"),
  tx("wiki.cited-events.your-ship-is-flooded-with-advertisement"),
  tx("wiki.cited-events.despite-the-barren-area-a-trader"),
  tx("wiki.cited-events.the-beacon-at-first-glance-seems"),
  tx("wiki.cited-events.a-pawn-broker-has-set-up"),
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
  tx("wiki.cited-events.it-s-hard-to-see-why");

const TRADE_RESOURCES_NEBULA_TAKE =
  /^c:trade-resources-in-nebula:take:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/;

function tradeTake(id: string): RegExpExecArray | null {
  return TRADE_RESOURCES_TAKE.exec(id) ?? TRADE_RESOURCES_NEBULA_TAKE.exec(id);
}

function tradeNote(id: TradeRes, n: number): string {
  const word = id === "fuel" ? tx("wiki.cited-events.fuel") : id === "missiles" ? tx("wiki.cited-events.missiles") : tx("wiki.cited-events.drone-parts");
  return `${word}: ${n}.`;
}

function tradeResourcesEvent(g: Game, title: string): GameEvent {
  const intro = TRADE_RESOURCE_INTROS[between(g, [0, 5])]!;
  const offer = TRADE_RESOURCE_OFFERS[between(g, [0, 3])]!;
  const cost = between(g, offer.cost);
  const gain = between(g, offer.gain);
  const sentence = tx("wiki.cited-events.you-lose-and-receive", { cost: cost, v: RES_WORD[offer.pay], gain: gain, v2: RES_WORD[offer.get] });
  return {
    title,
    body: `${intro} ${sentence}`,
    choices: [
      { id: `c:trade-resources:take:${offer.pay}:${cost}:${offer.get}:${gain}`, label: tx("wiki.cited-events.trade") },
      { id: "c:trade-resources:4", label: tx("wiki.cited-events.ignore") },
    ],
  };
}

function tradeResourcesNebulaEvent(g: Game, title: string): GameEvent {
  const offer = TRADE_RESOURCE_OFFERS[between(g, [0, 3])]!;
  const cost = between(g, offer.cost);
  const gain = between(g, offer.gain);
  const sentence = tx("wiki.cited-events.you-lose-and-receive", { cost: cost, v: RES_WORD[offer.pay], gain: gain, v2: RES_WORD[offer.get] });
  return {
    title,
    body: `${TRADE_RESOURCES_NEBULA_INTRO} ${sentence}`,
    choices: [
      { id: `c:trade-resources-in-nebula:take:${offer.pay}:${cost}:${offer.get}:${gain}`, label: tx("wiki.cited-events.trade") },
      { id: "c:trade-resources-in-nebula:4", label: tx("wiki.cited-events.ignore") },
    ],
  };
}

/** True when this id is one of the wired choices, including a price the ship cannot pay. */
export function citedOwns(id: string): boolean {
  return (
    findChoice(id) != null ||
    tradeTake(id) != null ||
    id.startsWith("c:slug-moons-question:") ||
    id.startsWith("c:zoltan-odd-moon:") ||
    missingOwns(id)
  );
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
  return tx("wiki.cited-events.you-lose-and-receive-scrap", { cost: offer.cost, word: word, scrap: offer.scrap });
}

// Lanius trader. The page prints three intros and no odds. INFERRED: equal.
const LANIUS_TRADER_INTROS = [
  tx("wiki.cited-events.aided-by-a-modified-translator-a"),
  tx("wiki.cited-events.a-small-lanius-craft-approaches-you"),
  tx("wiki.cited-events.you-arrive-to-find-a-large"),
];

export function laniusTraderTakeId(offer: LaniusTraderOffer): string {
  return tx("wiki.cited-events.q-lanius-trader-take", { res: offer.res, cost: offer.cost, scrap: offer.scrap });
}

// Pirate fight. The page prints five intros and then a default Pirate ship fight, and it prints no odds.
// INFERRED: the five intros are equally likely.
const PIRATE_FIGHT_INTROS = [
  tx("wiki.cited-events.as-you-jump-into-the-system"),
  tx("wiki.cited-events.soon-after-arriving-in-the-system"),
  tx("wiki.cited-events.at-first-it-appears-you-ve"),
  tx("wiki.cited-events.the-only-other-ship-at-this"),
  tx("wiki.cited-events.you-barely-have-time-to-register"),
];

// Free scrap with resources. The page prints six intros and no odds.
// INFERRED: equal. The gift stays c:free-scrap-with-resources:0.
const FREE_SCRAP_WITH_RESOURCES_INTROS = [
  tx("wiki.cited-events.you-arrive-in-a-system-and"),
  tx("wiki.cited-events.not-much-remains-in-this-abandoned"),
  tx("wiki.cited-events.as-you-arrive-in-the-system"),
  tx("wiki.cited-events.debris-from-a-forgotten-battle-still"),
  tx("wiki.cited-events.you-receive-a-message-from-a"),
  tx("wiki.cited-events.you-happen-upon-the-remains-of"),
];

// Slug fight in plasma storm. The page prints four intros and no odds.
// INFERRED: equal. The fight stays c:slug-fight-in-plasma-storm:0.
// Pirate ship distress trap. The page prints four intros and no odds.
// INFERRED: equal. The fight stays c:pirate-ship-distress-trap:0.
const PIRATE_DISTRESS_TRAP_INTROS = [
  tx("wiki.cited-events.you-arrive-at-the-beacon-and"),
  tx("wiki.cited-events.haha-i-knew-someone-would-fall"),
  tx("wiki.cited-events.your-cockpit-lights-up-with-warning"),
  tx("wiki.cited-events.as-soon-as-you-arrive-at"),
];

const SLUG_PLASMA_INTROS = [
  tx("wiki.cited-events.the-ion-storm-here-threatens-to"),
  tx("wiki.cited-events.the-slug-ship-that-descends-into"),
  tx("wiki.cited-events.you-arrive-in-the-middle-of-2"),
  tx("wiki.cited-events.you-find-yourself-stuck-in-the"),
];

// Free weapon. The page prints six intros and no odds.
// INFERRED: equal. The gift stays c:free-weapon:0.
const FREE_WEAPON_INTROS = [
  tx("wiki.cited-events.holy-crap-a-weapon-is-just"),
  tx("wiki.cited-events.you-inform-a-nearby-station-of"),
  tx("wiki.cited-events.a-settlement-still-loyal-to-the"),
  tx("wiki.cited-events.as-soon-as-you-arrive-a"),
  tx("wiki.cited-events.a-small-merchant-ship-messages-you"),
  tx("wiki.cited-events.debris-from-a-battle-is-scattered"),
];

// Rebel checkpoint. Four intros and four hide labels, no odds. INFERRED: equal.
const REBEL_CHECKPOINT_INTROS = [
  tx("wiki.cited-events.a-rather-large-fleet-of-civilian"),
  tx("wiki.cited-events.another-rebel-checkpoint-is-monitoring-this"),
  tx("wiki.cited-events.a-rebel-space-station-and-single"),
  tx("wiki.cited-events.it-looks-like-this-beacon-is"),
];
// Pirate fight near pulsar. Three printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-near-pulsar:0.
const PIRATE_PULSAR_INTROS = [
  tx("wiki.cited-events.sensors-go-wild-as-a-nearby"),
  tx("wiki.cited-events.you-arrive-to-find-a-pulsar"),
  tx("wiki.cited-events.a-small-research-station-orbits-a"),
];

// Rock fight. Eight printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight:0.
const ROCK_FIGHT_INTROS = [
  tx("wiki.cited-events.you-encounter-a-rock-vessel-and"),
  tx("wiki.cited-events.you-jump-into-the-middle-of"),
  tx("wiki.cited-events.you-intercept-chatter-from-an-approaching"),
  tx("wiki.cited-events.as-you-jump-in-a-vast"),
  tx("wiki.cited-events.it-looks-quiet-but-you-realize"),
  tx("wiki.cited-events.you-notice-a-rock-ship-performing"),
  tx("wiki.cited-events.a-loud-thud-resounds-through-the"),
  tx("wiki.cited-events.you-re-intercepted-by-a-rock"),
];

// Rebel fight (Lanius). Six printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-lanius:0.
const LANIUS_REBEL_INTROS = [
  tx("wiki.cited-events.you-intercept-discussions-between-a-rebel"),
  tx("wiki.cited-events.you-arrive-to-see-a-number"),
  tx("wiki.cited-events.a-rebel-scout-patrols-near-the"),
  tx("wiki.cited-events.you-arrive-at-the-beacon-and-2"),
  tx("wiki.cited-events.a-rebel-messages-you-who-would"),
  tx("wiki.cited-events.your-arrival-coincides-almost-exactly-with"),
];

// Rock fight with boarders. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight-with-boarders:0.
const ROCK_BOARDER_INTROS = [
  tx("wiki.cited-events.you-passively-scan-a-small-rock"),
  tx("wiki.cited-events.you-find-a-rock-ship-docked"),
];

// Auto-ship fight. Nine printed intros, no odds. INFERRED: equal. The fight stays c:auto-ship-fight:0.
// Auto-ship warning prints the same nine lines. That fight stays c:auto-ship-warning:0.
const AUTO_SHIP_FIGHT_INTROS = [
  tx("wiki.cited-events.you-discover-one-of-the-rebel"),
  tx("wiki.cited-events.your-ship-is-hailed-this-is"),
  tx("wiki.cited-events.a-rebel-autonomous-scout-is-exploring"),
  tx("wiki.cited-events.the-ai-of-a-nearby-small"),
  tx("wiki.cited-events.a-rebel-ship-moves-in-to"),
  tx("wiki.cited-events.this-must-be-one-of-the"),
  tx("wiki.cited-events.another-unmanned-ship-patrols-this-area"),
  tx("wiki.cited-events.this-beacon-is-being-patrolled-by"),
  tx("wiki.cited-events.a-small-shuttle-appears-on-the"),
];

// Rebel fight with boarders. Four printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-with-boarders:0.
const REBEL_BOARDER_INTROS = [
  tx("wiki.cited-events.you-receive-a-message-from-a-2"),
  tx("wiki.cited-events.your-sensors-warn-of-an-incoming"),
  tx("wiki.cited-events.incoming-message-hello-captain-says-a"),
  tx("wiki.cited-events.you-receive-a-message-on-a"),
];

// Boarders: Mantis. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-mantis:0.
const MANTIS_BOARDER_INTROS = [
  tx("wiki.cited-events.a-derelict-and-still-smoking-mantis"),
  tx("wiki.cited-events.your-world-all-of-a-sudden"),
  tx("wiki.cited-events.you-hear-a-grating-rattle-and"),
];

// Boarders: Humans in nebula. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-humans-in-nebula:0.
const NEBULA_HUMAN_BOARDER_INTROS = [
  tx("wiki.cited-events.you-see-a-small-station-nearby"),
  tx("wiki.cited-events.you-arrive-in-the-nebula-and"),
  tx("wiki.cited-events.you-see-a-number-of-derelict"),
];

// Boarders: Crystal. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-crystal:0.
const CRYSTAL_BOARDER_INTROS = [
  tx("wiki.cited-events.you-detect-a-heavily-armed-crystalline"),
  tx("wiki.cited-events.you-arrive-near-a-small-settlement"),
  tx("wiki.cited-events.you-pick-up-chatter-from-a"),
];

// Boarders: Rockmen near sun. The page prints two intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-rockmen-near-sun:0.
const ROCK_SUN_BOARDER_INTROS = [
  tx("wiki.cited-events.as-soon-as-you-arrive-you"),
  tx("wiki.cited-events.with-their-high-resistance-to-heat"),
];

// Boarders: Humans (Pirate). The page prints five intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-humans-pirate:0.
const PIRATE_HUMAN_BOARDER_INTROS = [
  tx("wiki.cited-events.what-appears-to-be-a-civilian"),
  tx("wiki.cited-events.a-heavily-damaged-ship-is-drifting"),
  tx("wiki.cited-events.you-detect-life-signs-actually-on"),
  tx("wiki.cited-events.your-ship-detects-a-faint-distress"),
  tx("wiki.cited-events.as-you-arrive-you-become-aware"),
];

// Rock fight with boarders in asteroid field. Two printed intros, no odds. INFERRED: equal.
// The fight stays c:rock-fight-with-boarders-in-asteroid-field:0, which already beams 1-2 Rock boarders inside an asteroid field.
const ROCK_BOARDER_ASTEROID_INTROS = [
  tx("wiki.cited-events.you-arrive-in-an-asteroid-field"),
  tx("wiki.cited-events.your-shields-are-being-taxed-as"),
];

// Lanius fight. Eleven printed intros, one repeated, no odds. INFERRED: equal, so the repeated line is twice as likely.
// The fight stays c:lanius-fight:0. Default Lanius rewards are not a separate payout.
const LANIUS_FIGHT_INTROS = [
  tx("wiki.cited-events.you-receive-a-message-on-a-2"),
  tx("wiki.cited-events.sensors-indicate-a-small-lanius-cruiser"),
  tx("wiki.cited-events.shortly-after-your-arrival-a-lanius"),
  tx("wiki.cited-events.a-military-lanius-vessel-stops-repurposing"),
  tx("wiki.cited-events.the-beacon-is-surrounded-by-many"),
  tx("wiki.cited-events.you-arrive-to-see-a-well"),
  tx("wiki.cited-events.as-you-arrive-in-the-system-2"),
  tx("wiki.cited-events.as-you-are-getting-your-bearings"),
  tx("wiki.cited-events.at-first-everything-seems-quiet-then"),
  tx("wiki.cited-events.you-have-stumbled-across-a-mining"),
  tx("wiki.cited-events.as-you-are-getting-your-bearings"),
];

// Mantis fight (Engi). Four printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight-engi:0. Default Mantis rewards are not a separate payout.
const MANTIS_FIGHT_ENGI_INTROS = [
  tx("wiki.cited-events.a-mixed-radar-signal-turns-out"),
  tx("wiki.cited-events.you-come-across-a-mantis-raider"),
  tx("wiki.cited-events.the-area-looks-clear-and-you"),
  tx("wiki.cited-events.you-find-a-mantis-ship-harrying"),
];

// Mantis fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight-in-nebula:0. Default Mantis rewards are not a separate payout.
// The storm words are the printed lines. They do not arm an ion storm.
const MANTIS_NEBULA_INTROS = [
  tx("wiki.cited-events.nebulas-are-known-to-be-popular"),
  tx("wiki.cited-events.you-detect-a-mantis-expedition-vessel"),
  tx("wiki.cited-events.a-mantis-ship-lost-in-the"),
  tx("wiki.cited-events.a-mantis-ship-hails-you-through"),
  tx("wiki.cited-events.you-notice-a-mantis-attack-ship"),
];

// Mantis fight. Twenty printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight:0. Default Mantis rewards are not a separate payout.
const MANTIS_FIGHT_INTROS = [
  tx("wiki.cited-events.a-mantis-military-ship-appears-on"),
  tx("wiki.cited-events.a-mantis-military-scout-hails-your"),
  tx("wiki.cited-events.a-small-mantis-cruiser-is-broadcasting"),
  tx("wiki.cited-events.you-detect-a-small-military-outpost"),
  tx("wiki.cited-events.you-discover-yet-another-unlicensed-and"),
  tx("wiki.cited-events.a-mantis-military-scout-seems-to"),
  tx("wiki.cited-events.a-small-military-craft-hails-you"),
  tx("wiki.cited-events.a-nearby-mantis-ship-begins-aggressive"),
  tx("wiki.cited-events.a-stream-of-clicks-and-gurgling"),
  tx("wiki.cited-events.the-mantis-ship-is-pleased-to"),
  tx("wiki.cited-events.you-recognize-the-outline-of-a"),
  tx("wiki.cited-events.something-red-looms-it-s-the"),
  tx("wiki.cited-events.a-mantis-vessel-hails-you-this"),
  tx("wiki.cited-events.you-notice-a-flurry-of-laser"),
  tx("wiki.cited-events.the-mantis-hail-you-their-captain"),
  tx("wiki.cited-events.a-mantis-female-comes-on-the"),
  tx("wiki.cited-events.a-mantis-ship-with-the-markings"),
  tx("wiki.cited-events.a-mantis-ship-hails-ah-fine"),
  tx("wiki.cited-events.children-on-earth-are-told-terrible"),
  tx("wiki.cited-events.a-youthful-looking-mantis-captain-hails"),
];

// Mantis fight choice. Six printed intros, no odds. INFERRED: equal.
// Attack stays c:mantis-fight-choice:0. Conceal and cloaking are quests.ts.
const MANTIS_CHOICE_INTROS = [
  tx("wiki.cited-events.you-re-greeted-by-a-rare"),
  tx("wiki.cited-events.for-once-you-see-the-mantis"),
  tx("wiki.cited-events.when-they-see-the-mantis-warship"),
  tx("wiki.cited-events.you-overhear-mantis-comm-chatter-negative"),
  tx("wiki.cited-events.you-overhear-mantis-comm-chatter-the"),
  tx("wiki.cited-events.you-overhear-mantis-comm-chatter-agreed"),
];

// Mantis ship attacking civilian. Five printed intros, no odds. INFERRED: equal.
// Aid stays c:mantis-ship-attacking-civilian:0. Stay out stays :1. The three stay-out sentences are quests.ts.
const MANTIS_CIVILIAN_INTROS = [
  tx("wiki.cited-events.you-spot-a-mantis-ship-hunting"),
  tx("wiki.cited-events.a-mantis-ship-engaging-a-civilian"),
  tx("wiki.cited-events.local-sensors-pick-up-two-ships"),
  tx("wiki.cited-events.a-mantis-vessel-flashes-past-your"),
  tx("wiki.cited-events.you-pick-up-a-distress-call"),
];

// Pirate ship attacking civilian. Six printed intros, no odds. INFERRED: equal.
// Aid stays c:pirate-ship-attacking-civilian:0. Stay out stays :1. The stay-out sentence is quests.ts.
const PIRATE_CIVILIAN_INTROS = [
  tx("wiki.cited-events.you-arrive-in-the-system-to"),
  tx("wiki.cited-events.scanners-indicate-that-a-battle-is"),
  tx("wiki.cited-events.you-detect-two-ships-one-chasing"),
  tx("wiki.cited-events.there-are-only-two-ships-within"),
  tx("wiki.cited-events.you-arrive-at-the-next-beacon"),
  tx("wiki.cited-events.you-come-out-of-the-jump"),
];

// Pirate ship attacking civilian (Lanius). Three printed intros, no odds. INFERRED: equal.
// Attack stays c:pirate-ship-attacking-civilian-lanius:0. Avoid stays :1.
const LANIUS_PIRATE_CIVILIAN_INTROS = [
  tx("wiki.cited-events.you-discover-an-abandoned-mining-facility"),
  tx("wiki.cited-events.a-pirate-ship-emerges-from-hiding"),
  tx("wiki.cited-events.a-pirate-ship-is-firing-on"),
];

// Pirate fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:pirate-fight-in-nebula:0. Default rewards. No nebula environment is added.
const NEBULA_PIRATE_INTROS = [
  tx("wiki.cited-events.as-you-drift-through-the-nebula"),
  tx("wiki.cited-events.a-pirate-ship-pulls-out-of"),
  tx("wiki.cited-events.as-you-coast-through-the-nebula"),
  tx("wiki.cited-events.a-hostile-vessel-descends-from-out"),
  tx("wiki.cited-events.you-try-to-read-the-id"),
];

// Rebel fight in nebula. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-in-nebula:0. Default rewards. No nebula environment is added.
const NEBULA_REBEL_INTROS = [
  tx("wiki.cited-events.you-cross-paths-with-an-advance"),
  tx("wiki.cited-events.a-ship-bearing-rebel-colors-can"),
  tx("wiki.cited-events.the-rebels-must-have-anticipated-you"),
  tx("wiki.cited-events.it-looks-like-you-will-be"),
  tx("wiki.cited-events.shortly-after-you-arrive-a-rebel"),
  tx("wiki.cited-events.newton-knows-what-brings-this-rebel"),
  tx("wiki.cited-events.a-rebel-ship-hails-but-you"),
];

// Auto-ship fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:auto-ship-fight-in-nebula:0. The destroyed reward is quests.ts. No nebula environment is added.
const NEBULA_AUTO_INTROS = [
  tx("wiki.cited-events.you-cross-paths-with-an-advance"),
  tx("wiki.cited-events.you-jump-into-a-calmer-part"),
  tx("wiki.cited-events.the-tangled-wrecks-of-many-ships"),
  tx("wiki.cited-events.this-drone-isn-t-looking-for"),
  tx("wiki.cited-events.it-s-worrying-that-the-rebels"),
];

// Zoltan fight. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:zoltan-fight:0. Default rewards. No extra payout is added here.
const ZOLTAN_FIGHT_INTROS = [
  tx("wiki.cited-events.a-zoltan-ship-makes-contact-the"),
  tx("wiki.cited-events.you-re-surprised-when-a-stationary"),
  tx("wiki.cited-events.you-receive-a-message-this-area"),
  tx("wiki.cited-events.you-discover-a-number-of-zoltan"),
  tx("wiki.cited-events.like-many-areas-in-zoltan-space"),
  tx("wiki.cited-events.a-zoltan-ship-is-waiting-at"),
  tx("wiki.cited-events.the-zoltan-ship-patrolling-this-area"),
];

// Crystal fight. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:crystal-fight:0. The unique surrender is surrender.ts.
const CRYSTAL_FIGHT_INTROS = [
  tx("wiki.cited-events.you-arrive-near-a-fleet-of"),
  tx("wiki.cited-events.you-arrive-at-the-beacon-and-3"),
  tx("wiki.cited-events.you-receive-a-message-hah-it"),
  tx("wiki.cited-events.a-crystalline-ship-messages-you-i"),
  tx("wiki.cited-events.you-arrive-in-a-busy-sector"),
  tx("wiki.cited-events.you-jump-next-to-a-node"),
  tx("wiki.cited-events.a-barrage-of-rasps-and-clicks"),
];

// Rebel fight among Rebel fleet. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-among-rebel-fleet:0. The low scrap and medium scrap payouts are not added here.
const REBEL_FLEET_INTROS = [
  tx("wiki.cited-events.although-you-were-expecting-the-rebels"),
  tx("wiki.cited-events.this-system-is-flooded-with-rebel"),
  tx("wiki.cited-events.you-arrive-to-find-a-rebel"),
  tx("wiki.cited-events.as-soon-as-you-arrive-you-2"),
  tx("wiki.cited-events.shots-fly-by-and-your-computer"),
  tx("wiki.cited-events.what-was-once-a-great-series"),
  tx("wiki.cited-events.the-federation-seems-to-have-put"),
];

// Rebel fight among Federation and Rebel fleets. Six printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-among-federation-and-rebel-fleets:0. Escape and the scrap payouts stay elsewhere.
const FEDERATION_FLEET_INTROS = [
  tx("wiki.cited-events.you-arrive-in-the-middle-of-3"),
  tx("wiki.cited-events.two-fleets-fight-nearby-you-try"),
  tx("wiki.cited-events.it-s-hard-to-tell-who"),
  tx("wiki.cited-events.the-sheer-scale-of-the-destruction"),
  tx("wiki.cited-events.the-destruction-in-the-distance-is"),
  tx("wiki.cited-events.you-don-t-have-any-time"),
];

// Lanius ship attacking civilian. Three printed intros, no odds. INFERRED: equal.
// Attack stays c:lanius-ship-attacking-civilian:0. Avoid stays the nothing choice.
const LANIUS_CIVILIAN_INTROS = [
  tx("wiki.cited-events.you-immediately-receive-a-message-upon"),
  tx("wiki.cited-events.you-scan-the-area-after-arriving"),
  tx("wiki.cited-events.you-arrive-at-the-location-of"),
];

// Lanius ship salvager. Five printed intros, no odds. INFERRED: equal.
// Attack stays c:lanius-ship-salvager:0. Leave stays :1. The Lanius scrap request stays :2.
const LANIUS_SALVAGER_INTROS = [
  tx("wiki.cited-events.you-come-across-a-single-lanius"),
  tx("wiki.cited-events.there-are-remnants-of-a-fierce"),
  tx("wiki.cited-events.when-you-arrive-at-the-beacon"),
  tx("wiki.cited-events.a-small-asteroid-belt-is-near"),
  tx("wiki.cited-events.a-lanius-ship-is-slowly-salvaging"),
];

// The mercenary. Six printed intros, no odds. INFERRED: equal.
// Delay stays c:the-mercenary:0. Fight stays :1. Decline stays :2.
const MERCENARY_INTROS = [
  tx("wiki.cited-events.you-find-a-mercenary-for-hire"),
  tx("wiki.cited-events.a-mercenary-hails-you-greetings-friend"),
  tx("wiki.cited-events.there-s-a-ship-with-pirate"),
  tx("wiki.cited-events.the-captain-of-this-ship-claims"),
  tx("wiki.cited-events.mercenaries-are-swarming-the-galaxy-now"),
  tx("wiki.cited-events.a-ship-hails-you-good-sir"),
];

// Rebel ship supplying civilians. Five printed intros, no odds. INFERRED: equal.
// Attack stays c:rebel-ship-supplying-civilians:0. Leave stays :1. Wait and steal stays :2.
const REBEL_SUPPLY_INTROS = [
  tx("wiki.cited-events.you-stumble-across-a-rebel-ship"),
  tx("wiki.cited-events.you-find-a-rebel-combat-ship"),
  tx("wiki.cited-events.the-rebels-in-this-system-are"),
  tx("wiki.cited-events.civilian-colonists-loyal-to-the-rebel"),
  tx("wiki.cited-events.because-of-the-war-thousands-of"),
];

// Rebel ship attacking Federation loyalists. Three printed intros, no odds. INFERRED: equal.
// Aid stays c:rebel-ship-attacking-federation-loyalists:0. Escape stays :1.
const REBEL_LOYALIST_INTROS = [
  tx("wiki.cited-events.upon-arriving-at-this-beacon-you"),
  tx("wiki.cited-events.you-immediately-notice-a-rebel-ship"),
  tx("wiki.cited-events.your-sensors-are-picking-up-a"),
];

// Pirate briber. Three printed intros, no odds. INFERRED: equal.
// Accept stays c:pirate-briber:0. Attack stays c:pirate-briber:1.
const PIRATE_BRIBER_INTROS = [
  tx("wiki.cited-events.you-come-across-a-pirate-in"),
  tx("wiki.cited-events.an-unidentified-ship-is-badly-damaged"),
  tx("wiki.cited-events.a-missile-shoots-across-your-bow"),
];

// Slug fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:slug-fight-in-nebula:0. No nebula environment is added. Surrender stays the Slug row.
const NEBULA_SLUG_INTROS = [
  tx("wiki.cited-events.your-sensors-are-no-match-for"),
  tx("wiki.cited-events.the-slug-vessel-you-encounter-here"),
  tx("wiki.cited-events.a-slug-passenger-ship-hails-please"),
  tx("wiki.cited-events.a-slug-ship-a-rogue-you"),
  tx("wiki.cited-events.direct-attacks-are-not-preferred-by"),
];

// Escort civilians. Three printed intros, no odds. INFERRED: equal.
// Accept stays the low fuel and the quest marker. Decline stays nothing.
const ESCORT_CIVILIAN_INTROS = [
  tx("wiki.cited-events.after-a-short-time-you-receive"),
  tx("wiki.cited-events.there-is-a-single-ship-at"),
  tx("wiki.cited-events.hello-your-communicator-opens-a-hail"),
];

// Trade fuel for drone parts. Three printed intros, no odds. INFERRED: equal.
// The trade stays lose 2-4 fuel for 1-3 drone parts. Reject stays nothing.
const FUEL_FOR_DRONES_INTROS = [
  tx("wiki.cited-events.a-nearby-space-station-hails-you"),
  tx("wiki.cited-events.a-strange-vessel-approaches-a-digital"),
  tx("wiki.cited-events.you-arrive-in-the-sector-and"),
];

// Rock pirates fight near sun. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight-near-sun:0.
const ROCK_PIRATE_SUN_INTROS = [
  tx("wiki.cited-events.unusual-solar-activity-in-this-region"),
  tx("wiki.cited-events.a-rock-ship-is-silhouetted-against"),
];

// Rock pirates fight in asteroid field. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight-in-asteroid-field:0.
const ROCK_PIRATE_ASTEROID_INTROS = [
  tx("wiki.cited-events.minute-fissures-in-the-shields-spark"),
  tx("wiki.cited-events.you-exit-the-jump-surrounded-by"),
];

// Rock fight in asteroid field. Three printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight-in-asteroid-field:0.
const ROCK_ASTEROID_INTROS = [
  tx("wiki.cited-events.a-rock-mining-vessel-is-harvesting"),
  tx("wiki.cited-events.a-rookie-rock-cargo-ship-has"),
  tx("wiki.cited-events.the-captain-of-a-rock-freighter"),
];

// Rebel fight (Slug). Three printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-slug:0.
const SLUG_REBEL_INTROS = [
  tx("wiki.cited-events.as-you-arrive-at-the-beacon"),
  tx("wiki.cited-events.you-jump-into-empty-space-and"),
  tx("wiki.cited-events.you-receive-a-message-from-a-3"),
];

// Pirate fight (Slug). Three printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-slug:0.
const SLUG_PIRATE_INTROS = [
  tx("wiki.cited-events.there-appears-to-be-a-pirate"),
  tx("wiki.cited-events.we-knew-anyone-foolish-enough-to"),
  tx("wiki.cited-events.before-you-can-take-a-moment"),
];

// Pirate fight (Lanius). Five printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-lanius:0.
const LANIUS_PIRATE_INTROS = [
  tx("wiki.cited-events.an-upgraded-pirate-ship-sits-among"),
  tx("wiki.cited-events.the-pirate-ship-patrolling-this-sector"),
  tx("wiki.cited-events.a-pirate-ship-appears-to-be"),
  tx("wiki.cited-events.debris-from-a-number-of-battleships"),
  tx("wiki.cited-events.the-pirate-sees-you-before-you"),
];

// Pirate fight (Zoltan). Five printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-zoltan:0.
const ZOLTAN_PIRATE_INTROS = [
  tx("wiki.cited-events.emergency-all-ships-in-range-we"),
  tx("wiki.cited-events.you-jump-just-in-time-to"),
  tx("wiki.cited-events.despite-their-precautions-pirates-have-begun"),
  tx("wiki.cited-events.a-ship-with-pirate-markings-demand"),
  tx("wiki.cited-events.you-spot-a-pirate-ship-looting"),
];

// Rock pirates fight. Three printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight:0.
const ROCK_PIRATE_INTROS = [
  tx("wiki.cited-events.as-a-naturally-warlike-species-with"),
  tx("wiki.cited-events.a-rock-ship-flies-past-your"),
  tx("wiki.cited-events.a-motley-collection-of-rock-ships"),
];

// Rebel fight near pulsar. Three printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-near-pulsar:0.
const REBEL_PULSAR_INTROS = [
  tx("wiki.cited-events.a-rebel-captain-appears-on-the"),
  tx("wiki.cited-events.a-small-rebel-research-station-overlooks"),
  tx("wiki.cited-events.you-arrive-at-an-infrequently-used"),
];

// Rebel fight. Ten printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight:0.
const REBEL_FIGHT_INTROS = [
  tx("wiki.cited-events.your-ship-is-hailed-we-ve"),
  tx("wiki.cited-events.a-small-rebel-ship-is-docked"),
  tx("wiki.cited-events.a-rebel-ship-has-been-patrolling"),
  tx("wiki.cited-events.a-rebel-ship-hails-you-federation"),
  tx("wiki.cited-events.you-receive-a-transmission-sorry-sir"),
  tx("wiki.cited-events.by-the-time-you-notice-the"),
  tx("wiki.cited-events.a-rebel-ship-hails-we-did"),
  tx("wiki.cited-events.a-rebel-ship-approaches-cautiously-personally"),
  tx("wiki.cited-events.you-re-hailed-by-a-rebel"),
  tx("wiki.cited-events.a-rebel-ship-is-guarding-this"),
];

// Rebel ship attacking civilians in Last Stand. Five printed intros, no odds. INFERRED: equal. Both choices stay.
const LAST_STAND_CIVILIAN_INTROS = [
  tx("wiki.cited-events.a-number-of-large-transports-are"),
  tx("wiki.cited-events.shots-fly-by-your-port-windows"),
  tx("wiki.cited-events.there-seems-to-be-a-small"),
  tx("wiki.cited-events.a-battle-rages-nearby-between-small"),
  tx("wiki.cited-events.a-civilian-ship-is-broadcasting-a"),
];

const REBEL_CHECKPOINT_HIDE = [
  tx("wiki.cited-events.fly-behind-a-moon-and-stay-2"),
  tx("wiki.cited-events.shut-down-all-non-vital-systems"),
  tx("wiki.cited-events.stay-quiet-and-hope-they-don"),
  tx("wiki.cited-events.stay-out-of-their-way-and"),
];

// Four printed tracks. The page gives no odds. INFERRED: each count is equally likely.
const SLUG_MOON_COUNTS = [5, 6, 7, 11] as const;

const SLUG_MOON_WORD: Record<(typeof SLUG_MOON_COUNTS)[number], string> = {
  5: "five",
  6: "six",
  7: "seven",
  11: "eleven",
};

const SLUG_MOON_QUESTION =
  tx("wiki.cited-events.as-you-drift-closer-you-are");

const SLUG_MOON_CORRECT =
  tx("wiki.cited-events.that-isss-correct-you-sssurprise-me");

const SLUG_MOON_WRONG =
  tx("wiki.cited-events.that-issss-incorrect-further-i-have");

const SLUG_MOON_ASK = /^c:slug-moons-question:ask:(5|6|7|11)$/;
const SLUG_MOON_ANSWER = /^c:slug-moons-question:answer:(5|6|7|11):(5|6|7|11)$/;

function slugMoonWord(n: number): string {
  return SLUG_MOON_WORD[n as (typeof SLUG_MOON_COUNTS)[number]] ?? "five";
}

/**
 * Slug moons question. The note: a regular beacon, and a nebula environment on arrival.
 * beacon.kind "nebula" is that environment (fleet step and the anti-ship battery).
 */
function slugMoonsCard(g: Game, b: Beacon, title: string): GameEvent {
  b.kind = "nebula";
  const n = SLUG_MOON_COUNTS[between(g, [0, SLUG_MOON_COUNTS.length - 1])]!;
  return {
    title,
    body: tx("wiki.cited-events.you-arrive-near-the-distress-beacon", { slugMoonWord: slugMoonWord(n) }),
    choices: [{ id: `c:slug-moons-question:ask:${n}`, label: tx("wiki.cited-events.investigate") }],
  };
}

function slugMoonsQuestion(ctx: CitedChoice, id: string): boolean | null {
  if (!id.startsWith("c:slug-moons-question:")) return null;
  const ask = SLUG_MOON_ASK.exec(id);
  if (ask) {
    const n = Number(ask[1]);
    const title = ctx.g.beacons.find((b) => b.id === ctx.g.here)?.name ?? tx("wiki.cited-events.slug-moons-question");
    ctx.g.event = {
      title,
      body: SLUG_MOON_QUESTION,
      choices: [5, 6, 7, 11].map((pick) => ({
        id: `c:slug-moons-question:answer:${n}:${pick}`,
        label: `${slugMoonWord(pick)[0]!.toUpperCase()}${slugMoonWord(pick).slice(1)}.`,
      })),
    };
    ctx.g.phase = "event";
    ctx.g.paused = true;
    return true;
  }
  const answer = SLUG_MOON_ANSWER.exec(id);
  if (!answer) return false;
  const correct = Number(answer[1]);
  const picked = Number(answer[2]);
  if (picked === correct) {
    // Crew: eight is the cap. A ninth is not added. This page does not print that refusal.
    const joined = joinCrew(ctx.g, tx("wiki.cited-events.slug"));
    const line = joined ? tx("wiki.cited-events.you-receive-a-slug-crewmember") : tx("wiki.cited-events.there-is-no-room-aboard-for");
    ctx.note(line);
    citedResult(ctx.g, SLUG_MOON_CORRECT, [line]);
    return true;
  }
  // "You lose 35 scrap, 2-4 fuel, and 1-2 drone parts." Inclusive ranges.
  // A shortfall returns before any spend, the same way a cited price does.
  const fuel = roll(ctx, 2, 4);
  const parts = roll(ctx, 1, 2);
  const g = ctx.g;
  if (g.scrap < 35 || g.fuel < fuel || g.player.parts < parts) return false;
  g.scrap -= 35;
  g.fuel -= fuel;
  g.player.parts -= parts;
  const paid = [tx("wiki.cited-events.scrap-35"), tx("wiki.cited-events.fuel-2", { fuel: fuel }), tx("wiki.cited-events.drone-parts-2", { parts: parts })];
  for (const line of paid) ctx.note(line);
  citedResult(g, SLUG_MOON_WRONG, paid);
  return true;
}

const ZOLTAN_MOON_OPEN = tx("wiki.cited-events.something-strikes-you-as-odd-about");
const ZOLTAN_MOON_CAVE =
  tx("wiki.cited-events.it-looks-as-if-a-team");
const ZOLTAN_MOON_SHUTTLE =
  tx("wiki.cited-events.sending-a-shuttle-to-explore-a");
const ZOLTAN_MOON_HEAP =
  tx("wiki.cited-events.a-deep-scan-of-the-surface");
const ZOLTAN_MOON_QUIET =
  tx("wiki.cited-events.a-closer-inspection-reveals-signs-of");
const ZOLTAN_MOON_LEAVE =
  tx("wiki.cited-events.you-try-not-to-fixate-on");
const ZOLTAN_MOON_BASE =
  tx("wiki.cited-events.your-explosives-reveal-the-cave-is");
const ZOLTAN_MOON_REMAINS =
  tx("wiki.cited-events.a-portion-of-the-surface-layer");
const ZOLTAN_MOON_WASTE = tx("wiki.cited-events.the-explosives-are-set-remotely-but");
const ZOLTAN_MOON_DRONE =
  tx("wiki.cited-events.initial-scans-indicate-a-network-of");

function zoltanMoonTitle(g: Game): string {
  return g.beacons.find((b) => b.id === g.here)?.name ?? tx("wiki.cited-events.zoltan-odd-moon");
}

function zoltanOddCard(title: string): GameEvent {
  return {
    title,
    body: ZOLTAN_MOON_OPEN,
    choices: [
      { id: "c:zoltan-odd-moon:look", label: tx("wiki.cited-events.check-it-out") },
      { id: "c:zoltan-odd-moon:leave", label: tx("wiki.cited-events.leave-it-be") },
      { id: "c:zoltan-odd-moon:drone", label: tx("wiki.cited-events.send-a-drone-to-probe-the") },
    ],
  };
}

/** Rewards, "Scrap only": a random amount is a low, medium, or high band. INFERRED: equally likely. */
function payRandomTier(ctx: CitedChoice): string {
  const tier = (["low", "medium", "high"] as const)[ctx.irand(3)]!;
  const [lo, hi] = band(ctx.g, tier);
  const n = roll(ctx, lo, hi);
  ctx.scrap(n);
  const name = tier === "low" ? tx("wiki.cited-events.low") : tier === "medium" ? tx("wiki.cited-events.medium") : tx("wiki.cited-events.high");
  const line = tx("wiki.cited-events.scrap", { name: name, n: n });
  ctx.note(line);
  return line;
}

function payTier(ctx: CitedChoice, tier: "low" | "medium"): string {
  const [lo, hi] = band(ctx.g, tier);
  const n = roll(ctx, lo, hi);
  ctx.scrap(n);
  const name = tier === "low" ? tx("wiki.cited-events.low") : tx("wiki.cited-events.medium");
  const line = tx("wiki.cited-events.scrap", { name: name, n: n });
  ctx.note(line);
  return line;
}

/**
 * Zoltan odd moon. Check it out has four results and the explosives have three, and the page prints no odds.
 * INFERRED: each of those results is equally likely.
 * Rewards, "Weapon": "A random weapon & T scrap." The page does not name either weapon, so it is a random one.
 * Rewards, "Scrap only": the remains' random scrap is a low, medium, or high band. The page prints no odds.
 * INFERRED: those three bands are equally likely. The base's "random amount" with its weapon uses the same draw.
 */
function zoltanOddMoon(ctx: CitedChoice, id: string): boolean | null {
  if (!id.startsWith("c:zoltan-odd-moon:")) return null;
  const g = ctx.g;
  if (id === "c:zoltan-odd-moon:look") {
    // Four results, no odds. INFERRED: equal.
    const which = ctx.irand(4);
    if (which === 0) {
      g.event = {
        title: zoltanMoonTitle(g),
        body: ZOLTAN_MOON_CAVE,
        choices: [
          { id: "c:zoltan-odd-moon:boom", label: "Attempt to detonate some explosives to break through the surface." },
          {
            id: "c:zoltan-odd-moon:spare",
            label: "Explosives are too valuable to waste on excavation work. Let's get out of here.",
          },
        ],
      };
      g.phase = "event";
      g.paused = true;
      return true;
    }
    if (which === 1) {
      const line = payTier(ctx, "low");
      const item = grantRandomItem(g, "weapon");
      ctx.note(item);
      citedResult(g, ZOLTAN_MOON_SHUTTLE, [tx("wiki.cited-events.you-receive-a-weapon-with-low"), line, item]);
      return true;
    }
    if (which === 2) {
      const line = payTier(ctx, "medium");
      citedResult(g, ZOLTAN_MOON_HEAP, [tx("wiki.cited-events.you-receive-medium-scrap"), line]);
      return true;
    }
    citedResult(g, ZOLTAN_MOON_QUIET, [tx("wiki.cited-events.nothing-happens")]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:leave") {
    citedResult(g, ZOLTAN_MOON_LEAVE, [tx("wiki.cited-events.nothing-happens")]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:spare") {
    citedResult(g, tx("wiki.cited-events.nothing-happens"), [tx("wiki.cited-events.nothing-happens")]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:boom") {
    if (g.missiles < 1) return false;
    g.missiles -= 1;
    ctx.note(tx("wiki.cited-events.missiles-1"));
    // Three results, no odds. INFERRED: equal.
    const which = ctx.irand(3);
    if (which === 0) {
      // "You receive a weapon with a random amount of scrap."
      const line = payRandomTier(ctx);
      const item = grantRandomItem(g, "weapon");
      ctx.note(item);
      citedResult(g, ZOLTAN_MOON_BASE, [tx("wiki.cited-events.you-receive-a-weapon-with-a"), line, item, tx("wiki.cited-events.missiles-1")]);
      return true;
    }
    if (which === 1) {
      const line = payRandomTier(ctx);
      citedResult(g, ZOLTAN_MOON_REMAINS, [tx("wiki.cited-events.you-receive-a-random-amount-of"), line, tx("wiki.cited-events.missiles-1")]);
      return true;
    }
    citedResult(g, ZOLTAN_MOON_WASTE, [tx("wiki.cited-events.nothing-happens"), tx("wiki.cited-events.missiles-1")]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:drone") {
    if (!ownsBoardDrone(g) || g.player.parts < 1) return false;
    g.player.parts -= 1;
    ctx.note(tx("wiki.cited-events.drone-parts-1"));
    // Crew: eight is the cap. A ninth is not added. This page does not print that refusal.
    const joined = joinCrew(g, tx("wiki.cited-events.zoltan"));
    const line = joined ? tx("wiki.cited-events.you-receive-a-zoltan-crewmember") : tx("wiki.cited-events.there-is-no-room-aboard-for");
    ctx.note(line);
    citedResult(g, ZOLTAN_MOON_DRONE, [line, tx("wiki.cited-events.drone-parts-1")]);
    return true;
  }
  return false;
}

export function citedEvent(g: Game, b: Beacon): GameEvent | null {
  const ev = matchEvent(b);
  if (!ev) return null;
  const missing = missingCard(g, b, ev);
  if (missing) return missing;
  if (ev.slug === "slug-moons-question") return slugMoonsCard(g, b, ev.dest);
  if (ev.slug === "zoltan-odd-moon") return zoltanOddCard(ev.dest);
  if (ev.slug === "lanius-trader") {
    const offer = rollLaniusTrader(g, false);
    // The offer is rolled first so the shown trade stays on the same draws. The intro uses the next draw.
    const intro = LANIUS_TRADER_INTROS[between(g, [0, 2])]!;
    return {
      title: ev.dest,
      body: `${intro}\n\n${laniusTraderOfferText(offer)}`,
      choices: [
        { id: laniusTraderTakeId(offer), label: tx("wiki.cited-events.agree-to-the-exchange") },
        { id: "c:lanius-trader:3", label: tx("wiki.cited-events.decline") },
        { id: "c:lanius-trader:4", label: tx("wiki.cited-events.ask-for-an-alternative-trade") },
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
        { id: "c:auto-ship-near-radar-station:2", label: tx("wiki.cited-events.send-a-drone-to-distract-the") },
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
        { id: "c:auto-ship-near-storage-station-in-nebula:2", label: tx("wiki.cited-events.attempt-to-stealthily-access-the-space") },
        { id: "c:auto-ship-near-storage-station-in-nebula:3", label: tx("wiki.cited-events.use-your-stealth-to-access-the") },
        { id: "c:auto-ship-near-storage-station-in-nebula:4", label: tx("wiki.cited-events.try-to-hack-the-station-to") },
        { id: "c:auto-ship-near-storage-station-in-nebula:5", label: tx("wiki.cited-events.hack-the-station-to-prevent-an") },
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
        { id: "c:pirate-ship-attacking-civilian-distress:2", label: tx("wiki.cited-events.fire-a-warning-shot-from-your") },
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
        { id: "c:zoltan-security-checkpoint:1", label: tx("wiki.cited-events.submit-to-profiling") },
        { id: "c:zoltan-security-checkpoint:2", label: tx("wiki.cited-events.have-your-slug-talk-them-into") },
        { id: "c:zoltan-security-checkpoint:3", label: tx("wiki.cited-events.make-the-guards-believe-they-have") },
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
        { id: "c:escort-civilians-ftl-haywire:2", label: tx("wiki.cited-events.have-your-navigation-software-calculate-and") },
      ],
    };
  }
  // Slug drink. Drink, and a Rock crewmember poses as captain. Refuse stays the fight.
  if (ev.slug === "slug-drink") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "c:slug-drink:1", label: tx("wiki.cited-events.drink") },
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:slug-drink:2", label: tx("wiki.cited-events.have-your-rockman-pose-as-captain") },
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
        { id: "c:rock-ship-in-plasma-storm:2", label: tx("wiki.cited-events.offer-to-lead-them-out-of") },
      ],
    };
  }
  // Deactivated Auto-ship. Download, and Sensors level 3. The strip choice is already on the card.
  if (ev.slug === "deactivated-auto-ship") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "c:deactivated-auto-ship:1", label: tx("wiki.cited-events.attempt-to-download-the-ship-s") },
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:deactivated-auto-ship:2", label: tx("wiki.cited-events.remotely-scan-the-ship") },
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
        { id: "c:auto-ship-fight-in-plasma-storm:1", label: tx("wiki.cited-events.attempt-to-out-run-it") },
        { id: "c:auto-ship-fight-in-plasma-storm:2", label: tx("wiki.cited-events.attempt-to-out-run-it") },
        { id: "c:auto-ship-fight-in-plasma-storm:3", label: tx("wiki.cited-events.use-your-cloaking-to-escape") },
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
        { id: "c:auto-ship-near-storage-station:2", label: tx("wiki.cited-events.attempt-to-cloak-and-access-the") },
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
        { id: "c:auto-ship-near-sensor-station:2", label: tx("wiki.cited-events.use-your-sensors-to-attempt-to") },
        { id: "c:auto-ship-near-sensor-station:3", label: tx("wiki.cited-events.beam-directly-onto-the-station-to") },
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
      body: tx("wiki.cited-events.a-pirate-ship-arrives-shortly-after"),
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:pirate-smuggler:2", label: tx("wiki.cited-events.activate-your-advanced-weapons-threateningly") },
      ],
    };
  }
  // Pirate fight has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "pirate-fight") {
    return {
      title: ev.dest,
      body: PIRATE_FIGHT_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:pirate-fight:0", label: tx("wiki.cited-events.fight-a-pirate-ship") }],
    };
  }
  // Pirate fight in nebula has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." nebula=true. unique=false. No nebula environment is added.
  if (ev.slug === "pirate-fight-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_PIRATE_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel fight in nebula has no choice. Arrival calls this fight.
  // One of the seven printed intros. "Fight a Rebel ship (default rewards)." nebula=true. unique=false. No nebula environment is added.
  if (ev.slug === "rebel-fight-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_REBEL_INTROS[between(g, [0, 6])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Auto-ship fight in nebula has no choice. Arrival calls c:auto-ship-fight-in-nebula:0.
  // One of the five printed intros. "Fight an Auto-ship." nebula=true. unique=false.
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
      body: tx("wiki.cited-events.you-encounter-a-small-craft-with"),
      choices: [
        { id: "c:rock-atheists:0", label: tx("wiki.cited-events.tell-them-their-god-sent-them-2") },
        { id: "c:rock-atheists:1", label: tx("wiki.cited-events.promise-to-share-with-them-the") },
        { id: "c:rock-atheists:2", label: tx("wiki.cited-events.show-them-to-your-data-suite") },
      ],
    };
  }
  // Pirate ship selling drones. Hail, then dock. The unnamed schematic is not a button.
  if (ev.slug === "pirate-ship-selling-drones") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "q:pirate-drones:hail", label: tx("wiki.cited-events.hail-the-ship") },
        { id: "c:pirate-ship-selling-drones:1", label: tx("wiki.cited-events.attack-him-before-he-can-attack") },
        { id: "c:pirate-ship-selling-drones:2", label: tx("wiki.cited-events.quickly-prepare-to-jump-away-2") },
      ],
    };
  }
  // Rebel fight (Lanius) has no choice. Arrival calls this fight.
  // One of the six printed intros. "Fight a Rebel ship (default rewards)." unique=false.
  if (ev.slug === "rebel-fight-lanius") {
    return {
      title: ev.dest,
      body: LANIUS_REBEL_INTROS[between(g, [0, 5])]!,
      choices: [{ id: "c:rebel-fight-lanius:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Rock fight with boarders. One of the two printed intros. The fight stays c:rock-fight-with-boarders:0.
  if (ev.slug === "rock-fight-with-boarders") {
    return {
      title: ev.dest,
      body: ROCK_BOARDER_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-fight-with-boarders:0", label: tx("wiki.cited-events.fight-a-rock-ship") }],
    };
  }
  // Auto-ship fight has no choice. Arrival calls c:auto-ship-fight:0.
  // One of the nine printed intros. "Fight an Auto-ship." unique=false.
  if (ev.slug === "auto-ship-fight") {
    return {
      title: ev.dest,
      body: AUTO_SHIP_FIGHT_INTROS[between(g, [0, 8])]!,
      choices: [{ id: "c:auto-ship-fight:0", label: tx("wiki.cited-events.fight-an-auto-ship") }],
    };
  }
  // Auto-ship warning has no choice. Arrival calls c:auto-ship-warning:0.
  // The page shares those nine intros. "Fight an Auto-ship that is running away."
  // The red line is the escape: Rebel Fleet pursuit is doubled. unique=true.
  if (ev.slug === "auto-ship-warning") {
    return {
      title: ev.dest,
      body: AUTO_SHIP_FIGHT_INTROS[between(g, [0, 8])]!,
      choices: [{ id: "c:auto-ship-warning:0", label: tx("wiki.cited-events.fight-an-auto-ship-that-is") }],
    };
  }
  // Rebel fight with boarders. One of the four printed intros. The fight stays c:rebel-fight-with-boarders:0.
  if (ev.slug === "rebel-fight-with-boarders") {
    return {
      title: ev.dest,
      body: REBEL_BOARDER_INTROS[between(g, [0, 3])]!,
      choices: [{ id: "c:rebel-fight-with-boarders:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Rock fight with boarders in asteroid field. One of the two printed intros. The fight stays c:rock-fight-with-boarders-in-asteroid-field:0.
  if (ev.slug === "rock-fight-with-boarders-in-asteroid-field") {
    return {
      title: ev.dest,
      body: ROCK_BOARDER_ASTEROID_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-fight-with-boarders-in-asteroid-field:0", label: tx("wiki.cited-events.fight-a-rock-ship") }],
    };
  }
  // Lanius fight has no choice. Arrival calls this fight.
  // One of the eleven printed intros, including the repeated line. "Fight a Lanius ship (default Lanius rewards)." unique=false.
  if (ev.slug === "lanius-fight") {
    return {
      title: ev.dest,
      body: LANIUS_FIGHT_INTROS[between(g, [0, 10])]!,
      choices: [{ id: "c:lanius-fight:0", label: tx("wiki.cited-events.fight-a-lanius-ship") }],
    };
  }
  // Mantis fight (Engi) has no choice. Arrival calls this fight.
  // One of the four printed intros. "Fight a Mantis ship (default rewards)." unique=false.
  if (ev.slug === "mantis-fight-engi") {
    return {
      title: ev.dest,
      body: MANTIS_FIGHT_ENGI_INTROS[between(g, [0, 3])]!,
      choices: [{ id: "c:mantis-fight-engi:0", label: tx("wiki.cited-events.fight-a-mantis-ship") }],
    };
  }
  // Mantis fight in nebula has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Mantis ship (default rewards)." nebula=true. unique=false.
  if (ev.slug === "mantis-fight-in-nebula") {
    return {
      title: ev.dest,
      body: MANTIS_NEBULA_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:mantis-fight-in-nebula:0", label: tx("wiki.cited-events.fight-a-mantis-ship") }],
    };
  }
  // Mantis fight has no choice. Arrival calls this fight.
  // One of the twenty printed intros. "Fight a Mantis ship (default rewards)." unique=false.
  if (ev.slug === "mantis-fight") {
    return {
      title: ev.dest,
      body: MANTIS_FIGHT_INTROS[between(g, [0, 19])]!,
      choices: [{ id: "c:mantis-fight:0", label: tx("wiki.cited-events.fight-a-mantis-ship") }],
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
  // Zoltan fight has no choice. Arrival calls c:zoltan-fight:0.
  // One of the seven printed intros. "Fight a Zoltan ship (default rewards)." unique=false.
  if (ev.slug === "zoltan-fight") {
    return {
      title: ev.dest,
      body: ZOLTAN_FIGHT_INTROS[between(g, [0, 6])]!,
      choices: [{ id: "c:zoltan-fight:0", label: tx("wiki.cited-events.fight-a-zoltan-ship") }],
    };
  }
  // Crystal fight has no choice. Arrival calls c:crystal-fight:0.
  // One of the seven printed intros. "Fight a Crystal ship (default rewards)." unique=false.
  if (ev.slug === "crystal-fight") {
    return {
      title: ev.dest,
      body: CRYSTAL_FIGHT_INTROS[between(g, [0, 6])]!,
      choices: [{ id: "c:crystal-fight:0", label: tx("wiki.cited-events.fight-a-crystal-ship-default-rewards") }],
    };
  }
  // Rebel fight among Rebel fleet has no choice. Arrival calls this fight.
  // One of the seven printed intros. "Fight a Rebel ship." unique=false. The low scrap and medium scrap payouts stay the winning results.
  if (ev.slug === "rebel-fight-among-rebel-fleet") {
    return {
      title: ev.dest,
      body: REBEL_FLEET_INTROS[between(g, [0, 6])]!,
      choices: [{ id: "c:rebel-fight-among-rebel-fleet:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
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
  // Slug fight in nebula has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Slug ship (default rewards)." nebula=true. unique=false. No nebula environment is added. Surrender stays the Slug row.
  if (ev.slug === "slug-fight-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_SLUG_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:slug-fight-in-nebula:0", label: tx("wiki.cited-events.fight-a-slug-ship") }],
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
  // Rebel fight among Federation and Rebel fleets has no choice. Arrival calls this fight.
  // One of the six printed intros. "Fight a Rebel ship." unique=false. The low scrap and medium scrap payouts stay the winning results.
  if (ev.slug === "rebel-fight-among-federation-and-rebel-fleets") {
    return {
      title: ev.dest,
      body: FEDERATION_FLEET_INTROS[between(g, [0, 5])]!,
      choices: [{ id: "c:rebel-fight-among-federation-and-rebel-fleets:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
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
  // Rock pirates fight near sun has no choice. Arrival calls this fight.
  // One of the two printed intros. "Fight a Rock pirate ship (default rewards)." redgiant=true. unique=true.
  if (ev.slug === "rock-pirates-fight-near-sun") {
    return {
      title: ev.dest,
      body: ROCK_PIRATE_SUN_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-pirates-fight-near-sun:0", label: tx("wiki.cited-events.fight-a-rock-pirate-ship") }],
    };
  }
  // Rock pirates fight in asteroid field has no choice. Arrival calls this fight.
  // One of the two printed intros. "Fight a Rock pirate ship (default rewards)." asteroidfield=true. unique=true.
  if (ev.slug === "rock-pirates-fight-in-asteroid-field") {
    return {
      title: ev.dest,
      body: ROCK_PIRATE_ASTEROID_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-pirates-fight-in-asteroid-field:0", label: tx("wiki.cited-events.fight-a-rock-pirate-ship") }],
    };
  }
  // Rock fight in asteroid field has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rock ship (default rewards)." asteroidfield=true. unique=true.
  if (ev.slug === "rock-fight-in-asteroid-field") {
    return {
      title: ev.dest,
      body: ROCK_ASTEROID_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rock-fight-in-asteroid-field:0", label: tx("wiki.cited-events.fight-a-rock-ship") }],
    };
  }
  // Rebel fight (Slug) has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rebel ship (default rewards)." unique=false.
  if (ev.slug === "rebel-fight-slug") {
    return {
      title: ev.dest,
      body: SLUG_REBEL_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rebel-fight-slug:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Pirate fight (Slug) has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "pirate-fight-slug") {
    return {
      title: ev.dest,
      body: SLUG_PIRATE_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:pirate-fight-slug:0", label: tx("wiki.cited-events.fight-a-pirate-ship") }],
    };
  }
  // Pirate fight (Lanius) has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "pirate-fight-lanius") {
    return {
      title: ev.dest,
      body: LANIUS_PIRATE_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:pirate-fight-lanius:0", label: tx("wiki.cited-events.fight-a-pirate-ship") }],
    };
  }
  // Pirate fight (Zoltan) has no choice. Arrival calls c:pirate-fight-zoltan:0.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "pirate-fight-zoltan") {
    return {
      title: ev.dest,
      body: ZOLTAN_PIRATE_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:pirate-fight-zoltan:0", label: tx("wiki.cited-events.fight-a-pirate-ship") }],
    };
  }
  // Rock pirates fight has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rock pirate ship (default rewards)." unique=false.
  if (ev.slug === "rock-pirates-fight") {
    return {
      title: ev.dest,
      body: ROCK_PIRATE_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rock-pirates-fight:0", label: tx("wiki.cited-events.fight-a-rock-pirate-ship") }],
    };
  }
  // Rebel fight near pulsar has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rebel ship (default rewards)." pulsar=true. unique=true.
  if (ev.slug === "rebel-fight-near-pulsar") {
    return {
      title: ev.dest,
      body: REBEL_PULSAR_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rebel-fight-near-pulsar:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Rock fight has no choice. Arrival calls this fight.
  // One of the eight printed intros. "Fight a Rock ship (default rewards)." unique=false.
  if (ev.slug === "rock-fight") {
    return {
      title: ev.dest,
      body: ROCK_FIGHT_INTROS[between(g, [0, 7])]!,
      choices: [{ id: "c:rock-fight:0", label: tx("wiki.cited-events.fight-a-rock-ship") }],
    };
  }
  // Pirate fight near pulsar has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Pirate ship (default rewards)." pulsar=true. unique=true.
  if (ev.slug === "pirate-fight-near-pulsar") {
    return {
      title: ev.dest,
      body: PIRATE_PULSAR_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:pirate-fight-near-pulsar:0", label: tx("wiki.cited-events.fight-a-pirate-ship") }],
    };
  }
  // Rebel fight has no choice. Arrival calls this fight.
  // One of the ten printed intros. "Fight a Rebel ship (default rewards)." unique=false.
  if (ev.slug === "rebel-fight") {
    return {
      title: ev.dest,
      body: REBEL_FIGHT_INTROS[between(g, [0, 9])]!,
      choices: [{ id: "c:rebel-fight:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Rebel checkpoint. The bribe amount is a whole number from 10 to 15, shown on the button.
  if (ev.slug === "rebel-checkpoint") {
    const cost = between(g, [10, 15]);
    return {
      title: ev.dest,
      body: REBEL_CHECKPOINT_INTROS[between(g, [0, 3])]!,
      choices: [
        { id: "c:rebel-checkpoint:0", label: tx("wiki.cited-events.fend-for-yourself-attack-and-escape-2") },
        { id: `q:rebel-checkpoint:bribe:${cost}`, label: tx("wiki.cited-events.bribe-the-rebels-to-release-the", { cost: cost }) },
        { id: "c:rebel-checkpoint:1", label: REBEL_CHECKPOINT_HIDE[between(g, [0, 3])]! },
      ],
    };
  }
  // Lanius trader with translator. The printed hail, then the same one shown base trade. No better-band blue option.
  if (ev.slug === "lanius-trader-with-translator") {
    const offer = rollLaniusTrader(g, false);
    return {
      title: ev.dest,
      body: tx("wiki.cited-events.a-lanius-merchant-appears-to-have", { laniusTraderOfferText: laniusTraderOfferText(offer) }),
      choices: [
        { id: `q:lanius-translator:take:${offer.res}:${offer.cost}:${offer.scrap}`, label: tx("wiki.cited-events.agree-to-the-exchange") },
        { id: "c:lanius-trader-with-translator:3", label: tx("wiki.cited-events.decline") },
        { id: "c:lanius-trader-with-translator:4", label: tx("wiki.cited-events.decline-but-ask-about-their-translation") },
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
  // Free scrap with resources. One of the six printed intros. The gift stays c:free-scrap-with-resources:0.
  if (ev.slug === "free-scrap-with-resources") {
    return {
      title: ev.dest,
      body: FREE_SCRAP_WITH_RESOURCES_INTROS[between(g, [0, 5])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate ship distress trap has no choice. Arrival calls this fight.
  // One of the four printed intros. No odds. INFERRED: equal. "Fight a Pirate ship (default rewards)." distress=true. unique=true.
  if (ev.slug === "pirate-ship-distress-trap") {
    return {
      title: ev.dest,
      body: PIRATE_DISTRESS_TRAP_INTROS[between(g, [0, 3])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Slug fight in plasma storm has no choice. Arrival calls this fight.
  // One of the four printed intros. "Fight a Slug ship (default rewards)." plasmastorm=true. unique=false. The beacon stays outside a nebula. Surrender stays the Slug row.
  if (ev.slug === "slug-fight-in-plasma-storm") {
    return {
      title: ev.dest,
      body: SLUG_PLASMA_INTROS[between(g, [0, 3])]!,
      choices: [{ id: "c:slug-fight-in-plasma-storm:0", label: tx("wiki.cited-events.fight-a-slug-ship") }],
    };
  }
  // Boarders: Mantis. One of the three printed intros. The boarders stay c:boarders-mantis:0.
  if (ev.slug === "boarders-mantis") {
    return {
      title: ev.dest,
      body: MANTIS_BOARDER_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:boarders-mantis:0", label: tx("wiki.cited-events.2-4-mantis-boarders-beam-aboard") }],
    };
  }
  // Boarders: Humans in nebula. One of the three printed intros. The boarders stay c:boarders-humans-in-nebula:0.
  if (ev.slug === "boarders-humans-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_HUMAN_BOARDER_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:boarders-humans-in-nebula:0", label: tx("wiki.cited-events.2-4-human-boarders-beam-aboard") }],
    };
  }
  // Boarders: Crystal. One of the three printed intros. The boarders stay c:boarders-crystal:0.
  if (ev.slug === "boarders-crystal") {
    return {
      title: ev.dest,
      body: CRYSTAL_BOARDER_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:boarders-crystal:0", label: tx("wiki.cited-events.2-3-crystal-boarders-beam-aboard") }],
    };
  }
  // Boarders: Rockmen near sun. One of the two printed intros. The boarders stay c:boarders-rockmen-near-sun:0.
  if (ev.slug === "boarders-rockmen-near-sun") {
    return {
      title: ev.dest,
      body: ROCK_SUN_BOARDER_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:boarders-rockmen-near-sun:0", label: tx("wiki.cited-events.2-3-rock-boarders-beam-aboard") }],
    };
  }
  // Boarders: Humans (Pirate). One of the five printed intros. The boarders stay c:boarders-humans-pirate:0.
  if (ev.slug === "boarders-humans-pirate") {
    return {
      title: ev.dest,
      body: PIRATE_HUMAN_BOARDER_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:boarders-humans-pirate:0", label: tx("wiki.cited-events.3-5-human-boarders-beam-aboard") }],
    };
  }
  // Free weapon. One of the six printed intros. The gift stays c:free-weapon:0.
  if (ev.slug === "free-weapon") {
    return {
      title: ev.dest,
      body: FREE_WEAPON_INTROS[between(g, [0, 5])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Space station under construction. {{Blue Option|Lanius Crew|Offer to have your crewmember help.}}
  // The button stays visible. Agreeing to the sale is the follow-up card in wiki/quests.ts.
  if (ev.slug === "space-station-under-construction") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:space-station-under-construction:2", label: tx("wiki.cited-events.offer-to-have-your-crewmember-help") },
      ],
    };
  }
  return {
    title: ev.dest,
    body: ev.body,
    choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

/** The fitted schematic is kit.target. A loadout entry counts the same way. */
function ownsBoardDrone(g: Game): boolean {
  const kit = g.player.kits.swarm;
  if (!kit) return false;
  return kit.target === "board" || (kit.loadout ?? []).includes("board");
}

/** The fitted schematic is kit.target. A loadout entry counts the same way. */
function ownsHullRepair(g: Game): boolean {
  const kit = g.player.kits.swarm;
  if (!kit) return false;
  return kit.target === "hull" || (kit.loadout ?? []).includes("hull");
}

export function citedChoiceDisabled(g: Game, id: string): string | null {
  const missing = missingDisabled(g, id);
  if (missing) return missing;
  // Zoltan odd moon. Boarding Drone. INFERRED: the refusal lines. The page names the drone and the part.
  if (id === "c:zoltan-odd-moon:drone" && !ownsBoardDrone(g)) return tx("wiki.cited-events.needs-a-boarding-drone");
  if (id === "c:zoltan-odd-moon:drone" && g.player.parts < 1) return tx("wiki.cited-events.need-1-drone-part");
  // No fuel: Engi ship repair. Hull Repair Drone, 1 drone part.
  // INFERRED: the refusal lines. The page names the drone and the part.
  if (id === "c:no-fuel-engi-ship-repair:2" && !ownsHullRepair(g)) return tx("wiki.cited-events.needs-a-hull-repair-drone");
  if (id === "c:no-fuel-engi-ship-repair:2" && g.player.parts < 1) return tx("wiki.cited-events.need-1-drone-part");
  // Destroyed cargo ship. Advanced Sensors prints level=2+. Long-Ranged Scanners is the augment.
  // INFERRED: the refusal lines. The page names the requirement and does not print these sentences.
  if (id === "c:destroyed-cargo-ship:2" && (g.player.systems.sensors?.level ?? 0) < 2) return tx("wiki.cited-events.needs-sensors-level-2");
  if (id === "c:destroyed-cargo-ship:3" && !g.augments.includes("glass")) return tx("wiki.cited-events.needs-long-ranged-scanners");
  // Auto-ship carrying shield virus. Hacking, "Counter the remote hacking."
  // INFERRED: the refusal line. The page names Hacking and does not print the sentence.
  if (id === "c:auto-ship-carrying-shield-virus:1" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.cited-events.needs-a-hacking-system");
  // Crystalline ship messaging about Rebels. Distraction Buoys.
  // INFERRED: the refusal line. The page names the augment and does not print the refusal sentence.
  if (id === "c:crystalline-ship-messaging-about-rebels:2" && !g.augments.includes("falsebuoy")) return tx("wiki.cited-events.needs-distraction-buoys");
  const take = tradeTake(id);
  if (take) {
    const pay = take[1] as TradeRes;
    const cost = Number(take[2]);
    if (stock(g, pay) < cost) return tx("wiki.cited-events.need", { cost: cost, v: RES_WORD[pay] });
    return null;
  }
  const choice = findChoice(id);
  if (!choice) return null;
  // Remote settlement. {{Blue Option|Fire Beam}} and {{Blue Option|Fire Bomb}}.
  // INFERRED: the refusal sentences. The page names the requirement and does not print the refusal.
  if (id === "c:remote-settlement:2" && !g.player.weapons.some((w) => w.defId === "firebeam")) return tx("wiki.cited-events.needs-a-fire-beam");
  if (id === "c:remote-settlement:3" && !g.player.weapons.some((w) => w.defId === "cask")) return tx("wiki.cited-events.needs-a-fire-bomb");
  for (const fx of choice.fx) {
    if (fx.k === "res" && fx.sign < 0 && stock(g, fx.id) < fx.lo) {
      return tx("wiki.cited-events.need-2", { lo: fx.lo, v: RES_WORD[fx.id] });
    }
  }
  return null;
}

export type CitedChoice = {
  g: Game;
  resolve: () => void;
  fight: (tier: string, asteroid?: boolean, slug?: string) => void;
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
    return tx("wiki.cited-events.thank-you-this-will-help-greatly");
  }
  if (
    id === "c:sell-drone-parts-for-scrap:0" ||
    id === "c:sell-drone-parts-for-scrap:1" ||
    id === "c:sell-drone-parts-for-scrap:2"
  ) {
    return tx("wiki.cited-events.thank-you-for-your-business");
  }
  return null;
}

const CRYSTAL_PLANS = "c:crystalline-ship-messaging-about-rebels";
const CRYSTAL_OUTRUN =
  tx("wiki.cited-events.it-was-never-your-intention-to");
const CRYSTAL_CRUISE =
  tx("wiki.cited-events.unable-to-interpret-it-themselves-the");
const CRYSTAL_LIE =
  tx("wiki.cited-events.they-take-one-look-at-your");
const CRYSTAL_BUOY =
  tx("wiki.cited-events.your-distraction-buoy-allows-you-to");
const CRYSTAL_REFUSE =
  tx("wiki.cited-events.you-apologize-for-the-trouble-you");

function citedResult(g: Game, sentence: string, paid: string[]) {
  const title = g.beacons.find((b) => b.id === g.here)?.name ?? tx("wiki.cited-events.event");
  g.event = {
    title,
    body: `${sentence}\n\n${paid.join(" ")}`,
    choices: [{ id: "ack", label: "Continue" }],
  };
  g.phase = "event";
  g.paused = true;
}

function highScrapNote(ctx: CitedChoice): string {
  const [lo, hi] = band(ctx.g, "high");
  const n = roll(ctx, lo, hi);
  ctx.scrap(n);
  const line = tx("wiki.cited-events.high-scrap", { n: n });
  ctx.note(line);
  return line;
}

/** Existing faster fx: one extra step, not a doubled column. */
function doubledPursuit(ctx: CitedChoice): string {
  ctx.g.fleet += 1;
  const line = tx("wiki.cited-events.rebel-fleet-pursuit-is-doubled-for");
  ctx.note(line);
  return line;
}

function delayedPursuit(ctx: CitedChoice): string {
  ctx.g.fleet = Math.max(0, ctx.g.fleet - 1);
  const line = tx("wiki.cited-events.rebel-fleet-pursuit-is-delayed-for");
  ctx.note(line);
  return line;
}

/**
 * Crystalline ship messaging about Rebels. Null when this id is some other card.
 * False when Distraction Buoys are missing: nothing is paid and the card stays.
 */
function crystallineRebelPlans(ctx: CitedChoice, id: string): boolean | null {
  if (!id.startsWith(`${CRYSTAL_PLANS}:`)) return null;
  const g = ctx.g;
  if (id === `${CRYSTAL_PLANS}:0`) {
    citedResult(g, CRYSTAL_OUTRUN, [highScrapNote(ctx), doubledPursuit(ctx)]);
    return true;
  }
  if (id === `${CRYSTAL_PLANS}:1`) {
    // Two results, no odds. INFERRED: equal.
    if (ctx.irand(2) === 0) {
      citedResult(g, CRYSTAL_CRUISE, [highScrapNote(ctx), delayedPursuit(ctx)]);
      return true;
    }
    ctx.note(CRYSTAL_LIE);
    ctx.fight(tx("wiki.cited-events.crystal-ship"));
    // INFERRED: the count is inclusive, and the call is after ctx.fight because startCombat drops enemy crew already aboard.
    crystalBoarders(g, 1, 2);
    return true;
  }
  if (id === `${CRYSTAL_PLANS}:2`) {
    if (!g.augments.includes("falsebuoy")) return false;
    citedResult(g, CRYSTAL_BUOY, [highScrapNote(ctx), delayedPursuit(ctx)]);
    return true;
  }
  if (id === `${CRYSTAL_PLANS}:3`) {
    citedResult(g, CRYSTAL_REFUSE, [tx("wiki.cited-events.nothing-happens")]);
    return true;
  }
  return null;
}

/** True only after the choice is applied. A shortfall returns false and changes nothing. */
export function citedChoose(ctx: CitedChoice, id: string): boolean {
  const missing = missingChoose(ctx, id);
  if (missing !== null) return missing;
  // Slug and Rock standoff in nebula: Get closer loads Rock and Slug standoff. The nebula stays.
  if (id === "c:slug-and-rock-standoff-in-nebula:0") {
    const b = ctx.g.beacons.find((x) => x.id === ctx.g.here);
    if (!b) return false;
    b.flag = "cited:rock-and-slug-standoff";
    b.name = "Rock and Slug standoff";
    b.kind = "nebula";
    const card = citedEvent(ctx.g, b);
    if (!card) return false;
    ctx.g.event = card;
    ctx.g.phase = "event";
    ctx.g.paused = true;
    return true;
  }
  const moons = slugMoonsQuestion(ctx, id);
  if (moons !== null) return moons;
  const moon = zoltanOddMoon(ctx, id);
  if (moon !== null) return moon;
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
  // Remote settlement. Fire Beam and Fire Bomb. citedChoose does not read citedChoiceDisabled.
  // A missing weapon returns before the res loop, so the missile is not spent.
  if (id === "c:remote-settlement:2" && !g.player.weapons.some((w) => w.defId === "firebeam")) return false;
  if (id === "c:remote-settlement:3" && !g.player.weapons.some((w) => w.defId === "cask")) return false;
  // Before the generic fleet/tier loops, so the old :0 rows are not applied twice.
  const crystalPlans = crystallineRebelPlans(ctx, id);
  if (crystalPlans !== null) return crystalPlans;
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
      ctx.note(tx("wiki.cited-events.you-receive-scrap", { got: got }));
      continue;
    }
    if (gn.id === "scrap") ctx.scrap(gn.n);
    else if (gn.id === "fuel") g.fuel += gn.n;
    else if (gn.id === "missiles") g.missiles += gn.n;
    else g.player.parts += gn.n;
    const word = gn.id === "scrap" ? tx("wiki.cited-events.scrap-2") : gn.id === "fuel" ? tx("wiki.cited-events.fuel") : gn.id === "missiles" ? tx("wiki.cited-events.missiles") : tx("wiki.cited-events.drone-parts");
    ctx.note(`${word}: ${gn.n}.`);
  }
  for (const fx of choice.fx) {
    if (fx.k !== "tier") continue;
    const [lo, hi] = band(g, fx.tier);
    const n = roll(ctx, lo, hi);
    ctx.scrap(n);
    const name = fx.tier === "low" ? tx("wiki.cited-events.low") : fx.tier === "high" ? tx("wiki.cited-events.high") : tx("wiki.cited-events.medium");
    ctx.note(tx("wiki.cited-events.scrap", { name: name, n: n }));
    if (fx.resources) ctx.note(tx("wiki.cited-events.resource-amounts-are-not-stated"));
  }
  for (const fx of choice.fx) {
    if (fx.k !== "hull") continue;
    if (fx.n >= 0) g.player.hull = Math.min(g.player.hullMax, g.player.hull + fx.n);
    else g.player.hull = Math.max(0, g.player.hull + fx.n);
    ctx.note(fx.n >= 0 ? tx("wiki.cited-events.hull-repairs", { n: fx.n }) : tx("wiki.cited-events.hull-damage", { v: -fx.n }));
  }
  for (const fx of choice.fx) {
    if (fx.k !== "fleet") continue;
    const last = !!fx.lastStand && (g.sector === 8 || g.sectorName === "The Last Stand");
    if (fx.faster) {
      g.fleet += fx.n;
      ctx.note(tx("wiki.cited-events.rebel-fleet-pursuit-is-doubled-for-2", { n: fx.n, v: fx.n === 1 ? "jump" : "jumps" }));
    } else if (fx.double) {
      g.fleet *= 2;
      ctx.note(tx("wiki.cited-events.rebel-fleet-pursuit-is-doubled"));
    } else if (last) {
      ctx.note(tx("wiki.cited-events.no-effect-in-the-last-stand"));
    } else {
      g.fleet = Math.max(0, g.fleet - fx.n);
      ctx.note(tx("wiki.cited-events.rebel-fleet-is-delayed-for-turns", { n: fx.n }));
    }
  }
  for (const fx of choice.fx) {
    if (fx.k === "item") ctx.note(grantRandomItem(g, fx.item));
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
  // Rebel transport ship. "Demand the surrender of their goods." One printed lead-in, then the running Rebel fight.
  if (id === "c:rebel-transport-ship:0") ctx.note(tx("wiki.cited-events.you-prepare-to-secure-their-cargo"));
  // Lanius ship absorbing automated scout. "Fight the ship." One printed lead-in, then a Lanius ship fight.
  if (id === "c:lanius-ship-absorbing-automated-scout:0") ctx.note(tx("wiki.cited-events.you-power-up-your-weapons-which"));
  // Mantis ship attacking Crystal. "Attack the Mantis." One printed lead-in, then a Mantis ship fight.
  if (id === "c:mantis-ship-attacking-crystal:0") ctx.note(tx("wiki.cited-events.you-activate-your-impulse-engines-and"));
  // Mantis ship with Rock body parts. "Attack!" One printed lead-in, then a Mantis ship fight.
  if (id === "c:mantis-ship-with-rock-body-parts:0") ctx.note(tx("wiki.cited-events.no-species-deserves-a-mantis-hunter"));
  // Lanius lone ship. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  if (id === "c:lanius-lone-ship:0") ctx.note(tx("wiki.cited-events.the-civilian-ship-hastily-retreats-while"));
  // Auto-ship near radar station. "Approach the station." One printed lead-in, then an Auto-ship fight.
  if (id === "c:auto-ship-near-radar-station:0") ctx.note(tx("wiki.cited-events.the-ship-powers-up-and-targets"));
  // Crystal fight choice. "Engage the Rebel ship." One printed lead-in, then a Crystal ship fight.
  if (id === "c:crystal-fight-choice:0") ctx.note(tx("wiki.cited-events.before-you-can-engage-the-crystalline"));
  // Lanius powered-down ship. "Scan the ship for lifeforms." One printed lead-in, then a Lanius ship fight.
  if (id === "c:lanius-powered-down-ship:0") ctx.note(tx("wiki.cited-events.as-you-scan-the-vessel-the"));
  // Pirate ship attacking Crystal. "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  if (id === "c:pirate-ship-attacking-crystal:0") ctx.note(tx("wiki.cited-events.you-chase-down-the-pirate-before"));
  // Remote settlement. "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  if (id === "c:remote-settlement:0") ctx.note(tx("wiki.cited-events.you-asked-for-it-they-pull"));
  // Pirate smuggler. "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  if (id === "c:pirate-smuggler:0") ctx.note(tx("wiki.cited-events.you-power-up-your-weapons-and"));
  // Refueling platform garbled broadcast. "Hail the platform and attempt to communicate." One printed lead-in, then a Lanius ship fight.
  if (id === "c:refueling-platform-garbled-broadcast:0") ctx.note(tx("wiki.cited-events.there-is-a-screech-from-your"));
  // Slug drink. "Refuse." One printed lead-in, then a Slug ship fight.
  if (id === "c:slug-drink:0") ctx.note(tx("wiki.cited-events.the-slug-feigns-offense-at-your"));
  // Zoltan quest primitives. "Interfere - make first contact with the primitive aliens." One printed lead-in, then a Zoltan ship fight.
  if (id === "c:zoltan-quest-primitives:0") ctx.note(tx("wiki.cited-events.the-local-people-furry-one-eyed"));
  // Zoltan quest primitives. "Protect the aliens' way of life - Attack the Rebel ship." One printed lead-in, then a Rebel ship fight.
  if (id === "c:zoltan-quest-primitives:1") ctx.note(tx("wiki.cited-events.these-creatures-should-be-left-to"));
  // Rebel ship attacking Crystal ship. "Attack the Rebel." One printed lead-in, then a Rebel ship fight.
  if (id === "c:rebel-ship-attacking-crystal-ship:0") ctx.note(tx("wiki.cited-events.you-message-the-crystalline-ship-your"));
  // Rebel ship attacking Crystal ship. "Attack the Crystalline ship." One printed lead-in, then a Crystal ship fight.
  if (id === "c:rebel-ship-attacking-crystal-ship:1") ctx.note(tx("wiki.cited-events.you-move-in-to-intercept-the"));
  // Auto-ship carrying shield virus. "Counter the remote hacking." Without Hacking the arrival card stays open.
  // citedChoose does not read citedChoiceDisabled, so this returns before the fight note and the fight.
  if (id === "c:auto-ship-carrying-shield-virus:1" && (g.player.kits.spike?.level ?? 0) <= 0) return true;
  // Auto-ship carrying shield virus. "Counter the remote hacking." One printed lead-in, then an Auto-ship fight.
  if (id === "c:auto-ship-carrying-shield-virus:1") ctx.note(tx("wiki.cited-events.your-hacking-system-automatically-counters-the"));
  // Rebel shipyard. "Look around." One printed warning, then the same second Flagship fight. No salvage is granted here.
  if (id === "c:rebel-shipyard:0") ctx.note(tx("wiki.cited-events.warning-lights-flash-as-scans-identify"));
  const fight = choice.fx.find((fx) => fx.k === "fight");
  if (fight && fight.k === "fight") {
    ctx.fight(fight.tier, fight.asteroid ? true : undefined);
    // Rock fight with boarders has no choice. Arrival calls this id.
    // "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)."
    // Rock fight with boarders in asteroid field has no choice. Arrival calls this id.
    // "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." asteroidfield=true.
    // INFERRED: the count is an inclusive whole number. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:rock-fight-with-boarders:0") rockBoarders(g, 1, 3);
    if (id === "c:rock-fight-with-boarders-in-asteroid-field:0") rockBoarders(g, 1, 2);
    // Mantis outcasts has no choice. Arrival calls this id.
    // "2-3 mantis boarders beam aboard your ship" and a Mantis ship (default rewards).
    // INFERRED: inclusive 2..3. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:mantis-outcasts:0") mantisBoarders(g, 2, 3);
    // Zoltan border police has no choice. Arrival calls this id.
    // "3-4 zoltan boarders beam aboard your ship" and a Zoltan ship (default rewards).
    // INFERRED: inclusive 3..4. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:zoltan-border-police:0") zoltanBoarders(g, 3, 4);
    // Rebel fight with boarders has no choice. Arrival calls this id.
    // "2-3 human boarders beam aboard your ship" and a Rebel ship (default rewards).
    // INFERRED: inclusive 2..3. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:rebel-fight-with-boarders:0") humanBoarders(g, 2, 3, tx("wiki.cited-events.human-boarders-beam-aboard-your-ship"));
    // "2 slug boarders beam aboard your ship" (Slug hacker (medical)).
    if (id === "c:slug-hacker-medical:0") slugBoarders(g, 2, 2, tx("wiki.cited-events.slug-boarders-beam-aboard-your-ship"));
    // "crew entirely composed of Mantis" (Mantis ship-collectors; Zoltan ship follows Mantis ship; Legendary thief KazaaakplethKilik).
    if (id === "c:mantis-ship-collectors:0" || id === "c:zoltan-ship-follows-mantis-ship:1" || id === "c:legendary-thief-kazaaakplethkilik:0") allMantisCrew(g);
    return true;
  }
  // Boarders: Humans in plasma storm has no choice. Arrival calls this id.
  // "3-4 human boarders beam aboard your ship" and medium scrap with resources. No enemy ship.
  // Resource amounts are not stated.
  if (id === "c:boarders-humans-in-plasma-storm:0") {
    plasmaHumanBoarders(g);
    return true;
  }
  // Pirate toll. "Pay their toll." One printed result. The 15-25 scrap is already spent above. No fight.
  if (id === "c:pirate-toll:0") {
    citedResult(g, tx("wiki.cited-events.you-made-the-right-decision-friend"), [tx("wiki.cited-events.you-avoid-the-fight")]);
    return true;
  }
  // The mercenary. "Hire the mercenary to delay the Rebels." One printed result. Scrap and the 2-turn delay are already applied.
  if (id === "c:the-mercenary:0") {
    const last = g.sector === 8 || g.sectorName === "The Last Stand";
    citedResult(g, tx("wiki.cited-events.the-mercenary-ship-masks-its-jump"), [
      last ? tx("wiki.cited-events.no-effect-in-the-last-stand") : tx("wiki.cited-events.rebel-fleet-is-delayed-for-2"),
    ]);
    return true;
  }
  // Federation deserters. "Offer supplies." 15-25 scrap and 1-3 fuel are already spent.
  // "The current sector map is revealed." This beacon chart has no hidden nodes, so that line uncovers none.
  // sectorMap is the between-sector chart and stays untouched.
  if (id === "c:federation-deserters:2") {
    citedResult(
      g,
      tx("wiki.cited-events.you-send-over-some-supplies-to"),
      [tx("wiki.cited-events.the-current-sector-map-is-revealed")],
    );
    return true;
  }
  // Remote settlement. Fire Beam and Fire Bomb. High scrap is already applied above.
  // "You receive a drone schematic with high scrap." Rewards, "Drone": "A random drone schematic & T scrap."
  if (id === "c:remote-settlement:2" || id === "c:remote-settlement:3") {
    const item = grantRandomItem(g, "drone");
    ctx.note(item);
    citedResult(
      g,
      id === "c:remote-settlement:2"
        ? tx("wiki.cited-events.the-pirate-watches-as-you-start")
        : tx("wiki.cited-events.the-pirate-watches-as-you-teleport"),
      [tx("wiki.cited-events.you-receive-a-drone-schematic-with-2"), item],
    );
    return true;
  }
  // No fuel: Engi ship repair. Hull Repair Drone spends 1 drone part and pays 4-6 fuel.
  // citedChoose does not read citedChoiceDisabled, so a missing drone returns before the part is spent.
  if (id === "c:no-fuel-engi-ship-repair:2") {
    if (!ownsHullRepair(g) || g.player.parts < 1) return false;
    g.player.parts -= 1;
    const fuel = roll(ctx, 4, 6);
    g.fuel += fuel;
    const spent = tx("wiki.cited-events.drone-parts-1");
    const got = `${tx("wiki.cited-events.fuel")}: ${fuel}.`;
    ctx.note(spent);
    ctx.note(got);
    citedResult(g, tx("wiki.cited-events.they-happily-accept-your-offer"), [got, spent]);
    return true;
  }
  ctx.resolve();
  return true;
}
