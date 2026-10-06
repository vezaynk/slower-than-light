/**
 * @agent:quests-a. Sector-special quest-opening event pages and their quest chains: Ancient device, Rock war vessel
 * encounter, Unarmed Zoltan transport, Zoltan research facility, Zoltan trade hub, Rock bride. Their opening cards are
 * the table in quests-a-pages.ts (stamped by cited-events.ts / beacon-mix.ts); everything after the opening card runs
 * here, registered with wiki/quests.ts as PART_A (quests.ts reads it at call time).
 *
 * Same conventions as wiki/quests.ts: a page that lists N results without odds rolls them with equal odds
 * ({{DuplicateEvent|N}} counts N times), unnamed weapons / drone schematics / augments are not granted, and the
 * one-word labels of "Fight ..." / "Continue" buttons and quest beacon names are INVENTED where the page prints none.
 * Ship unlocks go through unlocks.ts grantUnlock.
 */
import { kinOf } from "../extras/kin.ts";
import { xpNeedFor } from "../extras/lineage.ts";
import { log, rand } from "../sim.ts";
import type { Game, SkillName } from "../types.ts";
import { grantUnlock } from "../unlocks.ts";
import { EXTRA_EVENTS as ZOLTAN_PAGES } from "./cited-events-zoltan.ts";
import {
  addQuest,
  card,
  crew,
  grantAug,
  pick,
  repair,
  result,
  scrapOnly,
  startRun,
  std,
  STORE_CHOICES,
  weighted,
  type Choice,
  type QuestPart,
  type Win,
} from "./quests.ts";
import { between, closeFight, here, humanBoarders, joinCrew, NEVER_RUN, pageFight, rollStandard, rollSurrenderOffer, type SurrenderPlan } from "./surrender.ts";

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

function hasKin(g: Game, kin: string): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === kin);
}
const hasCrystal = (g: Game) => hasKin(g, "shard");
const hasZoltan = (g: Game) => hasKin(g, "spark");
const hasTeleporter = (g: Game) => (g.player.kits.sling?.level ?? 0) > 0;
const medbayLevel = (g: Game) => g.player.systems.medbay?.level ?? 0;

/** A fight whose page prints no surrender (or says it "doesn't surrender"): no offer this fight. */
function noOffer(g: Game) {
  const plan: SurrenderPlan = { chance: 0, threshold: 0, rolled: false, offered: false, refused: false, offer: null };
  g.enemySurrender = plan;
}

/** Same as surrender.ts humanBoarders, for another race ("2-4 zoltan boarders"). INFERRED: each lands in a random room. */
function boarders(g: Game, race: string, kin: "spark", lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = kinOf(kin).hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({ id: "u" + g.uid.toString(36), name: race, side: "enemy", aboard: "player", hp, maxHp: hp, room, path: [], move: 0, think: 0, tone: 3, kin });
  }
  log(g, `${n} ${race} boarders beam aboard.`);
}

/** A named crewmember "maxed in all skills" (as quests.ts does for Kazaaak). */
function maxedCrew(g: Game, race: string, name: string): string {
  if (!joinCrew(g, race, name)) return `There is no room aboard for ${name}.`;
  const c = g.crew[g.crew.length - 1];
  const all: SkillName[] = ["pilot", "engines", "weapons", "shields", "repair", "combat"];
  c.skills = Object.fromEntries(all.map((s) => [s, xpNeedFor(c, s) * 2]));
  return `${name} joins your crew.`;
}

/**
 * Augmentations, "Zoltan Shield". INFERRED: this build keeps the bubble on the ship (Ship.zoltan, 5 points, recharged by
 * every jump) rather than as one of the three augment slots, so granting it sets that field.
 */
function zoltanShield(g: Game): string {
  if (g.player.zoltan != null) return "Zoltan Shield is already fitted.";
  g.player.zoltan = 5;
  return "Zoltan Shield fitted.";
}

/** Back to the fight after a card shown mid-combat. */
function resume(g: Game, line: string) {
  g.event = null;
  g.phase = g.enemy ? "combat" : "map";
  g.paused = false;
  log(g, line);
}

const CONTINUE: Choice[] = [{ id: "qa:zrf:thanks", label: "Continue." }];

// ---------------------------------------------------------------------------------------------------------------
// Quest ids, beacon names (INVENTED), and arrival cards
// ---------------------------------------------------------------------------------------------------------------

const QUESTS_A: QuestPart["quests"] = {
  // Ancient device, "Quest Marker" (CRYSTAL_UNLOCK).
  "crystal-unlock": { page: "Ancient device", title: "Crystal repair station" },
  // Rock war vessel encounter, "Sun Quest Marker" and "Shipyard Quest Marker".
  "rock-sun": { page: "Rock war vessel encounter", title: "Red giant" },
  "rock-shipyard": { page: "Rock war vessel encounter", title: "Rockman shipyard" },
  // Unarmed Zoltan transport, "Quest Marker".
  "zoltan-peace": { page: "Unarmed Zoltan transport", title: "Zoltan brethren" },
  // Zoltan trade hub, "Quest Marker" ({{:Zoltan quest primitives}}).
  "zoltan-primitives": { page: "Zoltan trade hub", title: "Primitive planet" },
  // Rock bride, "Quest Marker".
  "rock-bride": { page: "Rock bride", title: "Numa V" },
};

const ARRIVE: QuestPart["arrive"] = {
  "crystal-unlock": (g) => {
    // "You unlock the Crystal Cruiser; you receive medium (2-4 fuel) fuel and scrap, Crystal Vengeance augmentation,
    // and your ship receives 10 repairs." Rewards, "Fuel": T fuel & T scrap.
    const unlocked = grantUnlock(g, "crystal-a"); // @agent:unlocks. Ancient device: "You unlock the Crystal Cruiser".
    const offer = scrapOnly(g, "medium");
    offer.fuel = between(g, [2, 4]);
    result(
      g,
      "You arrive at the coordinates to find a massive Crystalline cruiser docked at a small repair station. You arrange for the ship to be sent back to the Federation base while the station upgrades your hull.",
      offer,
      [unlocked, grantAug(g, "vengeance"), repair(g, 10)],
    );
  },
  "rock-sun": (g) => {
    card(g, "You arrive at the coordinates given and find yourself dangerously close to an M-class star! The other ship messages you, \"Let's see how long your puny ship can handle this heat! Prepare for a challenge!\"", [
      { id: "qa:rock-sun:fight", label: "Fight the Rock ship." },
    ]);
  },
  "rock-shipyard": (g) => {
    const unlocked = grantUnlock(g, "rock-a"); // @agent:unlocks. Rock war vessel encounter: "You unlock the Rock Cruiser."
    // "You unlock the Rock Cruiser." -> "You receive Rock Plating augmentation and your ship receives 29 repairs."
    result(
      g,
      "You arrive at a massive Rockman shipyard and notice the ship that had just tried to kill you is docked and already being repaired. \"Well fought! I must say I did not expect you to survive.\"\n\nI am convinced of your strength and pledge to assist your cause. We'll immediately send an advanced cruiser to the Federation fleet and we will prepare our warships to move out.\n\n\"Now that that's taken care of, let us patch up your hull. Maybe we can improve its armor plating while we're at it.\"",
      undefined,
      [unlocked, grantAug(g, "keel"), repair(g, 29)],
    );
  },
  "zoltan-peace": (g) => {
    card(g, "You arrive at the location specified by the peace-loving Zoltan, but the only thing nearby is a Rebel ship, closing in fast! \"We've found you! You're not getting away this time!\"", [
      { id: "qa:peace:attack", label: "Attack." },
      { id: "qa:peace:hail", label: "Attempt to hail them." },
    ]);
  },
  "zoltan-primitives": (g) => {
    // {{:Zoltan quest primitives}}: the standalone page's card (cited-events-zoltan.ts); its choices run in citedChoose.
    const page = ZOLTAN_PAGES.find((ev) => ev.slug === "zoltan-quest-primitives");
    if (!page) return;
    g.event = { title: here(g)?.name ?? page.dest, body: page.body, choices: page.choices.map((c) => ({ id: c.id, label: c.label })) };
    g.phase = "event";
    g.paused = true;
  },
  "rock-bride": (g) => {
    card(g, "A vast tunnel network near the surface of Numa V indicates an advanced Rock civilization. This must be where you were asked to deliver the passenger.\n\nRealizing arrival is imminent, your passenger - silent so far - pleads with you not to hand her over. She's interrupted by the Grand Basilisk's Chief Aide: \"To the alien vessel holding the Basilisk's wife. Deliver her to us. You will be rewarded... well.\"", [
      { id: "qa:bride:hand", label: "Hand her over." },
      { id: "qa:bride:refuse", label: "Refuse to comply." },
    ]);
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Choices
// ---------------------------------------------------------------------------------------------------------------

/** Zoltan trade hub, "In the Zoltan hub": two results, no odds printed. */
function zoltanHub(g: Game, text: string) {
  if (rand(g) < 0.5) {
    // "A store opens."
    result(g, `${text}\n\nYou head into a ship supply store. It is a well-equipped, self-service affair. An order is dialed into a terminal, scrap is deposited, and the item is dispatched from a nearby chute.`, undefined, [], STORE_CHOICES);
  } else {
    result(
      g,
      `${text}\n\nYou head into the cantina for gossip. Topics of conversation in the cantina range from crop distribution microbes to the joys of Slug pleasure cruises.\n\nYou overhear one group discussing a newly discovered planet yet to have first contact, and note down its location.`,
      undefined,
      [addQuest(g, "zoltan-primitives")],
    );
  }
}

const PEACE_FIGHT = "Rebel ship";

const CHOICES_A: QuestPart["choices"] = {
  // ---- Ancient device ----
  "c:ancient-device:0": (g) => {
    if (rand(g) < 0.5) {
      result(g, "You break it apart and take it for scrap. No one will miss it.", scrapOnly(g, "high"));
    } else {
      // "Fight a Rock ship (default rewards)." ROCK_SHIP keeps the Rock surrender row (surrender.ts).
      pageFight(g, "As you start to break it apart a Rock military ship jumps nearby, \"You think you can come into our sector and just steal whatever you please?! Prepare to die, vandals!\"", "Rock ship", "ancient-device");
    }
  },
  "c:ancient-device:1": (g) => result(g, "Better not risk it. The Rock people are unlikely to respond well to vandalism."),
  "c:ancient-device:2": (g) => {
    if (!hasCrystal(g)) return;
    // "You receive 1 fuel" ... "You jump to the Hidden Crystal Worlds. [1 subtract_fuel]": the fuel nets to zero.
    // INVENTED substitute: this build has no jump to the Hidden Crystal Worlds (it is not on the sector chart), so the
    // companion's coordinates ("A quest marker is added to your map.") go on this map, or the next sector's.
    result(
      g,
      "Your Crystalline companion says, \"It looks like we have found the abandoned link to my home worlds. I can reactivate it.\" He transmits some codes to the device and it immediately powers on.\n\nBefore you can react, the space around you distorts and a wormhole forms. You begin to sound the alarm, but your companion calms you and indicates that you should fly directly into the wormhole. You reluctantly do as he says.\n\n\"You have done as you promised and so shall I. The coordinates of my old ship have been forwarded to your navigation system.\"",
      undefined,
      [addQuest(g, "crystal-unlock")],
    );
  },

  // ---- Rock war vessel encounter ----
  "c:rock-war-vessel-encounter:0": (g) => {
    result(g, "\"The latter being more likely. Still... we can potentially help you and your precious fleet, but you'll need to prove yourself first. Meet us at these coordinates.\" They jump away.", undefined, [addQuest(g, "rock-sun")]);
  },
  "c:rock-war-vessel-encounter:1": (g) => {
    result(g, "\"One ship is not the same as a fleet, but at least you've got some fire. Meet us at these coordinates if you want to prove to us that the Federation is worth saving.\" They jump away.", undefined, [addQuest(g, "rock-sun")]);
  },
  "c:rock-war-vessel-encounter:2": (g) => {
    result(g, "\"Heh. Like I expected. If the Federation is as weak as you it deserves to fall.\" They jump away without another word.");
  },
  // "Fight the Rock Assault (Elite) ship" (ROCK_UNLOCK2), "(ship starts to escape with 32 seconds countdown timer)".
  // INFERRED: no surrender (the page prints none). Not wired: the M-class star's heat (no star hazard in this build).
  "qa:rock-sun:fight": (g) => {
    pageFight(g, "The Rock ship starts to power up their FTL drive. If we're going to earn their trust we must endure the heat for as long as they can!", "Rock Assault (Elite)", "quest-rock-sun", startRun(32));
    noOffer(g);
  },

  // ---- Unarmed Zoltan transport ----
  "c:unarmed-zoltan-transport:0": (g) => {
    if (rand(g) < 0.5) {
      // "Fight an unarmed Zoltan ship." INFERRED: "We carry no weapons or shielding" -> no weapons, shields, drones,
      // hacking or boarding on that hull.
      pageFight(g, "You charge your weapons - not that this will take much.", "Zoltan ship", "unarmed-zoltan-transport");
      const ship = g.enemy;
      if (ship) {
        ship.weapons = [];
        ship.kits = {};
        ship.boards = false;
        ship.shieldNow = 0;
        if (ship.systems.shields) {
          ship.systems.shields.level = 0;
          ship.systems.shields.power = 0;
        }
        g.boardTimer = 0;
      }
      // {{Winning|surrender=true|...}}. INFERRED: no threshold is printed and the ship cannot fight back, so the offer
      // opens with the fight. Zoltan ships otherwise never surrender (surrender.ts), so this card is the only one.
      card(g, "They are clearly not putting up a fight. Are you sure you want to destroy them?", [
        { id: "qa:uzt:finish", label: "Finish them off." },
        { id: "qa:uzt:go", label: "Let them go." },
      ]);
    } else {
      pageFight(g, "Just as you're preparing to attack you detect a nearby jump signature. A Zoltan defense ship comes to their aid!", "Zoltan ship", "unarmed-zoltan-defense");
    }
  },
  "qa:uzt:finish": (g) => resume(g, "You continue the assault."),
  "qa:uzt:go": (g) => {
    // "Nothing happens."
    closeFight(g);
    result(g, "You power down your weapons and after a time the ship slowly limps away. They refuse all communications. You can't help but feel somewhat guilty.");
  },
  "c:unarmed-zoltan-transport:1": (g) => {
    result(
      g,
      "They continue. \"We take your silence for interested contemplation.\" They talk at length about peace and harmony, but either it's beyond your simple mind or it's all nonsense.\n\nThey finish: \"Please, spread the word of enlightenment to those that have not heard. Once you have, contact our brethren.\" They transmit coordinates of their so-called \"brethren\".",
      undefined,
      [addQuest(g, "zoltan-peace")],
    );
  },
  "c:unarmed-zoltan-transport:2": (g) => {
    result(g, "The galaxy is at war - there's no time for talk of peace. You leave their hails unanswered and charge the jump drive.");
  },
  // Quest Marker. Every Rebel fight here is "(default rewards)", so no PAGE wins entry.
  "qa:peace:attack": (g) => pageFight(g, "You power your weapons and prepare to fight.", PEACE_FIGHT, "quest-zoltan-peace"),
  "qa:peace:hail": (g) => {
    card(g, "They open communications: \"I can't imagine there's anything you could say that will save you. The rebellion must destroy those that are still loyal to the obsolete Federation.\"", [
      { id: "qa:peace:reconcile", label: "\"Perhaps there could be a reconciliation of our ideals without war?\"" },
      { id: "qa:peace:surrender", label: "\"Surrender. Your ultimate destruction is inevitable. We've left scores of Rebels destroyed in our wake.\"" },
      { id: "qa:peace:unity", label: "\"Your Rebellion is causing millions of deaths. Your beliefs are dividing the galaxy. Unity is the only option!\"" },
    ]);
  },
  "qa:peace:reconcile": (g) => {
    card(g, "\"Our ideals are too different to be so easily reconciled. You think this could end any way but war?\"", [
      { id: "qa:peace:elsewhere", label: "The galaxy is huge, you can find a place for your ideals elsewhere without causing this destruction." },
      { id: "qa:peace:bloodless", label: "True progress can only be achieved without bloodshed." },
    ]);
  },
  "qa:peace:elsewhere": (g) => {
    pageFight(g, "\"No! We will not be consigned to the backwaters of space just because we don't fit into your 'Federation ideals'\" They charge.", PEACE_FIGHT, "quest-zoltan-peace");
  },
  "qa:peace:surrender": (g) => pageFight(g, "They shut off communications and immediately engage.", PEACE_FIGHT, "quest-zoltan-peace"),
  "qa:peace:unity": (g) => {
    pageFight(g, "\"Humans are treated as 'equal' to aliens in the weak Federation. The sacrifice of BILLIONS of alien or human lives are justified if it means we reach our full potential!\" They charge.", PEACE_FIGHT, "quest-zoltan-peace");
  },
  "qa:peace:bloodless": (g) => {
    const intro = "Suddenly all indications of the Rebel ship fade away and a Zoltan fleet appears around your ship. The captain of the ship you met previously materializes on your bridge.";
    const said = "\"Although your methods are crude and most certainly ineffective, it is clear you took our previous meeting to heart. If your ship represents the Federation's willingness to adapt we shall do what we can to aid in their fight.";
    const unlocked = grantUnlock(g, "zoltan-a"); // @agent:unlocks. Unarmed Zoltan transport: "You unlock the Zoltan Cruiser".
    // "(50% chance)" each.
    if (rand(g) < 0.5) {
      // "You unlock the Zoltan Cruiser; receive Zoltan Shield augmentation and low scrap."
      result(g, `${intro}\n\n${said} This technology should aid your quest."`, scrapOnly(g, "low"), [unlocked, zoltanShield(g)]);
    } else {
      // "You unlock the Zoltan Cruiser; receive a Zoltan crewmember named Envoy maxed in all skills and high scrap with resources."
      result(g, `${intro}\n\n${said} I will personally assist."`, rollStandard(g, "high"), [unlocked, maxedCrew(g, "Zoltan", "Envoy")]);
    }
  },

  // ---- Zoltan research facility ----
  "c:zoltan-research-facility:0": (g) => {
    // {{DuplicateEvent|2}} on the study; the ambush once.
    const r = weighted(g, [
      ["study", 2],
      ["ambush", 1],
    ] as ["study" | "ambush", number][]);
    if (r === "study") {
      result(g, "Your crew calmly lines up for the Zoltans to take their readings. After a short time, the process is done. They contact you, \"Thank you for your participation in our study. Please accept these small cakes made from stiff dough as well as some scrap.\"", scrapOnly(g, "low"));
      return;
    }
    // "2 boarders beam aboard your ship, and you fight a Pirate ship." INFERRED: Human boarders (the race is not named).
    // Trivia: PIRATE_ZOLTAN_CREW_STUDY "doesn't surrender, nor tries to escape".
    pageFight(g, "As soon as you dock, pirates burst on board and a hostile ship appears on the radar. You hear the Zoltans yell in the distance, \"We're being held hostage!\"", "Pirate ship", "zoltan-research-facility", { ...NEVER_RUN });
    noOffer(g);
    humanBoarders(g, 2, 2);
  },
  "c:zoltan-research-facility:1": (g) => result(g, "\"Alright. Fly safe.\" You prepare to leave."),
  "c:zoltan-research-facility:2": (g) => {
    if (medbayLevel(g) < 3) return;
    // "You receive a drone schematic with low (fuel: 1-3 ; missiles: 1-2 ; drone parts: 1) resources and scrap."
    // The schematic is not named: only the resources and scrap.
    result(g, "\"Thank you! We didn't expect to receive such a significant amount of data regarding your crew's health during FTL travel. Please, accept this for your trouble.\"", rollSurrenderOffer(g, "low", true));
  },
  // After the pirate: "Please, take this." -> the same unnamed schematic with low resources and scrap.
  "qa:zrf:thanks": (g) => {
    result(g, "\"Thank you for rescuing us! They held us hostage to ambush unsuspecting passersby. Please, take this.\"", rollSurrenderOffer(g, "low", true));
  },

  // ---- Zoltan trade hub ----
  "c:zoltan-trade-hub:0": (g) => {
    if (rand(g) < 0.5) {
      // "2-4 zoltan boarders beam aboard your ship and you fight a Zoltan ship (default rewards)." Trivia: ZOLTAN_SHIP
      // "doesn't have surrender/escape chances" (Zoltan ships never run or surrender in escape.ts / surrender.ts).
      pageFight(g, "They don't see many of your species in these parts, and you stick out like a Casvagarian Sea Slug in a Plutonian Shrimp Stew. You make it back to the ship with a gang of Zoltan guards in tow!", "Zoltan ship", "zoltan-trade-hub", { ...NEVER_RUN });
      boarders(g, "Zoltan", "spark", 2, 4);
    } else {
      zoltanHub(g, "You pose as traders and succeed in bypassing airlock security - however, it's only a matter of time before someone realizes your ID cards are counterfeit!");
    }
  },
  "c:zoltan-trade-hub:1": (g) => {
    if (!hasTeleporter(g)) return;
    zoltanHub(g, "You re-materialize in a dark corner of the main concourse and are able to conduct your investigations in peace.");
  },
  "c:zoltan-trade-hub:2": (g) => {
    // "You lose 10 scrap."
    if (!hasZoltan(g) || g.scrap < 10) return;
    g.scrap -= 10;
    log(g, "Scrap: -10.");
    zoltanHub(g, "They scan ID that declares your crewmember an official citizen, collect their fee, and let you pass.");
  },
  "c:zoltan-trade-hub:3": (g) => result(g, "You don't have the papers - well, the neuro-laced identity bracelets - to get in, so best not to try."),

  // ---- Rock bride ----
  "c:rock-bride:0": (g) => {
    result(g, "\"You surprise me, off-worlder. Thank you. The passenger will be with you momentarily.\" She refuses to enter the main hold and prefers to wait in the cargo bay.", undefined, [addQuest(g, "rock-bride")]);
  },
  "c:rock-bride:1": (g) => result(g, "Arranged marriages aren't on your list of worthy causes. You leave the Rock to their business."),
  // "You receive an augmentation with low scrap." The augmentation is not named: only the low scrap.
  "qa:bride:hand": (g) => {
    result(g, "\"May your children erode into dust!\" she screams as she's bundled into the waiting shuttle. The Rock guards on board hurriedly drop off an exotic piece of technology and return to the Grand Basilisk.", scrapOnly(g, "low"));
  },
  // "You receive a Rockman crewmember named Ariadne and fight a Rock ship."
  "qa:bride:refuse": (g) => {
    const joined = crew(g, "Rock", undefined, "Ariadne");
    log(g, joined);
    pageFight(g, "\"I was led to believe your kind did not know mercy. I will join you. But quickly, we must jump away - they will not tolerate...\" She's interrupted by weapons fire from the Basilisk's escort!", "Rock ship", "quest-rock-bride");
  },
};

/** Blue options and prices (wiki/quests.ts questChoiceDisabled). */
function disabledA(g: Game, id: string): string | null {
  if (id === "c:ancient-device:2" && !hasCrystal(g)) return "Needs a Crystal crewmember";
  if (id === "c:zoltan-research-facility:2" && medbayLevel(g) < 3) return "Needs Medbay level 3";
  if (id === "c:zoltan-trade-hub:1" && !hasTeleporter(g)) return "Needs a Teleporter";
  if (id === "c:zoltan-trade-hub:2" && !hasZoltan(g)) return "Needs a Zoltan crewmember";
  if (id === "c:zoltan-trade-hub:2" && g.scrap < 10) return "Need 10 scrap";
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Page wins and "gotaway" results
// ---------------------------------------------------------------------------------------------------------------

/** Destroyed -> `destroyed` tier; deadCrew -> "a random amount of scrap with resources". */
function lowOrRandom(textD: string, textK: string): Win {
  return (g, deadCrew) => result(g, deadCrew ? textK : textD, rollStandard(g, deadCrew ? undefined : "low"));
}

const WINS_A: QuestPart["wins"] = {
  // Unarmed Zoltan transport, the unarmed ship: destroyed -> low; deadCrew -> random amount (scrap with resources).
  "unarmed-zoltan-transport": lowOrRandom(
    "You can't help but feel somewhat guilty as you search through the debris. It was probably a trap... right?",
    "You begin to strip their ship and don't find anything that would indicate they were on anything other than a peaceful mission. Perhaps you were too hasty.",
  ),
  // The Zoltan defense ship: same tiers.
  "unarmed-zoltan-defense": lowOrRandom(
    "You defeat your assailant, but the peace ship has jumped away in the commotion.",
    "You defeat your assailant, but the peace ship has jumped away in the commotion.",
  ),
  // Rock war vessel, Sun Quest Marker: destroyed -> medium, deadCrew -> high scrap with resources.
  "quest-rock-sun": std(
    "medium",
    "high",
    "Their ship breaks apart and you feel a twinge of guilt. Perhaps they could have helped the Federation if this had gone another way. You scrap what you can and prepare to jump out of the heat.",
    "Their ship goes quiet and you feel a twinge of guilt. Perhaps they could have helped the Federation if this had gone another way. You scrap what you can and prepare to jump out of the heat.",
  ),
  // Zoltan research facility pirate: destroyed -> medium, deadCrew -> high; then "Please, take this." (qa:zrf:thanks).
  "zoltan-research-facility": std("medium", "high", "You take out the ship and contact the research station.", "You disable the ship and contact the research station.", CONTINUE),
  // Rock bride, Quest Marker: destroyed -> medium, deadCrew -> high scrap with resources.
  "quest-rock-bride": std(
    "medium",
    "high",
    "His escort eliminated, the Grand Basilisk dispatches his entire fleet. There's just time to take your pick from the wreck before you jump out of reach.",
  ),
};

const GOT_AWAY_A: QuestPart["gotAway"] = {
  // {{Winning|gotaway=true|...}} -> "Another quest marker is added to your map."
  "quest-rock-sun": (g) => {
    result(g, "As they jump away they relay coordinates to your navigation system. They must mean for you to follow them!", undefined, [addQuest(g, "rock-shipyard")]);
  },
};

export const PART_A: QuestPart = {
  quests: QUESTS_A,
  arrive: ARRIVE,
  choices: CHOICES_A,
  disabled: disabledA,
  wins: WINS_A,
  gotAway: GOT_AWAY_A,
};
