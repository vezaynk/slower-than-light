/**
 * @agent:quests-a. Sector-special quest-opening event pages and their quest chains: Ancient device, Rock war vessel
 * encounter, Unarmed Zoltan transport, Zoltan research facility, Zoltan trade hub, Rock bride. Their opening cards are
 * the table in quests-a-pages.ts (stamped by cited-events.ts / beacon-mix.ts); everything after the opening card runs
 * here, registered with wiki/quests.ts as PART_A (quests.ts reads it at call time).
 *
 * Same conventions as wiki/quests.ts: a page that lists N results without odds rolls them with equal odds
 * ({{DuplicateEvent|N}} counts N times), unnamed weapons / drone schematics / augments are random ones (bonus-item.ts
 * grantRandomItem, per Rewards "Weapon" / "Drone" / "Augment"), and the
 * one-word labels of "Fight ..." / "Continue" buttons and quest beacon names are INVENTED where the page prints none.
 * Ship unlocks go through unlocks.ts grantUnlock.
 */
import { crewDef } from "@stl/pack";
import { xpNeedFor } from "../extras/lineage.ts";
import { enterHiddenCrystal, log, rand, showEventLines } from "../sim.ts";
import type { Game, SkillName } from "../types.ts";
import { grantUnlock } from "../unlocks.ts";
import { grantRandomItem } from "../rules/bonus-item.ts";
import { eventText } from "../event-text.ts";
import { affordStock, scrapLine, takeStock } from "./stock-spend.ts";
import {
  addQuest,
  card,
  crew,
  grantAug,
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
import { type SurrenderPlan } from "../rules/surrender.ts";
import {
  between,
  closeFight,
  humanBoarders,
  joinCrew,
  NEVER_RUN,
  pageFight,
  rollStandard,
  resourceBand,
  rollSurrenderOffer,
} from "./surrender.ts";

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

function hasKin(g: Game, kin: string): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === kin);
}
const hasCrystal = (g: Game) => hasKin(g, "crystal");
const hasZoltan = (g: Game) => hasKin(g, "energy");
const hasTeleporter = (g: Game) => (g.player.kits.teleporter?.level ?? 0) > 0;
const medbayLevel = (g: Game) => g.player.systems.medbay?.level ?? 0;

/** A fight whose page prints no surrender (or says it "doesn't surrender"): no offer this fight. */
function noOffer(g: Game) {
  const plan: SurrenderPlan = {
    chance: 0,
    threshold: 0,
    rolled: false,
    offered: false,
    refused: false,
    offer: null,
  };
  g.enemySurrender = plan;
}

/** Same as surrender.ts humanBoarders, for another race ("2-4 zoltan boarders"). INFERRED: each lands in a random room. */
function boarders(g: Game, race: string, kin: "energy", lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = crewDef(kin).hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room =
      rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: race,
      side: "enemy",
      aboard: "player",
      hp,
      maxHp: hp,
      room,
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin,
    });
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
 * Unarmed Zoltan transport: "receive Zoltan Shield augmentation".
 * Zoltan Shield: 5 points of energy shielding, recharged by an FTL jump once the augment is fitted.
 * Augmentations: a ship holds three. A full rack does not add a fourth. The page does not name which augment to swap.
 */
function zoltanShield(g: Game): string {
  const line = grantAug(g, "ENERGY_SHIELD");
  if (g.augments.includes("ENERGY_SHIELD")) g.player.zoltan = 5;
  return line;
}

/** The mid-combat line stays on a card until Continue. */
function resume(g: Game, line: string) {
  g.event = null;
  showEventLines(g, [line]);
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
    // Wiki citations:
    // > "You arrive at the coordinates to find a massive Crystalline cruiser docked at a small repair station." — [[Ancient device#Quest Marker]]
    // > "You unlock the Crystal Cruiser; you receive medium fuel and scrap, Crystal Vengeance augmentation, and your ship receives 10 repairs." — [[Ancient device#Quest Marker]]
    // Rewards, "Fuel": T fuel and T scrap.
    const unlocked = grantUnlock(g, "PLAYER_SHIP_CRYSTAL"); // @agent:unlocks. Ancient device: "You unlock the Crystal Cruiser".
    const offer = scrapOnly(g, "medium");
    offer.fuel = between(g, resourceBand("fuel", "medium"));
    result(
      g,
      eventText("event_CRYSTAL_UNLOCK_text"),
      offer,
      [unlocked, grantAug(g, "CRYSTAL_SHARDS"), repair(g, 10)],
    );
  },
  "rock-shipyard": (g) => {
    // Wiki citations:
    // > "You arrive at a massive Rockman shipyard" — [[Rock war vessel encounter#Shipyard Quest Marker]]
    // > "You unlock the Rock Cruiser." — [[Rock war vessel encounter#Shipyard Quest Marker]]
    // > "You receive Rock Plating augmentation and your ship receives 29 repairs." — [[Rock war vessel encounter#Shipyard Quest Marker]]
    const unlocked = grantUnlock(g, "PLAYER_SHIP_ROCK"); // @agent:unlocks. Rock war vessel encounter: "You unlock the Rock Cruiser."
    result(
      g,
      `${eventText("event_ROCK_UNLOCK3_text")}\n\n${eventText("event_ROCK_UNLOCK3_c1_text")}\n\n${eventText("event_ROCK_UNLOCK3_c1_c1_text")}`,
      undefined,
      [unlocked, grantAug(g, "ROCK_ARMOR"), repair(g, 29)],
    );
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Choices
// ---------------------------------------------------------------------------------------------------------------

/** Zoltan trade hub, "In the Zoltan hub": two results, no odds printed. */
function zoltanHub(g: Game, text: string) {
  // Wiki citations:
  // > "You head into a ship supply store." — [[Zoltan trade hub#In the Zoltan hub]]
  // > "A store opens." — [[Zoltan trade hub#In the Zoltan hub]]
  // > "You head into the cantina for gossip." — [[Zoltan trade hub#In the Zoltan hub]]
  // > "A quest marker is added to your map." — [[Zoltan trade hub#In the Zoltan hub]]
  if (rand(g) < 0.5) {
    result(
      g,
      `${text}\n\n${eventText("event_ZOLTAN_TRADE_HUB_SUCCESS_1_text")}`,
      undefined,
      [],
      STORE_CHOICES(),
    );
  } else {
    result(
      g,
      `${text}\n\n${eventText("event_ZOLTAN_TRADE_HUB_SUCCESS_2_text")}\n\n${eventText("event_ZOLTAN_TRADE_HUB_SUCCESS_2_c1_text")}`,
      undefined,
      [addQuest(g, "zoltan-primitives")],
    );
  }
}

const PEACE_FIGHT = "Rebel ship";

const CHOICES_A: QuestPart["choices"] = {
  // ---- Ancient device ----
  "c:ancient-device:0": (g) => {
    // Wiki citations:
    // > "You break it apart and take it for scrap." — [[Ancient device]]
    // > "You receive high scrap." — [[Ancient device]]
    // > "As you start to break it apart a Rock military ship jumps nearby" — [[Ancient device]]
    // > "Fight a Rock ship (default rewards)." — [[Ancient device]]
    // ROCK_SHIP keeps the Rock surrender row (surrender.ts).
    if (rand(g) < 0.5) {
      result(
        g,
        eventText("event_ROCK_CRYSTAL_BEACON_LIST_1_text"),
        scrapOnly(g, "high"),
      );
    } else {
      pageFight(
        g,
        eventText("event_ROCK_CRYSTAL_BEACON_LIST_2_text"),
        "Rock ship",
        "ancient-device",
      );
    }
  },
  "c:ancient-device:1": (g) =>
    // Wiki citations:
    // > "Nothing happens." — [[Ancient device]]
    // > "Better not risk it. The Rock people are unlikely to respond well to vandalism." — [[Ancient device]]
    result(g, eventText("event_ROCK_CRYSTAL_BEACON_c2_text")),
  "c:ancient-device:2": (g) => {
    // Wiki citations:
    // > "(Crystal Crew) Reactivate it." — [[Ancient device]]
    // > "You receive Fuel gained: 1." — [[Ancient device]]
    // > "You jump to the Hidden Crystal Worlds." — [[Ancient device]]
    // > "A quest marker is added to your map." — [[Ancient device#Hidden Crystal Worlds]]
    // > "The strength of enemy ships in the Crystal sector corresponds to the Rock Homeworlds sector number." — [[Ancient device#Notes]]
    // The granted fuel is spent on the jump. The marker is on the new map.
    if (!hasCrystal(g)) return;
    enterHiddenCrystal(g);
    result(
      g,
      `${eventText("event_ROCK_CRYSTAL_BEACON_c3_text")}\n\n${eventText("event_ROCK_CRYSTAL_BEACON_c3_c1_text")}\n\n${eventText("event_START_BEACON_CRYSTAL_text")}\n\n${eventText("event_START_BEACON_CRYSTAL_c1_text")}`,
      undefined,
      [addQuest(g, "crystal-unlock")],
    );
  },

  // ---- Rock war vessel encounter ----
  "c:rock-war-vessel-encounter:2": (g) => {
    // Wiki citations:
    // > "Nothing happens." — [[Rock war vessel encounter]]
    // > "If the Federation is as weak as you it deserves to fall." — [[Rock war vessel encounter]]
    result(
      g,
      eventText("event_ROCK_UNLOCK1_c3_text"),
    );
  },
  // INFERRED: no surrender (the page prints none). The M-class star's flares are rules/flare.ts eventHasFlare("quest-rock-sun"): the arrival page's `<environment type="sun">`.
  "qa:rock-sun:fight": (g) => {
    // Wiki citations:
    // > "Fight the Rock Assault (Elite) ship." — [[Rock war vessel encounter#Sun Quest Marker]]
    // > "ship starts to escape with 32 seconds countdown timer" — [[Rock war vessel encounter#Sun Quest Marker]]
    // > "The Rock ship starts to power up their FTL drive." — [[Rock war vessel encounter#Sun Quest Marker]]
    pageFight(
      g,
      eventText("ship_ROCK_UNLOCK2_escape_text"),
      "Rock Assault (Elite)",
      "quest-rock-sun",
      startRun(32),
    );
    noOffer(g);
  },

  // ---- Unarmed Zoltan transport ----
  "c:unarmed-zoltan-transport:0": (g) => {
    // Wiki citations:
    // > "Fight an unarmed Zoltan ship." — [[Unarmed Zoltan transport]]
    // > "We carry no weapons or shielding" — [[Unarmed Zoltan transport]]
    // > "They are clearly not putting up a fight." — [[Unarmed Zoltan transport]]
    // > "Just as you're preparing to attack you detect a nearby jump signature." — [[Unarmed Zoltan transport]]
    // > "Fight a Zoltan ship." — [[Unarmed Zoltan transport]]
    // INFERRED: "We carry no weapons or shielding" strips weapons, shields, drones, hacking, and boarding.
    if (rand(g) < 0.5) {
      pageFight(
        g,
        eventText("event_ZOLTAN_PEACE_QUEST_ATTACK_1_text"),
        "Zoltan ship",
        "unarmed-zoltan-transport",
      );
      const ship = g.enemy;
      if (ship) {
        ship.weapons = [];
        ship.kits = {};
        ship.boards = false;
        ship.shieldNow = 0;
        // Zoltan Ships: the unarmed Energy Fighter (Peace) "has no Shields, Weapons, or Zoltan Shield."
        ship.zoltan = undefined;
        if (ship.systems.shields) {
          ship.systems.shields.level = 0;
          ship.systems.shields.power = 0;
        }
        g.boardTimer = 0;
      }
      // {{Winning|surrender=true|...}}. INFERRED: no threshold is printed and the ship cannot fight back, so the offer
      // opens with the fight. Zoltan ships otherwise never surrender (surrender.ts), so this card is the only one.
      card(g, eventText("ship_ZOLTAN_PEACE_QUEST_ATTACK1_surrender_text"), [
        { id: "qa:uzt:finish", label: eventText("ship_ZOLTAN_PEACE_QUEST_ATTACK1_surrender_c1_choice") },
        { id: "qa:uzt:go", label: eventText("ship_ZOLTAN_PEACE_QUEST_ATTACK1_surrender_c2_choice") },
      ]);
    } else {
      pageFight(
        g,
        eventText("event_ZOLTAN_PEACE_QUEST_ATTACK_2_text"),
        "Zoltan ship",
        "unarmed-zoltan-defense",
      );
    }
  },
  "qa:uzt:finish": (g) => {
    // Wiki citations:
    // > "Finish them off." — [[Unarmed Zoltan transport]]
    // > "You continue the assault." — [[Unarmed Zoltan transport]]
    // > "The fight continues." — [[Unarmed Zoltan transport]]
    resume(g, eventText("ship_ZOLTAN_PEACE_QUEST_ATTACK1_surrender_c1_text"));
  },
  "qa:uzt:go": (g) => {
    // Wiki citations:
    // > "Let them go." — [[Unarmed Zoltan transport]]
    // > "You power down your weapons and after a time the ship slowly limps away." — [[Unarmed Zoltan transport]]
    // > "Nothing happens." — [[Unarmed Zoltan transport]]
    closeFight(g);
    result(
      g,
      eventText("ship_ZOLTAN_PEACE_QUEST_ATTACK1_surrender_c2_text"),
    );
  },
  "c:unarmed-zoltan-transport:2": (g) => {
    // Wiki citations:
    // > "The galaxy is at war - there's no time for talk of peace." — [[Unarmed Zoltan transport]]
    // > "Nothing happens." — [[Unarmed Zoltan transport]]
    result(
      g,
      eventText("event_ZOLTAN_PEACE_QUEST_c3_text"),
    );
  },
  // Quest Marker. Every Rebel fight here is "(default rewards)", so no PAGE wins entry.
  "qa:peace:attack": (g) => {
    // Wiki citations:
    // > "You power your weapons and prepare to fight." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "Fight a Rebel ship (default rewards)." — [[Unarmed Zoltan transport#Quest Marker]]
    pageFight(g, eventText("event_ZOLTAN_PEACE_QUEST2_c1_text"), PEACE_FIGHT, "quest-zoltan-peace");
  },
  "qa:peace:hail": (g) => {
    // Wiki citations:
    // > "Attempt to hail them." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "Perhaps there could be a reconciliation of our ideals without war?" — [[Unarmed Zoltan transport#Quest Marker]]
    // > "Surrender. Your ultimate destruction is inevitable." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "Your Rebellion is causing millions of deaths." — [[Unarmed Zoltan transport#Quest Marker]]
    card(
      g,
      eventText("event_ZOLTAN_PEACE_QUEST2_c2_text"),
      [
        {
          id: "qa:peace:reconcile",
          label: eventText("event_ZOLTAN_PEACE_QUEST2_c2_c1_choice"),
        },
        {
          id: "qa:peace:surrender",
          label:
            eventText("event_ZOLTAN_PEACE_QUEST2_c2_c2_choice"),
        },
        {
          id: "qa:peace:unity",
          label:
            eventText("event_ZOLTAN_PEACE_QUEST2_c2_c3_choice"),
        },
      ],
    );
  },
  "qa:peace:reconcile": (g) => {
    // Wiki citations:
    // > "The galaxy is huge, you can find a place for your ideals elsewhere without causing this destruction." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "True progress can only be achieved without bloodshed." — [[Unarmed Zoltan transport#Quest Marker]]
    card(
      g,
      eventText("event_ZOLTAN_PEACE_QUEST2_c2_c1_text"),
      [
        {
          id: "qa:peace:elsewhere",
          label:
            eventText("event_ZOLTAN_PEACE_QUEST2_c2_c1_c1_choice"),
        },
        {
          id: "qa:peace:bloodless",
          label: eventText("event_ZOLTAN_PEACE_QUEST2_c2_c1_c2_choice"),
        },
      ],
    );
  },
  "qa:peace:elsewhere": (g) => {
    // Wiki citations:
    // > "Fight a Rebel ship (default rewards)." — [[Unarmed Zoltan transport#Quest Marker]]
    pageFight(
      g,
      eventText("event_ZOLTAN_PEACE_QUEST2_c2_c1_c1_text"),
      PEACE_FIGHT,
      "quest-zoltan-peace",
    );
  },
  "qa:peace:surrender": (g) => {
    // Wiki citations:
    // > "They shut off communications and immediately engage." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "Fight a Rebel ship (default rewards)." — [[Unarmed Zoltan transport#Quest Marker]]
    pageFight(
      g,
      eventText("event_ZOLTAN_PEACE_QUEST2_c2_c2_text"),
      PEACE_FIGHT,
      "quest-zoltan-peace",
    );
  },
  "qa:peace:unity": (g) => {
    // Wiki citations:
    // > "Fight a Rebel ship (default rewards)." — [[Unarmed Zoltan transport#Quest Marker]]
    pageFight(
      g,
      eventText("event_ZOLTAN_PEACE_QUEST2_c2_c3_text"),
      PEACE_FIGHT,
      "quest-zoltan-peace",
    );
  },
  "qa:peace:bloodless": (g) => {
    // Wiki citations:
    // > "Suddenly all indications of the Rebel ship fade away and a Zoltan fleet appears around your ship." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "You unlock the Zoltan Cruiser; receive Zoltan Shield augmentation and low scrap." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "You unlock the Zoltan Cruiser; receive a Zoltan crewmember named Envoy maxed in all skills and high scrap with resources." — [[Unarmed Zoltan transport#Quest Marker]]
    // ftl.dat pages: the fleet arrives, then one of two reward pages.
    const intro = eventText("event_ZOLTAN_PEACE_QUEST2_c2_c1_c2_text");
    const unlocked = grantUnlock(g, "PLAYER_SHIP_ENERGY"); // @agent:unlocks. Unarmed Zoltan transport: "You unlock the Zoltan Cruiser".
    // "(50% chance)" each.
    if (rand(g) < 0.5) {
      // "You unlock the Zoltan Cruiser; receive Zoltan Shield augmentation and low scrap."
      result(
        g,
        `${intro}\n\n${eventText("event_ZOLTAN_PEACE_QUEST_REWARD_1_text")}`,
        scrapOnly(g, "low"),
        [unlocked, zoltanShield(g)],
      );
    } else {
      // "You unlock the Zoltan Cruiser; receive a Zoltan crewmember named Envoy maxed in all skills and high scrap with resources."
      result(
        g,
        `${intro}\n\n${eventText("event_ZOLTAN_PEACE_QUEST_REWARD_2_text")}`,
        rollStandard(g, "high"),
        [unlocked, maxedCrew(g, "Zoltan", "Envoy")],
      );
    }
  },

  // ---- Zoltan research facility ----
  "c:zoltan-research-facility:0": (g) => {
    // Wiki citations:
    // > "2× Your crew calmly lines up for the Zoltans to take their readings." — [[Zoltan research facility]]
    // > "You receive low scrap." — [[Zoltan research facility]]
    // > "pirates burst on board and a hostile ship appears" — [[Zoltan research facility]]
    // > "2 boarders beam aboard your ship, and you fight a Pirate ship." — [[Zoltan research facility]]
    // > "doesn't surrender, nor tries to escape" — [[Zoltan research facility#Trivia]]
    // The study is printed twice and the ambush once. Human boarders: the race is not named. INFERRED.
    const r = weighted(g, [
      ["study", 2],
      ["ambush", 1],
    ] as ["study" | "ambush", number][]);
    if (r === "study") {
      result(
        g,
        eventText("event_ZOLTAN_CREW_STUDY_LIST_1_text"),
        scrapOnly(g, "low"),
      );
      return;
    }
    pageFight(
      g,
      eventText("event_ZOLTAN_CREW_STUDY_LIST_3_text"),
      "Pirate ship",
      "zoltan-research-facility",
      { ...NEVER_RUN },
    );
    noOffer(g);
    humanBoarders(g, 2, 2);
  },
  "c:zoltan-research-facility:1": (g) =>
    // Wiki citations:
    // > "Alright. Fly safe." — [[Zoltan research facility]]
    // > "Nothing happens." — [[Zoltan research facility]]
    result(g, eventText("event_ZOLTAN_CREW_STUDY_c2_text")),
  "c:zoltan-research-facility:2": (g) => {
    // Wiki citations:
    // > "Requires level 3 Medbay" — [[Zoltan research facility]]
    // > "Thank you! We didn't expect to receive such a significant amount of data regarding your crew's health during FTL travel." — [[Zoltan research facility]]
    // > "You receive a drone schematic with low resources and scrap." — [[Zoltan research facility]]
    if (medbayLevel(g) < 3) return;
    result(
      g,
      eventText("event_ZOLTAN_CREW_STUDY_c3_text"),
      rollSurrenderOffer(g, "low", true),
      [grantRandomItem(g, "drone")],
    );
  },
  // Zoltan quest primitives. Interfere: a Zoltan fight. Both endings double pursuit for 1 jump (pageWin).
  "c:zoltan-quest-primitives:0": (g) => {
    // Wiki citations:
    // > "Interfere - make first contact with the primitive aliens." — [[Zoltan quest primitives]]
    // > "The local people - furry, one-eyed tree lizard things - begin chanting when they see you. Suddenly the sky is lit by laser fire - the Zoltan opened fire on your ship! You dash back to the shuttle and join the fight." — [[Zoltan quest primitives]]
    // > "Fight the Zoltan ship." — [[Zoltan quest primitives]]
    pageFight(
      g,
      eventText("event_ZOLTAN_QUEST_PRIMITIVES_c1_c1_text"),
      "Zoltan ship",
      "zoltan-quest-primitives-interfere",
    );
  },
  // Protect: a Rebel fight. Destroyed pays a weapon with low scrap; a crew kill pays a weapon with medium scrap.
  "c:zoltan-quest-primitives:1": (g) => {
    // Wiki citations:
    // > "Protect the aliens' way of life - Attack the Rebel ship." — [[Zoltan quest primitives]]
    // > "These creatures should be left to develop at their own pace. You direct all weapons on the Rebel ship and begin the firing sequence." — [[Zoltan quest primitives]]
    // > "Fight the Rebel Ship." — [[Zoltan quest primitives]]
    pageFight(
      g,
      eventText("event_ZOLTAN_QUEST_PRIMITIVES_c1_c2_text"),
      "Rebel ship",
      "zoltan-quest-primitives-protect",
    );
  },
  "c:zoltan-research-facility:3": (g) => {
    // Wiki citations:
    // > "I've never seen a cryogenic system like this." — [[Zoltan research facility]]
    // > "Crystal crewmember named Ruwen" — [[Zoltan research facility]]
    // > "a quest marker will appear in the Rock Homeworlds" — [[Zoltan research facility]]
    // > "as long as Ruwen stays alive" — [[Zoltan research facility]]
    const i = g.augments.indexOf("STASIS_POD");
    if (i < 0) return;
    g.augments.splice(i, 1);
    const joined = crew(g, "Crystal", undefined, "Ruwen");
    result(
      g,
      `${eventText("event_ZOLTAN_CREW_STUDY_c4_text")}\n\n${eventText("event_ZOLTAN_CREW_STUDY_c4_c1_text")}\n\n${eventText("event_ZOLTAN_CREW_STUDY_c4_c1_c1_text")}`,
      undefined,
      [joined],
    );
  },
  "qa:zrf:thanks": (g) => {
    // Wiki citations:
    // > "Thank you for rescuing us! They held us hostage to ambush unsuspecting passersby. Please, take this." — [[Zoltan research facility]]
    // > "You receive a drone schematic with low resources and scrap." — [[Zoltan research facility]]
    result(
      g,
      eventText("ship_PIRATE_ZOLTAN_CREW_STUDY_destroyed_c1_text"),
      rollSurrenderOffer(g, "low", true),
      [grantRandomItem(g, "drone")],
    );
  },

  // ---- Zoltan trade hub ----
  "c:zoltan-trade-hub:0": (g) => {
    // Wiki citations:
    // > "2-4 zoltan boarders beam aboard your ship and you fight a Zoltan ship (default rewards)." — [[Zoltan trade hub]]
    // > "You pose as traders and succeed in bypassing airlock security" — [[Zoltan trade hub]]
    // > "The Zoltan ship at the trade hub (\"ZOLTAN_SHIP\") doesn't have surrender/escape chances/requirements specified (events_ships.xml)." — [[Zoltan trade hub#Trivia]]
    if (rand(g) < 0.5) {
      pageFight(
        g,
        eventText("event_ZOLTAN_TRADE_HUB_TALK_1_text"),
        "Zoltan ship",
        "zoltan-trade-hub",
        { ...NEVER_RUN },
      );
      boarders(g, "Zoltan", "energy", 2, 4);
    } else {
      zoltanHub(
        g,
        eventText("event_ZOLTAN_TRADE_HUB_TALK_2_text"),
      );
    }
  },
  "c:zoltan-trade-hub:1": (g) => {
    // Wiki citations:
    // > "(Teleporter) Beam directly to the civilian deck." — [[Zoltan trade hub]]
    // > "You re-materialize in a dark corner of the main concourse and are able to conduct your investigations in peace." — [[Zoltan trade hub]]
    if (!hasTeleporter(g)) return;
    zoltanHub(
      g,
      eventText("event_ZOLTAN_TRADE_HUB_c2_text"),
    );
  },
  "c:zoltan-trade-hub:2": (g) => {
    // Wiki citations:
    // > "(Zoltan Crew) Present his official documentation and pay the entry fee." — [[Zoltan trade hub]]
    // > "You lose Scrap lost: 10." — [[Zoltan trade hub]]
    // > "They scan ID that declares your crewmember an official citizen" — [[Zoltan trade hub]]
    const cost = affordStock(g, "c:zoltan-trade-hub:2", "scrap");
    if (!hasZoltan(g) || cost == null) return;
    takeStock(g, "scrap", cost);
    zoltanHub(
      g,
      `${eventText("event_ZOLTAN_TRADE_HUB_c3_text")}\n\n${scrapLine(cost)}`,
    );
  },
  "c:zoltan-trade-hub:3": (g) =>
    // Wiki citations:
    // > "Nothing happens." — [[Zoltan trade hub]]
    // > "You don't have the papers" — [[Zoltan trade hub]]
    result(
      g,
      eventText("event_ZOLTAN_TRADE_HUB_c4_text"),
    ),

  // ---- Rock bride ----
  "c:rock-bride:1": (g) =>
    // Wiki citations:
    // > "Nothing happens." — [[Rock bride]]
    // > "Arranged marriages aren't on your list of worthy causes." — [[Rock bride]]
    result(
      g,
      eventText("event_ROCK_QUEST_MARRIAGE_START_c2_text"),
    ),
  // The augmentation is not named: Rewards, "Augment": "A random augmentation and T scrap."
  "qa:bride:hand": (g) => {
    // Wiki citations:
    // > "Hand her over." — [[Rock bride#Quest Marker]]
    // > "You receive an augmentation with low scrap." — [[Rock bride#Quest Marker]]
    result(
      g,
      eventText("event_ROCK_QUEST_MARRIAGE_c1_c1_text"),
      scrapOnly(g, "low"),
      [grantRandomItem(g, "augment")],
    );
  },
  "qa:bride:refuse": (g) => {
    // Wiki citations:
    // > "Refuse to comply." — [[Rock bride#Quest Marker]]
    // > "You receive a Rockman crewmember named Ariadne and fight a Rock ship." — [[Rock bride#Quest Marker]]
    const joined = crew(g, "Rock", undefined, "Ariadne");
    pageFight(
      g,
      eventText("event_ROCK_QUEST_MARRIAGE_c1_c2_text"),
      "Rock ship",
      "quest-rock-bride",
    );
    showEventLines(g, [joined]);
  },
};

/** Blue options and prices now live on the choice. The hook stays so the parts loop still runs. */
function disabledA(_g: Game, _id: string): string | null {
  // Wiki citations:
  // > "(Crystal Crew) Reactivate it." — [[Ancient device]]
  // Wiki citations:
  // > "Requires level 3 Medbay" — [[Zoltan research facility]]
  // > "(Damaged Stasis Pod) Ask if they can fix this." — [[Zoltan research facility]]
  // Wiki citations:
  // > "(Teleporter) Beam directly to the civilian deck." — [[Zoltan trade hub]]
  // > "(Zoltan Crew) Present his official documentation and pay the entry fee." — [[Zoltan trade hub]]
  // > "You lose Scrap lost: 10." — [[Zoltan trade hub]]
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Page wins and "gotaway" results
// ---------------------------------------------------------------------------------------------------------------

/** Destroyed -> `destroyed` tier; deadCrew -> "a random amount of scrap with resources". Text by ftl.dat id. */
function lowOrRandom(idD: string, idK: string): Win {
  return (g, deadCrew) =>
    result(g, eventText(deadCrew ? idK : idD), rollStandard(g, deadCrew ? undefined : "low"));
}

/** quests.ts `std`, with the text read by ftl.dat id when the fight ends. */
function stdText(
  destroyed: Parameters<typeof std>[0],
  killed: Parameters<typeof std>[1],
  idD: string,
  idK = idD,
  then?: Choice[],
): Win {
  return (g, deadCrew) => std(destroyed, killed, eventText(deadCrew ? idK : idD), undefined, then)(g, deadCrew);
}

const WINS_A: QuestPart["wins"] = {
  // Wiki citations:
  // > "You can't help but feel somewhat guilty as you search through the debris." — [[Unarmed Zoltan transport]]
  // > "You receive low scrap with resources." — [[Unarmed Zoltan transport]]
  // > "You begin to strip their ship and don't find anything that would indicate they were on anything other than a peaceful mission." — [[Unarmed Zoltan transport]]
  // > "You receive a random amount of scrap with resources." — [[Unarmed Zoltan transport]]
  "unarmed-zoltan-transport": lowOrRandom(
    "ship_ZOLTAN_PEACE_QUEST_ATTACK1_destroyed_text",
    "ship_ZOLTAN_PEACE_QUEST_ATTACK1_deadCrew_text",
  ),
  // Wiki citations:
  // > "After destroying enemy ship You defeat your assailant, but the peace ship has jumped away in the commotion." — [[Unarmed Zoltan transport]]
  // > "After killing enemy crew You defeat your assailant, but the peace ship has jumped away in the commotion." — [[Unarmed Zoltan transport]]
  // > "You receive low scrap with resources." — [[Unarmed Zoltan transport]]
  // > "You receive a random amount of scrap with resources." — [[Unarmed Zoltan transport]]
  "unarmed-zoltan-defense": lowOrRandom(
    "ship_ZOLTAN_PEACE_QUEST_ATTACK2_destroyed_text",
    "ship_ZOLTAN_PEACE_QUEST_ATTACK2_destroyed_text",
  ),
  // Wiki citations:
  // > "Their ship breaks apart and you feel a twinge of guilt." — [[Rock war vessel encounter#Sun Quest Marker]]
  // > "You receive medium scrap with resources." — [[Rock war vessel encounter#Sun Quest Marker]]
  // > "Their ship goes quiet and you feel a twinge of guilt." — [[Rock war vessel encounter#Sun Quest Marker]]
  // > "You receive high scrap with resources." — [[Rock war vessel encounter#Sun Quest Marker]]
  "quest-rock-sun": stdText(
    "medium",
    "high",
    "ship_ROCK_UNLOCK2_destroyed_text",
    "ship_ROCK_UNLOCK2_deadCrew_text",
  ),
  // Wiki citations:
  // > "You take out the ship and contact the research station." — [[Zoltan research facility]]
  // > "You receive medium scrap with resources." — [[Zoltan research facility]]
  // > "You disable the ship and contact the research station." — [[Zoltan research facility]]
  // > "You receive high scrap with resources." — [[Zoltan research facility]]
  "zoltan-research-facility": stdText(
    "medium",
    "high",
    "ship_PIRATE_ZOLTAN_CREW_STUDY_destroyed_text",
    "ship_PIRATE_ZOLTAN_CREW_STUDY_deadCrew_text",
    CONTINUE,
  ),
  // Interfere. "pursuit is doubled for 1 jump". Destroyed is low scrap with resources. A crew kill is a random amount.
  "zoltan-quest-primitives-interfere": (g, deadCrew) => {
    g.pursuitDouble = true;
    if (deadCrew) {
      // Wiki citations:
      // > "After killing enemy crew The Rebel contacts you. \"Lovely, you've done our job for us! We'll let you live as thanks. However, I can't promise the fleet will show you the same courtesy.\" They jump off. You collect what you can from the remains of the Zoltan ship." — [[Zoltan quest primitives]]
      // > "Rebel Fleet pursuit is doubled for 1 jump and you receive a random amount of scrap with resources." — [[Zoltan quest primitives]]
      result(
        g,
        eventText("ship_ZOLTAN_PRIMITIVES_ZOLTAN_destroyed_text"),
        rollStandard(g),
        ["Rebel Fleet pursuit is doubled for 1 jump."],
      );
      return;
    }
    // Wiki citations:
    // > "After destroying enemy ship The Rebel contacts you. \"Lovely, you've done our job for us! We'll let you live as thanks. However, I can't promise the fleet will show you the same courtesy.\" They jump off. You collect what you can from the remains of the Zoltan ship." — [[Zoltan quest primitives]]
    // > "Rebel Fleet pursuit is doubled for 1 jump and you receive low scrap with resources." — [[Zoltan quest primitives]]
    result(
      g,
      eventText("ship_ZOLTAN_PRIMITIVES_ZOLTAN_destroyed_text"),
      rollStandard(g, "low"),
      ["Rebel Fleet pursuit is doubled for 1 jump."],
    );
  },
  // Protect. A weapon with low scrap, or a weapon with medium scrap. The weapon is not named.
  "zoltan-quest-primitives-protect": (g, deadCrew) => {
    if (deadCrew) {
      // Wiki citations:
      // > "After killing enemy crew The Zoltan hail once the smoke disperses. \"Thank you. We were led to believe Federation ideals died along with the Federation itself. Let us aid you a little, for old times' sake.\" You accept their reward and scrap, then collect some remains from the Rebel ship." — [[Zoltan quest primitives]]
      // > "You receive a weapon with medium scrap." — [[Zoltan quest primitives]]
      result(
        g,
        eventText("ship_ZOLTAN_PRIMITIVES_REBEL_destroyed_text"),
        scrapOnly(g, "medium"),
        [grantRandomItem(g, "weapon")],
      );
      return;
    }
    // Wiki citations:
    // > "After destroying enemy ship The Zoltan hail once the smoke disperses. \"Thank you. We were led to believe Federation ideals died along with the Federation itself. Let us aid you a little, for old times' sake.\" You accept their reward and scrap, then collect some remains from the Rebel ship." — [[Zoltan quest primitives]]
    // > "You receive a weapon with low scrap." — [[Zoltan quest primitives]]
    result(
      g,
      eventText("ship_ZOLTAN_PRIMITIVES_REBEL_destroyed_text"),
      scrapOnly(g, "low"),
      [grantRandomItem(g, "weapon")],
    );
  },
  // Wiki citations:
  // > "After destroying enemy ship His escort eliminated, the Grand Basilisk dispatches his entire fleet. There's just time to take your pick from the wreck before you jump out of reach." — [[Rock bride#Quest Marker]]
  // > "You receive medium scrap with resources." — [[Rock bride#Quest Marker]]
  // > "After killing enemy crew His escort eliminated, the Grand Basilisk dispatches his entire fleet. There's just time to take your pick from the wreck before you jump out of reach." — [[Rock bride#Quest Marker]]
  // > "You receive high scrap with resources." — [[Rock bride#Quest Marker]]
  "quest-rock-bride": stdText(
    "medium",
    "high",
    "ship_ROCK_QUEST_MARRIAGE_destroyed_text",
  ),
};

const GOT_AWAY_A: QuestPart["gotAway"] = {
  // {{Winning|gotaway=true|...}} -> "Another quest marker is added to your map."
  "quest-rock-sun": (g) => {
    // Wiki citations:
    // > "As they jump away they relay coordinates to your navigation system." — [[Rock war vessel encounter#Sun Quest Marker]]
    // > "Another quest marker is added to your map." — [[Rock war vessel encounter#Sun Quest Marker]]
    result(
      g,
      eventText("ship_ROCK_UNLOCK2_gotaway_text"),
      undefined,
      [addQuest(g, "rock-shipyard")],
    );
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
