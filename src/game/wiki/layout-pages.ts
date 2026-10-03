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
        "heading": "Layout A",
        "source": "The Kestrel Cruiser, section Layout A",
        "figureFile": "KestralASystems.png",
        "figure": "/layouts/KestralASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This class of ship was decommissioned from Federation service years ago. After a number of refits and updating, this classic ship is ready for battle.\""
          },
          {
            "depth": 1,
            "text": "Default name: The Kestrel"
          },
          {
            "depth": 1,
            "text": "Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Crew:"
          },
          {
            "depth": 2,
            "text": "Human (3)"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (3)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "Artemis Missiles"
          },
          {
            "depth": 2,
            "text": "Burst Laser II"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (system not installed)"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "8 Missiles"
          },
          {
            "depth": 2,
            "text": "2 Drone parts"
          },
          {
            "depth": 0,
            "text": "Unlock:"
          },
          {
            "depth": 1,
            "text": "Does not require unlocking (it is the only ship, the cruiser and the layout, available from the very start of the game)"
          }
        ]
      },
      {
        "id": "kestrel-b",
        "page": "The Kestrel Cruiser",
        "heading": "Layout B",
        "source": "The Kestrel Cruiser, section Layout B",
        "figureFile": "KestralB.png",
        "figure": "/layouts/KestralB.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This modified Kestrel class ship was created by a laser weapon aficionado.\""
          },
          {
            "depth": 1,
            "text": "Default name: Red-Tail"
          },
          {
            "depth": 1,
            "text": "Crew: 2 Human, 1 Mantis, 1 Zoltan"
          },
          {
            "depth": 1,
            "text": "Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (4)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "Basic Laser (x4)"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (requires system)"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "5 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Unlock:"
          },
          {
            "depth": 2,
            "text": "Earn at least two out of three achievements for the Kestrel Cruiser"
          }
        ]
      },
      {
        "id": "kestrel-c",
        "page": "The Kestrel Cruiser",
        "heading": "Layout C",
        "source": "The Kestrel Cruiser, section Layout C",
        "figureFile": "KestralCSystems.png",
        "figure": "/layouts/KestralCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This model was modified by pirates to utilize newly discovered technology. It can clone lost crewmembers and stun enemies.\""
          },
          {
            "depth": 1,
            "text": "Default name: The Swallow"
          },
          {
            "depth": 1,
            "text": "Crew: 2 Human, 1 Lanius"
          },
          {
            "depth": 1,
            "text": "Reactor: 7"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Clone Bay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (2)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (2)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "Dual Lasers"
          },
          {
            "depth": 2,
            "text": "Ion Stunner"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (requires system)"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "4 Missiles"
          },
          {
            "depth": 2,
            "text": "3 Drone parts"
          },
          {
            "depth": 1,
            "text": "Unlock:"
          },
          {
            "depth": 2,
            "text": "Reach the final sector with the Kestrel Cruiser layout B and Advanced Edition Content enabled"
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
        "heading": "Layout A",
        "source": "The Engi Cruiser, section Layout A",
        "figureFile": "EngiASystems.png",
        "figure": "/layouts/EngiASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"Although it may look like a pile of junk loosely held together, this well designed ship relies on drones and ion weaponry.\""
          },
          {
            "depth": 1,
            "text": "Default name: The Torus"
          },
          {
            "depth": 1,
            "text": "Crew: 2 Engi, 1 Human"
          },
          {
            "depth": 1,
            "text": "Reactor: 10"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (3)"
          },
          {
            "depth": 2,
            "text": "Drone Control (3)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (3 slots):"
          },
          {
            "depth": 2,
            "text": "Ion Blast II"
          },
          {
            "depth": 1,
            "text": "Drones (3 slots):"
          },
          {
            "depth": 2,
            "text": "Combat Drone Mark I"
          },
          {
            "depth": 1,
            "text": "Augmentations:"
          },
          {
            "depth": 2,
            "text": "Engi Med-bot Dispersal"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "15 Drone parts"
          },
          {
            "depth": 1,
            "text": "Unlock:"
          },
          {
            "depth": 2,
            "text": "Reaching a sector 5 with any Kestrel Cruiser layout automatically unlocks the Engi Cruiser"
          }
        ]
      },
      {
        "id": "engi-b",
        "page": "The Engi Cruiser",
        "heading": "Layout B",
        "source": "The Engi Cruiser, section Layout B",
        "figureFile": "EngiBSystems.png",
        "figure": "/layouts/EngiBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"Heavily understaffed, this ship relies on drones to keep the ship running.\""
          },
          {
            "depth": 1,
            "text": "Default name: The Vortex"
          },
          {
            "depth": 1,
            "text": "Crew: 1 Engi"
          },
          {
            "depth": 1,
            "text": "Reactor: 9"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (1)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (3)"
          },
          {
            "depth": 2,
            "text": "Drone Control (3)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (3 slots):"
          },
          {
            "depth": 2,
            "text": "Heavy Ion"
          },
          {
            "depth": 2,
            "text": "Heavy Laser I"
          },
          {
            "depth": 1,
            "text": "Drones (3 slots):"
          },
          {
            "depth": 2,
            "text": "Anti-Personnel Drone"
          },
          {
            "depth": 2,
            "text": "System Repair Drone (x2)"
          },
          {
            "depth": 1,
            "text": "Augmentations:"
          },
          {
            "depth": 2,
            "text": "Drone Reactor Booster"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "6 Drone parts"
          },
          {
            "depth": 1,
            "text": "Unlock:"
          },
          {
            "depth": 2,
            "text": "Earn at least two out of three achievements for the Engi Cruiser"
          }
        ]
      },
      {
        "id": "engi-c",
        "page": "The Engi Cruiser",
        "heading": "Layout C",
        "source": "The Engi Cruiser, section Layout C",
        "figureFile": "EngiCSystems.png",
        "figure": "/layouts/EngiCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"The Engi were quick to adapt to the sudden surge of hacking technology - this ship is the result of their research.\""
          },
          {
            "depth": 1,
            "text": "Default name: Tetragon"
          },
          {
            "depth": 1,
            "text": "Crew: 1 Lanius, 2 Engi"
          },
          {
            "depth": 1,
            "text": "Reactor: 9"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Clone Bay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Hacking (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (1)"
          },
          {
            "depth": 2,
            "text": "Drone Control (2)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (3 slots):"
          },
          {
            "depth": 2,
            "text": "Dual Lasers"
          },
          {
            "depth": 1,
            "text": "Drones (3 slots):"
          },
          {
            "depth": 2,
            "text": "Beam I"
          },
          {
            "depth": 1,
            "text": "Augmentations:"
          },
          {
            "depth": 2,
            "text": "Defense Scrambler"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "25 Drone parts"
          },
          {
            "depth": 1,
            "text": "Unlock:"
          },
          {
            "depth": 2,
            "text": "Reach the final sector with the Engi Cruiser layout B and Advanced Edition Content enabled"
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
        "heading": "Layout A",
        "source": "The Federation Cruiser, section Layout A",
        "figureFile": "FedASystems.png",
        "figure": "/layouts/FedASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This ship features the latest in federation technology: an advanced beam weapon that pierces through shields!\""
          },
          {
            "depth": 1,
            "text": "Default name: The Osprey"
          },
          {
            "depth": 1,
            "text": "Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Crew:"
          },
          {
            "depth": 2,
            "text": "Human (1)"
          },
          {
            "depth": 2,
            "text": "Mantis (1)"
          },
          {
            "depth": 2,
            "text": "Rockman (1)"
          },
          {
            "depth": 2,
            "text": "Engi (1)"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Artillery Beam (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (2)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "Burst Laser II"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (system not installed)"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "5 Missiles"
          },
          {
            "depth": 2,
            "text": "2 Drone parts"
          },
          {
            "depth": 0,
            "text": "Unlock:"
          },
          {
            "depth": 1,
            "text": "Defeat the Flagship prototype in the Rebel Stronghold sector to unlock this ship."
          },
          {
            "depth": 1,
            "text": "Alternatively, defeat the Rebel Flagship with the Engi Cruiser."
          }
        ]
      },
      {
        "id": "fed-b",
        "page": "The Federation Cruiser",
        "heading": "Layout B",
        "source": "The Federation Cruiser, section Layout B",
        "figureFile": "FederationBSystems.png",
        "figure": "/layouts/FederationBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This ship features additional Artillery power, encouraging heavy reliance on the beam.\""
          },
          {
            "depth": 1,
            "text": "Default name: Nisos"
          },
          {
            "depth": 1,
            "text": "Reactor: 9"
          },
          {
            "depth": 1,
            "text": "Crew:"
          },
          {
            "depth": 2,
            "text": "Human (1)"
          },
          {
            "depth": 2,
            "text": "Slug (1)"
          },
          {
            "depth": 2,
            "text": "Zoltan (1)"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Artillery Beam (2)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (2)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "Dual Lasers"
          },
          {
            "depth": 2,
            "text": "Leto Missiles"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (system not installed)"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "9 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 0,
            "text": "Unlock:"
          },
          {
            "depth": 1,
            "text": "Earning two of the three Federation Cruiser achievements will unlock layout B."
          }
        ]
      },
      {
        "id": "fed-c",
        "page": "The Federation Cruiser",
        "heading": "Layout C",
        "source": "The Federation Cruiser, section Layout C",
        "figureFile": "FederationCSystems.png",
        "figure": "/layouts/FederationCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"With a Flak Artillery weapon and an improved Clone Bay, only the most suicidal of infantry chooses to fly on this ship.\""
          },
          {
            "depth": 1,
            "text": "Default name: The Fregatidae"
          },
          {
            "depth": 1,
            "text": "Reactor: 7"
          },
          {
            "depth": 1,
            "text": "Crew:"
          },
          {
            "depth": 2,
            "text": "Human (1)"
          },
          {
            "depth": 2,
            "text": "Zoltan (2)"
          },
          {
            "depth": 2,
            "text": "Mantis (1)"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Clone Bay (2)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Crew Teleporter (1)"
          },
          {
            "depth": 2,
            "text": "Flak Artillery (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (1)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "none"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (system not installed)"
          },
          {
            "depth": 1,
            "text": "Augmentations:"
          },
          {
            "depth": 2,
            "text": "Emergency Respirators"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "5 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 0,
            "text": "Unlock:"
          },
          {
            "depth": 1,
            "text": "Reaching Sector 8 with The Federation Cruiser B and Advanced Edition content enabled will unlock Layout C."
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
        "heading": "Layout A",
        "source": "The Zoltan Cruiser, section Layout A",
        "figureFile": "ZoltanASystems.png",
        "figure": "/layouts/ZoltanASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"The Zoltan's advanced shields technology give this ship an edge during each battle.\""
          },
          {
            "depth": 1,
            "text": "Default name: The Adjudicator"
          },
          {
            "depth": 1,
            "text": "Crew: 3 Zoltan"
          },
          {
            "depth": 1,
            "text": "Reactor: 5"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (1)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Weapons (3)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (2)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "Halberd Beam"
          },
          {
            "depth": 2,
            "text": "Leto Missiles"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (requires system)"
          },
          {
            "depth": 1,
            "text": "Augmentations:"
          },
          {
            "depth": 2,
            "text": "Zoltan Shield"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "12 Missiles"
          },
          {
            "depth": 2,
            "text": "2 Drone parts"
          },
          {
            "depth": 1,
            "text": "Unlock:"
          },
          {
            "depth": 2,
            "text": "See the Unarmed Zoltan Transport."
          },
          {
            "depth": 2,
            "text": "Alternatively, defeat The Rebel Flagship with the Federation Cruiser."
          }
        ]
      },
      {
        "id": "zoltan-b",
        "page": "The Zoltan Cruiser",
        "heading": "Layout B",
        "source": "The Zoltan Cruiser, section Layout B",
        "figureFile": "ZoltanB.png",
        "figure": "/layouts/ZoltanB.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This ship starts with a weakened Shield system and must rely on its Zoltan shield.\""
          },
          {
            "depth": 1,
            "text": "Default Name: Noether"
          },
          {
            "depth": 1,
            "text": "Crew: 3 Zoltan"
          },
          {
            "depth": 1,
            "text": "Reactor: 5"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (1)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (4)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "Ion Blast (x2)"
          },
          {
            "depth": 2,
            "text": "Pike Beam"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (requires system)"
          },
          {
            "depth": 1,
            "text": "Augmentations:"
          },
          {
            "depth": 2,
            "text": "Zoltan Shield"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "2 Drone parts"
          },
          {
            "depth": 1,
            "text": "Unlock:"
          },
          {
            "depth": 2,
            "text": "Earning two of the three Zoltan Cruiser achievements will unlock Layout B."
          },
          {
            "depth": 1,
            "text": "Special notes:"
          },
          {
            "depth": 2,
            "text": "Weak (level 1) Shields system requires 100 scrap to upgrade it to level 2 (in order to have a normal shield layer)"
          }
        ]
      },
      {
        "id": "zoltan-c",
        "page": "The Zoltan Cruiser",
        "heading": "Layout C",
        "source": "The Zoltan Cruiser, section Layout C",
        "figureFile": "ZoltanCSystems.png",
        "figure": "/layouts/ZoltanCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"The designer of this ship was not willing to spend the money for a decent reactor. Instead it relies on its Zoltan crew and Backup Battery.\""
          },
          {
            "depth": 1,
            "text": "Default name: Cerenkov"
          },
          {
            "depth": 1,
            "text": "Crew: 4 Zoltan"
          },
          {
            "depth": 1,
            "text": "Reactor: 2"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Clone Bay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Weapons (2)"
          },
          {
            "depth": 2,
            "text": "Drones (3)"
          },
          {
            "depth": 2,
            "text": "Backup Battery (2)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "Ion Charger"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (requires system)"
          },
          {
            "depth": 2,
            "text": "Anti-Ship Beam Drone I"
          },
          {
            "depth": 1,
            "text": "Augmentations:"
          },
          {
            "depth": 2,
            "text": "Zoltan Shield"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "2 Missiles"
          },
          {
            "depth": 2,
            "text": "15 Drone parts"
          },
          {
            "depth": 1,
            "text": "Unlock:"
          },
          {
            "depth": 2,
            "text": "Getting to Sector 8 with the The Zoltan Cruiser Type B with Advanced Edition Content enabled will unlock Layout C."
          },
          {
            "depth": 1,
            "text": "Special notes:"
          },
          {
            "depth": 2,
            "text": "Weak (level 2) Reactor requires 30 scrap per power bar upgrade until level 5 (inclusive)."
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
        "heading": "Layout A",
        "source": "The Lanius Cruiser, section Layout A",
        "figureFile": "LaniusASystems.png",
        "figure": "/layouts/LaniusASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"The sharp knife-like structures make Lanius ships a sight to behold. This cruiser was adapted to support the other races of the Federation.\""
          },
          {
            "depth": 1,
            "text": "Default name: Kruos"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 1 Human, 2 Lanius"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Clone Bay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (1)"
          },
          {
            "depth": 2,
            "text": "Weapons (3)"
          },
          {
            "depth": 2,
            "text": "Hacking (1)"
          },
          {
            "depth": 1,
            "text": "Starting Weapons:"
          },
          {
            "depth": 2,
            "text": "Chain Burst Laser"
          },
          {
            "depth": 2,
            "text": "Ion Stunner"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Emergency Respirators"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "3 Missiles"
          },
          {
            "depth": 2,
            "text": "9 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 4 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Including Resources): 955"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Not Including Resources): 865"
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "Unlock 4 ships (Excluding The Kestrel) to unlock this ship."
          }
        ]
      },
      {
        "id": "lanius-b",
        "page": "The Lanius Cruiser",
        "heading": "Layout B",
        "source": "The Lanius Cruiser, section Layout B",
        "figureFile": "LaniusBSystems.png",
        "figure": "/layouts/LaniusBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"The racial ability of the Lanius make them fearsome combatants in small quarters. Combine that with a Mind Control system and this ship is a force to be reckoned with.\""
          },
          {
            "depth": 1,
            "text": "Default name: The Shrike"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 1 Engi, 2 Lanius"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (1)"
          },
          {
            "depth": 2,
            "text": "Clone Bay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (1)"
          },
          {
            "depth": 2,
            "text": "Teleporter (1)"
          },
          {
            "depth": 2,
            "text": "Weapons (1)"
          },
          {
            "depth": 2,
            "text": "Mind Control (1)"
          },
          {
            "depth": 1,
            "text": "Starting Weapon:"
          },
          {
            "depth": 2,
            "text": "Advanced Flak"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Emergency Respirators"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 4 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost: 815"
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "Earning two of the three Lanius Cruiser achievements will unlock Layout B."
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
        "heading": "Layout A",
        "source": "The Stealth Cruiser, section Layout A",
        "figureFile": "StealthASystems.png",
        "figure": "/layouts/StealthASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"Constructed for the Federation by the Engi, this ship is designed to use cloaking technology and speed to get behind enemy lines.\""
          },
          {
            "depth": 1,
            "text": "Default name: The Nesasio"
          },
          {
            "depth": 1,
            "text": "Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Crew:"
          },
          {
            "depth": 2,
            "text": "Human (3)"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Engines (4)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Cloaking (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (2)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (2)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (3 slots):"
          },
          {
            "depth": 2,
            "text": "Mini Beam"
          },
          {
            "depth": 2,
            "text": "Dual Lasers"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (and requires system)"
          },
          {
            "depth": 1,
            "text": "Augmentations:"
          },
          {
            "depth": 2,
            "text": "Titanium System Casing"
          },
          {
            "depth": 2,
            "text": "Long-Ranged Scanners"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 0,
            "text": "Unlock:"
          },
          {
            "depth": 1,
            "text": "See the Engi fleet discussion event."
          },
          {
            "depth": 1,
            "text": "Alternatively, defeat the Rebel Flagship with the Rock Cruiser."
          }
        ]
      },
      {
        "id": "stealth-b",
        "page": "The Stealth Cruiser",
        "heading": "Layout B",
        "source": "The Stealth Cruiser, section Layout B",
        "figureFile": "StealthBSystems.png",
        "figure": "/layouts/StealthBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"Built like a glass cannon, this ship is hard to handle. If its cloaking can keep it safe long enough to charge its weapon, few cruisers can withstand its might.\""
          },
          {
            "depth": 1,
            "text": "Default name: DA-SR 12"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 2 Human, 1 Zoltan"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 7"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (2)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Cloaking (2)"
          },
          {
            "depth": 2,
            "text": "Weapons (4)"
          },
          {
            "depth": 1,
            "text": "Starting Weapon:"
          },
          {
            "depth": 2,
            "text": "Glaive Beam"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Long-Ranged Scanners"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 3 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "Earning two of the three Stealth Cruiser achievements will unlock Layout B."
          }
        ]
      },
      {
        "id": "stealth-c",
        "page": "The Stealth Cruiser",
        "heading": "Layout C",
        "source": "The Stealth Cruiser, section Layout C",
        "figureFile": "StealthCSystems.png",
        "figure": "/layouts/StealthCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This ship was part of an Engi experiment to make a power efficient version of the Zoltan shield. Unfortunately this required the removal of the Cloaking system.\""
          },
          {
            "depth": 1,
            "text": "Default name: Simo-H"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 1 Human, 1 Rockman, 1 Slug"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 7"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (1)"
          },
          {
            "depth": 2,
            "text": "Clone Bay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Engines (3)"
          },
          {
            "depth": 2,
            "text": "Weapons (2)"
          },
          {
            "depth": 2,
            "text": "Drones (2)"
          },
          {
            "depth": 1,
            "text": "Starting Weapons:"
          },
          {
            "depth": 2,
            "text": "Laser Charger (S)"
          },
          {
            "depth": 2,
            "text": "Mini Beam"
          },
          {
            "depth": 1,
            "text": "Starting Drones:"
          },
          {
            "depth": 2,
            "text": "Shield Overcharger +"
          },
          {
            "depth": 2,
            "text": "Anti-Drone"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Long-Ranged Scanners"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "16 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 3 Weapon, 3 Drone"
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "Reaching sector 8 with the Stealth Cruiser B and Advanced Mode enabled will unlock layout C."
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
        "heading": "Layout A",
        "source": "The Rock Cruiser, section Layout A",
        "figureFile": "RockASystems.png",
        "figure": "/layouts/RockASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"Similar to its designers, this super dense behemoth uses brute force to overwhelm its foes.\""
          },
          {
            "depth": 1,
            "text": "Default name: Bulwark"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 3 Rockmen"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Weapons (3)"
          },
          {
            "depth": 1,
            "text": "Starting Weapons:"
          },
          {
            "depth": 2,
            "text": "Artemis Missiles"
          },
          {
            "depth": 2,
            "text": "Hull Missile"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Rock Plating"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "28 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 4 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Including Resources): 1016"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Not Including Resources): 844"
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "See the Rock war vessel encounter."
          },
          {
            "depth": 0,
            "text": "Alternatively, defeat The Rebel Flagship with the Slug cruiser."
          }
        ]
      },
      {
        "id": "rock-b",
        "page": "The Rock Cruiser",
        "heading": "Layout B",
        "source": "The Rock Cruiser, section Layout B",
        "figureFile": "RockBSystems.png",
        "figure": "/layouts/RockBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"With no airlocks, this ship must rely entirely on its rock crew to put out fires.\""
          },
          {
            "depth": 1,
            "text": "Default name: Shivan"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 4 Rockmen"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (2)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Weapons (3)"
          },
          {
            "depth": 1,
            "text": "Starting Weapons:"
          },
          {
            "depth": 2,
            "text": "Heavy Pierce Laser Mk. I"
          },
          {
            "depth": 2,
            "text": "Fire Bomb"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Rock Plating"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "18 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 4 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Including Resources): 978"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Not Including Resources): 870"
          },
          {
            "depth": 0,
            "text": "The Shivan starts without a Door System, requiring 60 scrap to buy it. It is the only ship which does not have airlocks, preventing any sections from being vented to space except via a hull breach or with Lanius crew."
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "Earning two of the three Rock Cruiser achievements will unlock Layout B."
          }
        ]
      },
      {
        "id": "rock-c",
        "page": "The Rock Cruiser",
        "heading": "Layout C",
        "source": "The Rock Cruiser, section Layout C",
        "figureFile": "RockCSystems.png",
        "figure": "/layouts/RockCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"Contact has been made with the Crystalline race and this cruiser was offered to the Federation as part of diplomatic discussions between the sister species.\""
          },
          {
            "depth": 1,
            "text": "Default name: Tektite"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 2 Rockmen, 1 Crystal"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Clone Bay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Weapons (3)"
          },
          {
            "depth": 1,
            "text": "Starting Weapons:"
          },
          {
            "depth": 2,
            "text": "Swarm Missiles"
          },
          {
            "depth": 2,
            "text": "Heavy Crystal Mark I"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Rock Plating"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "15 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 4 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Including Resources): 925"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Not Including Resources): 835"
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "Reaching sector 8 with the Rock Cruiser B with Advanced Mode enabled will unlock layout C."
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
        "heading": "Layout A",
        "source": "The Slug Cruiser, section Layout A",
        "figureFile": "SlugASystems.png",
        "figure": "/layouts/SlugASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"Designed for use inside nebula, this cruiser lacks sensors and relies instead on the guile and cunning of the Slugs.\""
          },
          {
            "depth": 1,
            "text": "Default name: Man of War"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 2 Slug"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (2)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Weapons (3)"
          },
          {
            "depth": 1,
            "text": "Starting Weapons:"
          },
          {
            "depth": 2,
            "text": "Anti-Bio Beam"
          },
          {
            "depth": 2,
            "text": "Breach Bomb I"
          },
          {
            "depth": 2,
            "text": "Dual Lasers"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Slug Repair Gel"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "15 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 4 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Including Resources): 865"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Not Including Resources): 775"
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "See the Slug Home Nebula Surrender random event."
          },
          {
            "depth": 0,
            "text": "Alternatively, defeat The Rebel Flagship with the Mantis Cruiser."
          }
        ]
      },
      {
        "id": "slug-b",
        "page": "The Slug Cruiser",
        "heading": "Layout B",
        "source": "The Slug Cruiser, section Layout B",
        "figureFile": "SlugBSystems.png",
        "figure": "/layouts/SlugBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This boarding ship has no medical facilities and must manage its explosives carefully to keep the crew alive.\""
          },
          {
            "depth": 1,
            "text": "Default name: The Stormwalker"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 3 Slug"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 7"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (2)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Teleporter (1)"
          },
          {
            "depth": 2,
            "text": "Weapons (2)"
          },
          {
            "depth": 1,
            "text": "Starting Weapons:"
          },
          {
            "depth": 2,
            "text": "Healing Burst"
          },
          {
            "depth": 2,
            "text": "Artemis Missiles"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Slug Repair Gel"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "25 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 4 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Including Resources): 878"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Not Including Resources): 728"
          },
          {
            "depth": 0,
            "text": "The Stormwalker starts with a teleporter but lacks a medbay, resulting in reliance on the Healing Burst to heal crew members."
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "Earning two of the three Slug Cruiser achievements will unlock Layout B."
          }
        ]
      },
      {
        "id": "slug-c",
        "page": "The Slug Cruiser",
        "heading": "Layout C",
        "source": "The Slug Cruiser, section Layout C",
        "figureFile": "SlugCSystems.png",
        "figure": "/layouts/SlugCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"Slugs are often skilled in the arts of misdirection and manipulation. With Hacking and Mind Control systems, this ship capitalizes on that fact.\""
          },
          {
            "depth": 1,
            "text": "Default name: Ariolimax"
          },
          {
            "depth": 1,
            "text": "Starting crew: 3 Slug"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 9"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (2)"
          },
          {
            "depth": 2,
            "text": "Clone Bay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Weapons (2)"
          },
          {
            "depth": 2,
            "text": "Hacking (1)"
          },
          {
            "depth": 2,
            "text": "Mind Control (1)"
          },
          {
            "depth": 1,
            "text": "Starting Weapon:"
          },
          {
            "depth": 2,
            "text": "Chain Burst Laser"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Slug Repair Gel"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "1 Missiles"
          },
          {
            "depth": 2,
            "text": "15 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 4 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Including Resources): 1031"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Not Including Resources): 905"
          },
          {
            "depth": 0,
            "text": "The Ariolimax starts with Hacking and Mind Control, making it effective at disrupting an enemy ship."
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "Reaching sector 8 with the Slug Cruiser B on any difficulty with Advanced Edition Content enabled will unlock layout C."
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
        "heading": "Layout A",
        "source": "The Mantis Cruiser, section Layout A",
        "figureFile": "MantisASystems.png",
        "figure": "/layouts/MantisASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This warship is designed to enhance its crew for close combat missions.\""
          },
          {
            "depth": 1,
            "text": "Default name: The Gila Monster"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 3 Mantis, 1 Engi"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 7"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (1)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Teleporter (1)"
          },
          {
            "depth": 2,
            "text": "Weapons (1)"
          },
          {
            "depth": 1,
            "text": "Starting Weapons:"
          },
          {
            "depth": 2,
            "text": "Small Bomb"
          },
          {
            "depth": 2,
            "text": "Basic Laser"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Mantis Pheromones"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "16 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 3 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Including Resources): 891"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Not Including Resources): 795"
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "See Legendary Thief KazaaakplethKilik random event."
          },
          {
            "depth": 0,
            "text": "Alternatively, defeat The Rebel Flagship with the Zoltan Cruiser."
          }
        ]
      },
      {
        "id": "mantis-b",
        "page": "The Mantis Cruiser",
        "heading": "Layout B",
        "source": "The Mantis Cruiser, section Layout B",
        "figureFile": "MantisBSystems.png",
        "figure": "/layouts/MantisBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This warship encourages sending massive boarding parties and keeping strong defense.\""
          },
          {
            "depth": 1,
            "text": "Default Name: The Basilisk"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 2 Mantis"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 11"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (4)"
          },
          {
            "depth": 2,
            "text": "Engines (1)"
          },
          {
            "depth": 2,
            "text": "Teleporter (1)"
          },
          {
            "depth": 2,
            "text": "Weapons (1)"
          },
          {
            "depth": 2,
            "text": "Drones (3)"
          },
          {
            "depth": 1,
            "text": "Starting Drones:"
          },
          {
            "depth": 2,
            "text": "Boarding Drone"
          },
          {
            "depth": 2,
            "text": "Defense Drone I"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Mantis Pheromones"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "15 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 3 Weapon, 2 Drone"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Including Resources): 1015"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Not Including Resources): 895"
          },
          {
            "depth": 0,
            "text": "One of the few ships with a four man crew teleporter; one of the few ships without starting Weapons."
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "Earning two of the three Mantis Cruiser achievements will unlock Layout B."
          }
        ]
      },
      {
        "id": "mantis-c",
        "page": "The Mantis Cruiser",
        "heading": "Layout C",
        "source": "The Mantis Cruiser, section Layout C",
        "figureFile": "MantisCSystems.png",
        "figure": "/layouts/MantisCSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"With a large teleporter and weapons designed to impede enemy crew, this ship is deadly in the hands of a capable boarding party.\""
          },
          {
            "depth": 1,
            "text": "Default Name: The Theseus"
          },
          {
            "depth": 1,
            "text": "Starting Crew: 1 Engi, 1 Mantis, 1 Lanius"
          },
          {
            "depth": 1,
            "text": "Starting Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Starting Systems:"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Doors (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Clone Bay (2)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Teleporter (1)"
          },
          {
            "depth": 2,
            "text": "Weapons (2)"
          },
          {
            "depth": 1,
            "text": "Starting Weapons:"
          },
          {
            "depth": 2,
            "text": "Crystal Lockdown Bomb"
          },
          {
            "depth": 2,
            "text": "Stun Bomb"
          },
          {
            "depth": 1,
            "text": "Starting Augmentation:"
          },
          {
            "depth": 2,
            "text": "Mantis Pheromones"
          },
          {
            "depth": 1,
            "text": "Starting Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "20 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Slots: 3 Weapon, 2 Drone (requires system)"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Including Resources): 980"
          },
          {
            "depth": 1,
            "text": "Total Scrap Cost (Not Including Resources): 860"
          },
          {
            "depth": 0,
            "text": "One of the few ships with a four-man crew teleporter."
          },
          {
            "depth": 0,
            "text": "Unlock"
          },
          {
            "depth": 0,
            "text": "Reaching Sector 8 with the Mantis Cruiser B and Advanced Edition Content enabled will unlock layout C."
          },
          {
            "depth": 0,
            "text": "Notes: this layout is one of the ships with most airlocks."
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
        "heading": "Layout A",
        "source": "The Crystal Cruiser, section Layout A",
        "figureFile": "CrystalASystems.png",
        "figure": "/layouts/CrystalASystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"This powerful vessel is powered by the secret technologies of the lost Crystalline Beings.\""
          },
          {
            "depth": 1,
            "text": "Default name: Bravais"
          },
          {
            "depth": 1,
            "text": "Crew: 2 Human, 2 Crystal"
          },
          {
            "depth": 1,
            "text": "Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (3)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "Crystal Burst Mark I"
          },
          {
            "depth": 2,
            "text": "Heavy Crystal Mark I"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (requires system)"
          },
          {
            "depth": 1,
            "text": "Augmentations:"
          },
          {
            "depth": 2,
            "text": "Crystal Vengeance"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Unlock:"
          },
          {
            "depth": 2,
            "text": "See Ancestry (ship achievement) and its linked pages for directions on unlocking the Crystal Cruiser"
          },
          {
            "depth": 2,
            "text": "Alternatively, beat the Flagship with layout A and B of every ship (excluding The Lanius Cruiser)"
          }
        ]
      },
      {
        "id": "crystal-b",
        "page": "The Crystal Cruiser",
        "heading": "Layout B",
        "source": "The Crystal Cruiser, section Layout B",
        "figureFile": "CrystalBSystems.png",
        "figure": "/layouts/CrystalBSystems.webp",
        "lines": [
          {
            "depth": 0,
            "text": "\"Their unique racial ability makes the Crystal beings very adept at ship boarding. This ship was designed for such raiding parties.\""
          },
          {
            "depth": 1,
            "text": "Default name: Carnelian"
          },
          {
            "depth": 1,
            "text": "Crew: 3 Crystal"
          },
          {
            "depth": 1,
            "text": "Reactor: 8"
          },
          {
            "depth": 1,
            "text": "Systems:"
          },
          {
            "depth": 2,
            "text": "Shields (2)"
          },
          {
            "depth": 2,
            "text": "Engines (2)"
          },
          {
            "depth": 2,
            "text": "Medbay (1)"
          },
          {
            "depth": 2,
            "text": "Oxygen (1)"
          },
          {
            "depth": 2,
            "text": "Teleporter (1)"
          },
          {
            "depth": 2,
            "text": "Cloaking (1)"
          },
          {
            "depth": 2,
            "text": "Weapon Control (1)"
          },
          {
            "depth": 2,
            "text": "Piloting (1)"
          },
          {
            "depth": 2,
            "text": "Sensors (1)"
          },
          {
            "depth": 2,
            "text": "Door System (1)"
          },
          {
            "depth": 1,
            "text": "Weapons (4 slots):"
          },
          {
            "depth": 2,
            "text": "none"
          },
          {
            "depth": 1,
            "text": "Drones (2 slots):"
          },
          {
            "depth": 2,
            "text": "none (requires system)"
          },
          {
            "depth": 1,
            "text": "Augmentations:"
          },
          {
            "depth": 2,
            "text": "Crystal Vengeance"
          },
          {
            "depth": 1,
            "text": "Resources:"
          },
          {
            "depth": 2,
            "text": "16 Fuel"
          },
          {
            "depth": 2,
            "text": "0 Missiles"
          },
          {
            "depth": 2,
            "text": "0 Drone parts"
          },
          {
            "depth": 1,
            "text": "Unlock:"
          },
          {
            "depth": 2,
            "text": "Earn at least two out of three achievements for the Crystal Cruiser"
          }
        ]
      }
    ]
  }
];

export function cruiserPage(title: string) {
  return CRUISER_PAGES.find((page) => page.page === title);
}
