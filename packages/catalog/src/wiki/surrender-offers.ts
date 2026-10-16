import type { SurrenderOfferDef, SurrenderReward } from "@stl/pack";

/**
 * Scripted surrender offers. Keyed by the event slug startCombat receives.
 * The pack copies each row onto that event. A fight slug with no page becomes a holder record.
 * The sim still checks the hull and still hands the reward over.
 */
export type ScriptedReward = SurrenderReward;

export type ScriptedSurrender = SurrenderOfferDef & {
  /** Wiki event page. Holder records use this as their title. */
  page: string;
};

/** Crystal fight. Five surrender lines, no odds. INFERRED: equal. */
const CRYSTAL_FIGHT_HAILS = [
  // Wiki citations:
  // > "The surrender text varies, and could be any of the following:" — [[Crystal fight#The ship surrenders]]
  // > "\"We yield, aliens. We have no wish to die fighting you.\"" — [[Crystal fight#The ship surrenders]]
  // > "\"You have bested us! I will no longer underestimate you Outsiders. Please, let us leave in peace.\"" — [[Crystal fight#The ship surrenders]]
  // > "They appear to be transmitting the universal signals for surrender. Will you let them go?" — [[Crystal fight#The ship surrenders]]
  // > "They message you, \"I see now there was a misunderstanding and there is no need for more bloodshed. Will you forgive our lack of discretion?\"" — [[Crystal fight#The ship surrenders]]
  // > "\"We cannot beat you, we surrender. Surely there is mercy wherever you come from.\"" — [[Crystal fight#The ship surrenders]]
  '"We yield, aliens. We have no wish to die fighting you."',
  '"You have bested us! I will no longer underestimate you Outsiders. Please, let us leave in peace."',
  "They appear to be transmitting the universal signals for surrender. Will you let them go?",
  'They message you, "I see now there was a misunderstanding and there is no need for more bloodshed. Will you forgive our lack of discretion?"',
  '"We cannot beat you, we surrender. Surely there is mercy wherever you come from."',
];

/**
 * Scripted surrenders: event pages whose ship carries its own surrender offer and reward. Keyed by the event slug that
 * startCombat receives (wiki/escape.ts eventSlugOf). Only pages the cited events wire to a fight are listed.
 * Each reward is only what the page names; nothing else is added.
 */
export const SCRIPTED_SURRENDERS: Record<string, ScriptedSurrender> = {
  // Crystal fight. {{SurrenderEscape(alt)|surrenderofferchance*|CRYSTAL_SHIP|events_ships.xml|40|30-40|3-4}}.
  // The template uses the 40% and the 30-40 hull. It does not print the trailing 3-4.
  // Accept is a soldier (once), goods ({{DuplicateEvent|3}}), or nothing ({{DuplicateEvent|2}}). surrenderChoose.
  "crystal-fight": {
    // Wiki citations:
    // > "Accept their surrender." — [[Crystal fight#The ship surrenders]]
    // > "Ignore them." — [[Crystal fight#The ship surrenders]]
    page: "Crystal fight",
    chance: 40,
    low: 30,
    high: 40,
    reward: { k: "none" },
    hails: CRYSTAL_FIGHT_HAILS,
    hail: CRYSTAL_FIGHT_HAILS[0],
    accept: "Accept their surrender.",
    refuse: "Ignore them.",
  },
  // "Crystal fight with surrender offer (Human crew)": CRYSTAL_HUNTER, {{SurrenderEscape(alt)|surrenderofferchance*|...|50|30-40}}.
  // "Accept their surrender." -> "You receive a Human crewmember and the fight continues." (ref: "The surrender is
  // lacking the usual tag to stop the fight").
  "crystal-fight-with-surrender-offer-human-crew": {
    page: "Crystal fight with surrender offer (Human crew)",
    chance: 50,
    low: 30,
    high: 40,
    reward: { k: "crew", race: "Human" },
    continues: true,
    hail: 'The hunters message you, "We surrender. Take one of these squishy meat sacks that we\'ve captured." He must be referring to the human captives.',
    accept: "Accept their surrender.",
    refuse: "Finish them off.",
  },
  // "Crystal fight with surrender offer (hull repairs)": CRYSTAL_CONVOY, "surrenderofferchance100", 30-40.
  // "Stop the fight." -> "You receive low (1-3 fuel) fuel and scrap, and your ship receives 8 repairs."
  // Rewards, "Fuel": "T fuel & T scrap" (low fuel and low scrap). The two printed sentences are the result.
  "crystal-fight-with-surrender-offer-hull-repairs": {
    page: "Crystal fight with surrender offer (hull repairs)",
    chance: 100,
    low: 30,
    high: 40,
    reward: { k: "fuel-repairs", repairs: 8 },
    hail: "Their ship seems severely damaged and they look to be reconsidering the fight. Should you power down your weapons and explain that you mean no threat?",
    accept: "Stop the fight.",
    refuse: "Finish them off.",
    result: `They accept your explanation and allow you to approach the fleet. It appears they are miners and colonists from a fringe settlement who are fleeing to more protected space after hearing reports of pirate and rebel attacks.

They apologize for their hasty response to your presence and spend some time refueling and repairing both ships.`,
  },
  // "Pirate briber": "(has 70% chance to surrender at 30-40% hull)". "Accept the more generous bribe and leave." ->
  // "You receive high (fuel: 3-6 ; missiles: 4-8 ; drone parts: 1-2) resources with some scrap" (Rewards#Stuff).
  "pirate-briber": {
    page: "Pirate briber",
    chance: 70,
    low: 30,
    high: 40,
    reward: { k: "stuff", tier: "high" },
    hail: '"Fine! Our previous offer was not generous enough, let\'s improve it."',
    accept: "Accept the more generous bribe and leave.",
    refuse: "Reject the offer and continue your assault.",
  },
  // "Pirate smuggler", Fight the Pirate ship: "(enemy ship has 50% chance to surrender at 20-40% hull)".
  // "Accept their offer." -> "You receive a random amount of resources with some scrap" (Rewards#Stuff, random tier).
  "pirate-smuggler": {
    page: "Pirate smuggler",
    chance: 50,
    low: 20,
    high: 40,
    reward: { k: "stuff" },
    hail: 'They hail you, "We realize our ship is no match for yours. If you let us go we can make it worth your while."',
    accept: "Accept their offer.",
    refuse: "Ignore their pleas and attack.",
  },
  // "Remote settlement", Fight the pirate ship: "(50% chance for surrender offer at 20-40% hull)". "Let them go." ->
  // "You receive medium (fuel: 2-4 ; missiles: 2-4 ; drone parts: 1) resources with some scrap" (Rewards#Stuff).
  "remote-settlement": {
    page: "Remote settlement",
    chance: 50,
    low: 20,
    high: 40,
    reward: { k: "stuff", tier: "medium" },
    hail: '"Alright! We give up! We\'re terrible at this pirating thing anyway..."',
    accept: "Let them go.",
    refuse: "Piracy cannot be forgiven. Attack!",
  },
  // Template:Slaver Fight (used by "Slaver (hostile)" and "Slaver (friendly)"): "(enemy ship has 80% chance to surrender
  // at 20-40% hull)". "Accept their offer." -> "You receive a crewmember." The race is not named.
  // Category:Crew Rewards: any of the possible races for the current sector type (randomRace), not a global race.
  // INFERRED: each race on that sector's Sectors "Crewmembers" list is equally likely. The Sectors page says rarity
  // only affects the store assortment probability.
  "slaver-hostile": {
    page: "Slaver (hostile)",
    chance: 80,
    low: 20,
    high: 40,
    reward: { k: "crew" },
    hail: "We surrender! Take one of our slaves as tribute; if you destroy us they'll all die anyway!",
    accept: "Accept their offer.",
    refuse: "Surrender is not an option.",
  },
  "slaver-friendly": {
    page: "Slaver (friendly)",
    chance: 80,
    low: 20,
    high: 40,
    reward: { k: "crew" },
    hail: "We surrender! Take one of our slaves as tribute; if you destroy us they'll all die anyway!",
    accept: "Accept their offer.",
    refuse: "Surrender is not an option.",
  },
  // "Slug Home Nebula surrender": "surrender offer: 100% chance at 30-40% hull". "Let them live." -> "Accept the
  // prototype weapon." -> "You receive Anti-Bio Beam." The italic under that grant is `result` (surrenderChoose appends
  // the weapon name). @agent:quests: the other branch, "We don't want the weapon, we want information." -> "A quest
  // marker is added to your map.", is the `extra` answer (wiki/quests.ts). The Slug Cruiser unlock is the interceptor
  // fight on that marker, not this offer (@agent:unlocks, wiki/quests.ts grantUnlock).
  "slug-home-nebula-surrender": {
    // Wiki citations:
    // > "Fight a Slug ship (default rewards). (surrender offer: 100% chance at 30-40% hull; escape attempt: 50% chance at 30-40% hull)" — [[Slug Home Nebula surrender]]
    // > "\"You have besssted us! Will you accept what is in our storeesss in exchange for our livess?\"" — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    // > "Let them live." — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    // > "\"Take thisss newly developed weapon we're transporting... They're not going to be happy we gave it up, that isss for ssure...\"" — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    // > "Accept the prototype weapon." — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    // > "This odd beam weapon does no damage to ships but instead greatly hurts the crew! Diabolical!" — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    // > "You receive Anti-Bio Beam." — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    // > "We don't want the weapon, we want information." — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    // > "We will not accept surrender!" — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    // > "Continue the fight." — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    page: "Slug Home Nebula surrender",
    chance: 100,
    low: 30,
    high: 40,
    reward: { k: "weapon", name: "Anti-Bio Beam" },
    hail: '"You have besssted us! Will you accept what is in our storeesss in exchange for our livess?" "Take thisss newly developed weapon we\'re transporting..."',
    accept: "Let them live. Accept the prototype weapon.",
    refuse: "We will not accept surrender!",
    result:
      "This odd beam weapon does no damage to ships but instead greatly hurts the crew! Diabolical!",
    extra: {
      id: "s:slug-home-nebula-surrender:info",
      label: "Let them live. We don't want the weapon, we want information.",
    },
  },
  // ---- @agent:surrender (pages wired by cited-events-surrender.ts; their fights start in PAGE_CHOICES below) ----
  // "Destroyed cargo ship", Bring it aboard, ambush result: JELLY_PIRATE_WITHBOARDERS "makes a surrender offer at
  // 0-50% hull". Category:Ship surrender Events: "only the 'bring it aboard' ship fight has a guaranteed surrender
  // offer", so 100%. The page names no surrender reward; Template:SurrenderEscape links every offer to Rewards#Stuff
  // (random tier, as the default rows). INVENTED: the hail and both labels; the page prints none.
  "destroyed-cargo-ship": {
    page: "Destroyed cargo ship",
    chance: 100,
    low: 0,
    high: 50,
    reward: { k: "stuff" },
    hail: 'The pirates hail you: "Enough! Take what\'s left of the cargo and let us go."',
    accept: "Accept their surrender.",
    refuse: "Refuse. Keep firing.",
  },
  // "Settlement mercenary work", Accept: SQUAT_PIRATE_MERCENARY "(surrenders at 30-40% hull)"; the Category page:
  // "only the fight with a Pirate ship ... has a guaranteed surrender offer". "Let them live and then return to the
  // settlement." -> "You receive a weapon with medium scrap." The weapon is not named: Rewards, "Weapon": "A random
  // weapon & T scrap." The italic is the return to the settlement.
  "settlement-mercenary-work": {
    // Wiki citations:
    // > "When the ship surrenders They hail your ship saying, \"You win! We're not cut out for this!\" (surrenders at 30-40% hull)" — [[Settlement mercenary work]]
    // > "Let them live and then return to the settlement." — [[Settlement mercenary work]]
    // > "With the pirates dissuaded from their career path, you return to the settlement. \"Thank you, they returned to us before you did. I don't think we'll need this anymore.\"" — [[Settlement mercenary work]]
    // > "You receive a weapon with medium scrap." — [[Settlement mercenary work]]
    // > "Forget your promise, they die!" — [[Settlement mercenary work]]
    // > "The fight continues." — [[Settlement mercenary work]]
    page: "Settlement mercenary work",
    chance: 100,
    low: 30,
    high: 40,
    reward: { k: "scrap", tier: "medium", unnamed: "weapon" },
    hail: 'They hail your ship saying, "You win! We\'re not cut out for this!"',
    accept: "Let them live and then return to the settlement.",
    refuse: "Forget your promise, they die!",
    result:
      "With the pirates dissuaded from their career path, you return to the settlement. \"Thank you, they returned to us before you did. I don't think we'll need this anymore.\"",
  },
  // "The Black Raven", Trivia: "proposes a surrender offer when its hull integrity falls down to 30-40%". The page
  // gives no percent chance; INFERRED 100% (a scripted surrender, listed in Category:Ship surrender Events).
  // "Accept his surrender." -> "You receive a weapon with high scrap." Rewards, "Weapon": "A random weapon & T scrap."
  "the-black-raven": {
    // Wiki citations:
    // > "When the ship surrenders \"I see the rumorsss are true. I yield, we are no match for you. Take this and let us leave in ssshame.\"" — [[The Black Raven#Fighting the Black Raven]]
    // > "Accept his surrender." — [[The Black Raven#Fighting the Black Raven]]
    // > "He transfers over the goods and starts to repair his ship." — [[The Black Raven#Fighting the Black Raven]]
    // > "You receive a weapon with high scrap." — [[The Black Raven#Fighting the Black Raven]]
    // > "Ignore him and attack." — [[The Black Raven#Fighting the Black Raven]]
    // > "The ship proposes a surrender offer when its hull integrity falls down to 30-40%." — [[The Black Raven#Trivia]]
    page: "The Black Raven",
    chance: 100,
    low: 30,
    high: 40,
    reward: { k: "scrap", tier: "high", unnamed: "weapon" },
    hail: '"I see the rumorsss are true. I yield, we are no match for you. Take this and let us leave in ssshame."',
    accept: "Accept his surrender.",
    refuse: "Ignore him and attack.",
    result: "He transfers over the goods and starts to repair his ship.",
  },
  // "Zoltan ship asks to dock" (old title "Zoltan science ship"), ZOLTAN_SCIENCE_DOCK: "Enemy ship has 50% chance to
  // surrender at 30-40% hull". -> "You receive a Zoltan crewmember and low scrap with resources." Trivia: "there is
  // no option or prompt to decline the surrender". INVENTED: the accept label (the page has no choice there).
  "zoltan-ship-asks-to-dock": {
    // Wiki citations:
    // > "When the ship surrenders The Zoltan captain sends an urgent hail: \"Wait, this was all a test! A test that you passed! A diverse crew, working together, surely a sight to warm the heart of any dispassionate observer. Come, I shall join your crew!\" (Enemy ship has 50% chance to surrender at 30-40% hull; never tries to escape )" — [[Zoltan ship asks to dock]]
    // > "You receive a Zoltan crewmember and low scrap with resources." — [[Zoltan ship asks to dock]]
    // > "If surrender is triggered, the fight is over: there is no option or prompt to decline the surrender to continue the fight." — [[Zoltan ship asks to dock#Trivia]]
    page: "Zoltan ship asks to dock",
    chance: 50,
    low: 30,
    high: 40,
    reward: { k: "standard", tier: "low", race: "Zoltan" },
    forced: true,
    hail: 'The Zoltan captain sends an urgent hail: "Wait, this was all a test! A test that you passed! A diverse crew, working together, surely a sight to warm the heart of any dispassionate observer. Come, I shall join your crew!"',
    accept: "Welcome the captain aboard.",
    refuse: "",
  },
  // ---- @agent:quests. Fights at quest-marker beacons (wiki/quests.ts starts them with these slugs) ----
  // "Slug comm tapping", Quest Marker, Engage the pirate: QUEST_SLUG_PIRATE_TRAP1 "(surrenders at 30-40% hull)". No
  // percent is printed: INFERRED 100% (a scripted surrender). "Let the pirate escape and go after the Slugman ship."
  // -> "You receive high scrap." (Rewards#Scrap only).
  "quest-slug-pirate-trap-engage": {
    // Wiki citations:
    // > "When the ship surrenders When the pirate ship looks ready to break apart you notice the Slug ship has secured the loot and is preparing to jump away! (surrenders at 30-40% hull)" — [[Slug comm tapping#Quest Marker]]
    // > "Continue fighting the pirate." — [[Slug comm tapping#Quest Marker]]
    // > "The fight continues." — [[Slug comm tapping#Quest Marker]]
    // > "Let the pirate escape and go after the Slugman ship." — [[Slug comm tapping#Quest Marker]]
    // > "The pirate's too badly damaged to pursue you, and you catch up to the Slugs before they jump. \"Ah, of courssse, we would never leave without providing the agreed upon ssspoils.\" They transfer over a decent chunk of the profits and set off." — [[Slug comm tapping#Quest Marker]]
    // > "You receive high scrap." — [[Slug comm tapping#Quest Marker]]
    page: "Slug comm tapping",
    chance: 100,
    low: 30,
    high: 40,
    reward: { k: "scrap", tier: "high" },
    hail: "When the pirate ship looks ready to break apart you notice the Slug ship has secured the loot and is preparing to jump away!",
    accept: "Let the pirate escape and go after the Slugman ship.",
    refuse: "Continue fighting the pirate.",
    result:
      'The pirate\'s too badly damaged to pursue you, and you catch up to the Slugs before they jump. "Ah, of courssse, we would never leave without providing the agreed upon ssspoils." They transfer over a decent chunk of the profits and set off.',
  },
  // "Engi fleet discussion", First Quest Marker (Real): REBEL_ENGI_UNLOCK_2REAL "surrenders at 50% hull". No percent
  // chance printed: INFERRED 100%. The page prints one answer, "Demand information on the stolen technology." -> "A final
  // quest marker is added to your map." -> "Let them go." So the card has no refuse (forced) and pays nothing.
  "quest-engi-real": {
    // Wiki citations:
    // > "When the ship surrenders \"Stop! This isn't worth dying for...\"" — [[Engi fleet discussion#First Quest Marker (Real)]]
    // > "Demand information on the stolen technology." — [[Engi fleet discussion#First Quest Marker (Real)]]
    // > "\"Of course, that's why you're here. Yes, they passed by here but I had nothing to do with it, I don't know what they were carrying. I'll transmit coordinates. Now just let us go...\"" — [[Engi fleet discussion#First Quest Marker (Real)]]
    // > "A final quest marker is added to your map." — [[Engi fleet discussion#First Quest Marker (Real)]]
    // > "You prepare an FTL message containing the coordinates to send to the Engies and get ready to jump." — [[Engi fleet discussion#First Quest Marker (Real)]]
    page: "Engi fleet discussion",
    chance: 100,
    low: 50,
    high: 50,
    reward: { k: "none" },
    forced: true,
    quest: "engi-final",
    hail: '"Stop!  This isn\'t worth dying for..."',
    accept: "Demand information on the stolen technology.",
    refuse: "",
    result:
      "\"Of course, that's why you're here. Yes, they passed by here but I had nothing to do with it, I don't know what they were carrying. I'll transmit coordinates. Now just let us go...\" You prepare an FTL message containing the coordinates to send to the Engies and get ready to jump.",
  },
  // "Engi fleet discussion", Second Quest Marker (Fake): REBEL_ENGI_UNLOCK_2FAKE "surrenders at 40% hull" (INFERRED 100%).
  // "Demand information on the stolen technology." opens the page's follow-up: "Let them go." ("The ship turns neutral.")
  // or "Ignore him and attack." ("Continue the fight."), handled in wiki/quests.ts.
  "quest-engi-fake": {
    // Wiki citations:
    // > "When the ship surrenders \"Stop! I don't want to die here.\"" — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    // > "Demand information on the stolen technology." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    // > "\"Ah, so that's what you're after. Too bad, you followed the wrong ship. The envoy that passed through here was a fake, to trick fools like you. Now let us go!\"" — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    // > "Let them go." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    // > "Ignore him and attack." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    page: "Engi fleet discussion",
    chance: 100,
    low: 40,
    high: 40,
    reward: { k: "none" },
    forced: true,
    hail: '"Stop! I don\'t want to die here."',
    accept: "Demand information on the stolen technology.",
    refuse: "",
    card: {
      body: "\"Ah, so that's what you're after. Too bad, you followed the wrong ship. The envoy that passed through here was a fake, to trick fools like you. Now let us go!\"",
      choices: [
        { id: "q:engi-fake:go", label: "Let them go." },
        { id: "q:engi-fake:attack", label: "Ignore him and attack." },
      ],
    },
  },
  // "Mantis ship-collectors", Quest Marker: DONOR_MANTIS_CHASE2 "makes a surrender offer at 20% hull" (INFERRED 100%).
  // "Let them live." -> "You receive a weapon with high scrap." Rewards, "Weapon": "A random weapon & T scrap."
  "quest-mantis-chase": {
    // Wiki citations:
    // > "\"Look, you proved your point. We don't want to die... Take this and let us go. Please?\"" — [[Mantis ship-collectors#Quest Marker]]
    // > "Let them live." — [[Mantis ship-collectors#Quest Marker]]
    // > "\"Thank you. But do you have any idea how much repairing TWO ships will set us back?...\" What an odd Mantis. You prepare to leave." — [[Mantis ship-collectors#Quest Marker]]
    // > "You receive a weapon with high scrap." — [[Mantis ship-collectors#Quest Marker]]
    // > "Finish them off." — [[Mantis ship-collectors#Quest Marker]]
    page: "Mantis ship-collectors",
    chance: 100,
    low: 20,
    high: 20,
    reward: { k: "scrap", tier: "high", unnamed: "weapon" },
    hail: '"Look, you proved your point. We don\'t want to die... Take this and let us go. Please?"',
    accept: "Let them live.",
    refuse: "Finish them off.",
    result:
      '"Thank you. But do you have any idea how much repairing TWO ships will set us back?..." What an odd Mantis. You prepare to leave.',
  },
};

export function offerFromScripted(row: ScriptedSurrender): SurrenderOfferDef {
  const offer: SurrenderOfferDef = {
    chance: row.chance,
    low: row.low,
    high: row.high,
    reward: { ...row.reward },
    hail: row.hail,
    accept: row.accept,
    refuse: row.refuse,
  };
  if (row.hails) offer.hails = [...row.hails];
  if (row.continues) offer.continues = true;
  if (row.forced) offer.forced = true;
  if (row.quest) offer.quest = row.quest;
  if (row.result) offer.result = row.result;
  if (row.extra) offer.extra = { id: row.extra.id, label: row.extra.label };
  if (row.card) {
    offer.card = {
      body: row.card.body,
      choices: row.card.choices.map((choice) => ({ id: choice.id, label: choice.label })),
    };
  }
  return offer;
}
