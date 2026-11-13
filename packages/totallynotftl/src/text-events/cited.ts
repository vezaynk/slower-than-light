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
  event_LANIUS_TRADER_c1_choice:
    "1 in 3 each: lose 3-7 fuel, gain 15-30 scrap; lose 3-7 missiles, gain 20-40 scrap; lose 3-7 drone parts, gain 20-40 scrap.",
  event_LANIUS_TRADER_c2_choice: "Nothing happens.",
  event_LANIUS_TRADER_c3_choice:
    "Get a second offer: 3-7 fuel, missiles, or drone parts for 20-50 scrap.",
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
  event_SLUG_DRINK_c3_choice:
    "1 in 2: repair 10 hull and open a store. 1 in 2: fight the Slug ship.",
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
  event_NEBULA_PIRATE_SMUGGLE_c3_choice:
    "Choose: take a medium reward with fuel, or fight the pirate ship.",

  // Rock atheists (ROCK_ATHIEST).
  event_ROCK_ATHIEST_text: "Neutral Rock ship. It may join your crew.",
  event_ROCK_ATHIEST_c1_choice: "Fight the Rock ship.",
  event_ROCK_ATHIEST_c2_choice: "1 in 3: gain 1 Rock crew. 2 in 3: nothing happens.",
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
  event_CRYSTAL_REQUEST_LIST_2_text:
    "The false plans fail. Fight the Crystal ship, with 1-2 Crystal boarders.",
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
  event_FLAGSHIP_CONSTRUCTION_c1_text: "Fight the second Rebel flagship.",

  // One-line results.
  event_PIRATE_CHOICE_c1_text: "Toll paid. No fight.",
  event_MERCENARY_c1_text: "Mercenary hired.",
  event_CRYSTAL_FED_DESERTER_c1_text: "Supplies given. The sector map is revealed.",
  event_PIRATE_STATION_CROPS_c3_text: "Gain a drone and high scrap.",
  event_PIRATE_STATION_CROPS_c4_text: "Lose 1 missile. Gain a drone and high scrap.",
  event_FUEL_OFF_ENGI_DUBIOUS_c3_text: "Lose 1 drone part. Gain 4-6 fuel.",
  // Ancient device (ROCK_CRYSTAL_BEACON) and the hidden Crystal sector.
  event_ROCK_CRYSTAL_BEACON_LIST_1_text: "Gain high scrap.",
  event_ROCK_CRYSTAL_BEACON_LIST_2_text: "Fight the Rock ship.",
  event_ROCK_CRYSTAL_BEACON_c2_text: "Nothing happens.",
  event_ROCK_CRYSTAL_BEACON_c3_text: "Your Crystal crew activates the device.",
  event_ROCK_CRYSTAL_BEACON_c3_c1_text: "Jump to the hidden Crystal sector.",
  event_START_BEACON_CRYSTAL_text: "Hidden Crystal sector.",
  event_START_BEACON_CRYSTAL_c1_text: "A quest marker is added to the map.",
  event_CRYSTAL_UNLOCK_text: "Quest beacon: Crystal Cruiser unlocked.",

  // Rock war vessel encounter (ROCK_UNLOCK).
  event_ROCK_UNLOCK1_c3_text: "Nothing happens.",
  ship_ROCK_UNLOCK2_escape_text:
    "The Rock ship jumps away when its timer ends. Stay in the fight until then.",
  ship_ROCK_UNLOCK2_destroyed_text: "Ship destroyed.",
  ship_ROCK_UNLOCK2_deadCrew_text: "Crew killed.",
  ship_ROCK_UNLOCK2_gotaway_text: "The Rock ship escaped. A quest marker is added to the map.",
  event_ROCK_UNLOCK3_text: "Quest beacon: Rock shipyard.",
  event_ROCK_UNLOCK3_c1_text: "Rock Cruiser unlocked.",
  event_ROCK_UNLOCK3_c1_c1_text: "Gain Rock Plating. Repair 29 hull.",

  // Unarmed Zoltan transport (ZOLTAN_PEACE_QUEST).
  event_ZOLTAN_PEACE_QUEST_ATTACK_1_text: "Fight the Zoltan ship. It has no weapons or shields.",
  event_ZOLTAN_PEACE_QUEST_ATTACK_2_text: "Fight a Zoltan defense ship.",
  ship_ZOLTAN_PEACE_QUEST_ATTACK1_surrender_text: "The ship offers no resistance.",
  ship_ZOLTAN_PEACE_QUEST_ATTACK1_surrender_c1_choice: "Keep fighting.",
  ship_ZOLTAN_PEACE_QUEST_ATTACK1_surrender_c1_text: "The fight continues.",
  ship_ZOLTAN_PEACE_QUEST_ATTACK1_surrender_c2_choice: "End the fight. No reward.",
  ship_ZOLTAN_PEACE_QUEST_ATTACK1_surrender_c2_text: "The ship leaves. Nothing happens.",
  ship_ZOLTAN_PEACE_QUEST_ATTACK1_destroyed_text: "Ship destroyed.",
  ship_ZOLTAN_PEACE_QUEST_ATTACK1_deadCrew_text: "Crew killed.",
  ship_ZOLTAN_PEACE_QUEST_ATTACK2_destroyed_text: "Ship defeated. The transport has left.",
  event_ZOLTAN_PEACE_QUEST_c3_text: "Nothing happens.",
  event_ZOLTAN_PEACE_QUEST2_c1_text: "Fight the Rebel ship.",
  event_ZOLTAN_PEACE_QUEST2_c2_text: "Rebel ship. Pick a reply.",
  event_ZOLTAN_PEACE_QUEST2_c2_c1_choice: "Choose a second reply.",
  event_ZOLTAN_PEACE_QUEST2_c2_c2_choice: "Fight the Rebel ship.",
  event_ZOLTAN_PEACE_QUEST2_c2_c3_choice: "Fight the Rebel ship.",
  event_ZOLTAN_PEACE_QUEST2_c2_c1_text: "Rebel ship. Pick a second reply.",
  event_ZOLTAN_PEACE_QUEST2_c2_c1_c1_choice: "Fight the Rebel ship.",
  event_ZOLTAN_PEACE_QUEST2_c2_c1_c2_choice:
    "Unlock the Zoltan Cruiser. 1 in 2: gain Zoltan Shield and low scrap. 1 in 2: gain a Zoltan crew with every skill maxed, and high scrap with resources.",
  event_ZOLTAN_PEACE_QUEST2_c2_c1_c1_text: "Fight the Rebel ship.",
  event_ZOLTAN_PEACE_QUEST2_c2_c2_text: "Fight the Rebel ship.",
  event_ZOLTAN_PEACE_QUEST2_c2_c3_text: "Fight the Rebel ship.",
  event_ZOLTAN_PEACE_QUEST2_c2_c1_c2_text:
    "The Rebel ship was a Zoltan test. Zoltan Cruiser unlocked.",
  event_ZOLTAN_PEACE_QUEST_REWARD_1_text: "Gain Zoltan Shield and low scrap.",
  event_ZOLTAN_PEACE_QUEST_REWARD_2_text:
    "Gain a Zoltan crew with every skill maxed, and high scrap with resources.",

  // Zoltan research facility (ZOLTAN_CREW_STUDY).
  event_ZOLTAN_CREW_STUDY_LIST_1_text: "Gain low scrap.",
  event_ZOLTAN_CREW_STUDY_LIST_3_text: "2 boarders. Fight the pirate ship.",
  event_ZOLTAN_CREW_STUDY_c2_text: "Nothing happens.",
  event_ZOLTAN_CREW_STUDY_c3_text: "Gain a drone, and low scrap with resources.",
  event_ZOLTAN_CREW_STUDY_c4_text: "The stasis pod is used.",
  event_ZOLTAN_CREW_STUDY_c4_c1_text: "Gain 1 Crystal crew.",
  event_ZOLTAN_CREW_STUDY_c4_c1_c1_text:
    "A quest marker appears in the Rock sector while this crew lives.",
  ship_PIRATE_ZOLTAN_CREW_STUDY_destroyed_text: "Ship destroyed.",
  ship_PIRATE_ZOLTAN_CREW_STUDY_deadCrew_text: "Crew killed.",
  ship_PIRATE_ZOLTAN_CREW_STUDY_destroyed_c1_text: "Gain a drone, and low scrap with resources.",

  // Zoltan trade hub (ZOLTAN_TRADE_HUB) and Zoltan quest primitives.
  event_ZOLTAN_TRADE_HUB_TALK_1_text: "2-4 Zoltan boarders. Fight the Zoltan ship.",
  event_ZOLTAN_TRADE_HUB_TALK_2_text: "You enter the hub.",
  event_ZOLTAN_TRADE_HUB_c2_text: "You enter the hub.",
  event_ZOLTAN_TRADE_HUB_c3_text: "Fee paid. You enter the hub.",
  event_ZOLTAN_TRADE_HUB_c4_text: "Nothing happens.",
  event_ZOLTAN_TRADE_HUB_SUCCESS_1_text: "Store.",
  event_ZOLTAN_TRADE_HUB_SUCCESS_2_text: "No store.",
  event_ZOLTAN_TRADE_HUB_SUCCESS_2_c1_text: "A quest marker is added to the map.",
  ship_ZOLTAN_PRIMITIVES_ZOLTAN_destroyed_text: "Zoltan ship defeated. The Rebel ship leaves.",
  ship_ZOLTAN_PRIMITIVES_REBEL_destroyed_text: "Rebel ship defeated. Gain a weapon.",

  // Rock bride (ROCK_QUEST_MARRIAGE).
  event_ROCK_QUEST_MARRIAGE_START_c2_text: "Nothing happens.",
  event_ROCK_QUEST_MARRIAGE_c1_c1_text: "Gain an augment and low scrap.",
  event_ROCK_QUEST_MARRIAGE_c1_c2_text: "Gain 1 Rock crew. Fight the Rock ship.",
  ship_ROCK_QUEST_MARRIAGE_destroyed_text: "Ship defeated.",
  // Asteroid belt distress (CIVILIAN_ASTEROIDS_BEACON).
  event_CIVILIAN_ASTEROIDS_BEACON_2_text:
    "Civilian ship in an asteroid field. Its shields are down.",
  event_CIVILIAN_ASTEROIDS_BEACON_2_c1_choice:
    "1 in 3: take 1 hull damage and a fire, gain high fuel and scrap. 1 in 3: take 4 hull damage, gain low scrap. 1 in 3: gain low scrap.",
  event_CIVILIAN_ASTEROIDS_BEACON_2_c2_choice: "1 in 2: Rebel pursuit speeds up. 1 in 2: nothing.",
  event_CIVILIAN_ASTEROIDS_BEACON_2_c3_choice:
    "Lose drone parts. 1 in 2: take 4 hull damage and system damage, gain a weapon and medium scrap. 1 in 2: a quest marker is added to the map.",
  event_CIVILIAN_ASTEROIDS_BEACON_2_c4_choice:
    "Lose drone parts. 1 in 2: take 4 hull damage and system damage, gain a weapon and medium scrap. 1 in 2: a quest marker is added to the map.",
  event_CIVILIAN_ASTEROIDS_BEACON_2_c5_choice:
    "1 in 2: gain 1 crew. 1 in 2: choose to take them home for a reward.",
  event_CIVILIAN_ASTEROIDS_BEACON_2_c6_choice: "Gain medium fuel and scrap.",
  event_CIVILIAN_ASTEROIDS_BEACON_2_c6_text: "Gain medium fuel and scrap.",
  event_CIVILIAN_ASTEROIDS_BEACON_LIST1_1_text:
    "Take 1 hull damage and a fire. Gain high fuel and scrap.",
  event_CIVILIAN_ASTEROIDS_BEACON_LIST1_2_text: "The civilian ship is lost. Gain low scrap.",
  event_CIVILIAN_ASTEROIDS_BEACON_LIST1_3_text:
    "The civilian ship is lost. Take 4 hull damage. Gain low scrap.",
  event_CIVILIAN_ASTEROIDS_BEACON_LIST2_1_text:
    "Take 4 hull damage and system damage. Gain a weapon and medium scrap.",
  event_CIVILIAN_ASTEROIDS_BEACON_LIST2_2_text: "A quest marker is added to the map.",
  event_CIVILIAN_ASTEROIDS_BEACON_LIST3_1_text: "Gain 1 crew.",
  event_CIVILIAN_ASTEROIDS_BEACON_LIST3_2_text: "The crew are aboard and ask to go home.",
  event_CIVILIAN_ASTEROIDS_BEACON_LIST3_2_c1_choice:
    "1 in 3: gain high scrap. 1 in 3: gain medium scrap. 1 in 3: repair 10 hull.",
  event_CIVILIAN_ASTEROIDS_BEACON_LIST4_1_text:
    "The civilian ship survives. Rebel pursuit speeds up.",
  event_CIVILIAN_ASTEROIDS_BEACON_LIST4_2_text: "The civilian ship is lost. Nothing happens.",
  event_FAMILY_RETURN_1_text: "Gain high scrap.",
  event_FAMILY_RETURN_2_text: "Gain medium scrap.",
  event_FAMILY_RETURN_3_text: "Repair 10 hull.",

  // Capture the ship (QUEST_CREWDEAD).
  event_QUEST_CREWDEAD_START_2_c1_text: "Nothing happens.",
  event_QUEST_CREWDEAD_START_2_c2_text: "Nothing happens.",
  event_QUEST_CREWDEAD_CONTINUE_text:
    "Quest offer: kill the crew of a pirate ship. Destroying the ship damages yours.",
  event_QUEST_CREWDEAD_CONTINUE_c1_choice: "A quest marker is added to the map.",
  event_QUEST_CREWDEAD_CONTINUE_c2_choice: "Nothing happens.",
  event_QUEST_CREWDEAD_CONTINUE_c2_text: "Nothing happens.",
  ship_PIRATE_QUEST_CREWDEAD_deadCrew_text: "Crew killed. Gain a weapon and high scrap.",
  ship_PIRATE_QUEST_CREWDEAD_destroyed_text:
    "Ship destroyed. Take 15 hull damage, 1 system damage, and a fire and breach in one room.",

  // Encrypted federation signal (FEDERATION_PLANET_SIGNAL).
  event_FEDERATION_PLANET_SIGNAL_LIST_1_text: "A quest marker is added to the map.",
  event_FEDERATION_PLANET_SIGNAL_LIST_2_text:
    "Gain medium resources. A quest marker is added to the map.",
  event_FEDERATION_PLANET_SIGNAL_LIST_3_text: "Nothing happens.",
  event_FEDERATION_PLANET_SIGNAL_LIST_4_text: "Gain high scrap with resources.",
  event_FEDERATION_PLANET_SIGNAL_LIST_5_text: "2-3 boarders. Fight the Rebel ship.",

  // Engi ship attacked by Mantis ship (ENGI_STATION_DISTRESS, SAVE_ENGI_STATION).
  event_ENGI_STATION_DISTRESS_LIST_1_text: "1-2 Mantis boarders. Fight the Engi ship.",
  event_ENGI_STATION_DISTRESS_LIST_2_text: "Fight the Mantis ship.",
  ship_MANTIS_ENGI_STATION_destroyed_text: "Ship destroyed.",
  ship_MANTIS_ENGI_STATION_deadCrew_text: "Crew killed.",
  ship_MANTIS_ENGI_STATION_destroyed_c1_choice:
    "1 in 4 each: gain 1 Engi crew and low scrap, gain fuel, nothing, choose a reward.",
  event_SAVE_ENGI_STATION_1_text: "Nothing happens.",
  event_SAVE_ENGI_STATION_2_text: "Gain medium fuel.",
  event_SAVE_ENGI_STATION_3_text: "Choose a reward.",
  event_SAVE_ENGI_STATION_3_c1_choice: "Gain high fuel and scrap.",
  event_SAVE_ENGI_STATION_3_c2_choice: "Gain a weapon and low scrap.",
  event_SAVE_ENGI_STATION_3_c3_choice: "Gain a drone and low scrap.",
  event_SAVE_ENGI_STATION_3_c4_choice:
    "Gain a weapon and low scrap. Repair 10 hull. A quest marker is added to the map.",
  event_SAVE_ENGI_STATION_3_c1_text: "Fuel received.",
  event_SAVE_ENGI_STATION_3_c2_text: "Weapon received.",
  event_SAVE_ENGI_STATION_3_c3_text: "Drone received.",
  event_SAVE_ENGI_STATION_3_c4_text: "Weapon received. A quest marker is added to the map.",
  event_SAVE_ENGI_STATION_4_text: "Gain 1 Engi crew.",

  // Merchant's request (MERCHANT_REQUEST, MERCHANT_DELIVER, MERCHANT_INVESTIGATE).
  event_MERCHANT_REQUEST_LIST_1_text: "Quest offer: carry 5 drone parts to a station for pay.",
  event_MERCHANT_REQUEST_LIST_1_c1_choice: "Accept the quest.",
  event_MERCHANT_REQUEST_LIST_1_c2_choice: "Nothing happens.",
  event_MERCHANT_REQUEST_LIST_1_c1_text: "Gain 5 drone parts. A quest marker is added to the map.",
  event_MERCHANT_REQUEST_LIST_1_c2_text: "Nothing happens.",
  event_MERCHANT_REQUEST_LIST_2_text: "Quest offer: find a missing freighter.",
  event_MERCHANT_REQUEST_LIST_2_c2_text: "Nothing happens.",
  event_MERCHANT_DELIVER_text: "Quest beacon: deliver the drone parts.",
  event_MERCHANT_DELIVER_LIST_1_text: "Station with no response.",
  event_MERCHANT_DELIVER_LIST_1_c1_choice:
    "1 in 3: gain 1 drone part and medium scrap. 1 in 3: gain 1 crew, then a fight. 1 in 3: a crew is infected, then a fight.",
  event_MERCHANT_DELIVER_LIST_1_c2_choice: "Nothing happens.",
  event_MERCHANT_DELIVER_LIST_1_c3_choice:
    "Lose 1 drone part. 2 in 3: nothing. 1 in 3: gain medium scrap with resources.",
  event_MERCHANT_DELIVER_LIST_2_text: "The station offers less than the agreed pay.",
  event_MERCHANT_DELIVER_LIST_2_c1_choice: "Lose 5 drone parts. Gain 20-30 scrap.",
  event_MERCHANT_DELIVER_LIST_2_c1_text: "Drone parts delivered.",
  event_MERCHANT_DELIVER_LIST_2_c2_choice: "1 in 2: get the full-pay offer. 1 in 2: nothing.",
  event_MERCHANT_DELIVER_LIST_2_c3_choice: "Get the full-pay offer.",
  event_MERCHANT_DELIVER_LIST_2_c3_text: "Full-pay offer.",
  event_MERCHANT_DELIVER_LIST_2_c4_choice: "Lose 5 drone parts. Gain full pay and fuel.",
  event_MERCHANT_DELIVER_LIST_2_c4_text: "Drone parts delivered.",
  event_MERCHANT_DELIVER_BLUFF_LIST_1_text: "Full-pay offer.",
  event_MERCHANT_DELIVER_BLUFF_LIST_1_c1_choice: "Lose 5 drone parts. Gain the full pay.",
  event_MERCHANT_DELIVER_BLUFF_LIST_1_c2_choice: "Nothing happens.",
  event_MERCHANT_DELIVER_BLUFF_LIST_2_text: "No offer. Nothing happens.",
  event_MERCHANT_INVESTIGATE_text: "Quest beacon: the missing freighter.",
  event_MERCHANT_INVESTIGATE_LIST_1_text: "Wreck with cargo. Gain medium scrap with resources.",
  event_MERCHANT_INVESTIGATE_LIST_1_c1_choice: "A quest marker is added to the map.",
  event_MERCHANT_INVESTIGATE_LIST_1_c2_choice:
    "1 in 3: a quest marker is added to the map. 1 in 3: gain a weapon. 1 in 3: gain high scrap with resources.",
  event_MERCHANT_INVESTIGATE_LIST_2_text: "Damaged freighter with cargo and crew.",
  event_MERCHANT_INVESTIGATE_LIST_2_c1_choice: "Gain 1 crew. A quest marker is added to the map.",
  event_MERCHANT_INVESTIGATE_LIST_2_c1_text: "Gain 1 crew. A quest marker is added to the map.",
  event_MERCHANT_INVESTIGATE_LIST_2_c2_choice:
    "1 in 3: a quest marker is added to the map. 1 in 3: gain a weapon. 1 in 3: gain high scrap with resources.",
  event_MERCHANT_INVESTIGATE_LIST_2_c3_choice:
    "1 in 3: a quest marker is added to the map. 1 in 3: gain a weapon. 1 in 3: gain high scrap with resources.",
  event_MERCHANT_INVESTIGATE_LIST_3_text: "Pirate ship. Fight it.",
  event_MERCHANT_INVESTIGATE_CARGO_LIST_1_text: "A quest marker is added to the map.",
  event_MERCHANT_INVESTIGATE_CARGO_LIST_2_text: "Gain a weapon.",
  event_MERCHANT_INVESTIGATE_CARGO_LIST_3_text: "Gain high scrap with resources.",
  event_MERCHANT_INVESTIGATE_DELIVER_text: "Cargo delivered. Gain a drone and medium scrap.",
  ship_JELLY_PIRATE_MERCHANT_destroyed_text: "Ship defeated. Gain medium scrap with resources.",

  // Research station with no response (STATION_SICK).
  event_STATION_SICK_LIST_1_text: "Gain 1 drone part and medium scrap.",
  event_STATION_SICK_LIST_2_text: "Gain 1 crew. Hostile boarders are coming.",
  event_STATION_SICK_LIST_2_c1_choice: "3-4 boarders.",
  event_STATION_SICK_LIST_2_c2_choice: "Gain 1 crew with repair skill, and medium scrap.",
  event_STATION_SICK_LIST_2_c2_text: "Gain 1 crew.",
  event_STATION_SICK_LIST_3_text: "One of your crew is infected.",
  event_STATION_SICK_LIST_3_c1_choice: "1 crew turns hostile. 3-4 boarders.",
  event_STATION_SICK_LIST_3_c1_text: "1 crew turns hostile. 3-4 boarders.",
  event_STATION_SICK_LIST_3_c2_choice: "1 crew turns hostile.",
  event_STATION_SICK_LIST_3_c2_text: "1 crew turns hostile.",
  event_STATION_SICK_LIST_3_c3_choice: "3-4 boarders.",
  event_STATION_SICK_LIST_3_c3_text: "3-4 boarders.",
  event_STATION_SICK_LIST_3_c4_choice: "Gain 1 crew.",
  event_STATION_SICK_LIST_3_c4_text: "Gain 1 crew.",
  event_STATION_SICK_DRONE_LIST_1_text: "The drone finds nothing.",
  event_STATION_SICK_DRONE_LIST_2_text: "The drone is destroyed.",
  event_STATION_SICK_DRONE_LIST_3_text: "Gain medium scrap with resources.",
  event_STATION_SICK_SCANNER_1_text: "Scan: hostile survivors.",
  event_STATION_SICK_SCANNER_2_text: "Gain medium scrap with resources.",

  // Nebula wreckage (NEBULA_BATTLEFIELD) and its quest (SECRET_WORD_ABADOTH).
  event_NEBULA_BATTLEFIELD_c1_text: "A survivor is in the wreckage.",
  event_NEBULA_BATTLEFIELD_c1_c1_choice: "Bring the survivor aboard.",
  event_NEBULA_BATTLEFIELD_c1_c2_choice: "Nothing happens.",
  event_BATTLEFIELD_INVESTIGAGE_1_text: "Take 5 hull damage and a fire.",
  event_BATTLEFIELD_INVESTIGAGE_2_text: "Nothing happens.",
  event_BATTLEFIELD_INVESTIGAGE_5_text: "A survivor is in the wreckage.",
  event_BATTLEFIELD_SURVIVOR_text: "The survivor is dying.",
  event_BATTLEFIELD_SURVIVOR_c1_choice: "A quest marker is added to the map.",
  event_BATTLEFIELD_SURVIVOR_c2_choice: "Gain 1 crew.",
  event_BATTLEFIELD_SURVIVOR_c2_text: "Gain 1 crew.",
  event_BATTLEFIELD_SURVIVOR_c3_choice: "Gain 1 crew.",
  event_BATTLEFIELD_SURVIVOR_c3_text: "Gain 1 crew.",
  event_SECRET_WORD_ABADOTH_text: "Quest beacon. Nothing is visible.",
  event_SECRET_WORD_ABADOTH_c1_choice: "Find a Zoltan ship.",
  event_SECRET_WORD_ABADOTH_c2_choice: "Rebel pursuit speeds up. Find a Zoltan ship.",
  event_SECRET_WORD_ABADOTH_c2_text: "Scan complete.",
  event_SECRET_WORD_ABADOTH_CONCLUSION_text: "Zoltan ship. Give the password.",
  event_SECRET_WORD_ABADOTH_CONCLUSION_c1_choice: "Fight the Zoltan ship.",
  event_SECRET_WORD_ABADOTH_CONCLUSION_c1_text: "Wrong password. Fight the Zoltan ship.",
  event_SECRET_WORD_ABADOTH_CONCLUSION_c2_choice: "Gain medium scrap with resources.",
  event_SECRET_WORD_ABADOTH_CONCLUSION_c2_text: "Right password. Gain medium scrap with resources.",
  event_SECRET_WORD_ABADOTH_CONCLUSION_c3_choice: "Fight the Zoltan ship.",
  event_SECRET_WORD_ABADOTH_CONCLUSION_c4_choice: "Gain medium scrap with resources.",
  event_SECRET_WORD_ABADOTH_CONCLUSION_c4_text: "Right password. Gain medium scrap with resources.",
  event_SECRET_WORD_ABADOTH_CONCLUSION_c5_choice: "Fight the Zoltan ship.",
  // Crystal fight surrender (CRYSTAL_SHIP_SURRENDER).
  event_CRYSTAL_SHIP_SURRENDER_1_text: "The Crystal ship leaves. Nothing happens.",
  event_CRYSTAL_SHIP_SURRENDER_2_text: "The Crystal ship leaves. Nothing happens.",
  event_CRYSTAL_SHIP_SURRENDER_3_text: "The Crystal ship surrenders its cargo.",
  event_CRYSTAL_SHIP_SURRENDER_5_text: "The Crystal ship surrenders its cargo.",
  event_CRYSTAL_SHIP_SURRENDER_6_text: "The Crystal ship surrenders its cargo.",
  event_CRYSTAL_SHIP_SURRENDER_7_text: "Offer: 1 Crystal crew joins you.",
  event_CRYSTAL_SHIP_SURRENDER_7_c1_choice: "Gain 1 Crystal crew.",
  event_CRYSTAL_SHIP_SURRENDER_7_c1_text: "Crystal crew accepted.",
  event_CRYSTAL_SHIP_SURRENDER_7_c2_choice: "Gain random resources with some scrap.",
  event_CRYSTAL_SHIP_SURRENDER_7_c2_text: "Crew refused.",
  ship_CRYSTAL_SHIP_surrender_c2_text: "Surrender refused. The fight continues.",
  ship_CRYSTAL_CONVOY_surrender_c2_text: "Surrender refused. The fight continues.",
  ship_CRYSTAL_HUNTER_surrender_c1_text: "Gain 1 Human crew. The fight continues.",
  ship_CRYSTAL_HUNTER_surrender_c2_text: "Surrender refused. The fight continues.",

  // Destroyed cargo ship (FLOATING_CARGO).
  event_FLOATING_CARGO_LIST_1_text: "Gain medium scrap with resources.",
  event_FLOATING_CARGO_LIST_2_text: "Gain low scrap.",
  event_FLOATING_CARGO_LIST_3_text: "Boarders in the cargo.",
  event_FLOATING_CARGO_LIST_4_text: "2-4 boarders. Fight the pirate ship.",
  event_FLOATING_CARGO_SCAN_LIST_1_text: "Gain scrap.",
  event_FLOATING_CARGO_SCAN_LIST_2_text: "Gain medium scrap with resources.",
  event_FLOATING_CARGO_SCAN_LIST_3_text: "Scan: the cargo holds boarders.",
  event_FLOATING_CARGO_SCAN_LIST_3_c1_choice: "Fight the pirate ship.",
  event_FLOATING_CARGO_SCAN_LIST_3_c1_text: "Fight the pirate ship.",
  event_FLOATING_CARGO_SCAN_LIST_3_c2_choice: "Nothing happens.",

  // Engi surrender (ENGI_SURRENDER).
  event_ENGI_SURRENDER_LIST_1_text: "The Engi ship leaves. Nothing happens.",
  event_ENGI_SURRENDER_LIST_2_text: "Gain random scrap with resources.",
  event_ENGI_SURRENDER_c2_text: "Gain random scrap with resources.",

  // Settlement mercenary work (MERCENARY_WORK).
  event_MERCENARY_WORK_LIST_1_text: "Quest offer: defend a store from Rebels for fuel and scrap.",
  event_MERCENARY_WORK_LIST_1_c1_choice: "A quest marker is added to the map.",
  event_MERCENARY_WORK_LIST_1_c1_text: "Quest accepted.",
  event_MERCENARY_WORK_LIST_1_c2_choice: "Nothing happens.",
  event_MERCENARY_WORK_LIST_1_c2_text: "Nothing happens.",
  event_MERCENARY_WORK_LIST_2_text:
    "Job offer: fight a pirate ship. Paid only if its crew survives.",
  event_MERCENARY_WORK_LIST_2_c1_choice: "Fight the pirate ship.",
  event_MERCENARY_WORK_LIST_2_c1_text: "Fight the pirate ship.",
  event_MERCENARY_WORK_LIST_2_c2_text: "Nothing happens.",

  // The Black Raven (DONOR_BLACK_RAVEN).
  event_DONOR_BLACK_RAVEN_c1_text: "Pirate ship. It challenges you to fight.",
  event_DONOR_BLACK_RAVEN_c1_c1_choice: "Fight the pirate ship.",
  event_DONOR_BLACK_RAVEN_c1_c2_choice: "Fight the pirate ship.",
  event_DONOR_BLACK_RAVEN_c1_c2_text: "Fight the pirate ship.",
  event_DONOR_BLACK_RAVEN_c1_c3_choice:
    "1 in 2: 1-2 Slug boarders, then fight the pirate ship. 1 in 2: gain a weapon and high scrap.",
  event_DONOR_BLACK_RAVEN_SLUG_1_text: "Duel lost. 1-2 Slug boarders. Fight the pirate ship.",
  event_DONOR_BLACK_RAVEN_SLUG_2_text: "Duel won.",
  event_DONOR_BLACK_RAVEN_SLUG_2_c1_text: "Gain a weapon and high scrap.",
  ship_DONOR_BLACK_RAVEN_surrender_c2_text: "Surrender refused. The fight continues.",

  // Zoltan ship asks to dock (ZOLTAN_SCIENCE_DOCK).
  event_ZOLTAN_SCIENCE_DOCK_LIST_1_text: "Fight the Zoltan ship.",
  event_ZOLTAN_SCIENCE_DOCK_LIST_2_text: "Gain medium resources with some scrap.",
};
