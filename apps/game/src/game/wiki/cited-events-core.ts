import { tx } from "../../i18n/index.ts";

type CoreFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  | { k: "item"; item: "weapon" | "augment" | "drone" }
  | { k: "nothing" };

type CoreChoice = { id: string; label: string; fx: CoreFx[] };

export type CoreEvent = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: CoreChoice[];
};

export const CORE_EVENTS: CoreEvent[] = [
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
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Auto-ship warning]]
    // > "A ship responding to your distress moves in. Unfortunately it turns out to be an automated Rebel scout. It immediately reverses thrust after scanning your ship." — [[No fuel: Auto-ship warning]]
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
        // Wiki citations:
        // > "Fight an Auto-ship that is running away." — [[No fuel: Auto-ship warning]]
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
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Engi ship repair]]
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
        // Wiki citations:
        // > "Make the trade." — [[No fuel: Engi ship repair]]
        // > "You lose Scrap lost: 10-20 and receive Fuel gained: 4-6." — [[No fuel: Engi ship repair]]
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
        // Wiki citations:
        // > "Ignore them." — [[No fuel: Engi ship repair]]
        // > "Nothing happens." — [[No fuel: Engi ship repair]]
        "label": tx("wiki.cited-events.ignore-them"),
        "fx": [
          {
            "k": "nothing"
          }
        ]
      },
      {
        "id": "c:no-fuel-engi-ship-repair:2",
        // Wiki citations:
        // > "(Hull Repair Drone) Offer to help repair their hull. [ Drone parts lost: 1 ]" — [[No fuel: Engi ship repair]]
        // > "They happily accept your offer for help. Once the drone does its work they transfer over some fuel for your trouble." — [[No fuel: Engi ship repair]]
        // > "You receive Fuel gained: 4-6." — [[No fuel: Engi ship repair]]
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
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Mantis fight]]
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
        // Wiki citations:
        // > "Fight a Mantis ship that is running away. (80 seconds escape countdown timer if not interrupted)" — [[No fuel: Mantis fight]]
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
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Rebel fight]]
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
        // Wiki citations:
        // > "Fight a Rebel ship that is running away. (80 seconds escape countdown timer if not interrupted)" — [[No fuel: Rebel fight]]
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
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Slug fuel depot]]
    // > "A mobile Slugman fuel depot enters scanning range. \"My prices are fair, but I ask one thing - do not insult me with negotiation!\" You check out his price list." — [[No fuel: Slug fuel depot]]
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
        // Wiki citations:
        // > "Buy 5 fuel for 50 scrap." — [[No fuel: Slug fuel depot]]
        // > "You lose Scrap lost: 50 and receive Fuel gained: 5." — [[No fuel: Slug fuel depot]]
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
        // Wiki citations:
        // > "Buy 10 fuel for 95 scrap. (BEST DEAL!)" — [[No fuel: Slug fuel depot]]
        // > "You lose Scrap lost: 95 and receive Fuel gained: 10." — [[No fuel: Slug fuel depot]]
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
        // Wiki citations:
        // > "Negotiate." — [[No fuel: Slug fuel depot]]
        // > "Fight a Slug ship that is running away. (80 seconds escape countdown timer if not interrupted)(no surrender offers)" — [[No fuel: Slug fuel depot]]
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
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: automated refueling ship]]
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
        // Wiki citations:
        // > "Request emergency fuel reserves." — [[No fuel: automated refueling ship]]
        // > "You receive low fuel." — [[No fuel: automated refueling ship]]
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
        // Wiki citations:
        // > "Buy 5 fuel for 20 scrap. [ Scrap lost: 20 ]" — [[No fuel: automated refueling ship]]
        // > "You receive Fuel gained: 5." — [[No fuel: automated refueling ship]]
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
        // Wiki citations:
        // > "Buy 2 fuel for 8 scrap. [ Scrap lost: 8 ]" — [[No fuel: automated refueling ship]]
        // > "You receive Fuel gained: 2." — [[No fuel: automated refueling ship]]
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
        // Wiki citations:
        // > "Attack the automated ship." — [[No fuel: automated refueling ship]]
        // > "Fight an Auto-ship that is running away. (80 seconds escape countdown timer if not interrupted)" — [[No fuel: automated refueling ship]]
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
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: explore the system]]
    // > "Although your lack of fuel cells prevents your ship from jumping, you can still use your impulse engines. Will you spend some time exploring the nearby system?" — [[No fuel: explore the system]]
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
        // Wiki citations:
        // > "Trade 20 scrap for 5 fuel. [ Scrap lost: 20 ]" — [[No fuel: explore the system]]
        // > "You receive Fuel gained: 5." — [[No fuel: explore the system]]
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
        // Wiki citations:
        // > "Trade 10 scrap for 2 fuel. [ Scrap lost: 10 ]" — [[No fuel: explore the system]]
        // > "You receive Fuel gained: 2." — [[No fuel: explore the system]]
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
        // Wiki citations:
        // > "Trade 5 scrap for 1 fuel. [ Scrap lost: 5 ]" — [[No fuel: explore the system]]
        // > "You receive Fuel gained: 1." — [[No fuel: explore the system]]
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
        // Wiki citations:
        // > "Stay near the beacon." — [[No fuel: explore the system]]
        // > "Nothing happens." — [[No fuel: explore the system]]
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
