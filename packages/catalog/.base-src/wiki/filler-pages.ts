import type { EventDef, EventEffect } from "@stl/pack";
import type { CitedEventDef, CitedFx } from "./cited-events-surrender.ts";

/**
 * Opening cards for filler-list rows.
 * `base.ts` loads these as event records. This file does not import the sim.
 * A slug that is already a sector page stays that page in the pack.
 * Arrival of a filler stamp still reads this card while the pack holds the sector page.
 * Rolled intros and choice handlers stay in filler-events.ts.
 */

export const FILLER_PAGES: CitedEventDef[] = [
  // ASTEROID_EXPLORE. Explore: fuel "high|3-6"; "medium|2-4 missiles" missiles and scrap; "medium|1 drone part"; a
  // Pirate ship in an asteroid field; "5 hull damage"; nothing. Scrap Recovery Arm mines high scrap.
  {
    dest: "Large asteroid field",
    slug: "large-asteroid-field",
    flag: "cited:large-asteroid-field",
    aliases: ["Large asteroid field", "Large Asteroid Field"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "Scans reveal a large asteroid field nearby. Short-range scanners may discover useful materials while we wait for the FTL to recharge.",
    choices: [
      {
        id: "c:large-asteroid-field:0",
        label: "Explore the asteroid field.",
        // Six results: FILLER_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship", asteroid: true }],
      },
      {
        id: "c:large-asteroid-field:1",
        label: "Too dangerous. We'll just wait for the FTL to charge.",
        fx: [{ k: "nothing" }],
      },
      // {{Blue Option|Scrap Recovery Arm|Attempt to mine the asteroids.}} High scrap only.
      {
        id: "c:large-asteroid-field:2",
        label: "Attempt to mine the asteroids.",
        fx: [{ k: "note", text: "High scrap." }],
      },
    ],
  },
  // WRECKAGE_EVENT. Investigate: nothing ({{DuplicateEvent|4}}), nothing (Slug ship), medium resources with some scrap,
  // a Mantis ship, a Rebel ship, a Zoltan ship. Improved Sensors: that same medium salvage, and no fight.
  // Advanced Sensors can grant an unnamed weapon and prints no odds. Left unwired.
  {
    dest: "Battlefield wreckage",
    slug: "battlefield-wreckage",
    flag: "cited:battlefield-wreckage",
    aliases: ["Battlefield wreckage", "Battlefield Wreckage"],
    sectors: [
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
    ],
    body: "You have jumped into the aftermath of what seems to have been a brutal exchange between several ships. Wreckage drifts by your screens, and you can still see the remains of the dying ships sparking and breaking apart. It's hard to determine who the combatants were without closer investigation.",
    choices: [
      {
        id: "c:battlefield-wreckage:0",
        label: "Investigate the battlefield.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
      {
        id: "c:battlefield-wreckage:1",
        label: "Ignore the wreckage and continue on.",
        fx: [{ k: "nothing" }],
      },
      // {{Blue Option|Improved Sensors|Use your Sensors to scan the wreckage.|level=2|shortreq=Sensors}}
      {
        id: "c:battlefield-wreckage:2",
        label: "Use your Sensors to scan the wreckage.",
        fx: [{ k: "note", text: "Medium resources with some scrap." }],
      },
    ],
  },
  // DONOR_PLAGUE. Board: low scrap; a Human crewmember with low scrap; low scrap then "You lose a crewmember".
  // The sick card's Continue still loses that crewmember. Clone Bay has [no effect].
  // Improved Medbay level=2+ is "Try to cure the disease." Scrap: "a random amount of scrap".
  {
    dest: "Plagued station",
    slug: "plagued-station",
    flag: "cited:plagued-station",
    aliases: ["Plagued station", "Plagued Station"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You arrive near a damaged and dilapidated space station. It appears to be abandoned but you detect faint life signatures on board.",
    choices: [
      {
        id: "c:plagued-station:0",
        label: "Board the station and look for survivors.",
        fx: [{ k: "tier", tier: "low" }],
      },
      {
        id: "c:plagued-station:1",
        label: "Scrap some of the debris.",
        fx: [{ k: "note", text: "A random amount of scrap." }],
      },
    ],
  },
  // ROGUE_REBEL. Go looking: a Rebel ship ({{DuplicateEvent|2}}); pursuit doubled for 1 jump and a Rebel ship; nothing.
  {
    dest: "Rebel fight chance",
    slug: "rebel-fight-chance",
    flag: "cited:rebel-fight-chance",
    aliases: ["Rebel fight chance", "Rebel Fight Chance"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: 'You arrive at a beacon located in a civilian star system. A nearby colony contacts you: "We\'ve got a rogue Rebel ship harassing this system. Do you have time to find it?"',
    choices: [
      {
        id: "c:rebel-fight-chance:0",
        label: "Go looking for the Rebel ship.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
      {
        id: "c:rebel-fight-chance:1",
        label: "No time to search, you prepare to jump away.",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:rebel-fight-chance:2",
        label: "Perform a scan of the area.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
      {
        id: "c:rebel-fight-chance:3",
        label: "Pinpoint the Rebel's location.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  // REFUGEE_NO_DISTRESS, Template:Drifting Refugee Ship (type=main). Hail: a trade ({{DuplicateEvent|4}}); a Pirate
  // ambush; a Zoltan ship; a pirate ship using them as bait; a Slug ship.
  {
    dest: "Refugee",
    slug: "refugee",
    flag: "cited:refugee",
    aliases: ["Refugee"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
    ],
    body: "Your sensors have picked up a refugee ship drifting through the system, no doubt one of many fleeing the Rebel advance. It doesn't appear to have detected you... or else it is trying to avoid notice.",
    choices: [
      { id: "c:refugee:0", label: "Hail them.", fx: [{ k: "fight", tier: "Pirate ship" }] },
      { id: "c:refugee:1", label: "Ignore the refugees.", fx: [{ k: "nothing" }] },
    ],
  },
  // DONOR_PONY. Investigate opens three choices: communicate (Engi crewmember and low scrap with resources, or
  // nothing), sell (lose a crewmember, or nothing), leave.
  {
    dest: "Intelligent ponies",
    slug: "intelligent-ponies",
    flag: "cited:intelligent-ponies",
    aliases: ["Intelligent ponies", "Intelligent Ponies"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "Scanners are showing intelligent life forms on a nearby planet. No match for them can be found in the database.",
    choices: [
      {
        id: "c:intelligent-ponies:0",
        label: "Investigate.",
        fx: [{ k: "note", text: "Three follow-up choices." }],
      },
      { id: "c:intelligent-ponies:1", label: "Ignore it.", fx: [{ k: "nothing" }] },
    ],
  },
  // EMPTY_STATION2. Examine: low scrap ({{DuplicateEvent|2}}); 2 boarders and a Pirate ship; 2-4 boarders and a
  // planet-side Anti-Ship Battery with no ship; a cloning bay (scrap the machinery: low scrap); an empty shell.
  // Unnamed boarders are INFERRED human. The Clonebay DNA blue option is not offered on this copy.
  {
    dest: "Abandoned station",
    slug: "abandoned-station",
    flag: "cited:abandoned-station",
    aliases: ["Abandoned station", "Abandoned Station"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You find a small space station that appears to be abandoned.",
    choices: [
      {
        id: "c:abandoned-station:0",
        label: "Move in to examine the station.",
        fx: [{ k: "tier", tier: "low" }],
      },
      { id: "c:abandoned-station:1", label: "Stay near the Beacon.", fx: [{ k: "nothing" }] },
    ],
  },
  // TERRAFORMING_SCAN. Scan: nothing, or "Successful Scan" (oxygen upgraded; a Pirate ship; the mold, with a 15-25 scrap
  // bribe either way).
  {
    dest: "Terraforming scan",
    slug: "terraforming-scan",
    flag: "cited:terraforming-scan",
    aliases: ["Terraforming scan", "Terraforming Scan"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: 'You receive a hail from a station orbiting a nearby planet. "Captain, we are Federation Terraforming Team C12 and are in need of assistance. Do you have some time?"',
    choices: [
      {
        id: "c:terraforming-scan:0",
        label: "You offer your assistance.",
        fx: [{ k: "note", text: "They ask for a scan." }],
      },
      { id: "c:terraforming-scan:1", label: "You do not have time.", fx: [{ k: "nothing" }] },
    ],
  },
  // NEBULA_EMPTY. "Nothing happens." The intro is one of the page's nine texts (EMPTY_PAGES), drawn on arrival.
  {
    dest: "Empty nebula beacon",
    slug: "empty-nebula-beacon",
    flag: "cited:empty-nebula-beacon",
    aliases: ["Empty nebula beacon", "Empty Nebula Beacon", "Nebula empty beacon"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "There's nothing here, save for vast swirls of gas reflecting rays from a distant sun.",
    choices: [{ id: "c:empty-nebula-beacon:0", label: "Continue", fx: [{ k: "nothing" }] }],
  },
  // NEBULA_LOST_SHIP. Follow: a crewmember; a Rebel ship; nothing.
  {
    dest: "Nebula lost ship",
    slug: "nebula-lost-ship",
    flag: "cited:nebula-lost-ship",
    aliases: ["Nebula lost ship", "Nebula Lost Ship"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "A heavily damaged Federation ship is hiding in the nebula at this beacon. Before you have time to make contact with them, they fade into the nebula.",
    choices: [
      {
        id: "c:nebula-lost-ship:0",
        label: "Attempt to follow and help them.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
      {
        id: "c:nebula-lost-ship:1",
        label: "Keep your position, they can handle themselves.",
        fx: [{ k: "nothing" }],
      },
      // {{Blue Option|Teleporter}}. Crewmember and medium scrap. The button stays visible.
      {
        id: "c:nebula-lost-ship:2",
        label: "Lock onto their life-signs with your teleporter.",
        fx: [{ k: "nothing" }],
      },
      // {{Blue Option|Long-ranged Scanner}}. A crewmember, or medium scrap. No odds. INFERRED: equal.
      {
        id: "c:nebula-lost-ship:3",
        label: "Pump extra power into your sensors and try to track them.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // STORM_ITEMS. Search: "4 hull damage" and high resources with some scrap; a crewmember and low scrap with resources;
  // lose a crewmember and low scrap with resources; a drone schematic with medium scrap; a weapon with medium scrap.
  {
    dest: "Plasma storm incapacitated ships",
    slug: "plasma-storm-incapacitated-ships",
    flag: "cited:plasma-storm-incapacitated-ships",
    aliases: ["Plasma storm incapacitated ships", "Plasma Storm Incapacitated Ships"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "You jump into the middle of a plasma storm. Multiple recently incapacitated ships loom in the shadows, briefly illuminated by the lightning.",
    choices: [
      {
        id: "c:plasma-storm-incapacitated-ships:0",
        label: "Manually search the wreckage for survivors and equipment.",
        fx: [{ k: "hull", n: -4 }],
      },
      {
        id: "c:plasma-storm-incapacitated-ships:1",
        label: "Avoid the risk and wait to jump away unscathed.",
        fx: [{ k: "nothing" }],
      },
      // {{Blue Option|Piloting|level=2+}}. Four results, no odds. INFERRED: equal. The weapon pays low scrap.
      {
        id: "c:plasma-storm-incapacitated-ships:2",
        label: "Have your pilot carefully explore the debris.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // FRIENDLY_BEACON. Give "2-4" fuel: high scrap ({{DuplicateEvent|2}}); a weapon; the sector map (not wired); the
  // reactor upgraded.
  {
    dest: "Friendly ship out of fuel",
    slug: "friendly-ship-out-of-fuel",
    flag: "cited:friendly-ship-out-of-fuel",
    aliases: ["Friendly ship out of fuel", "Friendly Ship Out of Fuel"],
    sectors: [
      "Abandoned Sector",
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
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: '"Greetings! It is so good to see you! We\'ve been out of fuel and floating out here for weeks. We were terrified a pirate or those damn Rebels would find us first. Could you spare some fuel?"',
    choices: [
      {
        id: "c:friendly-ship-out-of-fuel:0",
        label: "Give them the fuel.",
        fx: [
          { k: "res", id: "fuel", sign: -1, lo: 2, hi: 4 },
          { k: "tier", tier: "high" },
        ],
      },
      {
        id: "c:friendly-ship-out-of-fuel:1",
        label: "Apologize, wish them luck, and continue on.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // REFUGEE_DISTRESS, Template:Drifting Refugee Ship (introtext=distress, type=main). Same results as Refugee.
  {
    dest: "Refugee distress",
    slug: "refugee-distress",
    flag: "cited:refugee-distress",
    aliases: ["Refugee distress", "Refugee Distress"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"],
    body: "You have encountered a refugee ship drifting in space. It looks as if it was fleeing the Rebel advance and ran out of fuel. Its distress beacon is active, but you're not sure anyone is on board.",
    choices: [
      {
        id: "c:refugee-distress:0",
        label: "Hail them.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      { id: "c:refugee-distress:1", label: "Ignore the refugees.", fx: [{ k: "nothing" }] },
    ],
  },
  // REFUGEE_GHOST. Board, five results, no odds: lose a crewmember; a crewmember; "medium|2-4 missiles" missiles
  // and scrap; "2-4 human boarders" with no ship; nothing.
  {
    dest: "Refugee comms down",
    slug: "refugee-comms-down",
    flag: "cited:refugee-comms-down",
    aliases: ["Refugee comms down", "Refugee Comms Down"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"],
    body: "You have encountered a refugee ship drifting in space. It looks as if it was fleeing the Rebel advance and ran out of fuel. Its distress beacon is active, but you're not sure anyone is on board, and its communications seem to be down.",
    choices: [
      {
        id: "c:refugee-comms-down:0",
        label: "Prepare to board and investigate.",
        fx: [
          { k: "res", id: "missiles", sign: 1, lo: 2, hi: 4 },
          { k: "tier", tier: "medium" },
        ],
      },
      { id: "c:refugee-comms-down:1", label: "Ignore the ship.", fx: [{ k: "nothing" }] },
    ],
  },
  // TRADER_UPGRADES. Inquire offers one of Oxygen, Piloting, Door System, Sensors, or the reactor.
  // alsooccur=exit stays with the unwired exit list. The items row is Template:EventList ITEMS.
  {
    dest: "Trade scrap for upgrades",
    slug: "trade-scrap-for-upgrades",
    flag: "cited:trade-scrap-for-upgrades",
    aliases: ["Trade scrap for upgrades"],
    sectors: [
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
    ],
    body: "You pick up an automated message from a nearby space station. There appears to be a local shipwright that can perform emergency work on military ships.",
    choices: [
      {
        id: "c:trade-scrap-for-upgrades:0",
        label: "Inquire about their specialty.",
        fx: [{ k: "note", text: "One printed upgrade offer." }],
      },
    ],
  },
  // REFUEL_STATION. Each buy is a fixed scrap cost for a fixed fuel amount. Ignore does nothing.
  {
    dest: "Refueling station",
    slug: "refueling-station",
    flag: "cited:refueling-station",
    aliases: ["Refueling station"],
    sectors: [
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
      "Zoltan Homeworlds",
    ],
    body: "A ship re-fueling station is stationed at this beacon. We can purchase fuel here.",
    choices: [
      {
        id: "c:refueling-station:0",
        label: "Buy 6 Fuel for 12 Scrap.",
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 12, hi: 12 },
          { k: "res", id: "fuel", sign: 1, lo: 6, hi: 6 },
        ],
      },
      {
        id: "c:refueling-station:1",
        label: "Buy 3 Fuel for 6 Scrap.",
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 6, hi: 6 },
          { k: "res", id: "fuel", sign: 1, lo: 3, hi: 3 },
        ],
      },
      {
        id: "c:refueling-station:2",
        label: "Buy 1 Fuel for 2 Scrap.",
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 2, hi: 2 },
          { k: "res", id: "fuel", sign: 1, lo: 1, hi: 1 },
        ],
      },
      { id: "c:refueling-station:3", label: "Ignore the station.", fx: [{ k: "nothing" }] },
    ],
  },
  // HELP_MINERS. Five missiles: 10 hull, a reactor step, or 15-25 scrap. No odds. INFERRED: equal.
  // Fifteen missiles: 15 hull and a reactor step, an unnamed augment, or 30-40 scrap and 5 hull.
  // INFERRED: those three are equal. The unnamed augment is a random one (Rewards, "Augment").
  // The reactor step size is not printed. INFERRED: one bar, and not past the reactor maximum.
  // A missile weapon's launch offer does nothing and returns the non-blue choices.
  // Hull Missile is not a missile weapon for events.
  {
    dest: "Asteroid mining colony",
    slug: "asteroid-mining-colony",
    flag: "cited:asteroid-mining-colony",
    aliases: ["Asteroid mining colony"],
    sectors: [
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
    ],
    body: 'You come across an asteroid mining colony. They message you immediately, saying, "Greetings. Our supplies of mining explosives have run out ever since the Rebels blockaded this system. Do you have any extra explosives?"',
    choices: [
      {
        id: "c:asteroid-mining-colony:0",
        label: "Offer to solve their problem by launching a missile.",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:asteroid-mining-colony:1",
        label: "Give them the requested 5 missiles.",
        fx: [{ k: "res", id: "missiles", sign: -1, lo: 5, hi: 5 }],
      },
      {
        id: "c:asteroid-mining-colony:2",
        label: "Give them 15 missiles.",
        fx: [{ k: "res", id: "missiles", sign: -1, lo: 15, hi: 15 }],
      },
      { id: "c:asteroid-mining-colony:3", label: "Decline.", fx: [{ k: "nothing" }] },
    ],
  },
  // TRADER_UPGRADES_EXCHANGE. One of three supply bundles, shown before the choice. No odds. INFERRED: equal.
  // Each band is inclusive. A maxed reactor still takes the supplies and gains no bar.
  // The reactor step size is not printed. INFERRED: one bar, and not past 25.
  {
    dest: "Improve reactor for supplies",
    slug: "improve-reactor-for-supplies",
    flag: "cited:improve-reactor-for-supplies",
    aliases: ["Improve reactor for supplies"],
    sectors: [
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
    ],
    body: "You receive a message from a small convoy. They're looking for some military supplies and are offering to try to improve your reactor in exchange.",
    choices: [
      {
        id: "c:improve-reactor-for-supplies:0",
        label: "Agree to the trade.",
        fx: [{ k: "note", text: "One printed supply bundle." }],
      },
      {
        id: "c:improve-reactor-for-supplies:1",
        label: "Respectfully decline.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // DISTRESS_INFESTATION. Send the crew: lose a crewmember, or high resources with some scrap. No odds. INFERRED: equal.
  // Leave them alone: nothing. Anti-Personnel Drone: 1 drone part, medium resources with some scrap.
  // Boarding Drone: 1 drone part, low scrap with resources. The breach flavor names no hull number.
  // Both drone costs skip the part when the reward includes drone parts. That is the two-of-three resource draw.
  // Anti-Bio Beam: high resources with some scrap. The unnamed bonus item is not granted.
  {
    dest: "Giant alien spiders",
    slug: "giant-alien-spiders",
    flag: "cited:giant-alien-spiders",
    aliases: ["Giant alien spiders"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
    ],
    body: "You find a number of ships fleeing from a small space station. You hail them, asking what's wrong: \"Help! We're being overrun by some sort of giant alien spiders!\"",
    choices: [
      {
        id: "c:giant-alien-spiders:0",
        label: "Send the crew to help! Giant alien spiders are no joke.",
        fx: [{ k: "note", text: "A crewmember, or high resources with some scrap." }],
      },
      { id: "c:giant-alien-spiders:1", label: "Leave them alone.", fx: [{ k: "nothing" }] },
      {
        id: "c:giant-alien-spiders:2",
        label: "Send your battle drone in to help.",
        fx: [{ k: "note", text: "Medium resources with some scrap." }],
      },
      {
        id: "c:giant-alien-spiders:3",
        label: "Launch a Boarding drone into the station.",
        fx: [{ k: "note", text: "Low scrap with resources." }],
      },
      {
        id: "c:giant-alien-spiders:4",
        label: "Use the beam to pick off the spiders.",
        fx: [{ k: "note", text: "High resources with some scrap." }],
      },
    ],
  },
  // DISTRESS_TRAPPED_MINER. Shooting the rocks: 2 hull, 2 system damage, and low scrap, or medium scrap with resources.
  // No odds. INFERRED: equal. Looting: medium scrap with resources, or a Pirate ship. INFERRED: equal.
  // A beam that is not Anti-Bio or Fire, including Artillery Beam, pays medium scrap with resources.
  // A beam drone that is not an Anti-Ship Fire Drone spends 1 part for the same reward, with the drone-part bug.
  {
    dest: "Crushed pirate",
    slug: "crushed-pirate",
    flag: "cited:crushed-pirate",
    aliases: ["Crushed pirate"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
    ],
    body: "You arrive at the distress beacon near a small asteroid belt and find a ship with pirate markings partially crushed between two large rocks. It must have been illegally mining the belt without proper equipment.",
    choices: [
      {
        id: "c:crushed-pirate:0",
        label: "Try to dislodge the ship by shooting at the rocks.",
        fx: [
          {
            k: "note",
            text: "2 hull, 2 system damage, and low scrap, or medium scrap with resources.",
          },
        ],
      },
      {
        id: "c:crushed-pirate:1",
        label: "Destroy and loot the ship. They're just pirates.",
        fx: [{ k: "note", text: "Medium scrap with resources, or a Pirate ship." }],
      },
      {
        id: "c:crushed-pirate:2",
        label: "Carefully cut the ship out.",
        fx: [{ k: "note", text: "Medium scrap with resources." }],
      },
      {
        id: "c:crushed-pirate:3",
        label: "Have your drone cut the ship out.",
        fx: [{ k: "note", text: "Medium scrap with resources." }],
      },
    ],
  },
  // DISTRESS_STATION_DISEASE. Send the crew: lose a crewmember and medium resources, or nothing. No odds. INFERRED: equal.
  // Clone Bay has no effect. Ignore: nothing. A living Rock or Engi pays medium resources with some scrap.
  // Medbay level 2 or more opens the cure. Continue pays that same reward. Engi Med-bot Dispersal pays high scrap.
  // Its weapon is not named: a random one (Rewards, "Weapon").
  {
    dest: "Unknown disease on mining colony",
    slug: "unknown-disease-on-mining-colony",
    flag: "cited:unknown-disease-on-mining-colony",
    aliases: ["Unknown disease on mining colony"],
    sectors: [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
    ],
    body: "You locate a nearby human mining colony where an unknown disease has spread virulently. They are setting up a quarantine to contain it but a riot has broken out.",
    choices: [
      {
        id: "c:unknown-disease-on-mining-colony:0",
        label: "Send in your crew to help control the crowds.",
        fx: [{ k: "note", text: "A crewmember and medium resources, or nothing." }],
      },
      {
        id: "c:unknown-disease-on-mining-colony:1",
        label: "Ignore their request and move on.",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:unknown-disease-on-mining-colony:2",
        label: "Send your Rock crew-member to prevent a riot.",
        fx: [{ k: "note", text: "Medium resources with some scrap." }],
      },
      {
        id: "c:unknown-disease-on-mining-colony:3",
        label: "Send your Engi to calm down the infected.",
        fx: [{ k: "note", text: "Medium resources with some scrap." }],
      },
      {
        id: "c:unknown-disease-on-mining-colony:4",
        label: "Use your medbay to help synthesize a cure.",
        fx: [{ k: "note", text: "Medium resources, or high scrap." }],
      },
    ],
  },
  // DISTRESS_STATION_FIRE. Send the crew: lose a crewmember and low scrap, or high scrap. No odds. INFERRED: equal.
  // Clone Bay revives that crewmember. Docking: 4 hull, 1 system damage, and low scrap, or Dr. Jones and low scrap.
  // INFERRED: equal. Leave: nothing. A living Rock pays high scrap and an unnamed augmentation. A Repair Drone pays high
  // scrap and an unnamed drone schematic. Each is a random one (Rewards, "Augment" / "Drone").
  {
    dest: "Fire on research station",
    slug: "fire-on-research-station",
    flag: "cited:fire-on-research-station",
    aliases: ["Fire on research station"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "You find the source of the distress call, a small research station. It appears a small laboratory fire got out of control and is threatening to destroy the station. Their fire suppression system is not responding.",
    choices: [
      {
        id: "c:fire-on-research-station:0",
        label: "Send your crew in a shuttle to help put out the fire.",
        fx: [{ k: "note", text: "A crewmember and low scrap, or high scrap." }],
      },
      {
        id: "c:fire-on-research-station:1",
        label: "Dock and try to rescue the survivors.",
        fx: [
          {
            k: "note",
            text: "4 hull, 1 system damage, and low scrap, or Dr. Jones and low scrap.",
          },
        ],
      },
      { id: "c:fire-on-research-station:2", label: "Leave.", fx: [{ k: "nothing" }] },
      {
        id: "c:fire-on-research-station:3",
        label: "Send your Rock crew-member in.",
        fx: [{ k: "note", text: "High scrap and a random augmentation." }],
      },
      {
        id: "c:fire-on-research-station:4",
        label: "Send your repair drone into the fire.",
        fx: [{ k: "note", text: "High scrap and a random drone schematic." }],
      },
    ],
  },
  // STRANDED_BEACON. Go down: a survivor, or a man in a cave. No odds. INFERRED: equal.
  // Invite: Charlie with 1 skill in one of the six stations. No odds. INFERRED: equal. The page names Charlie and not a race.
  // Take him home is Template:ReturnSurvivor: high scrap, medium scrap, or 10 repairs. No odds. INFERRED: equal.
  // Bring him back: a crewmember, Charlie, 5 hull and 1 system damage, or he collapses. No odds. INFERRED: equal.
  // A level 2 medbay, a level 3 medbay, and a living Slug are blue options. The Slug's crewmember is not named.
  {
    dest: "Single life form on moon",
    slug: "single-life-form-on-moon",
    flag: "cited:single-life-form-on-moon",
    aliases: ["Single life form on moon"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "It appears the distress beacon is coming from the surface of a nearby moon. Your sensors are picking up a single life form.",
    choices: [
      {
        id: "c:single-life-form-on-moon:0",
        label: "Go down to the surface to investigate.",
        fx: [{ k: "note", text: "Charlie, a crewmember, 5 hull, or scrap and repairs." }],
      },
      { id: "c:single-life-form-on-moon:1", label: "Ignore the signal.", fx: [{ k: "nothing" }] },
    ],
  },
  // TRAP_BEACON. The intro is one of four printed lines. No odds. INFERRED: equal.
  // Fight a Pirate ship. Default rewards are the destroy salvage. The PIRATE surrender and escape rows are that faction's plan.
  {
    dest: "Pirate ship distress trap",
    slug: "pirate-ship-distress-trap",
    flag: "cited:pirate-ship-distress-trap",
    aliases: ["Pirate ship distress trap"],
    sectors: [
      "Abandoned Sector",
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
      "Zoltan Homeworlds",
    ],
    body: "You arrive at the beacon and immediately detect a pirate ship. It seems this distress beacon was a trap!",
    choices: [
      {
        id: "c:pirate-ship-distress-trap:0",
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  // DISTRESS_SATELLITE_DEFENSE. Promise opens the printed options. No odds on simply fire.
  // The other printed result (5 hull, 1 random system, 1 breached room) stays unwired, so that button does not roll a weight.
  // The commented-out Lanius crew option is not in the game. It is not added here.
  {
    dest: "Malfunctioning defense system",
    slug: "malfunctioning-defense-system",
    flag: "cited:malfunctioning-defense-system",
    aliases: ["Malfunctioning defense system"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "The distress signal is coming from a small space station orbiting an uninhabited planet. Their satellite defense system has gone haywire and their repair crew can't approach without being fired on. They're looking for help to fix or disable it.",
    choices: [
      {
        id: "c:malfunctioning-defense-system:0",
        label: "Promise to help.",
        fx: [
          {
            k: "note",
            text: "Ion, cloaking, an Engi, or low scrap. The 5 hull result stays unwired.",
          },
        ],
      },
      {
        id: "c:malfunctioning-defense-system:1",
        label: "Leave them alone.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // TAVERN_HIRE. The intro varies. Don't hire anyone does nothing.
  // Both hire prices grant an unnamed crewmember and stay unwired.
  {
    dest: "Crew hiring station",
    slug: "crew-hiring-station",
    flag: "cited:crew-hiring-station",
    aliases: ["Crew hiring station"],
    sectors: [
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
    ],
    body: "This Beacon seems to serve as meeting place for local traffic. It seems you can find crew willing to fight on your ship here... for a price.",
    choices: [
      { id: "c:crew-hiring-station:0", label: "Don't hire anyone.", fx: [{ k: "nothing" }] },
    ],
  },
];

function effect(fx: CitedFx): EventEffect {
  if (fx.k === "res") return { k: "res", id: fx.id, sign: fx.sign, lo: fx.lo, hi: fx.hi };
  if (fx.k === "tier") {
    const copy: EventEffect = { k: "tier", tier: fx.tier };
    if (fx.resources !== undefined) copy.resources = fx.resources;
    return copy;
  }
  if (fx.k === "hull") return { k: "hull", n: fx.n };
  if (fx.k === "fleet") {
    const copy: EventEffect = { k: "fleet", n: fx.n };
    if (fx.double !== undefined) copy.double = fx.double;
    if (fx.faster !== undefined) copy.faster = fx.faster;
    if (fx.lastStand !== undefined) copy.lastStand = fx.lastStand;
    return copy;
  }
  if (fx.k === "fight") {
    const copy: EventEffect = { k: "fight", tier: fx.tier };
    if (fx.asteroid !== undefined) copy.asteroid = fx.asteroid;
    return copy;
  }
  if (fx.k === "note") return { k: "note", text: fx.text };
  if (fx.k === "quest") return { k: "quest", id: fx.id };
  if (fx.k === "goto") return { k: "goto", id: fx.id };
  if (fx.k === "close") return { k: "close" };
  return { k: "nothing" };
}

/** Pack records for the opening cards. The id is the page slug. */
export function fillerPageRecords(): EventDef[] {
  return FILLER_PAGES.map((page) => ({
    id: page.slug,
    dest: page.dest,
    flag: page.flag,
    aliases: [...page.aliases],
    sectors: [...page.sectors],
    body: page.body,
    choices: page.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      fx: choice.fx.map(effect),
    })),
  }));
}
