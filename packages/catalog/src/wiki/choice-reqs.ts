import type { ChoiceReq } from "@stl/pack";

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

const need = (cost: number, v: string) => `Need ${cost} ${v}`;
const scrapN = (v: number) => `Need ${v} scrap`;

const engi = () => crew("engi", "Needs an Engi crewmember");
const rock = () => crew("rock", "Needs a Rock crewmember");
const slug = () => crew("slug", "Needs a Slug crewmember");
const lanius = () => crew("anaerobic", "Needs a Lanius crewmember");
const medbay2 = () => system("medbay", 2, "Needs a level 2 Medbay");
const sensors2 = () => system("sensors", 2, "Needs Sensors level 2");
const sensors3 = () => system("sensors", 3, "Needs Sensors level 3");
const glass = () => augment("ADV_SCANNERS", "Needs Long-Ranged Scanners");
const part = () => stock("parts", 1, "Need 1 drone part");
const hullDrone = () => drone("SHIP_REPAIR", "Needs a Hull Repair Drone");
const missile = () => family("missile", "Needs a missile weapon");

const qEngi = () => crew("engi", "Needs an Engi crewmember");
const qLanius = () => crew("anaerobic", "Needs a Lanius crewmember");
const qRock = () => crew("rock", "Needs a Rock crewmember");
const qSlug = () => crew("slug", "Needs a Slug crewmember");
const qMantis = () => crew("mantis", "Needs a Mantis crewmember");
const qPilot2 = () => system("pilot", 2, "Needs level 2 Piloting");
const qSensors3 = () => system("sensors", 3, "Needs level 3 Sensors");
const qHack = () => system("hacking", 1, "Needs a Hacking system");
const qCloak = () => system("cloaking", 1, "Needs Cloaking");
const qPart = () => stock("parts", 1, "Need 1 drone part");
const qDoors = () => system("doors", 2, "Needs level 2 Door System");

/** Filler cards. Rolled prices in the choice id stay in fillerChoiceDisabled. */
export const FILLER_LOCKS: Record<string, readonly ChoiceReq[]> = {
  "c:refueling-station:0": [stock("scrap", 12, "Need 12 scrap")],
  "c:refueling-station:1": [stock("scrap", 6, "Need 6 scrap")],
  "c:refueling-station:2": [stock("scrap", 2, "Need 2 scrap")],
  "c:asteroid-mining-colony:0": [missile()],
  "c:asteroid-mining-colony:1": [stock("missiles", 5, "Need 5 missiles")],
  "c:asteroid-mining-colony:2": [stock("missiles", 15, "Need 15 missiles")],
  "c:pirate-ship-selling-weapon:2": [system("mind", 1, "Needs Mind Control")],
  "c:giant-alien-spiders:2": [drone("personnel", "Needs an Anti-Personnel Drone")],
  "c:giant-alien-spiders:3": [drone("BOARDER", "Needs a Boarding Drone")],
  "c:giant-alien-spiders:4": [weapon("BEAM_BIO", "Needs an Anti-Bio Beam")],
  "c:malfunctioning-defense-system:3": [family("ion", "Needs an ion weapon")],
  "c:malfunctioning-defense-system:4": [system("cloaking", 1, "Needs Cloaking")],
  "c:malfunctioning-defense-system:5": [system("cloaking", 2, "Needs Improved Cloaking")],
  "c:malfunctioning-defense-system:6": [system("cloaking", 3, "Needs Advanced Cloaking")],
  "c:malfunctioning-defense-system:7": [engi()],
  "c:crushed-pirate:2": [family("beam", "Needs a beam weapon")],
  "c:crushed-pirate:3": [drone("COMBAT_BEAM", "Needs a beam drone")],
  "c:unknown-disease-on-mining-colony:2": [rock()],
  "c:unknown-disease-on-mining-colony:3": [engi()],
  "c:unknown-disease-on-mining-colony:4": [medbay2()],
  "s:plagued-station:cure": [medbay2()],
  "s:unknown-disease:medbot": [augment("NANO_MEDBAY", "Needs Engi Med-bot Dispersal")],
  "c:fire-on-research-station:3": [rock()],
  "c:fire-on-research-station:4": [drone("REPAIR", "Needs a Repair Drone")],
  "s:moon:medbay2": [medbay2()],
  "s:moon:collapse-medbay": [medbay2()],
  "s:moon:medbay3": [system("medbay", 3, "Needs a level 3 Medbay")],
  "s:moon:collapse-clone": [system("clonebay", 2, "Needs a level 2 Clone Bay")],
  "s:moon:slug": [slug()],
  "s:confused-mantis:human": [crew("human", "Needs a Human crewmember")],
  "s:confused-mantis:mantis": [crew("mantis", "Needs a Mantis crewmember")],
  "s:confused-mantis:mind": [system("mind", 1, "Needs Mind Control")],
  "c:battlefield-wreckage:2": [sensors2()],
  "c:rebel-fight-chance:2": [sensors2()],
  "c:rebel-fight-chance:3": [sensors3()],
  "c:rebel-fight-chance-in-nebula:2": [sensors3()],
  "c:rebel-fight-chance-in-nebula:3": [glass()],
  "c:rebel-fight-chance-in-nebula:4": [augment("LIFE_SCANNER", "Needs a Lifeform Scanner")],
  "c:slocknog:0": [stock("scrap", 55, "Need 55 scrap")],
  "c:engi-smashed-ships:2": [engi()],
  "c:mantis-ships-battle-for-rock-freighter:2": [drone("REPAIR", "Needs a Repair Drone")],
  "c:mantis-ships-battle-for-rock-freighter:3": [hullDrone(), part()],
  "c:rock-live-mine:1": [system("engines", 5, "Needs Engines level 5")],
  "s:rock-mine:missile": [missile()],
  "s:rock-mine:beam": [drone("mine", "Needs a Beam Drone"), part()],
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
  "c:nebula-lost-ship:2": [system("teleporter", 1, "Needs a Teleporter")],
  "c:nebula-lost-ship:3": [glass()],
  "c:plasma-storm-incapacitated-ships:2": [system("pilot", 2, "Needs level 2 Piloting")],
  "s:abandoned-station:dna": [system("clonebay", 1, "Needs a Clone Bay")],
  "c:dense-asteroid-field-distress:2": [augment("ROCK_ARMOR", "Needs Rock Plating")],
  "c:disabled-rock-ship:2": [slug()],
  "s:terraforming-scan:sensors": [sensors2()],
  "s:terraforming-scan:zoltan": [crew("energy", "Needs a Zoltan crewmember")],
  "c:large-asteroid-field:2": [augment("SCRAP_COLLECTOR", "Needs a Scrap Recovery Arm")],
  "c:boarders-humans-jammed-sensors:1": [system("hacking", 1, "Needs a Hacking system")],
  "c:slaver-hostile:1": [system("engines", 6, "Needs Engines level 6")],
};

/** Location pages in cited-missing. A ransom or a trade id still parses its price from the id. */
export const MISSING_LOCKS: Record<string, readonly ChoiceReq[]> = {
  "c:crystal-chat:crystal": [crew("crystal", "Needs a Crystal crewmember")],
  "c:crystalline-cache:crystal": [crew("crystal", "Needs a Crystal crewmember")],
  "c:crystalline-cache:breach": [
    weapon("MISSILES_BREACH", "Needs Breach Missiles"),
    stock("missiles", 1, "Need 1 missiles"),
  ],
  "c:crystalline-cache:teleport": [system("teleporter", 2, "Needs a Teleporter level 2")],
  "c:crystalline-cache:engines": [system("engines", 7, "Needs Engines level 7")],
  "c:crystalline-research-facility:rock": [crew("rock", "Needs a Rock crewmember")],
  "c:crystalline-research-facility:dna": [augment("BACKUP_DNA", "Needs a Backup DNA Bank")],
  "c:engi-research-station:sensors": [system("sensors", 2, "Needs Sensors level 2")],
  "c:engi-research-station:scanners": [augment("ADV_SCANNERS", "Needs Long-Ranged Scanners")],
  "c:lanius-with-federation-science-craft:lanius": [crew("anaerobic", "Needs a Lanius crewmember")],
  "c:slug-oxygen-malfunction:mantis": [crew("mantis", "Needs a Mantis crewmember")],
  "c:no-fuel-slug-fuel-trader:slug": [
    crew("slug", "Needs a Slug crewmember"),
    stock("scrap", 15, need(15, "scrap")),
  ],
  "c:slug-store-ship:slug": [crew("slug", "Needs a Slug crewmember")],
  "c:no-fuel-drifting-debris:scan": [augment("LIFE_SCANNER", "Needs a Lifeform Scanner")],
  "c:no-fuel-prepare-to-dock:sensors": [system("sensors", 3, "Needs Sensors level 3")],
  "c:no-fuel-prepare-to-dock:scanners": [augment("ADV_SCANNERS", "Needs Long-Ranged Scanners")],
  "c:no-fuel-prepare-to-dock:cloak": [system("cloaking", 1, "Needs Cloaking")],
  "c:no-fuel-refugee-trading:engi": [qEngi()],
  "c:no-fuel-slug-fuel-trader:pay": [stock("scrap", 15, need(15, "scrap"))],
  "c:no-fuel-refugee-trading:trade": [stock("scrap", 10, need(10, "scrap"))],
  "c:no-fuel-refugee-trading:better": [stock("scrap", 10, need(10, "scrap"))],
  "c:no-fuel-refugee-trading:again": [stock("scrap", 10, need(10, "scrap"))],
  "c:no-fuel-refugee-trading:missiles": [stock("missiles", 1, "Need 1 missiles")],
  "c:slug-repair-station:fuel": [stock("fuel", 15, need(15, "fuel"))],
  "c:slug-repair-station:scrap50": [stock("scrap", 50, need(50, "scrap"))],
  "c:slug-repair-station:accept50": [stock("scrap", 50, need(50, "scrap"))],
};

/** Cited pages whose lock is not a negative resource effect. tradeTake still returns before that loop. */
export const CITED_LOCKS: Record<string, readonly ChoiceReq[]> = {
  "c:zoltan-odd-moon:drone": [
    drone("BOARDER", "Needs a Boarding Drone"),
    stock("parts", 1, "Need 1 drone part"),
  ],
  "c:no-fuel-engi-ship-repair:2": [
    drone("SHIP_REPAIR", "Needs a Hull Repair Drone"),
    stock("parts", 1, "Need 1 drone part"),
  ],
  "c:destroyed-cargo-ship:2": [system("sensors", 2, "Needs Sensors level 2")],
  "c:destroyed-cargo-ship:3": [augment("ADV_SCANNERS", "Needs Long-Ranged Scanners")],
  "c:auto-ship-carrying-shield-virus:1": [system("hacking", 1, "Needs a Hacking system")],
  "c:crystalline-ship-messaging-about-rebels:2": [
    augment("FLEET_DISTRACTION", "Needs Distraction Buoys"),
  ],
  "c:remote-settlement:2": [weapon("BEAM_FIRE", "Needs a Fire Beam")],
  "c:remote-settlement:3": [weapon("BOMB_FIRE", "Needs a Fire Bomb")],
};

/** Quest buttons, including the checks that used to live on the quest-part hooks. */
export const QUEST_LOCKS: Record<string, readonly ChoiceReq[]> = {
  "c:engi-fleet-discussion:2": [qEngi()],
  "c:lanius-ship-in-rich-debris-field:3": [qPilot2()],
  "c:lanius-ship-in-rich-debris-field:4": [system("pilot", 3, "Needs level 3 Piloting")],
  "c:lanius-ship-salvager:2": [qLanius()],
  "c:lanius-trader:4": [qLanius()],
  "c:space-station-under-construction:2": [qLanius()],
  "c:lanius-lone-ship:3": [qLanius()],
  "q:lanius-dormant:plunder": [qLanius()],
  "q:lanius-dormant:autopilot": [qPilot2()],
  "q:lanius-translator:buy": [stock("scrap", 40, "Need 40 scrap")],
  "c:auto-ship-near-sensor-station:2": [qSensors3()],
  "c:auto-ship-near-sensor-station:3": [system("teleporter", 1, "Needs a Teleporter")],
  "c:auto-ship-fight-in-plasma-storm:1": [band("engines", 3, 5, "Needs Engines level 3-5")],
  "c:auto-ship-fight-in-plasma-storm:2": [system("engines", 6, "Needs level 6 Engines")],
  "c:auto-ship-fight-in-plasma-storm:3": [qCloak()],
  "c:deactivated-auto-ship:2": [qSensors3()],
  "c:rock-ship-in-plasma-storm:2": [qRock()],
  "c:slug-drink:2": [qRock()],
  "c:slug-hacker-choice:4": [qHack()],
  "c:slug-hacker-oxygen:1": [system("oxygen", 2, "Needs level 2 Oxygen")],
  "c:slug-hacker-oxygen:2": [qHack()],
  "c:slug-hacker-doors:1": [qHack()],
  "c:slug-hacker-medical:1": [qHack()],
  "c:slug-hacker-medical:2": [system("medbay", 2, "Needs level 2 Medbay")],
  "c:legendary-thief-kazaaakplethkilik:1": [qMantis()],
  "c:mantis-ship-with-rock-body-parts:2": [qRock()],
  "c:mantis-ship-with-rock-body-parts:3": [augment("ROCK_ARMOR", "Needs Rock Plating")],
  "c:pirate-engine-hacker:1": [qHack()],
  "c:escort-civilians-ftl-haywire:2": [augment("FTL_JUMPER", "Needs Adv. FTL Navigation")],
  "c:zoltan-security-checkpoint:2": [qSlug()],
  "c:zoltan-security-checkpoint:3": [system("mind", 1, "Needs Mind Control")],
  "c:pirate-ship-attacking-civilian-distress:2": [system("weapons", 6, "Needs level 6 Weapons")],
  "c:pirate-smuggler:2": [system("weapons", 6, "Needs level 6 Weapons")],
  "c:rock-atheists:2": [system("sensors", 2, "Needs level 2 Sensors")],
  "q:pirate-drones:slug": [qSlug()],
  "q:pirate-drones:hack": [qHack()],
  "q:pirate-drones:upgrade": [system("drones", 1, "Needs Drone Control")],
  "q:engi-distress:scrap": [stock("scrap", 25, "Need 25 scrap")],
  "q:engi-distress:supplies": [
    stock("scrap", 40, "Need 40 scrap"),
    stock("missiles", 2, "Need 2 missiles"),
    stock("fuel", 2, "Need 2 fuel"),
  ],
  "c:rebel-fight-choice-in-nebula:2": [qCloak()],
  "q:rebel-nebula:engines": [system("engines", 4, "Needs level 4 Engines")],
  "c:mantis-fight-choice:2": [qCloak()],
  "c:auto-ship-near-storage-station:2": [qCloak()],
  "c:auto-ship-near-storage-station-in-nebula:2": [qCloak()],
  "c:auto-ship-near-storage-station-in-nebula:3": [system("cloaking", 2, "Needs level 2 Cloaking")],
  "c:auto-ship-near-storage-station-in-nebula:4": [qHack(), qPart()],
  "c:auto-ship-near-storage-station-in-nebula:5": [
    system("hacking", 2, "Needs level 2 Hacking"),
    qPart(),
  ],
  "c:auto-ship-near-radar-station:2": [drone("radar", "Needs a Combat Drone"), qPart()],
  "q:auto-radar:drone": [qHack(), qPart()],
  "s:the-black-raven:duel": [qSlug()],
  "s:garbled-dock:doors": [qDoors()],
  "s:garbled-dock:sensors2": [system("sensors", 2, "Needs Sensors level 2")],
  "s:garbled-dock:sensors3": [system("sensors", 3, "Needs Sensors level 3")],
  "s:refuel-dock:accept": [stock("scrap", 5, "Need 5 scrap")],
  "s:zoltan-raft:hire": [stock("scrap", 40, "Need 40 scrap")],
  "s:refuel-dock:doors": [qDoors()],
  "q:war-camp:missile": [stock("missiles", 1, "Need 1 missiles")],
  "q:loyalists:heal": [stock("missiles", 1, "Need 1 missiles")],
  "q:war-camp:firebomb": [stock("missiles", 2, "Need 2 missiles")],
  "q:station:fuel4": [stock("fuel", 4, "Need 4 fuel")],
  "q:station:fuel1": [stock("fuel", 1, "Need 1 fuel")],
  "c:ancient-device:2": [crew("crystal", "Needs a Crystal crewmember")],
  "c:zoltan-research-facility:2": [system("medbay", 3, "Needs Medbay level 3")],
  "c:zoltan-research-facility:3": [augment("STASIS_POD", "Needs a Damaged Stasis Pod")],
  "c:zoltan-trade-hub:1": [system("teleporter", 1, "Needs a Teleporter")],
  "c:zoltan-trade-hub:2": [
    crew("energy", "Needs a Zoltan crewmember"),
    stock("scrap", 10, "Need 10 scrap"),
  ],
  "c:capture-the-ship:2": [system("teleporter", 1, "Needs a Teleporter")],
  "c:capture-the-ship:3": [weapon("BOMB_FIRE", "Needs a Fire Bomb")],
  "c:capture-the-ship:4": [weapon("BEAM_BIO", "Needs an Anti-Bio Beam")],
  "c:nebula-wreckage:0": [crew("slug", "Needs a Slug crewmember")],
  "q:asteroid:defense": [stock("parts", 1, "Need 1 drone parts")],
  "q:asteroid:repair": [stock("parts", 1, "Need 1 drone parts")],
  "q:merchant:paltry": [stock("parts", 5, `Need ${5} drone parts`)],
  "q:merchant:full": [stock("parts", 5, `Need ${5} drone parts`)],
  "q:merchant:weapons": [stock("parts", 5, `Need ${5} drone parts`)],
  "q:research:drone": [drone("BATTLE", "Needs an Anti-Personnel Drone")],
  "c:research-station-with-no-response:2": [drone("BATTLE", "Needs an Anti-Personnel Drone")],
  "c:research-station-with-no-response:3": [augment("LIFE_SCANNER", "Needs a Lifeform Scanner")],
};

export const CHOICE_REQS: Record<string, readonly ChoiceReq[]> = {
  ...FILLER_LOCKS,
  ...MISSING_LOCKS,
  ...CITED_LOCKS,
  ...QUEST_LOCKS,
};
