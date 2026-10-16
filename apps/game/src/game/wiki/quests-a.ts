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
import { enterHiddenCrystal, log, rand } from "../sim.ts";
import type { Game, SkillName } from "../types.ts";
import { grantUnlock } from "../unlocks.ts";
import { grantRandomItem } from "./bonus-item.ts";
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
  type SurrenderPlan,
} from "./surrender.ts";

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
function boarders(g: Game, race: string, kin: "spark", lo: number, hi: number) {
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
    const unlocked = grantUnlock(g, "crystal-a"); // @agent:unlocks. Ancient device: "You unlock the Crystal Cruiser".
    const offer = scrapOnly(g, "medium");
    offer.fuel = between(g, resourceBand("fuel", "medium"));
    result(
      g,
      "You arrive at the coordinates to find a massive Crystalline cruiser docked at a small repair station. You arrange for the ship to be sent back to the Federation base while the station upgrades your hull.",
      offer,
      [unlocked, grantAug(g, "vengeance"), repair(g, 10)],
    );
  },
  "rock-shipyard": (g) => {
    // Wiki citations:
    // > "You arrive at a massive Rockman shipyard" — [[Rock war vessel encounter#Shipyard Quest Marker]]
    // > "You unlock the Rock Cruiser." — [[Rock war vessel encounter#Shipyard Quest Marker]]
    // > "You receive Rock Plating augmentation and your ship receives 29 repairs." — [[Rock war vessel encounter#Shipyard Quest Marker]]
    const unlocked = grantUnlock(g, "rock-a"); // @agent:unlocks. Rock war vessel encounter: "You unlock the Rock Cruiser."
    result(
      g,
      `You arrive at a massive Rockman shipyard and notice the ship that had just tried to kill you is docked and already being repaired. "Well fought! I must say I did not expect you to survive."

I am convinced of your strength and pledge to assist your cause. We'll immediately send an advanced cruiser to the Federation fleet and we will prepare our warships to move out.

"Now that that's taken care of, let us patch up your hull. Maybe we can improve its armor plating while we're at it."`,
      undefined,
      [unlocked, grantAug(g, "keel"), repair(g, 29)],
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
      `${text}

You head into a ship supply store. It is a well-equipped, self-service affair. An order is dialed into a terminal, scrap is deposited, and the item is dispatched from a nearby chute.`,
      undefined,
      [],
      STORE_CHOICES,
    );
  } else {
    result(
      g,
      `${text}

You head into the cantina for gossip. Topics of conversation in the cantina range from crop distribution microbes to the joys of Slug pleasure cruises.

You overhear one group discussing a newly discovered planet yet to have first contact, and note down its location.`,
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
        "You break it apart and take it for scrap. No one will miss it.",
        scrapOnly(g, "high"),
      );
    } else {
      pageFight(
        g,
        'As you start to break it apart a Rock military ship jumps nearby, "You think you can come into our sector and just steal whatever you please?! Prepare to die, vandals!"',
        "Rock ship",
        "ancient-device",
      );
    }
  },
  "c:ancient-device:1": (g) =>
    // Wiki citations:
    // > "Nothing happens." — [[Ancient device]]
    // > "Better not risk it. The Rock people are unlikely to respond well to vandalism." — [[Ancient device]]
    result(g, "Better not risk it. The Rock people are unlikely to respond well to vandalism."),
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
      `Your Crystalline companion says, "It looks like we have found the abandoned link to my home worlds. I can reactivate it." He transmits some codes to the device and it immediately powers on.

Before you can react, the space around you distorts and a wormhole forms. You begin to sound the alarm, but your companion calms you and indicates that you should fly directly into the wormhole. You reluctantly do as he says.

You arrive in a sector not listed in any star charts. Strange crystalline ships dot the horizon. Your companion speaks, "Here we are, my home sector. It has been a long time since others have set foot here, I wonder how you will be received."

"You have done as you promised and so shall I. The coordinates of my old ship have been forwarded to your navigation system."`,
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
      '"Heh. Like I expected. If the Federation is as weak as you it deserves to fall." They jump away without another word.',
    );
  },
  // INFERRED: no surrender (the page prints none). The M-class star's flares are cited-flare.ts eventHasFlare("quest-rock-sun").
  "qa:rock-sun:fight": (g) => {
    // Wiki citations:
    // > "Fight the Rock Assault (Elite) ship." — [[Rock war vessel encounter#Sun Quest Marker]]
    // > "ship starts to escape with 32 seconds countdown timer" — [[Rock war vessel encounter#Sun Quest Marker]]
    // > "The Rock ship starts to power up their FTL drive." — [[Rock war vessel encounter#Sun Quest Marker]]
    pageFight(
      g,
      "The Rock ship starts to power up their FTL drive. If we're going to earn their trust we must endure the heat for as long as they can!",
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
        "You charge your weapons - not that this will take much.",
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
      card(g, "They are clearly not putting up a fight. Are you sure you want to destroy them?", [
        { id: "qa:uzt:finish", label: "Finish them off." },
        { id: "qa:uzt:go", label: "Let them go." },
      ]);
    } else {
      pageFight(
        g,
        "Just as you're preparing to attack you detect a nearby jump signature. A Zoltan defense ship comes to their aid!",
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
    resume(g, "You continue the assault.");
  },
  "qa:uzt:go": (g) => {
    // Wiki citations:
    // > "Let them go." — [[Unarmed Zoltan transport]]
    // > "You power down your weapons and after a time the ship slowly limps away." — [[Unarmed Zoltan transport]]
    // > "Nothing happens." — [[Unarmed Zoltan transport]]
    closeFight(g);
    result(
      g,
      "You power down your weapons and after a time the ship slowly limps away. They refuse all communications. You can't help but feel somewhat guilty.",
    );
  },
  "c:unarmed-zoltan-transport:2": (g) => {
    // Wiki citations:
    // > "The galaxy is at war - there's no time for talk of peace." — [[Unarmed Zoltan transport]]
    // > "Nothing happens." — [[Unarmed Zoltan transport]]
    result(
      g,
      "The galaxy is at war - there's no time for talk of peace. You leave their hails unanswered and charge the jump drive.",
    );
  },
  // Quest Marker. Every Rebel fight here is "(default rewards)", so no PAGE wins entry.
  "qa:peace:attack": (g) => {
    // Wiki citations:
    // > "You power your weapons and prepare to fight." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "Fight a Rebel ship (default rewards)." — [[Unarmed Zoltan transport#Quest Marker]]
    pageFight(g, "You power your weapons and prepare to fight.", PEACE_FIGHT, "quest-zoltan-peace");
  },
  "qa:peace:hail": (g) => {
    // Wiki citations:
    // > "Attempt to hail them." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "Perhaps there could be a reconciliation of our ideals without war?" — [[Unarmed Zoltan transport#Quest Marker]]
    // > "Surrender. Your ultimate destruction is inevitable." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "Your Rebellion is causing millions of deaths." — [[Unarmed Zoltan transport#Quest Marker]]
    card(
      g,
      "They open communications: \"I can't imagine there's anything you could say that will save you. The rebellion must destroy those that are still loyal to the obsolete Federation.\"",
      [
        {
          id: "qa:peace:reconcile",
          label: '"Perhaps there could be a reconciliation of our ideals without war?"',
        },
        {
          id: "qa:peace:surrender",
          label:
            '"Surrender. Your ultimate destruction is inevitable. We\'ve left scores of Rebels destroyed in our wake."',
        },
        {
          id: "qa:peace:unity",
          label:
            '"Your Rebellion is causing millions of deaths. Your beliefs are dividing the galaxy. Unity is the only option!"',
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
      '"Our ideals are too different to be so easily reconciled. You think this could end any way but war?"',
      [
        {
          id: "qa:peace:elsewhere",
          label:
            "The galaxy is huge, you can find a place for your ideals elsewhere without causing this destruction.",
        },
        {
          id: "qa:peace:bloodless",
          label: "True progress can only be achieved without bloodshed.",
        },
      ],
    );
  },
  "qa:peace:elsewhere": (g) => {
    // Wiki citations:
    // > "Fight a Rebel ship (default rewards)." — [[Unarmed Zoltan transport#Quest Marker]]
    pageFight(
      g,
      "\"No! We will not be consigned to the backwaters of space just because we don't fit into your 'Federation ideals'\" They charge.",
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
      "They shut off communications and immediately engage.",
      PEACE_FIGHT,
      "quest-zoltan-peace",
    );
  },
  "qa:peace:unity": (g) => {
    // Wiki citations:
    // > "Fight a Rebel ship (default rewards)." — [[Unarmed Zoltan transport#Quest Marker]]
    pageFight(
      g,
      "\"Humans are treated as 'equal' to aliens in the weak Federation. The sacrifice of BILLIONS of alien or human lives are justified if it means we reach our full potential!\" They charge.",
      PEACE_FIGHT,
      "quest-zoltan-peace",
    );
  },
  "qa:peace:bloodless": (g) => {
    // Wiki citations:
    // > "Suddenly all indications of the Rebel ship fade away and a Zoltan fleet appears around your ship." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "You unlock the Zoltan Cruiser; receive Zoltan Shield augmentation and low scrap." — [[Unarmed Zoltan transport#Quest Marker]]
    // > "You unlock the Zoltan Cruiser; receive a Zoltan crewmember named Envoy maxed in all skills and high scrap with resources." — [[Unarmed Zoltan transport#Quest Marker]]
    const intro =
      "Suddenly all indications of the Rebel ship fade away and a Zoltan fleet appears around your ship. The captain of the ship you met previously materializes on your bridge.";
    const said =
      "\"Although your methods are crude and most certainly ineffective, it is clear you took our previous meeting to heart. If your ship represents the Federation's willingness to adapt we shall do what we can to aid in their fight.";
    const unlocked = grantUnlock(g, "zoltan-a"); // @agent:unlocks. Unarmed Zoltan transport: "You unlock the Zoltan Cruiser".
    // "(50% chance)" each.
    if (rand(g) < 0.5) {
      // "You unlock the Zoltan Cruiser; receive Zoltan Shield augmentation and low scrap."
      result(
        g,
        `${intro}

${said} This technology should aid your quest."`,
        scrapOnly(g, "low"),
        [unlocked, zoltanShield(g)],
      );
    } else {
      // "You unlock the Zoltan Cruiser; receive a Zoltan crewmember named Envoy maxed in all skills and high scrap with resources."
      result(
        g,
        `${intro}

${said} I will personally assist."`,
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
        'Your crew calmly lines up for the Zoltans to take their readings. After a short time, the process is done. They contact you, "Thank you for your participation in our study. Please accept these small cakes made from stiff dough as well as some scrap."',
        scrapOnly(g, "low"),
      );
      return;
    }
    pageFight(
      g,
      'As soon as you dock, pirates burst on board and a hostile ship appears on the radar. You hear the Zoltans yell in the distance, "We\'re being held hostage!"',
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
    result(g, '"Alright. Fly safe." You prepare to leave.'),
  "c:zoltan-research-facility:2": (g) => {
    // Wiki citations:
    // > "Requires level 3 Medbay" — [[Zoltan research facility]]
    // > "Thank you! We didn't expect to receive such a significant amount of data regarding your crew's health during FTL travel." — [[Zoltan research facility]]
    // > "You receive a drone schematic with low resources and scrap." — [[Zoltan research facility]]
    if (medbayLevel(g) < 3) return;
    result(
      g,
      "\"Thank you! We didn't expect to receive such a significant amount of data regarding your crew's health during FTL travel. Please, accept this for your trouble.\"",
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
      "The local people - furry, one-eyed tree lizard things - begin chanting when they see you. Suddenly the sky is lit by laser fire - the Zoltan opened fire on your ship! You dash back to the shuttle and join the fight.",
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
      "These creatures should be left to develop at their own pace. You direct all weapons on the Rebel ship and begin the firing sequence.",
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
    const i = g.augments.indexOf("stasis");
    if (i < 0) return;
    g.augments.splice(i, 1);
    const joined = crew(g, "Crystal", undefined, "Ruwen");
    result(
      g,
      `"Interesting. I've never seen a cryogenic system like this. It appears to still be functioning..." They hook it up to their system and run a number of tests on it.

"Amazing! It has the ability to reconstruct the body if it was damaged during transit. Watch." They reactivate the pod and you watch as the hunks of crystal inside reform to build a humanoid structure. The pod slides open and the re-formed alien steps out.

It speaks slowly, "Greetings. I appear to be in your debt. My people isolated themselves a long time ago, but perhaps it's time to re-establish a connection. There's a hidden wormhole near the Rock home-worlds. Perhaps you can take me there so I can properly repay you?"`,
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
      '"Thank you for rescuing us! They held us hostage to ambush unsuspecting passersby. Please, take this."',
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
        "They don't see many of your species in these parts, and you stick out like a Casvagarian Sea Slug in a Plutonian Shrimp Stew. You make it back to the ship with a gang of Zoltan guards in tow!",
        "Zoltan ship",
        "zoltan-trade-hub",
        { ...NEVER_RUN },
      );
      boarders(g, "Zoltan", "spark", 2, 4);
    } else {
      zoltanHub(
        g,
        "You pose as traders and succeed in bypassing airlock security - however, it's only a matter of time before someone realizes your ID cards are counterfeit!",
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
      "You re-materialize in a dark corner of the main concourse and are able to conduct your investigations in peace.",
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
    log(g, scrapLine(cost));
    zoltanHub(
      g,
      "They scan ID that declares your crewmember an official citizen, collect their fee, and let you pass.",
    );
  },
  "c:zoltan-trade-hub:3": (g) =>
    // Wiki citations:
    // > "Nothing happens." — [[Zoltan trade hub]]
    // > "You don't have the papers" — [[Zoltan trade hub]]
    result(
      g,
      "You don't have the papers - well, the neuro-laced identity bracelets - to get in, so best not to try.",
    ),

  // ---- Rock bride ----
  "c:rock-bride:1": (g) =>
    // Wiki citations:
    // > "Nothing happens." — [[Rock bride]]
    // > "Arranged marriages aren't on your list of worthy causes." — [[Rock bride]]
    result(
      g,
      "Arranged marriages aren't on your list of worthy causes. You leave the Rock to their business.",
    ),
  // The augmentation is not named: Rewards, "Augment": "A random augmentation and T scrap."
  "qa:bride:hand": (g) => {
    // Wiki citations:
    // > "Hand her over." — [[Rock bride#Quest Marker]]
    // > "You receive an augmentation with low scrap." — [[Rock bride#Quest Marker]]
    result(
      g,
      '"May your children erode into dust!" she screams as she\'s bundled into the waiting shuttle. The Rock guards on board hurriedly drop off an exotic piece of technology and return to the Grand Basilisk.',
      scrapOnly(g, "low"),
      [grantRandomItem(g, "augment")],
    );
  },
  "qa:bride:refuse": (g) => {
    // Wiki citations:
    // > "Refuse to comply." — [[Rock bride#Quest Marker]]
    // > "You receive a Rockman crewmember named Ariadne and fight a Rock ship." — [[Rock bride#Quest Marker]]
    const joined = crew(g, "Rock", undefined, "Ariadne");
    log(g, joined);
    pageFight(
      g,
      "\"I was led to believe your kind did not know mercy. I will join you. But quickly, we must jump away - they will not tolerate...\" She's interrupted by weapons fire from the Basilisk's escort!",
      "Rock ship",
      "quest-rock-bride",
    );
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

/** Destroyed -> `destroyed` tier; deadCrew -> "a random amount of scrap with resources". */
function lowOrRandom(textD: string, textK: string): Win {
  return (g, deadCrew) =>
    result(g, deadCrew ? textK : textD, rollStandard(g, deadCrew ? undefined : "low"));
}

const WINS_A: QuestPart["wins"] = {
  // Wiki citations:
  // > "You can't help but feel somewhat guilty as you search through the debris." — [[Unarmed Zoltan transport]]
  // > "You receive low scrap with resources." — [[Unarmed Zoltan transport]]
  // > "You begin to strip their ship and don't find anything that would indicate they were on anything other than a peaceful mission." — [[Unarmed Zoltan transport]]
  // > "You receive a random amount of scrap with resources." — [[Unarmed Zoltan transport]]
  "unarmed-zoltan-transport": lowOrRandom(
    "You can't help but feel somewhat guilty as you search through the debris. It was probably a trap... right?",
    "You begin to strip their ship and don't find anything that would indicate they were on anything other than a peaceful mission. Perhaps you were too hasty.",
  ),
  // Wiki citations:
  // > "After destroying enemy ship You defeat your assailant, but the peace ship has jumped away in the commotion." — [[Unarmed Zoltan transport]]
  // > "After killing enemy crew You defeat your assailant, but the peace ship has jumped away in the commotion." — [[Unarmed Zoltan transport]]
  // > "You receive low scrap with resources." — [[Unarmed Zoltan transport]]
  // > "You receive a random amount of scrap with resources." — [[Unarmed Zoltan transport]]
  "unarmed-zoltan-defense": lowOrRandom(
    "You defeat your assailant, but the peace ship has jumped away in the commotion.",
    "You defeat your assailant, but the peace ship has jumped away in the commotion.",
  ),
  // Wiki citations:
  // > "Their ship breaks apart and you feel a twinge of guilt." — [[Rock war vessel encounter#Sun Quest Marker]]
  // > "You receive medium scrap with resources." — [[Rock war vessel encounter#Sun Quest Marker]]
  // > "Their ship goes quiet and you feel a twinge of guilt." — [[Rock war vessel encounter#Sun Quest Marker]]
  // > "You receive high scrap with resources." — [[Rock war vessel encounter#Sun Quest Marker]]
  "quest-rock-sun": std(
    "medium",
    "high",
    "Their ship breaks apart and you feel a twinge of guilt. Perhaps they could have helped the Federation if this had gone another way. You scrap what you can and prepare to jump out of the heat.",
    "Their ship goes quiet and you feel a twinge of guilt. Perhaps they could have helped the Federation if this had gone another way. You scrap what you can and prepare to jump out of the heat.",
  ),
  // Wiki citations:
  // > "You take out the ship and contact the research station." — [[Zoltan research facility]]
  // > "You receive medium scrap with resources." — [[Zoltan research facility]]
  // > "You disable the ship and contact the research station." — [[Zoltan research facility]]
  // > "You receive high scrap with resources." — [[Zoltan research facility]]
  "zoltan-research-facility": std(
    "medium",
    "high",
    "You take out the ship and contact the research station.",
    "You disable the ship and contact the research station.",
    CONTINUE,
  ),
  // Interfere. "pursuit is doubled for 1 jump". Destroyed is low scrap with resources. A crew kill is a random amount.
  "zoltan-quest-primitives-interfere": (g, deadCrew) => {
    g.pursuitDouble = true;
    log(g, "Rebel Fleet pursuit is doubled for 1 jump.");
    if (deadCrew) {
      // Wiki citations:
      // > "After killing enemy crew The Rebel contacts you. \"Lovely, you've done our job for us! We'll let you live as thanks. However, I can't promise the fleet will show you the same courtesy.\" They jump off. You collect what you can from the remains of the Zoltan ship." — [[Zoltan quest primitives]]
      // > "Rebel Fleet pursuit is doubled for 1 jump and you receive a random amount of scrap with resources." — [[Zoltan quest primitives]]
      result(
        g,
        "The Rebel contacts you. \"Lovely, you've done our job for us! We'll let you live as thanks. However, I can't promise the fleet will show you the same courtesy.\" They jump off. You collect what you can from the remains of the Zoltan ship.",
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
      "The Rebel contacts you. \"Lovely, you've done our job for us! We'll let you live as thanks. However, I can't promise the fleet will show you the same courtesy.\" They jump off. You collect what you can from the remains of the Zoltan ship.",
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
        'The Zoltan hail once the smoke disperses. "Thank you. We were led to believe Federation ideals died along with the Federation itself. Let us aid you a little, for old times\' sake." You accept their reward and scrap, then collect some remains from the Rebel ship.',
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
      'The Zoltan hail once the smoke disperses. "Thank you. We were led to believe Federation ideals died along with the Federation itself. Let us aid you a little, for old times\' sake." You accept their reward and scrap, then collect some remains from the Rebel ship.',
      scrapOnly(g, "low"),
      [grantRandomItem(g, "weapon")],
    );
  },
  // Wiki citations:
  // > "After destroying enemy ship His escort eliminated, the Grand Basilisk dispatches his entire fleet. There's just time to take your pick from the wreck before you jump out of reach." — [[Rock bride#Quest Marker]]
  // > "You receive medium scrap with resources." — [[Rock bride#Quest Marker]]
  // > "After killing enemy crew His escort eliminated, the Grand Basilisk dispatches his entire fleet. There's just time to take your pick from the wreck before you jump out of reach." — [[Rock bride#Quest Marker]]
  // > "You receive high scrap with resources." — [[Rock bride#Quest Marker]]
  "quest-rock-bride": std(
    "medium",
    "high",
    "His escort eliminated, the Grand Basilisk dispatches his entire fleet. There's just time to take your pick from the wreck before you jump out of reach.",
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
      "As they jump away they relay coordinates to your navigation system. They must mean for you to follow them!",
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
