/**
 * Wiki pages "Achievements" and "Ship Achievements".
 * Requirements are the unlock lines, not the tips.
 * Easy and Normal stay separate rows. Unnamed victory and quest blurbs are not rows.
 */

export type AchievementRow = {
  id: string;
  name: string;
  ship: string | null;
  requirement: string;
  source: string;
};

export const ACHIEVEMENTS: AchievementRow[] = [
  {
    id: "just-getting-started",
    name: "Just Getting Started",
    ship: null,
    requirement: "Get to sector 5.",
    source: "Achievements",
  },
  {
    id: "federation-base-in-range",
    name: "Federation Base in Range",
    ship: null,
    requirement: "Get to sector 8.",
    source: "Achievements",
  },
  {
    id: "federation-victory-easy",
    name: "Federation Victory (Easy)",
    ship: null,
    requirement: "Beat the boss on Easy.",
    source: "Achievements",
  },
  {
    id: "federation-victory-normal",
    name: "Federation Victory (Normal)",
    ship: null,
    requirement: "Beat the boss on Normal.",
    source: "Achievements",
  },
  {
    id: "your-own-fleet",
    name: "Your Own Fleet",
    ship: null,
    requirement: "Unlock the Type A layout for every playable ship.",
    source: "Achievements",
  },
  {
    id: "rule-ten-greed-is-eternal",
    name: "Rule Ten: Greed is Eternal",
    ship: null,
    requirement: "Collect 10,000 scrap across all games.",
    source: "Achievements",
  },
  {
    id: "warlord",
    name: "Warlord",
    ship: null,
    requirement: "Defeat 1000 ships across all playthroughs.",
    source: "Achievements",
  },
  {
    id: "coming-in-for-my-pacifism-run",
    name: "Coming in for my Pacifism run!",
    ship: null,
    requirement: "Get to sector 5 without firing a shot, using an offensive drone, or teleporting.",
    source: "Achievements",
  },
  {
    id: "i-dont-need-no-stinkin-upgrades",
    name: "I don't need no stinkin' upgrades!",
    ship: null,
    requirement: "Get to sector 5 with no system/reactor upgrades.",
    source: "Achievements",
  },
  {
    id: "on-a-wing-and-a-prayer",
    name: "On a Wing and a Prayer",
    ship: null,
    requirement: "Get to sector 5 without repairing at a store.",
    source: "Achievements",
  },
  {
    id: "ballistophobia",
    name: "Ballistophobia",
    ship: null,
    requirement: "Get to sector 8 without using missiles/bombs.",
    source: "Achievements",
  },
  {
    id: "technophobia",
    name: "Technophobia",
    ship: null,
    requirement: "Get to sector 8 without using drones.",
    source: "Achievements",
  },
  {
    id: "living-off-the-land",
    name: "Living off the Land",
    ship: null,
    requirement: "Get to sector 8 without buying at a store (Repairs are ok).",
    source: "Achievements",
  },
  {
    id: "no-redshirts-here",
    name: "No Redshirts Here",
    ship: null,
    requirement: "Get to sector 8 without losing a crewmember.",
    source: "Achievements",
  },
  {
    id: "some-people-just-like-to-watch-ships-burn",
    name: "Some people just like to watch ships burn",
    ship: null,
    requirement: "Have every square of an enemy ship on fire simultaneously.",
    source: "Achievements",
  },
  {
    id: "astronomically-low-odds",
    name: "Astronomically Low Odds",
    ship: null,
    requirement: "Fail to evade 5 shots in a row with a fully powered and upgraded engine.",
    source: "Achievements",
  },
  {
    id: "boarding-objective-successful",
    name: "BOARDING OBJECTIVE SUCCESSFUL",
    ship: null,
    requirement: "Have a single boarding drone kill 4 crewmembers on one ship.",
    source: "Achievements",
  },
  {
    id: "they-never-saw-it-coming",
    name: "They never saw it coming",
    ship: null,
    requirement:
      "Use the Weapon Pre-Igniter augmentation to destroy an enemy ship in one volley before the enemy can get a single shot off.",
    source: "Achievements",
  },
  {
    id: "trustworthy-auto-pilot",
    name: "Trustworthy Auto-Pilot",
    ship: null,
    requirement: "Defeat an enemy ship with all of your crew aboard it.",
    source: "Achievements",
  },
  {
    id: "slice-and-dice",
    name: "Slice and Dice",
    ship: null,
    requirement: "Hit every room of a ship with at least one beam in under 5 seconds.",
    source: "Achievements",
  },
  {
    id: "victory-through-asphyxiation",
    name: "Victory through Asphyxiation",
    ship: null,
    requirement:
      "Empty the oxygen (Net level less than 5 percent) of a non-automated, hostile enemy ship.",
    source: "Achievements",
  },
  {
    id: "the-united-federation",
    name: "The United Federation",
    ship: "Kestrel Cruiser",
    requirement: "Have six unique aliens on the Kestrel Cruiser simultaneously.",
    source: "Ship Achievements",
  },
  {
    id: "full-arsenal",
    name: "Full Arsenal",
    ship: "Kestrel Cruiser",
    requirement: "Have eleven systems installed on the Kestrel Cruiser at one time.",
    source: "Ship Achievements",
  },
  {
    id: "tough-little-ship",
    name: "Tough Little Ship",
    ship: "Kestrel Cruiser",
    requirement:
      "As the Kestrel Cruiser, repair back to full health when it only has 1 HP remaining.",
    source: "Ship Achievements",
  },
  {
    id: "bird-of-prey",
    name: "Bird of Prey",
    ship: "Stealth Cruiser",
    requirement: "Destroy a ship at full health during a single cloak in the Stealth Cruiser.",
    source: "Ship Achievements",
  },
  {
    id: "phase-shift",
    name: "Phase Shift",
    ship: "Stealth Cruiser",
    requirement: "In the Stealth Cruiser, avoid 9 points of damage during a single cloak.",
    source: "Ship Achievements",
  },
  {
    id: "tactical-approach",
    name: "Tactical Approach",
    ship: "Stealth Cruiser",
    requirement:
      "In the Stealth Cruiser, get to sector 8 without jumping to a beacon with an environmental danger.",
    source: "Ship Achievements",
  },
  {
    id: "take-no-prisoners",
    name: "Take no prisoners!",
    ship: "Mantis Cruiser",
    requirement: "Kill the crew of 20 ships by sector 6 in the Mantis Cruiser.",
    source: "Ship Achievements",
  },
  {
    id: "avast-ye-scurvy-dogs",
    name: "Avast, ye scurvy dogs!",
    ship: "Mantis Cruiser",
    requirement:
      "Kill 5 enemy crew in a fight without taking hull damage or losing a crew member while using the Mantis Cruiser.",
    source: "Ship Achievements",
  },
  {
    id: "battle-royale",
    name: "Battle Royale",
    ship: "Mantis Cruiser",
    requirement:
      "While using the Mantis Cruiser, kill the last enemy with your last crew member on their ship.",
    source: "Ship Achievements",
  },
  {
    id: "robotic-warfare",
    name: "Robotic Warfare",
    ship: "Engi Cruiser",
    requirement: "With the Engi Cruiser, have 3 drones functioning at the same time.",
    source: "Ship Achievements",
  },
  {
    id: "i-hardly-lifted-a-finger",
    name: "I hardly lifted a finger",
    ship: "Engi Cruiser",
    requirement: "With the Engi Cruiser, destroy an enemy ship using only drones.",
    source: "Ship Achievements",
  },
  {
    id: "the-guns-theyve-stopped",
    name: "The guns... They've stopped",
    ship: "Engi Cruiser",
    requirement:
      "Have 4 enemy systems or subsystems ioned at the same time while using the Engi Cruiser.",
    source: "Ship Achievements",
  },
  {
    id: "master-of-patience",
    name: "Master of Patience",
    ship: "Federation Cruiser",
    requirement:
      "Use only the Artillery Beam to destroy an enemy ship while taking no hull damage.",
    source: "Ship Achievements",
  },
  {
    id: "diplomatic-immunity",
    name: "Diplomatic Immunity",
    ship: "Federation Cruiser",
    requirement:
      "While using the Federation Cruiser, use your crew in four special blue events by sector 5.",
    source: "Ship Achievements",
  },
  {
    id: "artillery-mastery",
    name: "Artillery Mastery",
    ship: "Federation Cruiser",
    requirement:
      "Get to sector 5 with the Federation Cruiser without upgrading your weapons system.",
    source: "Ship Achievements",
  },
  {
    id: "were-in-position",
    name: "We're in position!",
    ship: "Slug Cruiser",
    requirement:
      "While using the Slug Cruiser, have vision of every room on the enemy ship without functioning sensors.",
    source: "Ship Achievements",
  },
  {
    id: "home-sweet-home",
    name: "Home Sweet Home",
    ship: "Slug Cruiser",
    requirement: "Jump to 30 nebula locations before sector 8.",
    source: "Ship Achievements",
  },
  {
    id: "disintegration-ray",
    name: "Disintegration Ray",
    ship: "Slug Cruiser",
    requirement:
      "While using the Slug Cruiser, kill 3 enemy crew members with one shot from the Anti-Bio Beam.",
    source: "Ship Achievements",
  },
  {
    id: "is-it-warm-in-here",
    name: "Is it warm in here?",
    ship: "Rock Cruiser",
    requirement: "Have your crew kill a burning enemy on their ship while using the Rock Cruiser.",
    source: "Ship Achievements",
  },
  {
    id: "defense-drones-dont-do-danything",
    name: "Defense Drones Don't Do D'anything!",
    ship: "Rock Cruiser",
    requirement:
      "While using the Rock Cruiser, destroy an enemy ship which has a defense drone deployed using only missiles.",
    source: "Ship Achievements",
  },
  {
    id: "ancestry",
    name: "Ancestry",
    ship: "Rock Cruiser",
    requirement: "Find the secret sector with the Rock Cruiser.",
    source: "Ship Achievements",
  },
  {
    id: "shields-holding",
    name: "Shields Holding",
    ship: "Zoltan Cruiser",
    requirement: "Destroy a ship before it gets through the Zoltan Shield.",
    source: "Ship Achievements",
  },
  {
    id: "givin-her-all-shes-got-captain",
    name: "Givin' her all she's got, Captain!",
    ship: "Zoltan Cruiser",
    requirement: "With the Zoltan Cruiser, have 29 power in systems at the same time.",
    source: "Ship Achievements",
  },
  {
    id: "manpower",
    name: "Manpower",
    ship: "Zoltan Cruiser",
    requirement:
      "Get to sector 5 without upgrading your reactor in the Zoltan Cruiser (in Advanced Edition if you get a reactor upgrade from a random event you can still get this achievement).",
    source: "Ship Achievements",
  },
  {
    id: "sweet-revenge",
    name: "Sweet Revenge",
    ship: "Crystal Cruiser",
    requirement: "Destroy an enemy ship with a shard from the Crystal Vengeance augment.",
    source: "Ship Achievements",
  },
  {
    id: "no-escape",
    name: "No Escape",
    ship: "Crystal Cruiser",
    requirement:
      "While using the Crystal Cruiser, trap 4 enemy crew inside a single room using the crystal being power or Lockdown Bomb.",
    source: "Ship Achievements",
  },
  {
    id: "clash-of-the-titans",
    name: "Clash of the Titans",
    ship: "Crystal Cruiser",
    requirement: "Destroy 10 Rock ships using the Crystal Cruiser.",
    source: "Ship Achievements",
  },
  {
    id: "advanced-mastery",
    name: "Advanced Mastery",
    ship: "Lanius Cruiser",
    requirement: "Have Hacking, Mind Control and the Battery all active at once.",
    source: "Ship Achievements",
  },
  {
    id: "scrap-hoarder",
    name: "Scrap Hoarder",
    ship: "Lanius Cruiser",
    requirement: "Have at least 600 scrap in your ship storage.",
    source: "Ship Achievements",
  },
  {
    id: "loss-of-cabin-pressure",
    name: "Loss of Cabin Pressure",
    ship: "Lanius Cruiser",
    requirement:
      "Get to sector 8 without your ship's net oxygen levels exceeding 20 percent (starts after the first jump).",
    source: "Ship Achievements",
  },
];
