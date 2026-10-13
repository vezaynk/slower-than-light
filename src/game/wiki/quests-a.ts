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
import { tx } from "../../i18n/index.ts";
import { kinOf } from "../extras/kin.ts";
import { xpNeedFor } from "../extras/lineage.ts";
import { enterHiddenCrystal, log, rand } from "../sim.ts";
import type { Game, SkillName } from "../types.ts";
import { grantUnlock } from "../unlocks.ts";
import { grantRandomItem } from "./bonus-item.ts";
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
  log(g, tx("wiki.quests-a.boarders-beam-aboard", { n: n, race: race }));
}

/** A named crewmember "maxed in all skills" (as quests.ts does for Kazaaak). */
function maxedCrew(g: Game, race: string, name: string): string {
  if (!joinCrew(g, race, name)) return tx("wiki.quests-a.there-is-no-room-aboard-for", { name: name });
  const c = g.crew[g.crew.length - 1];
  const all: SkillName[] = ["pilot", "engines", "weapons", "shields", "repair", "combat"];
  c.skills = Object.fromEntries(all.map((s) => [s, xpNeedFor(c, s) * 2]));
  return tx("wiki.quests-a.joins-your-crew", { name: name });
}

/**
 * Unarmed Zoltan transport: "receive Zoltan Shield augmentation".
 * Zoltan Shield: 5 points of energy shielding, recharged by an FTL jump once the augment is fitted.
 * Augmentations: a ship holds three. A full rack does not add a fourth. The page does not name which augment to swap.
 */
function zoltanShield(g: Game): string {
  const line = grantAug(g, "zshield");
  if (g.augments.includes("zshield")) g.player.zoltan = 5;
  return line;
}

/** Back to the fight after a card shown mid-combat. */
function resume(g: Game, line: string) {
  g.event = null;
  g.phase = g.enemy ? "combat" : "map";
  g.paused = false;
  log(g, line);
}

const CONTINUE: Choice[] = [{ id: "qa:zrf:thanks", label: tx("wiki.quests-a.continue") }];

// ---------------------------------------------------------------------------------------------------------------
// Quest ids, beacon names (INVENTED), and arrival cards
// ---------------------------------------------------------------------------------------------------------------

const QUESTS_A: QuestPart["quests"] = {
  // Ancient device, "Quest Marker" (CRYSTAL_UNLOCK).
  "crystal-unlock": { page: "Ancient device", title: tx("wiki.quests-a.crystal-repair-station") },
  // Rock war vessel encounter, "Sun Quest Marker" and "Shipyard Quest Marker".
  "rock-sun": { page: "Rock war vessel encounter", title: tx("wiki.quests-a.red-giant") },
  "rock-shipyard": { page: "Rock war vessel encounter", title: tx("wiki.quests-a.rockman-shipyard") },
  // Unarmed Zoltan transport, "Quest Marker".
  "zoltan-peace": { page: "Unarmed Zoltan transport", title: tx("wiki.quests-a.zoltan-brethren") },
  // Zoltan trade hub, "Quest Marker" ({{:Zoltan quest primitives}}).
  "zoltan-primitives": { page: "Zoltan trade hub", title: tx("wiki.quests-a.primitive-planet") },
  // Rock bride, "Quest Marker".
  "rock-bride": { page: "Rock bride", title: tx("wiki.quests-a.numa-v") },
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
      tx("wiki.quests-a.you-arrive-at-the-coordinates-to"),
      offer,
      [unlocked, grantAug(g, "vengeance"), repair(g, 10)],
    );
  },
  "rock-sun": (g) => {
    card(g, tx("wiki.quests-a.you-arrive-at-the-coordinates-given"), [
      { id: "qa:rock-sun:fight", label: tx("wiki.quests-a.fight-the-rock-ship") },
    ]);
  },
  "rock-shipyard": (g) => {
    const unlocked = grantUnlock(g, "rock-a"); // @agent:unlocks. Rock war vessel encounter: "You unlock the Rock Cruiser."
    // "You unlock the Rock Cruiser." -> "You receive Rock Plating augmentation and your ship receives 29 repairs."
    result(
      g,
      tx("wiki.quests-a.you-arrive-at-a-massive-rockman"),
      undefined,
      [unlocked, grantAug(g, "keel"), repair(g, 29)],
    );
  },
  "zoltan-peace": (g) => {
    card(g, tx("wiki.quests-a.you-arrive-at-the-location-specified"), [
      { id: "qa:peace:attack", label: tx("wiki.quests-a.attack") },
      { id: "qa:peace:hail", label: tx("wiki.quests-a.attempt-to-hail-them") },
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
    card(g, tx("wiki.quests-a.a-vast-tunnel-network-near-the"), [
      { id: "qa:bride:hand", label: tx("wiki.quests-a.hand-her-over") },
      { id: "qa:bride:refuse", label: tx("wiki.quests-a.refuse-to-comply") },
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
    result(g, tx("wiki.quests-a.you-head-into-a-ship-supply", { text: text }), undefined, [], STORE_CHOICES);
  } else {
    result(
      g,
      tx("wiki.quests-a.you-head-into-the-cantina-for", { text: text }),
      undefined,
      [addQuest(g, "zoltan-primitives")],
    );
  }
}

const PEACE_FIGHT = tx("wiki.quests-a.rebel-ship");

const CHOICES_A: QuestPart["choices"] = {
  // ---- Ancient device ----
  "c:ancient-device:0": (g) => {
    if (rand(g) < 0.5) {
      result(g, tx("wiki.quests-a.you-break-it-apart-and-take"), scrapOnly(g, "high"));
    } else {
      // "Fight a Rock ship (default rewards)." ROCK_SHIP keeps the Rock surrender row (surrender.ts).
      pageFight(g, tx("wiki.quests-a.as-you-start-to-break-it"), tx("wiki.quests-a.rock-ship"), "ancient-device");
    }
  },
  "c:ancient-device:1": (g) => result(g, tx("wiki.quests-a.better-not-risk-it-the-rock")),
  "c:ancient-device:2": (g) => {
    if (!hasCrystal(g)) return;
    // "You receive 1 fuel" then "You jump to the Hidden Crystal Worlds" spends that fuel. The marker is on the new map.
    enterHiddenCrystal(g);
    result(
      g,
      tx("wiki.quests-a.your-crystalline-companion-says-it-looks"),
      undefined,
      [addQuest(g, "crystal-unlock")],
    );
  },

  // ---- Rock war vessel encounter ----
  "c:rock-war-vessel-encounter:0": (g) => {
    result(g, tx("wiki.quests-a.the-latter-being-more-likely-still"), undefined, [addQuest(g, "rock-sun")]);
  },
  "c:rock-war-vessel-encounter:1": (g) => {
    result(g, tx("wiki.quests-a.one-ship-is-not-the-same"), undefined, [addQuest(g, "rock-sun")]);
  },
  "c:rock-war-vessel-encounter:2": (g) => {
    result(g, tx("wiki.quests-a.heh-like-i-expected-if-the"));
  },
  // "Fight the Rock Assault (Elite) ship" (ROCK_UNLOCK2), "(ship starts to escape with 32 seconds countdown timer)".
  // INFERRED: no surrender (the page prints none). Not wired: the M-class star's heat (no star hazard in this build).
  "qa:rock-sun:fight": (g) => {
    pageFight(g, tx("wiki.quests-a.the-rock-ship-starts-to-power"), tx("wiki.quests-a.rock-assault-elite"), "quest-rock-sun", startRun(32));
    noOffer(g);
  },

  // ---- Unarmed Zoltan transport ----
  "c:unarmed-zoltan-transport:0": (g) => {
    if (rand(g) < 0.5) {
      // "Fight an unarmed Zoltan ship." INFERRED: "We carry no weapons or shielding" -> no weapons, shields, drones,
      // hacking or boarding on that hull.
      pageFight(g, tx("wiki.quests-a.you-charge-your-weapons-not-that"), tx("wiki.quests-a.zoltan-ship"), "unarmed-zoltan-transport");
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
      card(g, tx("wiki.quests-a.they-are-clearly-not-putting-up"), [
        { id: "qa:uzt:finish", label: tx("wiki.quests-a.finish-them-off") },
        { id: "qa:uzt:go", label: tx("wiki.quests-a.let-them-go") },
      ]);
    } else {
      pageFight(g, tx("wiki.quests-a.just-as-you-re-preparing-to"), tx("wiki.quests-a.zoltan-ship"), "unarmed-zoltan-defense");
    }
  },
  "qa:uzt:finish": (g) => resume(g, tx("wiki.quests-a.you-continue-the-assault")),
  "qa:uzt:go": (g) => {
    // "Nothing happens."
    closeFight(g);
    result(g, tx("wiki.quests-a.you-power-down-your-weapons-and"));
  },
  "c:unarmed-zoltan-transport:1": (g) => {
    result(
      g,
      tx("wiki.quests-a.they-continue-we-take-your-silence"),
      undefined,
      [addQuest(g, "zoltan-peace")],
    );
  },
  "c:unarmed-zoltan-transport:2": (g) => {
    result(g, tx("wiki.quests-a.the-galaxy-is-at-war-there"));
  },
  // Quest Marker. Every Rebel fight here is "(default rewards)", so no PAGE wins entry.
  "qa:peace:attack": (g) => pageFight(g, tx("wiki.quests-a.you-power-your-weapons-and-prepare"), PEACE_FIGHT, "quest-zoltan-peace"),
  "qa:peace:hail": (g) => {
    card(g, tx("wiki.quests-a.they-open-communications-i-can-t"), [
      { id: "qa:peace:reconcile", label: tx("wiki.quests-a.perhaps-there-could-be-a-reconciliation") },
      { id: "qa:peace:surrender", label: tx("wiki.quests-a.surrender-your-ultimate-destruction-is-inevitabl") },
      { id: "qa:peace:unity", label: tx("wiki.quests-a.your-rebellion-is-causing-millions-of") },
    ]);
  },
  "qa:peace:reconcile": (g) => {
    card(g, tx("wiki.quests-a.our-ideals-are-too-different-to"), [
      { id: "qa:peace:elsewhere", label: tx("wiki.quests-a.the-galaxy-is-huge-you-can") },
      { id: "qa:peace:bloodless", label: tx("wiki.quests-a.true-progress-can-only-be-achieved") },
    ]);
  },
  "qa:peace:elsewhere": (g) => {
    pageFight(g, tx("wiki.quests-a.no-we-will-not-be-consigned"), PEACE_FIGHT, "quest-zoltan-peace");
  },
  "qa:peace:surrender": (g) => pageFight(g, tx("wiki.quests-a.they-shut-off-communications-and-immediately"), PEACE_FIGHT, "quest-zoltan-peace"),
  "qa:peace:unity": (g) => {
    pageFight(g, tx("wiki.quests-a.humans-are-treated-as-equal-to"), PEACE_FIGHT, "quest-zoltan-peace");
  },
  "qa:peace:bloodless": (g) => {
    const intro = tx("wiki.quests-a.suddenly-all-indications-of-the-rebel");
    const said = tx("wiki.quests-a.although-your-methods-are-crude-and");
    const unlocked = grantUnlock(g, "zoltan-a"); // @agent:unlocks. Unarmed Zoltan transport: "You unlock the Zoltan Cruiser".
    // "(50% chance)" each.
    if (rand(g) < 0.5) {
      // "You unlock the Zoltan Cruiser; receive Zoltan Shield augmentation and low scrap."
      result(g, tx("wiki.quests-a.this-technology-should-aid-your-quest", { intro: intro, said: said }), scrapOnly(g, "low"), [unlocked, zoltanShield(g)]);
    } else {
      // "You unlock the Zoltan Cruiser; receive a Zoltan crewmember named Envoy maxed in all skills and high scrap with resources."
      result(g, tx("wiki.quests-a.i-will-personally-assist", { intro: intro, said: said }), rollStandard(g, "high"), [unlocked, maxedCrew(g, tx("wiki.quests-a.zoltan"), tx("wiki.quests-a.envoy"))]);
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
      result(g, tx("wiki.quests-a.your-crew-calmly-lines-up-for"), scrapOnly(g, "low"));
      return;
    }
    // "2 boarders beam aboard your ship, and you fight a Pirate ship." INFERRED: Human boarders (the race is not named).
    // Trivia: PIRATE_ZOLTAN_CREW_STUDY "doesn't surrender, nor tries to escape".
    pageFight(g, tx("wiki.quests-a.as-soon-as-you-dock-pirates"), tx("wiki.quests-a.pirate-ship"), "zoltan-research-facility", { ...NEVER_RUN });
    noOffer(g);
    humanBoarders(g, 2, 2);
  },
  "c:zoltan-research-facility:1": (g) => result(g, tx("wiki.quests-a.alright-fly-safe-you-prepare-to")),
  "c:zoltan-research-facility:2": (g) => {
    if (medbayLevel(g) < 3) return;
    // "You receive a drone schematic with low (fuel: 1-3 ; missiles: 1-2 ; drone parts: 1) resources and scrap."
    // The schematic is not named: Rewards, "Drone": "A random drone schematic & T scrap."
    result(g, tx("wiki.quests-a.thank-you-we-didn-t-expect"), rollSurrenderOffer(g, "low", true), [grantRandomItem(g, "drone")]);
  },
  // {{Blue Option|Damaged Stasis Pod}}. One pod opens one Crystal named Ruwen. joinCrew marks the Rock Homeworlds beacon.
  "c:zoltan-research-facility:3": (g) => {
    const i = g.augments.indexOf("stasis");
    if (i < 0) return;
    g.augments.splice(i, 1);
    const joined = crew(g, tx("wiki.surrender.crystal"), undefined, tx("wiki.quests-a.ruwen"));
    result(g, tx("wiki.quests-a.interesting-i-ve-never-seen"), undefined, [joined]);
  },
  // After the pirate: "Please, take this." -> the same unnamed schematic with low resources and scrap.
  "qa:zrf:thanks": (g) => {
    result(g, tx("wiki.quests-a.thank-you-for-rescuing-us-they"), rollSurrenderOffer(g, "low", true), [grantRandomItem(g, "drone")]);
  },

  // ---- Zoltan trade hub ----
  "c:zoltan-trade-hub:0": (g) => {
    if (rand(g) < 0.5) {
      // "2-4 zoltan boarders beam aboard your ship and you fight a Zoltan ship (default rewards)." Trivia: ZOLTAN_SHIP
      // "doesn't have surrender/escape chances" (Zoltan ships never run or surrender in escape.ts / surrender.ts).
      pageFight(g, tx("wiki.quests-a.they-don-t-see-many-of"), tx("wiki.quests-a.zoltan-ship"), "zoltan-trade-hub", { ...NEVER_RUN });
      boarders(g, tx("wiki.quests-a.zoltan"), "spark", 2, 4);
    } else {
      zoltanHub(g, tx("wiki.quests-a.you-pose-as-traders-and-succeed"));
    }
  },
  "c:zoltan-trade-hub:1": (g) => {
    if (!hasTeleporter(g)) return;
    zoltanHub(g, tx("wiki.quests-a.you-re-materialize-in-a-dark"));
  },
  "c:zoltan-trade-hub:2": (g) => {
    // "You lose 10 scrap."
    if (!hasZoltan(g) || g.scrap < 10) return;
    g.scrap -= 10;
    log(g, tx("wiki.quests-a.scrap-10"));
    zoltanHub(g, tx("wiki.quests-a.they-scan-id-that-declares-your"));
  },
  "c:zoltan-trade-hub:3": (g) => result(g, tx("wiki.quests-a.you-don-t-have-the-papers")),

  // ---- Rock bride ----
  "c:rock-bride:0": (g) => {
    result(g, tx("wiki.quests-a.you-surprise-me-off-worlder-thank"), undefined, [addQuest(g, "rock-bride")]);
  },
  "c:rock-bride:1": (g) => result(g, tx("wiki.quests-a.arranged-marriages-aren-t-on-your")),
  // "You receive an augmentation with low scrap." The augmentation is not named: Rewards, "Augment": "A random
  // augmentation & T scrap."
  "qa:bride:hand": (g) => {
    result(g, tx("wiki.quests-a.may-your-children-erode-into-dust"), scrapOnly(g, "low"), [grantRandomItem(g, "augment")]);
  },
  // "You receive a Rockman crewmember named Ariadne and fight a Rock ship."
  "qa:bride:refuse": (g) => {
    const joined = crew(g, tx("wiki.quests-a.rock"), undefined, tx("wiki.quests-a.ariadne"));
    log(g, joined);
    pageFight(g, tx("wiki.quests-a.i-was-led-to-believe-your"), tx("wiki.quests-a.rock-ship"), "quest-rock-bride");
  },
};

/** Blue options and prices (wiki/quests.ts questChoiceDisabled). */
function disabledA(g: Game, id: string): string | null {
  if (id === "c:ancient-device:2" && !hasCrystal(g)) return tx("wiki.quests-a.needs-a-crystal-crewmember");
  if (id === "c:zoltan-research-facility:2" && medbayLevel(g) < 3) return tx("wiki.quests-a.needs-medbay-level-3");
  if (id === "c:zoltan-research-facility:3" && !g.augments.includes("stasis")) return tx("wiki.quests-a.needs-a-damaged-stasis-pod");
  if (id === "c:zoltan-trade-hub:1" && !hasTeleporter(g)) return tx("wiki.quests-a.needs-a-teleporter");
  if (id === "c:zoltan-trade-hub:2" && !hasZoltan(g)) return tx("wiki.quests-a.needs-a-zoltan-crewmember");
  if (id === "c:zoltan-trade-hub:2" && g.scrap < 10) return tx("wiki.quests-a.need-10-scrap");
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
    tx("wiki.quests-a.you-can-t-help-but-feel"),
    tx("wiki.quests-a.you-begin-to-strip-their-ship"),
  ),
  // The Zoltan defense ship: same tiers.
  "unarmed-zoltan-defense": lowOrRandom(
    tx("wiki.quests-a.you-defeat-your-assailant-but-the"),
    tx("wiki.quests-a.you-defeat-your-assailant-but-the"),
  ),
  // Rock war vessel, Sun Quest Marker: destroyed -> medium, deadCrew -> high scrap with resources.
  "quest-rock-sun": std(
    "medium",
    "high",
    tx("wiki.quests-a.their-ship-breaks-apart-and-you"),
    tx("wiki.quests-a.their-ship-goes-quiet-and-you"),
  ),
  // Zoltan research facility pirate: destroyed -> medium, deadCrew -> high; then "Please, take this." (qa:zrf:thanks).
  "zoltan-research-facility": std("medium", "high", tx("wiki.quests-a.you-take-out-the-ship-and"), tx("wiki.quests-a.you-disable-the-ship-and-contact"), CONTINUE),
  // Rock bride, Quest Marker: destroyed -> medium, deadCrew -> high scrap with resources.
  "quest-rock-bride": std(
    "medium",
    "high",
    tx("wiki.quests-a.his-escort-eliminated-the-grand-basilisk"),
  ),
};

const GOT_AWAY_A: QuestPart["gotAway"] = {
  // {{Winning|gotaway=true|...}} -> "Another quest marker is added to your map."
  "quest-rock-sun": (g) => {
    result(g, tx("wiki.quests-a.as-they-jump-away-they-relay"), undefined, [addQuest(g, "rock-shipyard")]);
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
