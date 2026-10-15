import type { ChoiceReq } from "@stl/pack";
import { tx } from "../../i18n/index.ts";

/**
 * Blue-button locks, in the order each button checks them.
 * The first failure's text is the refusal. Pressing the button still runs the handler.
 * A price already stored as a negative resource effect stays an effect, and this list
 * still records the button's own sentence. Amounts parsed out of the choice id stay procedures.
 */

const crew = (id: string, text: string): ChoiceReq => ({ k: "crew", id, text });
const system = (id: string, level: number, text: string): ChoiceReq => ({
  k: "system",
  id,
  level,
  text,
});
const band = (id: string, lo: number, hi: number, text: string): ChoiceReq => ({
  k: "band",
  id,
  lo,
  hi,
  text,
});
const augment = (id: string, text: string): ChoiceReq => ({ k: "augment", id, text });
const weapon = (id: string, text: string): ChoiceReq => ({ k: "weapon", id, text });
const family = (id: string, text: string): ChoiceReq => ({ k: "family", id, text });
const drone = (id: string, text: string): ChoiceReq => ({ k: "drone", id, text });
const stock = (id: string, n: number, text: string): ChoiceReq => ({ k: "stock", id, n, text });

const need = (cost: number, v: string) => tx("wiki.cited-events.need", { cost, v });
const scrapN = (v: number) => tx("wiki.filler-events.need-scrap", { v });

const engi = () => crew("shell", tx("wiki.filler-events.needs-an-engi-crewmember"));
const rock = () => crew("stone", tx("wiki.filler-events.needs-a-rock-crewmember"));
const slug = () => crew("gel", tx("wiki.filler-events.needs-a-slug-crewmember"));
const lanius = () => crew("voidlung", tx("wiki.filler-events.needs-a-lanius-crewmember"));
const medbay2 = () => system("medbay", 2, tx("wiki.filler-events.needs-a-level-2-medbay"));
const sensors2 = () => system("sensors", 2, tx("wiki.filler-events.needs-sensors-level-2"));
const sensors3 = () => system("sensors", 3, tx("wiki.filler-events.needs-sensors-level-3"));
const glass = () => augment("glass", tx("wiki.filler-events.needs-long-ranged-scanners"));
const part = () => stock("parts", 1, tx("wiki.filler-events.need-1-drone-part"));
const hullDrone = () => drone("hull", tx("wiki.filler-events.needs-a-hull-repair-drone"));
const missile = () => family("missile", tx("wiki.filler-events.needs-a-missile-weapon"));

const qEngi = () => crew("shell", tx("wiki.quests.needs-an-engi-crewmember"));
const qLanius = () => crew("voidlung", tx("wiki.quests.needs-a-lanius-crewmember"));
const qRock = () => crew("stone", tx("wiki.quests.needs-a-rock-crewmember"));
const qSlug = () => crew("gel", tx("wiki.quests.needs-a-slug-crewmember"));
const qMantis = () => crew("blade", tx("wiki.quests.needs-a-mantis-crewmember"));
const qPilot2 = () => system("pilot", 2, tx("wiki.quests.needs-level-2-piloting"));
const qSensors3 = () => system("sensors", 3, tx("wiki.quests.needs-level-3-sensors"));
const qHack = () => system("spike", 1, tx("wiki.quests.needs-a-hacking-system"));
const qCloak = () => system("veil", 1, tx("wiki.quests.needs-cloaking"));
const qPart = () => stock("parts", 1, tx("wiki.quests.need-1-drone-part"));
const qDoors = () => system("doors", 2, tx("wiki.quests.needs-level-2-door-system"));

/** Filler cards. Rolled prices in the choice id stay in fillerChoiceDisabled. */
export const FILLER_LOCKS: Record<string, readonly ChoiceReq[]> = {
  "c:refueling-station:0": [stock("scrap", 12, tx("wiki.filler-events.need-12-scrap"))],
  "c:refueling-station:1": [stock("scrap", 6, tx("wiki.filler-events.need-6-scrap"))],
  "c:refueling-station:2": [stock("scrap", 2, tx("wiki.filler-events.need-2-scrap"))],
  "c:asteroid-mining-colony:0": [missile()],
  "c:asteroid-mining-colony:1": [stock("missiles", 5, tx("wiki.filler-events.need-5-missiles"))],
  "c:asteroid-mining-colony:2": [stock("missiles", 15, tx("wiki.filler-events.need-15-missiles"))],
  "c:pirate-ship-selling-weapon:2": [
    system("leash", 1, tx("wiki.filler-events.needs-mind-control")),
  ],
  "c:giant-alien-spiders:2": [
    drone("personnel", tx("wiki.filler-events.needs-an-anti-personnel-drone")),
  ],
  "c:giant-alien-spiders:3": [drone("board", tx("wiki.filler-events.needs-a-boarding-drone"))],
  "c:giant-alien-spiders:4": [weapon("antibio", tx("wiki.filler-events.needs-an-anti-bio-beam"))],
  "c:malfunctioning-defense-system:3": [
    family("ion", tx("wiki.filler-events.needs-an-ion-weapon")),
  ],
  "c:malfunctioning-defense-system:4": [system("veil", 1, tx("wiki.filler-events.needs-cloaking"))],
  "c:malfunctioning-defense-system:5": [
    system("veil", 2, tx("wiki.filler-events.needs-improved-cloaking")),
  ],
  "c:malfunctioning-defense-system:6": [
    system("veil", 3, tx("wiki.filler-events.needs-advanced-cloaking")),
  ],
  "c:malfunctioning-defense-system:7": [engi()],
  "c:crushed-pirate:2": [family("beam", tx("wiki.filler-events.needs-a-beam-weapon"))],
  "c:crushed-pirate:3": [drone("beam", tx("wiki.filler-events.needs-a-beam-drone"))],
  "c:unknown-disease-on-mining-colony:2": [rock()],
  "c:unknown-disease-on-mining-colony:3": [engi()],
  "c:unknown-disease-on-mining-colony:4": [medbay2()],
  "s:plagued-station:cure": [medbay2()],
  "s:unknown-disease:medbot": [
    augment("medbot", tx("wiki.filler-events.needs-engi-med-bot-dispersal")),
  ],
  "c:fire-on-research-station:3": [rock()],
  "c:fire-on-research-station:4": [drone("patch", tx("wiki.filler-events.needs-a-repair-drone"))],
  "s:moon:medbay2": [medbay2()],
  "s:moon:collapse-medbay": [medbay2()],
  "s:moon:medbay3": [system("medbay", 3, tx("wiki.filler-events.needs-a-level-3-medbay"))],
  "s:moon:collapse-clone": [
    system("cradle", 2, tx("wiki.filler-events.needs-a-level-2-clone-bay")),
  ],
  "s:moon:slug": [slug()],
  "s:confused-mantis:human": [crew("plain", tx("wiki.filler-events.needs-a-human-crewmember"))],
  "s:confused-mantis:mantis": [crew("blade", tx("wiki.filler-events.needs-a-mantis-crewmember"))],
  "s:confused-mantis:mind": [system("leash", 1, tx("wiki.filler-events.needs-mind-control"))],
  "c:battlefield-wreckage:2": [sensors2()],
  "c:rebel-fight-chance:2": [sensors2()],
  "c:rebel-fight-chance:3": [sensors3()],
  "c:rebel-fight-chance-in-nebula:2": [sensors3()],
  "c:rebel-fight-chance-in-nebula:3": [glass()],
  "c:rebel-fight-chance-in-nebula:4": [
    augment("pulseeye", tx("wiki.filler-events.needs-a-lifeform-scanner")),
  ],
  "c:slocknog:0": [stock("scrap", 55, tx("wiki.filler-events.need-55-scrap"))],
  "c:engi-smashed-ships:2": [engi()],
  "c:mantis-ships-battle-for-rock-freighter:2": [
    drone("patch", tx("wiki.filler-events.needs-a-repair-drone")),
  ],
  "c:mantis-ships-battle-for-rock-freighter:3": [hullDrone(), part()],
  "c:rock-live-mine:1": [system("engines", 5, tx("wiki.filler-events.needs-engines-level-5"))],
  "s:rock-mine:missile": [missile()],
  "s:rock-mine:beam": [drone("mine", tx("wiki.filler-events.needs-a-beam-drone-2")), part()],
  "c:lanius-ship-absorbing-rebel-base:2": [lanius()],
  "c:lanius-ship-absorbing-jump-beacon:2": [lanius()],
  "c:lanius-ship-absorbing-jump-beacon:3": [hullDrone()],
  "c:lanius-ship-attacking-civilian-distress:2": [lanius()],
  "s:lanius-craftsmen:help": [lanius()],
  "s:lanius-craftsmen:aug": [stock("scrap", 45, scrapN(45))],
  "s:lanius-craftsmen:weapon": [stock("scrap", 50, scrapN(50))],
  "s:lanius-craftsmen:drone": [stock("scrap", 40, scrapN(40))],
  "s:lanius-craftsmen:help:aug": [stock("scrap", 35, scrapN(35))],
  "s:lanius-craftsmen:help:weapon": [stock("scrap", 40, scrapN(40))],
  "s:lanius-craftsmen:help:drone": [stock("scrap", 30, scrapN(30))],
  "c:nebula-lost-ship:2": [system("sling", 1, tx("wiki.filler-events.needs-a-teleporter"))],
  "c:nebula-lost-ship:3": [glass()],
  "c:plasma-storm-incapacitated-ships:2": [
    system("pilot", 2, tx("wiki.filler-events.needs-level-2-piloting")),
  ],
  "s:abandoned-station:dna": [system("cradle", 1, tx("wiki.filler-events.needs-a-clone-bay"))],
  "c:dense-asteroid-field-distress:2": [
    augment("keel", tx("wiki.filler-events.needs-rock-plating")),
  ],
  "c:disabled-rock-ship:2": [slug()],
  "s:terraforming-scan:sensors": [sensors2()],
  "s:terraforming-scan:zoltan": [crew("spark", tx("wiki.filler-events.needs-a-zoltan-crewmember"))],
  "c:large-asteroid-field:2": [
    augment("hook", tx("wiki.filler-events.needs-a-scrap-recovery-arm")),
  ],
  "c:boarders-humans-jammed-sensors:1": [
    system("spike", 1, tx("wiki.filler-events.needs-a-hacking-system")),
  ],
  "c:slaver-hostile:1": [system("engines", 6, tx("wiki.filler-events.needs-engines-level-6"))],
};

/** Location pages in cited-missing. A ransom or a trade id still parses its price from the id. */
export const MISSING_LOCKS: Record<string, readonly ChoiceReq[]> = {
  "c:crystal-chat:crystal": [crew("shard", tx("wiki.quests-a.needs-a-crystal-crewmember"))],
  "c:crystalline-cache:crystal": [crew("shard", tx("wiki.quests-a.needs-a-crystal-crewmember"))],
  "c:crystalline-cache:breach": [
    weapon("breachmissiles", tx("wiki.cited-missing.needs-breach-missiles")),
    stock("missiles", 1, tx("wiki.quests.need-1-missiles")),
  ],
  "c:crystalline-cache:teleport": [
    system("sling", 2, tx("wiki.cited-missing.needs-teleporter-level-2")),
  ],
  "c:crystalline-cache:engines": [
    system("engines", 7, tx("wiki.cited-missing.needs-engines-level-7")),
  ],
  "c:crystalline-research-facility:rock": [
    crew("stone", tx("wiki.quests.needs-a-rock-crewmember")),
  ],
  "c:crystalline-research-facility:dna": [
    augment("dna", tx("wiki.cited-missing.needs-backup-dna-bank")),
  ],
  "c:engi-research-station:sensors": [
    system("sensors", 2, tx("wiki.cited-events.needs-sensors-level-2")),
  ],
  "c:engi-research-station:scanners": [
    augment("glass", tx("wiki.cited-events.needs-long-ranged-scanners")),
  ],
  "c:lanius-with-federation-science-craft:lanius": [
    crew("voidlung", tx("wiki.quests.needs-a-lanius-crewmember")),
  ],
  "c:slug-oxygen-malfunction:mantis": [crew("blade", tx("wiki.quests.needs-a-mantis-crewmember"))],
  "c:no-fuel-slug-fuel-trader:slug": [
    crew("gel", tx("wiki.quests.needs-a-slug-crewmember")),
    stock("scrap", 15, need(15, "scrap")),
  ],
  "c:slug-store-ship:slug": [crew("gel", tx("wiki.quests.needs-a-slug-crewmember"))],
  "c:no-fuel-drifting-debris:scan": [
    augment("pulseeye", tx("wiki.filler-events.needs-a-lifeform-scanner")),
  ],
  "c:no-fuel-prepare-to-dock:sensors": [
    system("sensors", 3, tx("wiki.quests.needs-sensors-level-3")),
  ],
  "c:no-fuel-prepare-to-dock:scanners": [
    augment("glass", tx("wiki.cited-events.needs-long-ranged-scanners")),
  ],
  "c:no-fuel-prepare-to-dock:cloak": [system("veil", 1, tx("wiki.quests.needs-cloaking"))],
  "c:no-fuel-refugee-trading:engi": [qEngi()],
  "c:no-fuel-slug-fuel-trader:pay": [stock("scrap", 15, need(15, "scrap"))],
  "c:no-fuel-refugee-trading:trade": [stock("scrap", 10, need(10, "scrap"))],
  "c:no-fuel-refugee-trading:better": [stock("scrap", 10, need(10, "scrap"))],
  "c:no-fuel-refugee-trading:again": [stock("scrap", 10, need(10, "scrap"))],
  "c:no-fuel-refugee-trading:missiles": [stock("missiles", 1, tx("wiki.quests.need-1-missiles"))],
  "c:slug-repair-station:fuel": [stock("fuel", 15, need(15, "fuel"))],
  "c:slug-repair-station:scrap50": [stock("scrap", 50, need(50, "scrap"))],
  "c:slug-repair-station:accept50": [stock("scrap", 50, need(50, "scrap"))],
};

/** Cited pages whose lock is not a negative resource effect. tradeTake still returns before that loop. */
export const CITED_LOCKS: Record<string, readonly ChoiceReq[]> = {
  "c:zoltan-odd-moon:drone": [
    drone("board", tx("wiki.cited-events.needs-a-boarding-drone")),
    stock("parts", 1, tx("wiki.cited-events.need-1-drone-part")),
  ],
  "c:no-fuel-engi-ship-repair:2": [
    drone("hull", tx("wiki.cited-events.needs-a-hull-repair-drone")),
    stock("parts", 1, tx("wiki.cited-events.need-1-drone-part")),
  ],
  "c:destroyed-cargo-ship:2": [system("sensors", 2, tx("wiki.cited-events.needs-sensors-level-2"))],
  "c:destroyed-cargo-ship:3": [
    augment("glass", tx("wiki.cited-events.needs-long-ranged-scanners")),
  ],
  "c:auto-ship-carrying-shield-virus:1": [
    system("spike", 1, tx("wiki.cited-events.needs-a-hacking-system")),
  ],
  "c:crystalline-ship-messaging-about-rebels:2": [
    augment("falsebuoy", tx("wiki.cited-events.needs-distraction-buoys")),
  ],
  "c:remote-settlement:2": [weapon("firebeam", tx("wiki.cited-events.needs-a-fire-beam"))],
  "c:remote-settlement:3": [weapon("cask", tx("wiki.cited-events.needs-a-fire-bomb"))],
};

/** Quest buttons, including the checks that used to live on the quest-part hooks. */
export const QUEST_LOCKS: Record<string, readonly ChoiceReq[]> = {
  "c:engi-fleet-discussion:2": [qEngi()],
  "c:lanius-ship-in-rich-debris-field:3": [qPilot2()],
  "c:lanius-ship-in-rich-debris-field:4": [
    system("pilot", 3, tx("wiki.quests.needs-level-3-piloting")),
  ],
  "c:lanius-ship-salvager:2": [qLanius()],
  "c:lanius-trader:4": [qLanius()],
  "c:space-station-under-construction:2": [qLanius()],
  "c:lanius-lone-ship:3": [qLanius()],
  "q:lanius-dormant:plunder": [qLanius()],
  "q:lanius-dormant:autopilot": [qPilot2()],
  "q:lanius-translator:buy": [stock("scrap", 40, tx("wiki.quests.need-40-scrap"))],
  "c:auto-ship-near-sensor-station:2": [qSensors3()],
  "c:auto-ship-near-sensor-station:3": [system("sling", 1, tx("wiki.quests.needs-a-teleporter"))],
  "c:auto-ship-fight-in-plasma-storm:1": [
    band("engines", 3, 5, tx("wiki.quests.needs-engines-level-3-5")),
  ],
  "c:auto-ship-fight-in-plasma-storm:2": [
    system("engines", 6, tx("wiki.quests.needs-level-6-engines")),
  ],
  "c:auto-ship-fight-in-plasma-storm:3": [qCloak()],
  "c:deactivated-auto-ship:2": [qSensors3()],
  "c:rock-ship-in-plasma-storm:2": [qRock()],
  "c:slug-drink:2": [qRock()],
  "c:slug-hacker-choice:4": [qHack()],
  "c:slug-hacker-oxygen:1": [system("oxygen", 2, tx("wiki.quests.needs-level-2-oxygen"))],
  "c:slug-hacker-oxygen:2": [qHack()],
  "c:slug-hacker-doors:1": [qHack()],
  "c:slug-hacker-medical:1": [qHack()],
  "c:slug-hacker-medical:2": [system("medbay", 2, tx("wiki.quests.needs-level-2-medbay"))],
  "c:legendary-thief-kazaaakplethkilik:1": [qMantis()],
  "c:mantis-ship-with-rock-body-parts:2": [qRock()],
  "c:mantis-ship-with-rock-body-parts:3": [augment("keel", tx("wiki.quests.needs-rock-plating"))],
  "c:pirate-engine-hacker:1": [qHack()],
  "c:escort-civilians-ftl-haywire:2": [augment("nav", tx("wiki.quests.needs-adv-ftl-navigation"))],
  "c:zoltan-security-checkpoint:2": [qSlug()],
  "c:zoltan-security-checkpoint:3": [system("leash", 1, tx("wiki.quests.needs-mind-control"))],
  "c:pirate-ship-attacking-civilian-distress:2": [
    system("weapons", 6, tx("wiki.quests.needs-level-6-weapons")),
  ],
  "c:pirate-smuggler:2": [system("weapons", 6, tx("wiki.quests.needs-level-6-weapons"))],
  "c:rock-atheists:2": [system("sensors", 2, tx("wiki.quests.needs-level-2-sensors"))],
  "q:pirate-drones:slug": [qSlug()],
  "q:pirate-drones:hack": [qHack()],
  "q:pirate-drones:upgrade": [system("swarm", 1, tx("wiki.quests.needs-drone-control"))],
  "q:engi-distress:scrap": [stock("scrap", 25, tx("wiki.quests.need-25-scrap"))],
  "q:engi-distress:supplies": [
    stock("scrap", 40, tx("wiki.quests.need-40-scrap")),
    stock("missiles", 2, tx("wiki.quests.need-2-missiles")),
    stock("fuel", 2, tx("wiki.quests.need-2-fuel")),
  ],
  "c:rebel-fight-choice-in-nebula:2": [qCloak()],
  "q:rebel-nebula:engines": [system("engines", 4, tx("wiki.quests.needs-level-4-engines"))],
  "c:mantis-fight-choice:2": [qCloak()],
  "c:auto-ship-near-storage-station:2": [qCloak()],
  "c:auto-ship-near-storage-station-in-nebula:2": [qCloak()],
  "c:auto-ship-near-storage-station-in-nebula:3": [
    system("veil", 2, tx("wiki.quests.needs-level-2-cloaking")),
  ],
  "c:auto-ship-near-storage-station-in-nebula:4": [qHack(), qPart()],
  "c:auto-ship-near-storage-station-in-nebula:5": [
    system("spike", 2, tx("wiki.quests.needs-level-2-hacking")),
    qPart(),
  ],
  "c:auto-ship-near-radar-station:2": [
    drone("radar", tx("wiki.quests.needs-a-combat-drone")),
    qPart(),
  ],
  "q:auto-radar:drone": [qHack(), qPart()],
  "s:the-black-raven:duel": [qSlug()],
  "s:garbled-dock:doors": [qDoors()],
  "s:garbled-dock:sensors2": [system("sensors", 2, tx("wiki.quests.needs-sensors-level-2"))],
  "s:garbled-dock:sensors3": [system("sensors", 3, tx("wiki.quests.needs-sensors-level-3"))],
  "s:refuel-dock:accept": [stock("scrap", 5, tx("wiki.quests.need-5-scrap"))],
  "s:zoltan-raft:hire": [stock("scrap", 40, tx("wiki.quests.need-40-scrap"))],
  "s:refuel-dock:doors": [qDoors()],
  "q:war-camp:missile": [stock("missiles", 1, tx("wiki.quests.need-1-missiles"))],
  "q:loyalists:heal": [stock("missiles", 1, tx("wiki.quests.need-1-missiles"))],
  "q:war-camp:firebomb": [stock("missiles", 2, tx("wiki.quests.need-2-missiles"))],
  "q:station:fuel4": [stock("fuel", 4, tx("wiki.quests.need-4-fuel"))],
  "q:station:fuel1": [stock("fuel", 1, tx("wiki.quests.need-1-fuel"))],
  "c:ancient-device:2": [crew("shard", tx("wiki.quests-a.needs-a-crystal-crewmember"))],
  "c:zoltan-research-facility:2": [system("medbay", 3, tx("wiki.quests-a.needs-medbay-level-3"))],
  "c:zoltan-research-facility:3": [
    augment("stasis", tx("wiki.quests-a.needs-a-damaged-stasis-pod")),
  ],
  "c:zoltan-trade-hub:1": [system("sling", 1, tx("wiki.quests-a.needs-a-teleporter"))],
  "c:zoltan-trade-hub:2": [
    crew("spark", tx("wiki.quests-a.needs-a-zoltan-crewmember")),
    stock("scrap", 10, tx("wiki.quests-a.need-10-scrap")),
  ],
  "c:capture-the-ship:2": [system("sling", 1, tx("wiki.quests-b.needs-a-teleporter"))],
  "c:capture-the-ship:3": [weapon("cask", tx("wiki.quests-b.needs-a-fire-bomb"))],
  "c:capture-the-ship:4": [weapon("antibio", tx("wiki.quests-b.needs-an-anti-bio-beam"))],
  "c:nebula-wreckage:0": [crew("gel", tx("wiki.quests-b.needs-a-slug-crewmember"))],
  "q:asteroid:defense": [stock("parts", 1, tx("wiki.quests-b.need-1-drone-parts"))],
  "q:asteroid:repair": [stock("parts", 1, tx("wiki.quests-b.need-1-drone-parts"))],
  "q:merchant:paltry": [stock("parts", 5, tx("wiki.quests-b.need-drone-parts", { PARTS_OWED: 5 }))],
  "q:merchant:full": [stock("parts", 5, tx("wiki.quests-b.need-drone-parts", { PARTS_OWED: 5 }))],
  "q:merchant:weapons": [
    stock("parts", 5, tx("wiki.quests-b.need-drone-parts", { PARTS_OWED: 5 })),
  ],
  "q:research:drone": [drone("antipersonnel", tx("wiki.quests-b.needs-an-anti-personnel-drone"))],
  "c:research-station-with-no-response:2": [
    drone("antipersonnel", tx("wiki.quests-b.needs-an-anti-personnel-drone")),
  ],
  "c:research-station-with-no-response:3": [
    augment("pulseeye", tx("wiki.quests-b.needs-a-lifeform-scanner")),
  ],
};

export const CHOICE_REQS: Record<string, readonly ChoiceReq[]> = {
  ...FILLER_LOCKS,
  ...MISSING_LOCKS,
  ...CITED_LOCKS,
  ...QUEST_LOCKS,
};
