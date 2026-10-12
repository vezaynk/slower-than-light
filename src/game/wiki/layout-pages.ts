import { tx } from "../../i18n/index.ts";
/**
 * Visible wording from the FTL wiki, not a paraphrase.
 * "Ship", section "Playable ships" and section "Layouts": the ten-class table,
 * the naming note, the unlock bullets, and File:FTL_ship_unlock_progression_cropped.png.
 * Each cruiser article's Layout A/B/C section: the italic line, the field labels
 * that page used, and the right-column figure (a *Systems.png file when the
 * section has one). Link text is the label after "|", otherwise the page title.
 * File: links are figures. Empty and 403 pages are not filled in.
 */

export type WikiLine = { depth: number; text: string };

export type PlayableCell = { page: string; file: string; src: string };

export const PLAYABLE_SHIPS = {
  "heading": "Playable ships",
  "source": "Wiki page \"Ship\", section \"Playable ships\"",
  "see": [
    "For ship strategies, see Ship guides.",
    "For ship comparisons, see Ship comparison."
  ],
  "lead": "There are ten playable ship classes available in FTL:",
  "rows": [
    [
      {
        "page": "The Kestrel Cruiser",
        "file": "Kestrel Cruiser A.png",
        "src": "/hulls/kestrel-a.webp"
      },
      {
        "page": "The Engi Cruiser",
        "file": "Engi Cruiser A.png",
        "src": "/hulls/engi-a.webp"
      },
      {
        "page": "The Federation Cruiser",
        "file": "Federation Cruiser A.png",
        "src": "/hulls/fed-a.webp"
      },
      {
        "page": "The Zoltan Cruiser",
        "file": "Zoltan Cruiser A.png",
        "src": "/hulls/zoltan-a.webp"
      },
      {
        "page": "The Lanius Cruiser",
        "file": "Lanius Cruiser A.png",
        "src": "/hulls/lanius-a.webp"
      }
    ],
    [
      {
        "page": "The Stealth Cruiser",
        "file": "Stealth Cruiser A.png",
        "src": "/hulls/stealth-a.webp"
      },
      {
        "page": "The Rock Cruiser",
        "file": "Rock Cruiser A.png",
        "src": "/hulls/rock-a.webp"
      },
      {
        "page": "The Slug Cruiser",
        "file": "Slug Cruiser A.png",
        "src": "/hulls/slug-a.webp"
      },
      {
        "page": "The Mantis Cruiser",
        "file": "Mantis Cruiser A.png",
        "src": "/hulls/mantis-a.webp"
      },
      {
        "page": "The Crystal Cruiser",
        "file": "Crystal Cruiser A.png",
        "src": "/hulls/crystal-a.webp"
      }
    ]
  ],
  "note": "Note: specific ships are usually referred to in the following format: <Cruiser class name> <Layout letter> - e.g. the Stealth Cruiser Layout/Type A is simply called Stealth A.",
  "layoutsHeading": "Layouts",
  "layoutsSource": "Wiki page \"Ship\", section \"Layouts\"",
  "layoutsLead": "At start only the Kestrel Cruiser is available. Upon reaching the 5th sector with the Kestrel Cruiser, the Engi Cruiser is unlocked. To unlock other ships and layouts, certain objectives must be accomplished:",
  "layouts": [
    {
      "depth": 1,
      "text": "Layout A - complete a respective quest or defeat the Rebel Flagship with the previous ship in the diagram (denoted by the arrows)."
    },
    {
      "depth": 1,
      "text": "Layout B - earn 2 out of 3 ship-related Achievements."
    },
    {
      "depth": 1,
      "text": "Layout C - reach sector 8 with Layout B and Advanced Edition Content enabled."
    },
    {
      "depth": 1,
      "text": "The Lanius Cruiser and the Crystal Cruiser:"
    },
    {
      "depth": 2,
      "text": "The Lanius Cruiser becomes available after unlocking 4 ships."
    },
    {
      "depth": 2,
      "text": "The Crystal Cruiser can either be unlocked with the quest or by defeating the Flagship with layout A and B of every ship (excluding the Lanius Cruiser)."
    },
    {
      "depth": 2,
      "text": "Do not have Layout C."
    }
  ],
  "diagram": {
    "file": "FTL_ship_unlock_progression_cropped.png",
    "src": "/layouts/FTL_ship_unlock_progression_cropped.webp",
    "caption": "The ship diagram with achievements and progress of unlocking all of the playable ships"
  }
} as const;

export type CruiserLayout = {
  id: string;
  page: string;
  heading: string;
  source: string;
  figureFile: string;
  figure: string;
  lines: WikiLine[];
};

export const CRUISER_PAGES: { page: string; layouts: CruiserLayout[] }[] = [
  {
    "page": "The Kestrel Cruiser",
    "layouts": [
      {
        "id": "kestrel-a",
        "page": "The Kestrel Cruiser",
        "heading": tx("wiki.layout-pages.layout-a"),
        "source": tx("wiki.layout-pages.the-kestrel-cruiser-section-layout-a"),
        "figureFile": "KestralASystems.png",
        "figure": "/layouts/KestralASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-class-of-ship-was-decommissioned")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-kestrel")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.human-3")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-3")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.artemis-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.burst-laser-ii")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-system-not-installed")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.8-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.2-drone-parts")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.does-not-require-unlocking-it-is")
          }
        ]
      },
      {
        "id": "kestrel-b",
        "page": "The Kestrel Cruiser",
        "heading": tx("wiki.layout-pages.layout-b"),
        "source": tx("wiki.layout-pages.the-kestrel-cruiser-section-layout-b"),
        "figureFile": "KestralB.png",
        "figure": "/layouts/KestralB.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-modified-kestrel-class-ship-was")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-red-tail")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew-2-human-1-mantis-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-4")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.basic-laser-x4")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-requires-system")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.5-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.earn-at-least-two-out-of")
          }
        ]
      },
      {
        "id": "kestrel-c",
        "page": "The Kestrel Cruiser",
        "heading": tx("wiki.layout-pages.layout-c"),
        "source": tx("wiki.layout-pages.the-kestrel-cruiser-section-layout-c"),
        "figureFile": "KestralCSystems.png",
        "figure": "/layouts/KestralCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-model-was-modified-by-pirates")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-swallow")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew-2-human-1-lanius")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-7")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.clone-bay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.dual-lasers")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.ion-stunner")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-requires-system")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.4-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.3-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.reach-the-final-sector-with-the")
          }
        ]
      }
    ]
  },
  {
    "page": "The Engi Cruiser",
    "layouts": [
      {
        "id": "engi-a",
        "page": "The Engi Cruiser",
        "heading": tx("wiki.layout-pages.layout-a"),
        "source": tx("wiki.layout-pages.the-engi-cruiser-section-layout-a"),
        "figureFile": "EngiASystems.png",
        "figure": "/layouts/EngiASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.although-it-may-look-like-a")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-torus")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew-2-engi-1-human")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-10")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-3")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.drone-control-3")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-3-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.ion-blast-ii")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-3-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.combat-drone-mark-i")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.augmentations")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engi-med-bot-dispersal")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.15-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.reaching-a-sector-5-with-any")
          }
        ]
      },
      {
        "id": "engi-b",
        "page": "The Engi Cruiser",
        "heading": tx("wiki.layout-pages.layout-b"),
        "source": tx("wiki.layout-pages.the-engi-cruiser-section-layout-b"),
        "figureFile": "EngiBSystems.png",
        "figure": "/layouts/EngiBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.heavily-understaffed-this-ship-relies-on")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-vortex")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew-1-engi")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-9")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-3")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.drone-control-3")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-3-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.heavy-ion")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.heavy-laser-i")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-3-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.anti-personnel-drone")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.system-repair-drone-x2")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.augmentations")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.drone-reactor-booster")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.6-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.earn-at-least-two-out-of-2")
          }
        ]
      },
      {
        "id": "engi-c",
        "page": "The Engi Cruiser",
        "heading": tx("wiki.layout-pages.layout-c"),
        "source": tx("wiki.layout-pages.the-engi-cruiser-section-layout-c"),
        "figureFile": "EngiCSystems.png",
        "figure": "/layouts/EngiCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.the-engi-were-quick-to-adapt")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-tetragon")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew-1-lanius-2-engi")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-9")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.clone-bay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.hacking-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.drone-control-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-3-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.dual-lasers")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-3-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.beam-i")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.augmentations")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.defense-scrambler")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.25-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.reach-the-final-sector-with-the-2")
          }
        ]
      }
    ]
  },
  {
    "page": "The Federation Cruiser",
    "layouts": [
      {
        "id": "fed-a",
        "page": "The Federation Cruiser",
        "heading": tx("wiki.layout-pages.layout-a"),
        "source": tx("wiki.layout-pages.the-federation-cruiser-section-layout-a"),
        "figureFile": "FedASystems.png",
        "figure": "/layouts/FedASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-ship-features-the-latest-in")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-osprey")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.human-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.mantis-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.rockman-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engi-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.artillery-beam-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.burst-laser-ii")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-system-not-installed")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.5-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.2-drone-parts")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.defeat-the-flagship-prototype-in-the")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.alternatively-defeat-the-rebel-flagship-with")
          }
        ]
      },
      {
        "id": "fed-b",
        "page": "The Federation Cruiser",
        "heading": tx("wiki.layout-pages.layout-b"),
        "source": tx("wiki.layout-pages.the-federation-cruiser-section-layout-b"),
        "figureFile": "FederationBSystems.png",
        "figure": "/layouts/FederationBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-ship-features-additional-artillery-power")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-nisos")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-9")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.human-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.slug-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.zoltan-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.artillery-beam-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.dual-lasers")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.leto-missiles")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-system-not-installed")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.9-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.earning-two-of-the-three-federation")
          }
        ]
      },
      {
        "id": "fed-c",
        "page": "The Federation Cruiser",
        "heading": tx("wiki.layout-pages.layout-c"),
        "source": tx("wiki.layout-pages.the-federation-cruiser-section-layout-c"),
        "figureFile": "FederationCSystems.png",
        "figure": "/layouts/FederationCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.with-a-flak-artillery-weapon-and")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-fregatidae")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-7")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.human-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.zoltan-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.mantis-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.clone-bay-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.crew-teleporter-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.flak-artillery-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": "none"
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-system-not-installed")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.augmentations")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.emergency-respirators")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.5-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reaching-sector-8-with-the-federation")
          }
        ]
      }
    ]
  },
  {
    "page": "The Zoltan Cruiser",
    "layouts": [
      {
        "id": "zoltan-a",
        "page": "The Zoltan Cruiser",
        "heading": tx("wiki.layout-pages.layout-a"),
        "source": tx("wiki.layout-pages.the-zoltan-cruiser-section-layout-a"),
        "figureFile": "ZoltanASystems.png",
        "figure": "/layouts/ZoltanASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.the-zoltan-s-advanced-shields-technology")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-adjudicator")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew-3-zoltan")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-5")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-3")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-2")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.halberd-beam")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.leto-missiles")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-requires-system")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.augmentations")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.zoltan-shield")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.12-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.2-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.see-the-unarmed-zoltan-transport")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.alternatively-defeat-the-rebel-flagship-with-2")
          }
        ]
      },
      {
        "id": "zoltan-b",
        "page": "The Zoltan Cruiser",
        "heading": tx("wiki.layout-pages.layout-b"),
        "source": tx("wiki.layout-pages.the-zoltan-cruiser-section-layout-b"),
        "figureFile": "ZoltanB.png",
        "figure": "/layouts/ZoltanB.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-ship-starts-with-a-weakened")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-noether")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew-3-zoltan")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-5")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-4")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.ion-blast-x2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.pike-beam")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-requires-system")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.augmentations")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.zoltan-shield")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.2-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.earning-two-of-the-three-zoltan")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.special-notes")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weak-level-1-shields-system-requires")
          }
        ]
      },
      {
        "id": "zoltan-c",
        "page": "The Zoltan Cruiser",
        "heading": tx("wiki.layout-pages.layout-c"),
        "source": tx("wiki.layout-pages.the-zoltan-cruiser-section-layout-c"),
        "figureFile": "ZoltanCSystems.png",
        "figure": "/layouts/ZoltanCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.the-designer-of-this-ship-was")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-cerenkov")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew-4-zoltan")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-2")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.clone-bay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.drones-3")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.backup-battery-2")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.ion-charger")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-requires-system")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.anti-ship-beam-drone-i")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.augmentations")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.zoltan-shield")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.2-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.15-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.getting-to-sector-8-with-the")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.special-notes")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weak-level-2-reactor-requires-30")
          }
        ]
      }
    ]
  },
  {
    "page": "The Lanius Cruiser",
    "layouts": [
      {
        "id": "lanius-a",
        "page": "The Lanius Cruiser",
        "heading": tx("wiki.layout-pages.layout-a"),
        "source": tx("wiki.layout-pages.the-lanius-cruiser-section-layout-a"),
        "figureFile": "LaniusASystems.png",
        "figure": "/layouts/LaniusASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.the-sharp-knife-like-structures-make")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-kruos")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-1-human-2-lanius")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.clone-bay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-3")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.hacking-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapons")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.chain-burst-laser")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.ion-stunner")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.emergency-respirators")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.3-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.9-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-4-weapon-2-drone-requires")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-including-resources-955")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-not-including-resources")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-4-ships-excluding-the-kestrel")
          }
        ]
      },
      {
        "id": "lanius-b",
        "page": "The Lanius Cruiser",
        "heading": tx("wiki.layout-pages.layout-b"),
        "source": tx("wiki.layout-pages.the-lanius-cruiser-section-layout-b"),
        "figureFile": "LaniusBSystems.png",
        "figure": "/layouts/LaniusBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.the-racial-ability-of-the-lanius")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-shrike")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-1-engi-2-lanius")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.clone-bay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.teleporter-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.mind-control-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapon")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.advanced-flak")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.emergency-respirators")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-4-weapon-2-drone-requires")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-815")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.earning-two-of-the-three-lanius")
          }
        ]
      }
    ]
  },
  {
    "page": "The Stealth Cruiser",
    "layouts": [
      {
        "id": "stealth-a",
        "page": "The Stealth Cruiser",
        "heading": tx("wiki.layout-pages.layout-a"),
        "source": tx("wiki.layout-pages.the-stealth-cruiser-section-layout-a"),
        "figureFile": "StealthASystems.png",
        "figure": "/layouts/StealthASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.constructed-for-the-federation-by-the")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-nesasio")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.human-3")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-4")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.cloaking-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-3-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.mini-beam")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.dual-lasers")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-and-requires-system")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.augmentations")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.titanium-system-casing")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.long-ranged-scanners")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.see-the-engi-fleet-discussion-event")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.alternatively-defeat-the-rebel-flagship-with-3")
          }
        ]
      },
      {
        "id": "stealth-b",
        "page": "The Stealth Cruiser",
        "heading": tx("wiki.layout-pages.layout-b"),
        "source": tx("wiki.layout-pages.the-stealth-cruiser-section-layout-b"),
        "figureFile": "StealthBSystems.png",
        "figure": "/layouts/StealthBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.built-like-a-glass-cannon-this")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-da-sr-12")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-2-human-1-zoltan")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-7")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.cloaking-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-4")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapon")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.glaive-beam")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.long-ranged-scanners")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-3-weapon-2-drone-requires")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.earning-two-of-the-three-stealth")
          }
        ]
      },
      {
        "id": "stealth-c",
        "page": "The Stealth Cruiser",
        "heading": tx("wiki.layout-pages.layout-c"),
        "source": tx("wiki.layout-pages.the-stealth-cruiser-section-layout-c"),
        "figureFile": "StealthCSystems.png",
        "figure": "/layouts/StealthCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-ship-was-part-of-an")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-simo-h")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-1-human-1-rockman")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-7")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.clone-bay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-3")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.drones-2")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapons")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.laser-charger-s")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.mini-beam")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-drones")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shield-overcharger")
          },
          {
            "depth": 2,
            "text": "Anti-Drone"
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.long-ranged-scanners")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-3-weapon-3-drone")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.reaching-sector-8-with-the-stealth")
          }
        ]
      }
    ]
  },
  {
    "page": "The Rock Cruiser",
    "layouts": [
      {
        "id": "rock-a",
        "page": "The Rock Cruiser",
        "heading": tx("wiki.layout-pages.layout-a"),
        "source": tx("wiki.layout-pages.the-rock-cruiser-section-layout-a"),
        "figureFile": "RockASystems.png",
        "figure": "/layouts/RockASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.similar-to-its-designers-this-super")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-bulwark")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-3-rockmen")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-3")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapons")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.artemis-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.hull-missile")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.rock-plating")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.28-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-4-weapon-2-drone-requires")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-including-resources-1016")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-not-including-resources-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.see-the-rock-war-vessel-encounter")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.alternatively-defeat-the-rebel-flagship-with-4")
          }
        ]
      },
      {
        "id": "rock-b",
        "page": "The Rock Cruiser",
        "heading": tx("wiki.layout-pages.layout-b"),
        "source": tx("wiki.layout-pages.the-rock-cruiser-section-layout-b"),
        "figureFile": "RockBSystems.png",
        "figure": "/layouts/RockBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.with-no-airlocks-this-ship-must")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-shivan")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-4-rockmen")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-3")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapons")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.heavy-pierce-laser-mk-i")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.fire-bomb")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.rock-plating")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.18-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-4-weapon-2-drone-requires")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-including-resources-978")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-not-including-resources-3")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.the-shivan-starts-without-a-door")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.earning-two-of-the-three-rock")
          }
        ]
      },
      {
        "id": "rock-c",
        "page": "The Rock Cruiser",
        "heading": tx("wiki.layout-pages.layout-c"),
        "source": tx("wiki.layout-pages.the-rock-cruiser-section-layout-c"),
        "figureFile": "RockCSystems.png",
        "figure": "/layouts/RockCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.contact-has-been-made-with-the")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-tektite")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-2-rockmen-1-crystal")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.clone-bay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-3")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapons")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.swarm-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.heavy-crystal-mark-i")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.rock-plating")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.15-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-4-weapon-2-drone-requires")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-including-resources-925")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-not-including-resources-4")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.reaching-sector-8-with-the-rock")
          }
        ]
      }
    ]
  },
  {
    "page": "The Slug Cruiser",
    "layouts": [
      {
        "id": "slug-a",
        "page": "The Slug Cruiser",
        "heading": tx("wiki.layout-pages.layout-a"),
        "source": tx("wiki.layout-pages.the-slug-cruiser-section-layout-a"),
        "figureFile": "SlugASystems.png",
        "figure": "/layouts/SlugASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.designed-for-use-inside-nebula-this")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-man-of-war")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-2-slug")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-3")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapons")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.anti-bio-beam")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.breach-bomb-i")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.dual-lasers")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.slug-repair-gel")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.15-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-4-weapon-2-drone-requires")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-including-resources-865")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-not-including-resources-5")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.see-the-slug-home-nebula-surrender")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.alternatively-defeat-the-rebel-flagship-with-5")
          }
        ]
      },
      {
        "id": "slug-b",
        "page": "The Slug Cruiser",
        "heading": tx("wiki.layout-pages.layout-b"),
        "source": tx("wiki.layout-pages.the-slug-cruiser-section-layout-b"),
        "figureFile": "SlugBSystems.png",
        "figure": "/layouts/SlugBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-boarding-ship-has-no-medical")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-stormwalker")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-3-slug")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-7")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.teleporter-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-2")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapons")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.healing-burst")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.artemis-missiles")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.slug-repair-gel")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.25-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-4-weapon-2-drone-requires")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-including-resources-878")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-not-including-resources-6")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.the-stormwalker-starts-with-a-teleporter")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.earning-two-of-the-three-slug")
          }
        ]
      },
      {
        "id": "slug-c",
        "page": "The Slug Cruiser",
        "heading": tx("wiki.layout-pages.layout-c"),
        "source": tx("wiki.layout-pages.the-slug-cruiser-section-layout-c"),
        "figureFile": "SlugCSystems.png",
        "figure": "/layouts/SlugCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.slugs-are-often-skilled-in-the")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-ariolimax")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-3-slug-2")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-9")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.clone-bay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.hacking-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.mind-control-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapon")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.chain-burst-laser")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.slug-repair-gel")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.1-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.15-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-4-weapon-2-drone-requires")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-including-resources-1031")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-not-including-resources-7")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.the-ariolimax-starts-with-hacking-and")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.reaching-sector-8-with-the-slug")
          }
        ]
      }
    ]
  },
  {
    "page": "The Mantis Cruiser",
    "layouts": [
      {
        "id": "mantis-a",
        "page": "The Mantis Cruiser",
        "heading": tx("wiki.layout-pages.layout-a"),
        "source": tx("wiki.layout-pages.the-mantis-cruiser-section-layout-a"),
        "figureFile": "MantisASystems.png",
        "figure": "/layouts/MantisASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-warship-is-designed-to-enhance")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-gila-monster")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-3-mantis-1-engi")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-7")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.teleporter-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapons")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.small-bomb")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.basic-laser")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.mantis-pheromones")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-3-weapon-2-drone-requires")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-including-resources-891")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-not-including-resources-8")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.see-legendary-thief-kazaaakplethkilik-random-eve")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.alternatively-defeat-the-rebel-flagship-with-6")
          }
        ]
      },
      {
        "id": "mantis-b",
        "page": "The Mantis Cruiser",
        "heading": tx("wiki.layout-pages.layout-b"),
        "source": tx("wiki.layout-pages.the-mantis-cruiser-section-layout-b"),
        "figureFile": "MantisBSystems.png",
        "figure": "/layouts/MantisBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-warship-encourages-sending-massive-boarding")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-basilisk")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-2-mantis")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-11")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-4")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.teleporter-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.drones-3")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-drones")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.boarding-drone")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.defense-drone-i")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.mantis-pheromones")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.15-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-3-weapon-2-drone")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-including-resources-1015")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-not-including-resources-9")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.one-of-the-few-ships-with")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.earning-two-of-the-three-mantis")
          }
        ]
      },
      {
        "id": "mantis-c",
        "page": "The Mantis Cruiser",
        "heading": tx("wiki.layout-pages.layout-c"),
        "source": tx("wiki.layout-pages.the-mantis-cruiser-section-layout-c"),
        "figureFile": "MantisCSystems.png",
        "figure": "/layouts/MantisCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.with-a-large-teleporter-and-weapons")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-the-theseus")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-crew-1-engi-1-mantis")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.doors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.clone-bay-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.teleporter-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapons-2")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-weapons")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.crystal-lockdown-bomb")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.stun-bomb")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-augmentation")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.mantis-pheromones")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.starting-resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.20-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.slots-3-weapon-2-drone-requires")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-including-resources-980")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.total-scrap-cost-not-including-resources-10")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.one-of-the-few-ships-with-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.unlock-2")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.reaching-sector-8-with-the-mantis")
          },
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.notes-this-layout-is-one-of")
          }
        ]
      }
    ]
  },
  {
    "page": "The Crystal Cruiser",
    "layouts": [
      {
        "id": "crystal-a",
        "page": "The Crystal Cruiser",
        "heading": tx("wiki.layout-pages.layout-a"),
        "source": tx("wiki.layout-pages.the-crystal-cruiser-section-layout-a"),
        "figureFile": "CrystalASystems.png",
        "figure": "/layouts/CrystalASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.this-powerful-vessel-is-powered-by")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-bravais")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew-2-human-2-crystal")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-3")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.crystal-burst-mark-i")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.heavy-crystal-mark-i")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-requires-system")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.augmentations")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.crystal-vengeance")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.see-ancestry-ship-achievement-and-its")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.alternatively-beat-the-flagship-with-layout")
          }
        ]
      },
      {
        "id": "crystal-b",
        "page": "The Crystal Cruiser",
        "heading": tx("wiki.layout-pages.layout-b"),
        "source": tx("wiki.layout-pages.the-crystal-cruiser-section-layout-b"),
        "figureFile": "CrystalBSystems.png",
        "figure": "/layouts/CrystalBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": tx("wiki.layout-pages.their-unique-racial-ability-makes-the")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.default-name-carnelian")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.crew-3-crystal")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.reactor-8")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.systems")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.shields-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.engines-2")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.medbay-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.oxygen-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.teleporter-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.cloaking-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.weapon-control-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.piloting-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.sensors-1")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.door-system-1")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.weapons-4-slots")
          },
          {
            "depth": 2,
            "text": "none"
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.drones-2-slots")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.none-requires-system")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.augmentations")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.crystal-vengeance")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.resources")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.16-fuel")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-missiles")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.0-drone-parts")
          },
          {
            "depth": 1,
            "text": tx("wiki.layout-pages.unlock")
          },
          {
            "depth": 2,
            "text": tx("wiki.layout-pages.earn-at-least-two-out-of-3")
          }
        ]
      }
    ]
  }
];

export function cruiserPage(title: string) {
  return CRUISER_PAGES.find((page) => page.page === title);
}
