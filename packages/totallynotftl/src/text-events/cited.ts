/**
 * Stand-in event text for the cited area, keyed by ftl.dat text id. Each line is functional:
 * an option states its outcome, or the odds of each outcome when it is random. No lore, no story.
 */
export const TEXT: Record<string, string> = {
  // Trade resources (TRADER_CIV) and Trade resources in nebula (NEBULA_TRADER). The body states the offer.
  event_TRADER_CIV_c1_choice: "Make the trade shown.",
  event_TRADER_CIV_c2_choice: "Nothing happens.",
  event_NEBULA_TRADER_text: "Trade offer in a nebula: one resource for another.",
  event_NEBULA_TRADER_c1_choice: "Make the trade shown.",
  event_NEBULA_TRADER_c2_choice: "Nothing happens.",

  // Slug moons question (SLUG_DISTRESS_QUESTION). The moon count on the tracking page is the right answer.
  event_SLUG_DISTRESS_QUESTION_text: "Distress beacon in a nebula.",
  event_SLUG_DISTRESS_QUESTION_LIST_1_text: "The signal comes from a planet with five moons.",
  event_SLUG_DISTRESS_QUESTION_LIST_2_text: "The signal comes from a planet with six moons.",
  event_SLUG_DISTRESS_QUESTION_LIST_3_text: "The signal comes from a planet with seven moons.",
  event_SLUG_DISTRESS_QUESTION_LIST_4_text: "The signal comes from a planet with eleven moons.",
  event_SLUG_DISTRESS_QUESTION_LIST_1_c1_choice: "Answer a question about the moon count.",
  event_SLUG_DISTRESS_QUESTION_LIST_1_c1_text:
    "Question: how many moons does this planet have? Right: gain 1 Slug crew. Wrong: lose 35 scrap, 2-4 fuel, and 1-2 drone parts.",
  event_SLUG_DISTRESS_QUESTION_TRUE_text: "Right answer.",
  event_SLUG_DISTRESS_QUESTION_FALSE_text: "Wrong answer. Resources are taken.",

  // Zoltan odd moon (ZOLTAN_ODD_MOON).
  event_ZOLTAN_ODD_MOON_text: "A moon you can scan.",
  event_ZOLTAN_ODD_MOON_c1_choice:
    "1 in 4: nothing. 1 in 4: gain a weapon and low scrap. 1 in 4: gain medium scrap. 1 in 4: choose whether to spend 1 missile.",
  event_ZOLTAN_ODD_MOON_c2_choice: "Nothing happens.",
  event_ZOLTAN_ODD_MOON_c2_text: "You leave the moon. Nothing happens.",
  event_ZOLTAN_ODD_MOON_c3_choice: "Lose 1 drone part. Gain 1 Zoltan crew.",
  event_ZOLTAN_ODD_MOON_c3_text: "The boarding drone is spent.",
  event_ZOLTAN_ODD_MOON_c3_c1_text: "A Zoltan offers to join.",
  event_ZOLTAN_ODD_MOON_CHECK_1_text: "The scan finds nothing. Nothing happens.",
  event_ZOLTAN_ODD_MOON_CHECK_2_text: "Gain a weapon and low scrap.",
  event_ZOLTAN_ODD_MOON_CHECK_3_text: "Gain medium scrap.",
  event_ZOLTAN_ODD_MOON_CHECK_4_text: "Explosives can open the surface.",
  event_ZOLTAN_ODD_MOON_CHECK_4_c1_choice:
    "Lose 1 missile. 1 in 3: gain a weapon and random scrap. 1 in 3: gain random scrap. 1 in 3: nothing.",
  event_ZOLTAN_ODD_MOON_CHECK_4_c2_choice: "Nothing happens.",
  event_ZOLTAN_ODD_MOON_EXPLOSION_1_text: "Gain random scrap.",
  event_ZOLTAN_ODD_MOON_EXPLOSION_2_text: "The blast finds nothing.",
  event_ZOLTAN_ODD_MOON_EXPLOSION_3_text: "Gain a weapon and random scrap.",

  // Lanius trader (LANIUS_TRADER) and Lanius trader with translator. The body states the offer.
  event_LANIUS_TRADER_c1_choice: "Make the trade shown.",
  event_LANIUS_TRADER_c2_choice: "Nothing happens.",
  event_LANIUS_TRADER_c3_choice: "Get a second offer: 3-7 fuel, missiles, or drone parts for 20-50 scrap.",
  event_LANIUS_TRADER_TRANSLATOR_text: "Trade offer: one resource for scrap.",
  event_LANIUS_TRADER_TRANSLATOR_c1_choice: "Make the trade shown.",
  event_LANIUS_TRADER_TRANSLATOR_c2_choice: "Nothing happens.",
  event_LANIUS_TRADER_TRANSLATOR_c3_choice: "Get an offer: 1 Lanius crew for 40 scrap.",

  // Blue options on auto-ship and station pages.
  event_AUTO_DEFENSE_RADAR_c1_text: "Fight the automated ship.",
  event_AUTO_DEFENSE_RADAR_c3_choice:
    "Lose 1 drone part. 1 in 3: fight the ship. 2 in 3: reach the station: 1 in 4 each: Rebel pursuit slows, the sector map, nothing, Rebel pursuit speeds up.",
  event_NEBULA_AUTO_DEFENSE_ITEM_c3_choice:
    "1 in 2: search the station: 1 in 4 each: nothing, a drone, a weapon, medium resources. 1 in 2: fight the ship.",
  event_NEBULA_AUTO_DEFENSE_ITEM_c4_choice:
    "Search the station: 1 in 4 each: nothing, a drone, a weapon, medium resources.",
  event_NEBULA_AUTO_DEFENSE_ITEM_c5_choice:
    "Lose 1 drone part. 1 in 2: search the station: 1 in 4 each: nothing, a drone, a weapon, medium resources. 1 in 2: fight the ship.",
  event_NEBULA_AUTO_DEFENSE_ITEM_c6_choice:
    "Lose 1 drone part. Search the station: 1 in 4 each: nothing, a drone, a weapon, medium resources.",
  event_AUTO_DEFENSE_ITEM_c3_choice:
    "1 in 2: search the station: 1 in 4 each: nothing, a drone, a weapon, medium resources. 1 in 2: fight the ship.",
  event_AUTO_DEFENSE_MAP_c3_choice: "1 in 2: reveal the sector map. 1 in 2: fight the ship.",
  event_AUTO_DEFENSE_MAP_c4_choice: "Reveal the sector map.",
  event_PIRATE_CIVILIAN_BEACON_c3_choice:
    "1 in 2: fight the pirate ship. 1 in 2: the pirate leaves and the civilian ship rewards you.",
  event_ZOLTAN_CREW_SCAN_c2_choice:
    "1 in 2: nothing. 1 in 2: give up 1 crew, or fight a Zoltan ship with 2-4 boarders and Weapons halved.",
  event_ZOLTAN_CREW_SCAN_c3_choice: "Gain medium fuel.",
  event_ZOLTAN_CREW_SCAN_c4_choice: "Gain medium fuel.",
  event_ESCORT_BEACON_c3_choice: "Gain a high reward.",
  event_SLUG_DRINK_c1_choice: "1 in 2: repair 10 hull and open a store. 1 in 2: lose 25-35 scrap.",
  event_SLUG_DRINK_c2_text: "Fight the Slug ship.",
  event_SLUG_DRINK_c3_choice: "1 in 2: repair 10 hull and open a store. 1 in 2: fight the Slug ship.",
  event_NEBULA_ROCK_RACIST_c3_choice: "Gain a high reward.",
  event_BROKEN_REBEL_DRONE_c1_choice:
    "1 in 2: gain a low reward and the sector map. 1 in 2: fight the automated ship.",
  event_BROKEN_REBEL_DRONE_c3_choice:
    "1 in 2: gain a low reward and the sector map. 1 in 2: choose whether to risk the download.",
  event_STORM_AUTO_c2_choice: "1 in 2: escape. 1 in 2: fight the automated ship.",
  event_STORM_AUTO_c3_choice: "Escape. No fight.",
  event_STORM_AUTO_c4_choice: "Escape. No fight.",

  // Pirate smuggler (NEBULA_PIRATE_SMUGGLE).
  event_NEBULA_PIRATE_SMUGGLE_text: "Pirate ship. It is not hostile.",
  event_NEBULA_PIRATE_SMUGGLE_c1_text: "Fight the pirate ship.",
  event_NEBULA_PIRATE_SMUGGLE_c3_choice: "Choose: take a medium reward with fuel, or fight the pirate ship.",

  // Rock atheists (ROCK_ATHIEST).
  event_ROCK_ATHIEST_text: "Rock ship. Its crew can join you.",
  event_ROCK_ATHIEST_c1_choice: "Fight the Rock ship.",
  event_ROCK_ATHIEST_c2_choice: "1 in 3: gain 1 Rock crew. 2 in 3: nothing.",
  event_ROCK_ATHIEST_c3_choice: "Gain 1 Rock crew.",

  // Pirate ship selling drones (PIRATE_SALESMAN).
  event_PIRATE_SALESMAN_c1_choice: "Contact the ship: dock to trade, or leave and fight.",
  event_PIRATE_SALESMAN_c2_choice: "Fight the pirate ship.",
  event_PIRATE_SALESMAN_c3_choice: "Nothing happens.",

  // Rebel checkpoint (REBEL_CHECKPOINT). The button shows the bribe.
  event_REBEL_CHECKPOINT_c1_choice: "Fight the Rebel ship.",
  event_REBEL_CHECKPOINT_c2_choice:
    "Pay the bribe. Then 1 in 4 each: nothing, low scrap, a low reward, fight a Rebel ship.",

  // Space station under construction (QUEST_CONSTRUCTIONYARD).
  event_QUEST_CONSTRUCTIONYARD_c3_choice:
    "Choose: give up 1 Lanius crew for a high reward with an augment, or keep it for medium scrap.",

  // Sell missiles and sell drone parts. The scrap line follows.
  event_SELL_MISSILES_STATION_c1_text: "Missiles sold.",
  event_SELL_DRONES_STATION_c1_text: "Drone parts sold.",

  // Crystalline ship messaging about Rebels (CRYSTAL_REQUEST).
  event_CRYSTAL_REQUEST_c1_c1_text: "Gain high scrap. Rebel pursuit speeds up.",
  event_CRYSTAL_REQUEST_LIST_1_text: "The false plans work. Gain high scrap. Rebel pursuit slows.",
  event_CRYSTAL_REQUEST_LIST_2_text: "The false plans fail. Fight the Crystal ship, with 1-2 Crystal boarders.",
  event_CRYSTAL_REQUEST_c1_c3_text: "Gain high scrap. Rebel pursuit slows.",
  event_CRYSTAL_REQUEST_c1_c4_text: "You refuse. Nothing happens.",

  // Fights that open with one line.
  event_REBEL_TRANSPORT_c1_text: "Fight the Rebel ship.",
  event_LANIUS_AUTO_REBEL_c1_text: "Fight the Lanius ship.",
  event_CRYSTAL_MANTIS_CRYSTAL_c1_text: "Fight the Mantis ship.",
  event_ROCK_MANTIS_HUNTER_c1_text: "Fight the Mantis ship.",
  event_LANIUS_SCARED_CIVILIAN_c1_text: "Fight the Lanius ship.",
  event_CRYSTAL_REBEL_CRYSTAL2_c1_text: "Fight the Crystal ship.",
  event_LANIUS_DORMANT_EVENT_c1_text: "Fight the Lanius ship.",
  event_CRYSTAL_PIRATE_CRYSTAL_c1_text: "Fight the pirate ship.",
  event_PIRATE_STATION_CROPS_c1_text: "Fight the pirate ship.",
  event_LANIUS_FUELING_STATION_c1_text: "Fight the Lanius ship.",
  event_ZOLTAN_QUEST_PRIMITIVES_c1_c1_text: "Fight the Zoltan ship.",
  event_ZOLTAN_QUEST_PRIMITIVES_c1_c2_text: "Fight the Rebel ship.",
  event_CRYSTAL_REBEL_CRYSTAL_c1_text: "Fight the Rebel ship.",
  event_CRYSTAL_REBEL_CRYSTAL_c2_text: "Fight the Crystal ship.",
  event_AUTO_HACKER_c2_text: "Hacking blocks the shield virus. Fight the automated ship.",
  event_FLAGSHIP_CONSTRUCTION_c1_text: "Fight the second Rebel flagship.",

  // One-line results.
  event_PIRATE_CHOICE_c1_text: "Toll paid. No fight.",
  event_MERCENARY_c1_text: "Mercenary hired.",
  event_CRYSTAL_FED_DESERTER_c1_text: "Supplies given. The sector map is revealed.",
  event_PIRATE_STATION_CROPS_c3_text: "Gain a drone and high scrap.",
  event_PIRATE_STATION_CROPS_c4_text: "Lose 1 missile. Gain a drone and high scrap.",
  event_FUEL_OFF_ENGI_DUBIOUS_c3_text: "Lose 1 drone part. Gain 4-6 fuel.",
};
