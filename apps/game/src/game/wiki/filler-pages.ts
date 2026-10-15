import { tx } from "../../i18n/index.ts";
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
    sectors: ["Abandoned Sector", "Civilian Sector", "Engi Controlled Sector", "Engi Homeworlds", "Pirate Controlled Sector", "Slug Controlled Nebula", "Slug Home Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.filler-events.scans-reveal-a-large-asteroid-field"),
    choices: [
      {
        id: "c:large-asteroid-field:0",
        label: tx("wiki.filler-events.explore-the-asteroid-field"),
        // Six results: FILLER_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship", asteroid: true }],
      },
      { id: "c:large-asteroid-field:1", label: tx("wiki.filler-events.too-dangerous-we-ll-just-wait"), fx: [{ k: "nothing" }] },
      // {{Blue Option|Scrap Recovery Arm|Attempt to mine the asteroids.}} High scrap only.
      { id: "c:large-asteroid-field:2", label: tx("wiki.filler-events.attempt-to-mine-the-asteroids"), fx: [{ k: "note", text: tx("wiki.filler-events.high-scrap") }] },
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
    sectors: ["Engi Controlled Sector", "Engi Homeworlds", "Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.filler-events.you-have-jumped-into-the-aftermath"),
    choices: [
      { id: "c:battlefield-wreckage:0", label: tx("wiki.filler-events.investigate-the-battlefield"), fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:battlefield-wreckage:1", label: tx("wiki.filler-events.ignore-the-wreckage-and-continue-on"), fx: [{ k: "nothing" }] },
      // {{Blue Option|Improved Sensors|Use your Sensors to scan the wreckage.|level=2|shortreq=Sensors}}
      { id: "c:battlefield-wreckage:2", label: tx("wiki.filler-events.use-your-sensors-to-scan-the"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-resources-with-some-scrap") }] },
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
    body: tx("wiki.filler-events.you-arrive-near-a-damaged-and"),
    choices: [
      { id: "c:plagued-station:0", label: tx("wiki.filler-events.board-the-station-and-look-for"), fx: [{ k: "tier", tier: "low" }] },
      { id: "c:plagued-station:1", label: tx("wiki.filler-events.scrap-some-of-the-debris"), fx: [{ k: "note", text: tx("wiki.filler-events.a-random-amount-of-scrap") }] },
    ],
  },
  // ROGUE_REBEL. Go looking: a Rebel ship ({{DuplicateEvent|2}}); pursuit doubled for 1 jump and a Rebel ship; nothing.
  {
    dest: "Rebel fight chance",
    slug: "rebel-fight-chance",
    flag: "cited:rebel-fight-chance",
    aliases: ["Rebel fight chance", "Rebel Fight Chance"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.filler-events.you-arrive-at-a-beacon-located"),
    choices: [
      { id: "c:rebel-fight-chance:0", label: tx("wiki.filler-events.go-looking-for-the-rebel-ship"), fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:rebel-fight-chance:1", label: tx("wiki.filler-events.no-time-to-search-you-prepare"), fx: [{ k: "nothing" }] },
      { id: "c:rebel-fight-chance:2", label: tx("wiki.filler-events.perform-a-scan-of-the-area"), fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:rebel-fight-chance:3", label: tx("wiki.filler-events.pinpoint-the-rebel-s-location"), fx: [{ k: "fight", tier: "Rebel ship" }] },
    ],
  },
  // REFUGEE_NO_DISTRESS, Template:Drifting Refugee Ship (type=main). Hail: a trade ({{DuplicateEvent|4}}); a Pirate
  // ambush; a Zoltan ship; a pirate ship using them as bait; a Slug ship.
  {
    dest: "Refugee",
    slug: "refugee",
    flag: "cited:refugee",
    aliases: ["Refugee"],
    sectors: ["Civilian Sector", "Engi Controlled Sector", "Engi Homeworlds", "Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.filler-events.your-sensors-have-picked-up-a"),
    choices: [
      { id: "c:refugee:0", label: tx("wiki.filler-events.hail-them"), fx: [{ k: "fight", tier: "Pirate ship" }] },
      { id: "c:refugee:1", label: tx("wiki.filler-events.ignore-the-refugees"), fx: [{ k: "nothing" }] },
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
    body: tx("wiki.filler-events.scanners-are-showing-intelligent-life-forms"),
    choices: [
      { id: "c:intelligent-ponies:0", label: tx("wiki.filler-events.investigate"), fx: [{ k: "note", text: tx("wiki.filler-events.three-follow-up-choices") }] },
      { id: "c:intelligent-ponies:1", label: tx("wiki.filler-events.ignore-it"), fx: [{ k: "nothing" }] },
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
    body: tx("wiki.filler-events.you-find-a-small-space-station"),
    choices: [
      { id: "c:abandoned-station:0", label: tx("wiki.filler-events.move-in-to-examine-the-station"), fx: [{ k: "tier", tier: "low" }] },
      { id: "c:abandoned-station:1", label: tx("wiki.filler-events.stay-near-the-beacon"), fx: [{ k: "nothing" }] },
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
    body: tx("wiki.filler-events.you-receive-a-hail-from-a"),
    choices: [
      { id: "c:terraforming-scan:0", label: tx("wiki.filler-events.you-offer-your-assistance"), fx: [{ k: "note", text: tx("wiki.filler-events.they-ask-for-a-scan") }] },
      { id: "c:terraforming-scan:1", label: tx("wiki.filler-events.you-do-not-have-time"), fx: [{ k: "nothing" }] },
    ],
  },
  // NEBULA_EMPTY. "Nothing happens." The intro is one of the page's nine texts (EMPTY_PAGES), drawn on arrival.
  {
    dest: "Empty nebula beacon",
    slug: "empty-nebula-beacon",
    flag: "cited:empty-nebula-beacon",
    aliases: ["Empty nebula beacon", "Empty Nebula Beacon", "Nebula empty beacon"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.filler-events.there-s-nothing-here-save-for"),
    choices: [{ id: "c:empty-nebula-beacon:0", label: tx("wiki.filler-events.continue"), fx: [{ k: "nothing" }] }],
  },
  // NEBULA_LOST_SHIP. Follow: a crewmember; a Rebel ship; nothing.
  {
    dest: "Nebula lost ship",
    slug: "nebula-lost-ship",
    flag: "cited:nebula-lost-ship",
    aliases: ["Nebula lost ship", "Nebula Lost Ship"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Slug Controlled Nebula", "Slug Home Nebula", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.filler-events.a-heavily-damaged-federation-ship-is"),
    choices: [
      { id: "c:nebula-lost-ship:0", label: tx("wiki.filler-events.attempt-to-follow-and-help-them"), fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:nebula-lost-ship:1", label: tx("wiki.filler-events.keep-your-position-they-can-handle"), fx: [{ k: "nothing" }] },
      // {{Blue Option|Teleporter}}. Crewmember and medium scrap. The button stays visible.
      { id: "c:nebula-lost-ship:2", label: tx("wiki.filler-events.lock-onto-their-life-signs"), fx: [{ k: "nothing" }] },
      // {{Blue Option|Long-ranged Scanner}}. A crewmember, or medium scrap. No odds. INFERRED: equal.
      { id: "c:nebula-lost-ship:3", label: tx("wiki.filler-events.pump-extra-power-into-your-sensors"), fx: [{ k: "nothing" }] },
    ],
  },
  // STORM_ITEMS. Search: "4 hull damage" and high resources with some scrap; a crewmember and low scrap with resources;
  // lose a crewmember and low scrap with resources; a drone schematic with medium scrap; a weapon with medium scrap.
  {
    dest: "Plasma storm incapacitated ships",
    slug: "plasma-storm-incapacitated-ships",
    flag: "cited:plasma-storm-incapacitated-ships",
    aliases: ["Plasma storm incapacitated ships", "Plasma Storm Incapacitated Ships"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.filler-events.you-jump-into-the-middle-of"),
    choices: [
      { id: "c:plasma-storm-incapacitated-ships:0", label: tx("wiki.filler-events.manually-search-the-wreckage-for-survivors"), fx: [{ k: "hull", n: -4 }] },
      { id: "c:plasma-storm-incapacitated-ships:1", label: tx("wiki.filler-events.avoid-the-risk-and-wait-to"), fx: [{ k: "nothing" }] },
      // {{Blue Option|Piloting|level=2+}}. Four results, no odds. INFERRED: equal. The weapon pays low scrap.
      { id: "c:plasma-storm-incapacitated-ships:2", label: tx("wiki.filler-events.have-your-pilot-carefully-explore"), fx: [{ k: "nothing" }] },
    ],
  },
  // FRIENDLY_BEACON. Give "2-4" fuel: high scrap ({{DuplicateEvent|2}}); a weapon; the sector map (not wired); the
  // reactor upgraded.
  {
    dest: "Friendly ship out of fuel",
    slug: "friendly-ship-out-of-fuel",
    flag: "cited:friendly-ship-out-of-fuel",
    aliases: ["Friendly ship out of fuel", "Friendly Ship Out of Fuel"],
    sectors: ["Abandoned Sector", "Civilian Sector", "Engi Controlled Sector", "Engi Homeworlds", "Mantis Controlled Sector", "Mantis Homeworlds", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Rock Controlled Sector", "Rock Homeworlds", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.filler-events.greetings-it-is-so-good-to"),
    choices: [
      { id: "c:friendly-ship-out-of-fuel:0", label: tx("wiki.filler-events.give-them-the-fuel"), fx: [{ k: "res", id: "fuel", sign: -1, lo: 2, hi: 4 }, { k: "tier", tier: "high" }] },
      { id: "c:friendly-ship-out-of-fuel:1", label: tx("wiki.filler-events.apologize-wish-them-luck-and-continue"), fx: [{ k: "nothing" }] },
    ],
  },
  // REFUGEE_DISTRESS, Template:Drifting Refugee Ship (introtext=distress, type=main). Same results as Refugee.
  {
    dest: "Refugee distress",
    slug: "refugee-distress",
    flag: "cited:refugee-distress",
    aliases: ["Refugee distress", "Refugee Distress"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"],
    body: tx("wiki.filler-events.you-have-encountered-a-refugee-ship"),
    choices: [
      { id: "c:refugee-distress:0", label: tx("wiki.filler-events.hail-them"), fx: [{ k: "fight", tier: "Pirate ship" }] },
      { id: "c:refugee-distress:1", label: tx("wiki.filler-events.ignore-the-refugees"), fx: [{ k: "nothing" }] },
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
    body: tx("wiki.filler-events.you-have-encountered-a-refugee-ship-2"),
    choices: [
      { id: "c:refugee-comms-down:0", label: tx("wiki.filler-events.prepare-to-board-and-investigate"), fx: [{ k: "res", id: "missiles", sign: 1, lo: 2, hi: 4 }, { k: "tier", tier: "medium" }] },
      { id: "c:refugee-comms-down:1", label: tx("wiki.filler-events.ignore-the-ship"), fx: [{ k: "nothing" }] },
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
    body: tx("wiki.filler-events.you-pick-up-an-automated-message"),
    choices: [
      { id: "c:trade-scrap-for-upgrades:0", label: tx("wiki.filler-events.inquire-about-their-specialty"), fx: [{ k: "note", text: tx("wiki.filler-events.one-printed-upgrade-offer") }] },
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
    body: tx("wiki.filler-events.a-ship-re-fueling-station-is"),
    choices: [
      { id: "c:refueling-station:0", label: tx("wiki.filler-events.buy-6-fuel-for-12-scrap"), fx: [{ k: "res", id: "scrap", sign: -1, lo: 12, hi: 12 }, { k: "res", id: "fuel", sign: 1, lo: 6, hi: 6 }] },
      { id: "c:refueling-station:1", label: tx("wiki.filler-events.buy-3-fuel-for-6-scrap"), fx: [{ k: "res", id: "scrap", sign: -1, lo: 6, hi: 6 }, { k: "res", id: "fuel", sign: 1, lo: 3, hi: 3 }] },
      { id: "c:refueling-station:2", label: tx("wiki.filler-events.buy-1-fuel-for-2-scrap"), fx: [{ k: "res", id: "scrap", sign: -1, lo: 2, hi: 2 }, { k: "res", id: "fuel", sign: 1, lo: 1, hi: 1 }] },
      { id: "c:refueling-station:3", label: tx("wiki.filler-events.ignore-the-station"), fx: [{ k: "nothing" }] },
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
    body: tx("wiki.filler-events.you-come-across-an-asteroid-mining"),
    choices: [
      { id: "c:asteroid-mining-colony:0", label: tx("wiki.filler-events.offer-to-solve-their-problem-by"), fx: [{ k: "nothing" }] },
      { id: "c:asteroid-mining-colony:1", label: tx("wiki.filler-events.give-them-the-requested-5-missiles"), fx: [{ k: "res", id: "missiles", sign: -1, lo: 5, hi: 5 }] },
      { id: "c:asteroid-mining-colony:2", label: tx("wiki.filler-events.give-them-15-missiles"), fx: [{ k: "res", id: "missiles", sign: -1, lo: 15, hi: 15 }] },
      { id: "c:asteroid-mining-colony:3", label: tx("wiki.filler-events.decline"), fx: [{ k: "nothing" }] },
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
    body: tx("wiki.filler-events.you-receive-a-message-from-a"),
    choices: [
      { id: "c:improve-reactor-for-supplies:0", label: tx("wiki.filler-events.agree-to-the-trade"), fx: [{ k: "note", text: tx("wiki.filler-events.one-printed-supply-bundle") }] },
      { id: "c:improve-reactor-for-supplies:1", label: tx("wiki.filler-events.respectfully-decline"), fx: [{ k: "nothing" }] },
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
    body: tx("wiki.filler-events.you-find-a-number-of-ships"),
    choices: [
      { id: "c:giant-alien-spiders:0", label: tx("wiki.filler-events.send-the-crew-to-help-giant"), fx: [{ k: "note", text: tx("wiki.filler-events.a-crewmember-or-high-resources-with") }] },
      { id: "c:giant-alien-spiders:1", label: tx("wiki.filler-events.leave-them-alone"), fx: [{ k: "nothing" }] },
      { id: "c:giant-alien-spiders:2", label: tx("wiki.filler-events.send-your-battle-drone-in-to"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-resources-with-some-scrap") }] },
      { id: "c:giant-alien-spiders:3", label: tx("wiki.filler-events.launch-a-boarding-drone-into-the"), fx: [{ k: "note", text: tx("wiki.filler-events.low-scrap-with-resources") }] },
      { id: "c:giant-alien-spiders:4", label: tx("wiki.filler-events.use-the-beam-to-pick-off"), fx: [{ k: "note", text: tx("wiki.filler-events.high-resources-with-some-scrap") }] },
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
    body: tx("wiki.filler-events.you-arrive-at-the-distress-beacon"),
    choices: [
      { id: "c:crushed-pirate:0", label: tx("wiki.filler-events.try-to-dislodge-the-ship-by"), fx: [{ k: "note", text: tx("wiki.filler-events.2-hull-2-system-damage-and") }] },
      { id: "c:crushed-pirate:1", label: tx("wiki.filler-events.destroy-and-loot-the-ship-they"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-scrap-with-resources-or-a") }] },
      { id: "c:crushed-pirate:2", label: tx("wiki.filler-events.carefully-cut-the-ship-out"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-scrap-with-resources") }] },
      { id: "c:crushed-pirate:3", label: tx("wiki.filler-events.have-your-drone-cut-the-ship"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-scrap-with-resources") }] },
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
    body: tx("wiki.filler-events.you-locate-a-nearby-human-mining"),
    choices: [
      { id: "c:unknown-disease-on-mining-colony:0", label: tx("wiki.filler-events.send-in-your-crew-to-help"), fx: [{ k: "note", text: tx("wiki.filler-events.a-crewmember-and-medium-resources-or") }] },
      { id: "c:unknown-disease-on-mining-colony:1", label: tx("wiki.filler-events.ignore-their-request-and-move-on"), fx: [{ k: "nothing" }] },
      { id: "c:unknown-disease-on-mining-colony:2", label: tx("wiki.filler-events.send-your-rock-crew-member-to"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-resources-with-some-scrap") }] },
      { id: "c:unknown-disease-on-mining-colony:3", label: tx("wiki.filler-events.send-your-engi-to-calm-down"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-resources-with-some-scrap") }] },
      { id: "c:unknown-disease-on-mining-colony:4", label: tx("wiki.filler-events.use-your-medbay-to-help-synthesize"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-resources-or-high-scrap") }] },
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
    body: tx("wiki.filler-events.you-find-the-source-of-the"),
    choices: [
      { id: "c:fire-on-research-station:0", label: tx("wiki.filler-events.send-your-crew-in-a-shuttle"), fx: [{ k: "note", text: tx("wiki.filler-events.a-crewmember-and-low-scrap-or") }] },
      { id: "c:fire-on-research-station:1", label: tx("wiki.filler-events.dock-and-try-to-rescue-the"), fx: [{ k: "note", text: tx("wiki.filler-events.4-hull-1-system-damage-and") }] },
      { id: "c:fire-on-research-station:2", label: tx("wiki.filler-events.leave"), fx: [{ k: "nothing" }] },
      { id: "c:fire-on-research-station:3", label: tx("wiki.filler-events.send-your-rock-crew-member-in"), fx: [{ k: "note", text: tx("wiki.filler-events.high-scrap-and-a-random-augmentation") }] },
      { id: "c:fire-on-research-station:4", label: tx("wiki.filler-events.send-your-repair-drone-into-the"), fx: [{ k: "note", text: tx("wiki.filler-events.high-scrap-and-a-random-drone") }] },
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
    body: tx("wiki.filler-events.it-appears-the-distress-beacon-is"),
    choices: [
      { id: "c:single-life-form-on-moon:0", label: tx("wiki.filler-events.go-down-to-the-surface-to"), fx: [{ k: "note", text: tx("wiki.filler-events.charlie-a-crewmember-5-hull-or") }] },
      { id: "c:single-life-form-on-moon:1", label: tx("wiki.filler-events.ignore-the-signal"), fx: [{ k: "nothing" }] },
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
    body: tx("wiki.filler-events.you-arrive-at-the-beacon-and-2"),
    choices: [
      { id: "c:pirate-ship-distress-trap:0", label: tx("wiki.filler-events.fight-the-pirate-ship"), fx: [{ k: "fight", tier: "Pirate ship" }] },
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
    body: tx("wiki.filler-events.the-distress-signal-is-coming-from"),
    choices: [
      { id: "c:malfunctioning-defense-system:0", label: tx("wiki.filler-events.promise-to-help"), fx: [{ k: "note", text: tx("wiki.filler-events.ion-cloaking-an-engi-or-low") }] },
      { id: "c:malfunctioning-defense-system:1", label: tx("wiki.filler-events.leave-them-alone"), fx: [{ k: "nothing" }] },
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
    body: tx("wiki.filler-events.this-beacon-seems-to-serve-as"),
    choices: [
      { id: "c:crew-hiring-station:0", label: tx("wiki.filler-events.don-t-hire-anyone"), fx: [{ k: "nothing" }] },
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
