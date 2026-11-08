/**
 * Store rarity of each weapon, augment, and drone blueprint, written as `<rarity>`.
 * FTL GetRandomWeapon, GetRandomDrone, and GetRandomAugment skip rarity 0 and weigh the rest by 6 - rarity
 * (apps/game/src/game/archive-pay.ts weightedBlueprint).
 * Sources: the Rarity column of Template:Laser / Beam / Bomb / Crystal / Flak / Ion / Missile weapons, and the
 * "Store rarity" bullets on Augmentations and Drone Control. A weapon a page prints no rarity for is a
 * starting, enemy-only, or boss arm and is 0.
 * Crystal arms print rarities with the tooltip "only in Hidden Crystal Worlds". That is the sector's stock, not a
 * draw anywhere, so the blueprint keeps 0.
 */
export const STORE_RARITY: Readonly<Record<string, number>> = {
  // Weapons.
  // Template:Laser weapons, "Burst Laser Mark II".
  LASER_BURST_3: 4,
  // Template:Laser weapons, "Basic Laser".
  LASER_BURST_1: 0,
  // Template:Laser weapons, "Dual Lasers".
  LASER_BURST_2: 0,
  // Template:Laser weapons, "Heavy Laser Mark I".
  LASER_HEAVY_1: 2,
  // INVENTED weapon. It is not on Template:Purchasable weapons, so no draw picks it.
  dart: 0,
  // Template:Ion weapons, "Ion Blast".
  ION_1: 3,
  // Template:Missile weapons, "Artemis Missiles".
  MISSILES_2_PLAYER: 0,
  // Template:Missile weapons, "Leto Missiles".
  MISSILES_1: 0,
  // Template:Ion weapons, "Ion Blast Mark II".
  ION_4: 4,
  // Template:Ion weapons, "Heavy Ion".
  ION_2: 3,
  // Template:Ion weapons, "Ion Stunner".
  ION_STUN: 4,
  // Template:Beam weapons, "Pike Beam".
  BEAM_LONG: 2,
  // Template:Flak weapons, "Flak Gun Mark I".
  SHOTGUN: 1,
  // Template:Bomb weapons, "Fire Bomb".
  BOMB_FIRE: 2,
  // Template:Laser weapons, "Burst Laser Mark I".
  LASER_BURST_2_A: 1,
  // Template:Laser weapons, "Burst Laser Mark III".
  LASER_BURST_5: 4,
  // Template:Laser weapons, "Heavy Pierce Laser Mark I".
  LASER_HEAVY_1_SP: 0,
  // Template:Laser weapons, "Heavy Laser Mark II".
  LASER_HEAVY_2: 4,
  // Template:Laser weapons, "Hull Smasher Laser".
  LASER_HULL_1: 2,
  // Template:Laser weapons, "Hull Smasher Laser Mark II".
  LASER_HULL_2: 3,
  // Template:Laser weapons, "Chain Burst Laser".
  LASER_CHAINGUN: 3,
  // Template:Laser weapons, "Chain Vulcan".
  LASER_CHAINGUN_2: 5,
  // Template:Laser weapons, "Laser Charger (S)".
  LASER_CHARGEGUN_PLAYER: 0,
  // Template:Laser weapons, "Laser Charger".
  LASER_CHARGEGUN: 3,
  // Template:Laser weapons, "Laser Charger Mark II".
  LASER_CHARGEGUN_2: 3,
  // Template:Beam weapons, "Mini Beam".
  BEAM_1: 0,
  // Template:Beam weapons, "Hull Beam".
  BEAM_HULL: 3,
  // Template:Beam weapons, "Halberd Beam".
  BEAM_2: 2,
  // Template:Beam weapons, "Glaive Beam".
  BEAM_3: 5,
  // Template:Beam weapons, "Fire Beam".
  BEAM_FIRE: 3,
  // Template:Beam weapons, "Anti-Bio Beam".
  BEAM_BIO: 5,
  // Template:Ion weapons, "Ion Charger".
  ION_CHARGEGUN: 3,
  // Template:Ion weapons, "Chain Ion".
  ION_CHAINGUN: 4,
  // INFERRED: Flagship artillery, as ARTILLERY_BOSS_2.
  ARTILLERY_BOSS_4: 0,
  // Template:Missile weapons, "Artemis Missiles (enemy)".
  MISSILES_2: 0,
  // Template:Missile weapons, "Hermes Missile".
  MISSILES_3: 2,
  // Template:Missile weapons, "Breach Missiles".
  MISSILES_BREACH: 3,
  // Template:Missile weapons, "Hull Missile".
  MISSILES_HULL: 3,
  // Template:Missile weapons, "Swarm Missiles".
  MISSILE_CHARGEGUN: 4,
  // Template:Missile weapons, "Pegasus Missile".
  MISSILES_BURST: 3,
  // INFERRED: Flagship artillery. Template:Laser weapons "Boss Laser" and Template:Beam weapons "Artillery Beam" print 0.
  ARTILLERY_BOSS_2: 0,
  // Template:Bomb weapons, "Small Bomb".
  BOMB_1: 1,
  // Template:Bomb weapons, "Breach Bomb Mark I".
  BOMB_BREACH_1: 0,
  // Template:Bomb weapons, "Breach Bomb Mark II".
  BOMB_BREACH_2: 4,
  // Template:Bomb weapons, "Ion Bomb".
  BOMB_ION: 3,
  // Template:Bomb weapons, "Stun Bomb".
  BOMB_STUN: 2,
  // Template:Bomb weapons, "Healing Burst".
  BOMB_HEAL: 3,
  // Template:Bomb weapons, "Repair Burst".
  BOMB_HEAL_SYSTEM: 3,
  // Crystal (Weapons): crystal arms are "only in Hidden Crystal Worlds", so no draw picks them.
  BOMB_LOCK: 0,
  // Template:Flak weapons, "Adv. Flak Gun".
  SHOTGUN_PLAYER: 0,
  // Template:Flak weapons, "Flak Gun Mark II".
  SHOTGUN_2: 4,
  // Crystal (Weapons): crystal arms are "only in Hidden Crystal Worlds", so no draw picks them.
  CRYSTAL_BURST_1: 0,
  // Crystal (Weapons): crystal arms are "only in Hidden Crystal Worlds", so no draw picks them.
  CRYSTAL_BURST_2: 0,
  // Crystal (Weapons): crystal arms are "only in Hidden Crystal Worlds", so no draw picks them.
  CRYSTAL_HEAVY_1: 0,
  // Crystal (Weapons): crystal arms are "only in Hidden Crystal Worlds", so no draw picks them.
  CRYSTAL_HEAVY_2: 0,
  // INFERRED: Flagship artillery, as ARTILLERY_BOSS_2.
  "flak-artillery": 0,
  // Template:Laser weapons, "Boss Laser".
  ARTILLERY_BOSS_1: 0,
  // Template:Beam weapons, "Artillery Beam".
  ARTILLERY_BOSS_3: 0,
  // Augments.
  // Augmentations, "Automated Re-loader": Store rarity.
  AUTO_COOLDOWN: 2,
  // Augmentations, "Explosive Replicator": Store rarity.
  EXPLOSIVE_REPLICATOR: 3,
  // Augmentations, "Stealth Weapons": Store rarity.
  CLOAK_FIRE: 3,
  // Augmentations, "Weapon Pre-Igniter": Store rarity.
  WEAPON_PREIGNITE: 4,
  // Augmentations, "Repair Arm": Store rarity.
  REPAIR_ARM: 3,
  // Augmentations, "Reverse Ion Field": Store rarity.
  ION_ARMOR: 2,
  // Augmentations, "Shield Charge Booster": Store rarity.
  SHIELD_RECHARGE: 2,
  // Augmentations, "FTL Recharge Booster": Store rarity.
  FTL_BOOSTER: 2,
  // Augmentations, "Scrap Recovery Arm": Store rarity.
  SCRAP_COLLECTOR: 1,
  // Augmentations, "Rock Plating": prints a sell price and no purchase price or store rarity.
  ROCK_ARMOR: 0,
  // Augmentations, "Titanium System Casing": prints a sell price and no purchase price or store rarity.
  SYSTEM_CASING: 0,
  // Augmentations, "Crystal Vengeance": "Non-Purchasable Augmentations", no purchase price or store rarity.
  CRYSTAL_SHARDS: 0,
  // Augmentations, "Damaged Stasis Pod": "Non-Purchasable Augmentations", no purchase price or store rarity.
  STASIS_POD: 0,
  // Augmentations, "Drone Reactor Booster": "Non-Purchasable Augmentations", no purchase price or store rarity.
  DRONE_SPEED: 0,
  // Augmentations, "Engi Med-bot Dispersal": "Non-Purchasable Augmentations", no purchase price or store rarity.
  NANO_MEDBAY: 0,
  // Augmentations, "Mantis Pheromones": "Non-Purchasable Augmentations", no purchase price or store rarity.
  CREW_STIMS: 0,
  // Augmentations, "Slug Repair Gel": "Non-Purchasable Augmentations", no purchase price or store rarity.
  SLUG_GEL: 0,
  // Augmentations, "Zoltan Shield": "Non-Purchasable Augmentations", no purchase price or store rarity.
  ENERGY_SHIELD: 0,
  // Augmentations, "Battery Charger": Store rarity.
  BATTERY_BOOSTER: 2,
  // Augmentations, "Emergency Respirators": Store rarity.
  O2_MASKS: 2,
  // Augmentations, "Fire Suppression": Store rarity.
  FIRE_EXTINGUISHERS: 3,
  // Augmentations, "Distraction Buoys": Store rarity.
  FLEET_DISTRACTION: 3,
  // Augmentations, "Long-Ranged Scanners": Store rarity.
  ADV_SCANNERS: 1,
  // Augmentations, "FTL Jammer": Store rarity.
  FTL_JAMMER: 3,
  // Augmentations, "Drone Recovery Arm": Store rarity.
  DRONE_RECOVERY: 2,
  // Augmentations, "Hacking Stun": Store rarity.
  HACKING_STUN: 3,
  // Augmentations, "Backup DNA Bank": Store rarity.
  BACKUP_DNA: 2,
  // Augmentations, "Reconstructive Teleport": Store rarity.
  TELEPORT_HEAL: 3,
  // Augmentations, "Lifeform Scanner": Store rarity.
  LIFE_SCANNER: 3,
  // Augmentations, "Adv. FTL Navigation": Store rarity.
  FTL_JUMPER: 3,
  // Augmentations, "Defense Scrambler": Store rarity.
  DEFENSE_SCRAMBLER: 4,
  // Augmentations, "Zoltan Shield Bypass": Store rarity.
  ZOLTAN_BYPASS: 3,
  // Drones.
  // Drone Control, "Combat Drone Mark I": Store rarity.
  COMBAT_1: 2,
  // Drone Control, "Combat Drone Mark II": Store rarity.
  COMBAT_2: 5,
  // Drone Control, "Anti-Ship Beam Drone I": Store rarity.
  COMBAT_BEAM: 3,
  // Drone Control, "Anti-Ship Beam Drone II": Store rarity.
  COMBAT_BEAM_2: 5,
  // Drone Control, "Defense Drone Mark I": Store rarity.
  DEFENSE_1: 1,
  // Drone Control, "Defense Drone Mark II": Store rarity.
  DEFENSE_2: 3,
  // Drone Control, "Anti-Combat Drone": Store rarity.
  ANTI_DRONE: 1,
  // Drone Control, "Shield Overcharger": Store rarity.
  DRONE_SHIELD: 4,
  // Drone Control, "Anti-Personnel Drone": Store rarity.
  BATTLE: 2,
  // Drone Control, "System Repair Drone": Store rarity.
  REPAIR: 1,
  // Drone Control, "Hull Repair Drone": Store rarity.
  SHIP_REPAIR: 4,
  // Drone Control, "Boarding Drone": Store rarity.
  BOARDER: 4,
  // Drone Control, "Ion Intruder Drone": Store rarity.
  BOARDER_ION: 4,
};
