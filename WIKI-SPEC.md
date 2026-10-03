# Ashwake wiki spec

Source: latest-only public dump of ftl.fandom.com (`ftl.fandom.com-20261002-current.xml`, `pages.jsonl`). Namespace 0 articles are the rules. Namespace 6 file names are the layout pictures; the bytes stay in the dump. Namespace 10 templates and namespace 14 categories are used only where they state a mechanic (weapon tables, store stock, scrap tiers, crew comparison, event categories). No user page, talk page, message wall, forum, board, or blog thread was used.

A rule is one sentence plus the page title. If the dump does not state a number, name, or control, this spec says **not stated**. Visible link text is the text after `|` in a wikilink. `[[File:...]]` is an image citation, not prose.

Player ships are named `<class> <layout letter>` (example: Stealth A). (`Ship`)

---

## 1. Title menu

- The Advanced Edition title art is a logo reading FTL over ADVANCED EDITION on a purple wreck field. Picture: `FTL-Advanced-Edition-title-screen.jpg`. Page: `FTL: Advanced Edition`. It is not a control layout.
- `FTL_Title.png` is a logo (FTL over a moon with orange-striped ships). No namespace-0 article embeds it. Button labels on that image: **not stated**.
- The list of title-menu commands (wording such as a new-game or quit label) is **not stated** on any namespace-0 article.
- The first PC launch shows: "Open the in-game menu by pressing ESCAPE. You can restart or change options from there." (`Template:In-game tips`)
- Pressing Continue on the main menu reloads a save. (`Game bugs`)
- The game-over panel has buttons STATS, RESTART, HANGAR, MAIN MENU, and QUIT, so a main menu and a hangar are reachable after a loss. Pictures: `Gameover_rebelvictory.png`, `Death_message.PNG`, `Gameover_explode.png`, `Gameover_crewdeath.png`. Page: `Game Over`.

## 2. Hangar / new game

Reference pictures: `KestralASystems.png` (room cutaway for Kestrel A; page `The Kestrel Cruiser`) and `PCShipSelection.jpg` (ship-list overlay; no namespace-0 article embeds this file).

Regions on `KestralASystems.png`, top to bottom and left to right:

- Top left: RENAME beside a name plate (shown as The Kestrel).
- Top right: EASY, NORMAL, HARD stacked, then START.
- Left rail: SHIP, with LIST arrows, RANDOM SHIP, LAYOUT buttons A, B, C, and HIDE ROOMS.
- Under that: the line "Complete 2 for Layout B" and a strip of achievement icons, one locked.
- Center: the ship room cutaway on a hangar bay. HIDE ROOMS is the control that covers or shows those rooms; what the hidden state looks like is **not stated** beyond the button label.
- Under the cutaway: a row of system icons (the Kestrel A set is shields, engines, oxygen, medbay, weapons, piloting, sensors, doors).
- Right of the cutaway: "Advanced Edition Content" with DISABLED and ENABLED.
- Bottom: CREW cards (portrait, name, CUSTOMIZE), WEAPONS slots (Artemis and Burst Laser II filled; two empty), AUGMENTATIONS (three empty slots), and DRONES reading SYSTEM NOT INSTALLED when that system is absent.

`PCShipSelection.jpg` is a modal titled CHOOSE YOUR SHIP with tabs TYPE A (selected in the picture), TYPE B, and TYPE C. Ten ship cards sit in two rows. Locked cards are black silhouettes with a padlock. White arrows run between some cards. Each card has a row of small boxes; glyphs visible on cards include 1, 2, 3, V, and Q. What each glyph means is **not stated** on an article; layout B needs two of three ship achievements and some unlocks need a flagship victory (`Ship`).

- At start only the Kestrel Cruiser is available. (`Ship`)
- Reaching sector 5 with any Kestrel layout unlocks the Engi Cruiser. (`Ship`, `The Engi Cruiser`)
- Layout A of later ships is a quest or a flagship win with the previous ship in the unlock diagram. (`Ship`)
- Layout B is two of three ship achievements. (`Ship`)
- Layout C is reaching sector 8 with layout B while Advanced Edition content is enabled. (`Ship`)
- The Lanius Cruiser unlocks after four ships besides the Kestrel. It has no layout C. (`Ship`, `The Lanius Cruiser`)
- The Crystal Cruiser unlocks by the Ancestry quest or by defeating the flagship with layouts A and B of every ship except the Lanius. It has no layout C. (`Ship`, `The Crystal Cruiser`)
- A ship can be renamed; the hangar shows RENAME. Mid-run crew rename was added by Advanced Edition. (`FTL: Advanced Edition`) The hangar crew CUSTOMIZE control's options are **not stated**.
- Advanced Edition content can be disabled. Balance changes still apply when it is off. Some events exist only when it is on. (`FTL: Advanced Edition`)
- Every new game shows one random tip. (`Template:In-game tips`)

## 3. Difficulty

- Easy, Normal, and Hard are chosen on the ship selection screen before the run. Picture: `KestralASystems.png`. Page: `Scrap`.
- Higher difficulty gives less scrap and harder enemy spawns, and a higher score multiplier. (`FTL: Faster Than Light (about the game)`)
- Score multiplier D is 1 on Easy, 1.25 on Normal, and 1.5 on Hard. (`Score`)
- Initial scrap is 30 on Easy, 10 on Normal, and 0 on Hard, and that initial scrap does not count toward the score. (`Score`)
- Scrap reward tables by sector and tier are in section 14. Resource reward amounts do not vary by sector or difficulty. (`Rewards`, `Stores and resources`)
- Enemy hull and system levels vary by difficulty. Exact tables are on `Enemy Ships`. (`Ship`, `Enemy Ships`)
- Door hits to break a door are lower on higher difficulties (section 12). (`Door System`)
- On Easy with Advanced Edition disabled, the flagship has 3 shield layers (system level 6) instead of 4 (level 8), all three stages. (`The Rebel Flagship`)
- On Hard, two extra rooms connect the flagship laser and missile rooms to the main hull. (`The Rebel Flagship`)
- Flagship phase-2 extra drones: 4 Easy, 6 Normal, 7 Hard. (`The Rebel Flagship`)
- Anti-ship batteries never occur at exit beacons on Easy. (`Rebel Fleet`)
- What else changes on Hard (targeting priority, enemy loadouts) is described on the individual system and enemy pages, not as one master list. A single "difficulty rules" article is **not stated**.

## 4. Ship list and layouts

Ten classes. Maximum eight crew. Hull starts at 30 on every playable ship. (`Ship`)

Each layout below is the starting load. System numbers in parentheses are levels. "none (system not installed)" means the drone system is absent. Reference image is the systems cutaway named on that cruiser page unless noted.

### Kestrel — `The Kestrel Cruiser`

Achievements: The United Federation (six unique aliens at once); Full Arsenal (11 systems at once); Tough Little Ship (repair to full from 1 hull).

- **A, The Kestrel.** No unlock. Reactor 8. Crew: 3 Human. Shields 2, Engines 2, Medbay 1, Oxygen 1, Weapon Control 3, Piloting 1, Sensors 1, Door System 1. Weapons (4 slots): Artemis Missiles, Burst Laser II. Drones: none (system not installed). Resources: 16 fuel, 8 missiles, 2 drone parts. Image: `KestralASystems.png`. Exterior: `Kestrel Cruiser A.png`.
- **B, Red-Tail.** Two of three Kestrel achievements. Reactor 8. Crew: 2 Human, 1 Mantis, 1 Zoltan. Shields 2, Engines 2, Medbay 1, Oxygen 1, Weapon Control 4, Piloting 1, Sensors 1, Door System 1. Weapons: Basic Laser ×4. Drones: none (requires system). Resources: 16 fuel, 5 missiles, 0 drone parts. Image: `KestralB.png`. Exterior: `Kestrel Cruiser B.png`.
- **C, The Swallow.** Sector 8 on Kestrel B with Advanced Edition on. Reactor 7. Crew: 2 Human, 1 Lanius. Shields 2, Engines 2, Clone Bay 1, Oxygen 1, Weapon Control 2, Piloting 1, Sensors 2, Door System 1. Weapons: Dual Lasers, Ion Stunner. Drones: none (requires system). Resources: 16 fuel, 4 missiles, 3 drone parts. Image: `KestralCSystems.png`. Exterior: `Kestrel Cruiser C.png`.

### Engi — `The Engi Cruiser`

Achievements: Robotic Warfare (3 drones functioning at once); I hardly lifted a finger (destroy a ship using only drones); The guns... They've stopped (4 enemy systems or subsystems ioned at once).

- **A, The Torus.** Sector 5 with any Kestrel. Reactor 10. Crew: 2 Engi, 1 Human. Shields 2, Engines 2, Medbay 1, Oxygen 1, Weapon Control 3, Drone Control 3, Piloting 1, Sensors 1, Door System 1. Weapons (3 slots): Ion Blast II. Drones (3 slots): Combat Drone Mark I. Augment: Engi Med-bot Dispersal. Resources: 16 fuel, 0 missiles, 15 drone parts. Image: `EngiASystems.png`.
- **B, The Vortex.** Two of three Engi achievements. Reactor 9. Crew: 1 Engi. Shields 2, Engines 1, Medbay 1, Oxygen 1, Weapon Control 3, Drone Control 3, Piloting 1, Door System 1. Sensors: **not stated** as installed. Weapons: Heavy Ion, Heavy Laser I. Drones: Anti-Personnel Drone, System Repair Drone ×2. Augment: Drone Reactor Booster. Resources: 16 fuel, 0 missiles, 6 drone parts. Image: `EngiBSystems.png`.
- **C, Tetragon.** Sector 8 on Engi B with Advanced Edition on. Reactor 9. Crew: 1 Lanius, 2 Engi. Shields 2, Engines 2, Clone Bay 1, Oxygen 1, Hacking 1, Weapon Control 1, Drone Control 2, Piloting 1, Sensors 1, Door System 1. Weapons: Dual Lasers. Drones: Beam I. Augment: Defense Scrambler. Resources: 16 fuel, 0 missiles, 25 drone parts. Image: `EngiCSystems.png`.

### Federation — `The Federation Cruiser`

Achievements: Master of Patience (destroy a ship with only the Artillery Beam and no hull damage taken); Diplomatic Immunity (four special blue crew events by sector 5); Artillery Mastery (sector 5 without upgrading weapons).

- **A, The Osprey.** Defeat the flagship prototype in the Rebel Stronghold, or defeat the Rebel Flagship with the Engi Cruiser. Reactor 8. Crew: the page shows Human, Mantis, Rock, and Engi portraits; the count of each is the four icons on the page (1 each). Shields 2, Engines 2, Medbay 1, Oxygen 1, Artillery Beam 1, Weapon Control 2, Piloting 1, Sensors 1, Door System 1. Weapons: Burst Laser II. Drones: none (system not installed). Resources: 16 fuel, 5 missiles, 2 drone parts. Image: `FedASystems.png`.
- **B, Nisos.** Two of three Federation achievements. Reactor 9. Shields 2, Engines 2, Medbay 1, Oxygen 1, Artillery Beam 2, Weapon Control 2, Piloting 1, Sensors 1, Door System 1. Weapons: Dual Lasers, Leto Missiles. Drones: none (system not installed). Resources: 16 fuel, 9 missiles, 0 drone parts. Crew list: **not stated** in the extracted layout block beyond the page. Image: `FederationBSystems.png`.
- **C, The Fregatidae.** Sector 8 on Federation B with Advanced Edition on. Reactor 7. Shields 2, Engines 2, Clone Bay 2, Oxygen 1, Crew Teleporter 1, Flak Artillery 1, Weapon Control 1, Piloting 1, Sensors 1, Door System 1. Weapons: none. Drones: none (system not installed). Augment: Emergency Respirators. Resources: 16 fuel, 5 missiles, 0 drone parts. Image: `FederationCSystems.png`.

### Zoltan — `The Zoltan Cruiser`

Achievements: Shields Holding (destroy a ship before it breaks the Zoltan Shield); Givin' her all she's got, Captain! (29 power in systems at once); Manpower (sector 5 without upgrading the reactor).

- **A, The Adjudicator.** Unarmed Zoltan Transport event, or defeat the flagship with the Federation Cruiser. Reactor 5. Crew: 3 Zoltan. Shields 2, Engines 1, Medbay 1, Oxygen 1, Weapons 3, Piloting 1, Sensors 1, Door System 2. Weapons: Halberd Beam, Leto Missiles. Drones: none (requires system). Augment: Zoltan Shield. Resources: 16 fuel, 12 missiles, 2 drone parts. Image: `ZoltanASystems.png`.
- **B, Noether.** Two of three Zoltan achievements. Reactor 5. Crew: 3 Zoltan. Shields 1, Engines 2, Medbay 1, Oxygen 1, Weapon Control 4, Piloting 1, Sensors 1, Door System 1. Weapons: Ion Blast ×2, Pike Beam. Drones: none (requires system). Augment: Zoltan Shield. Resources: 16 fuel, 0 missiles, 2 drone parts. Shields 1 to 2 costs 100 scrap. Image: `ZoltanB.png`.
- **C, Cerenkov.** Sector 8 on Zoltan B with Advanced Edition on. Reactor 2 (weak: each bar through level 5 costs 30 scrap). Crew: 4 Zoltan. Piloting 1, Doors 1, Sensors 1, Clone Bay 1, Oxygen 1, Shields 2, Engines 2, Weapons 2, Drones 3, Backup Battery 2. Weapons: Ion Charger. Drone schematic: Anti-Ship Beam Drone I (the page also prints "none (requires system)" on the same drone list; the system is installed at level 3). Augment: Zoltan Shield. Resources: 16 fuel, 2 missiles, 15 drone parts. Image: `ZoltanCSystems.png`.

### Mantis — `The Mantis Cruiser`

Achievements: Take no prisoners! (kill the crew of 20 ships by sector 6); Avast, ye scurvy dogs! (kill 5 enemy crew in one fight with no hull damage and no crew lost); Battle Royale (last enemy killed by your last crew member on their ship).

- **A, The Gila Monster.** Legendary thief KazaaakplethKilik, or defeat the flagship with the Zoltan Cruiser. Reactor 7. Crew: 3 Mantis, 1 Engi. Piloting 1, Doors 1, Medbay 1, Oxygen 1, Shields 2, Engines 2, Teleporter 1, Weapons 1. Weapons: Small Bomb, Basic Laser. Augment: Mantis Pheromones. Resources: 16 fuel, 16 missiles, 0 drone parts. Slots: 3 weapon, 2 drone (system required). Image: `MantisASystems.png`.
- **B, The Basilisk.** Two of three Mantis achievements. Reactor 11. Crew: 2 Mantis. Piloting 1, Doors 1, Sensors 1, Medbay 1, Oxygen 1, Shields 4, Engines 1, Teleporter 1, Weapons 1, Drones 3. No starting weapons. Drones: Boarding Drone, Defense Drone I. Augment: Mantis Pheromones. Resources: 16 fuel, 0 missiles, 15 drone parts. Four-person teleporter. Image: `MantisBSystems.png`.
- **C, The Theseus.** Sector 8 on Mantis B with Advanced Edition on. Reactor 8. Crew: 1 Engi, 1 Mantis, 1 Lanius. Piloting 1, Doors 1, Sensors 1, Clone Bay 2, Oxygen 1, Shields 2, Engines 2, Teleporter 1, Weapons 2. Weapons: Crystal Lockdown Bomb, Stun Bomb. Augment: Mantis Pheromones. Resources: 16 fuel, 20 missiles, 0 drone parts. Four-person teleporter. Image: `MantisCSystems.png`.

### Slug — `The Slug Cruiser`

Achievements: We're in position! (see every enemy room without functioning sensors); Home Sweet Home (30 nebula jumps before sector 8); Disintegration Ray (kill 3 enemy crew with one Anti-Bio Beam shot).

- **A, Man of War.** Slug Home Nebula surrender, or defeat the flagship with the Mantis Cruiser. Reactor 8. Crew: 2 Slug. Piloting 1, Doors 2, Medbay 1, Oxygen 1, Shields 2, Engines 2, Weapons 3. No sensors. Weapons: Anti-Bio Beam, Breach Bomb I, Dual Lasers. Augment: Slug Repair Gel. Resources: 16 fuel, 15 missiles, 0 drone parts. Slots: 4 weapon, 2 drone (system required). Image: `SlugASystems.png`.
- **B, The Stormwalker.** Two of three Slug achievements. Reactor 7. Crew: 3 Slug. Piloting 1, Doors 2, Oxygen 1, Shields 2, Engines 2, Teleporter 1, Weapons 2. No medical system. Weapons: Healing Burst, Artemis Missiles. Augment: Slug Repair Gel. Resources: 16 fuel, 25 missiles, 0 drone parts. Image: `SlugBSystems.png`.
- **C, Ariolimax.** Sector 8 on Slug B with Advanced Edition on, any difficulty. Reactor 9. Crew: 3 Slug. Piloting 1, Doors 2, Clone Bay 1, Oxygen 1, Shields 2, Engines 2, Weapons 2, Hacking 1, Mind Control 1. Weapon: Chain Burst Laser. Augment: Slug Repair Gel. Resources: 16 fuel, 1 missile, 15 drone parts. Image: `SlugCSystems.png`.

### Rock — `The Rock Cruiser`

Achievements: Is it warm in here? (crew kills a burning enemy on the enemy ship); Defense Drones Don't Do D'anything! (destroy a ship that has a defense drone, using only missiles); Ancestry (find the secret sector).

- **A, Bulwark.** Rock war vessel encounter, or defeat the flagship with the Slug Cruiser. Reactor 8. Crew: 3 Rockmen. Piloting 1, Doors 1, Sensors 1, Medbay 1, Oxygen 1, Shields 2, Engines 2, Weapons 3. Weapons: Artemis Missiles, Hull Missile. Augment: Rock Plating. Resources: 16 fuel, 28 missiles, 0 drone parts. Slots: 4 weapon, 2 drone (system required). Image: `RockASystems.png`.
- **B, Shivan.** Two of three Rock achievements. The only player ship that does not start with Door System. (`Door System`) Reactor 8. Crew: 4 Rockmen. Piloting 1, Sensors 1, Medbay 1, Oxygen 2, Shields 2, Engines 2, Weapons 3. No doors. Weapons: Heavy Pierce Laser Mk. I, Fire Bomb. Augment: Rock Plating. Resources: 16 fuel, 18 missiles, 0 drone parts. Image: `RockBSystems.png`.
- **C, Tektite.** Sector 8 on Rock B with Advanced Mode on. Reactor 8. Crew: 2 Rockmen, 1 Crystal. Piloting 1, Doors 1, Sensors 1, Clone Bay 1, Oxygen 1, Shields 2, Engines 2, Weapons 3. Weapons: Swarm Missiles, Heavy Crystal Mark I. Augment: Rock Plating. Resources: 16 fuel, 15 missiles, 0 drone parts. Image: `RockCSystems.png`.

### Stealth — `The Stealth Cruiser`

No layout starts with Shields. Achievements: Bird of Prey (destroy a full-health ship during one cloak); Phase Shift (avoid 9 damage during one cloak); Tactical Approach (sector 8 without jumping to an environmental danger).

- **A, The Nesasio.** Engi fleet discussion, or defeat the flagship with the Rock Cruiser. Reactor 8. Crew: Human portrait on the page; the count is the crew line on that layout (the page shows one human icon in the extract). Engines 4, Medbay 1, Oxygen 1, Cloaking 1, Weapon Control 2, Piloting 1, Sensors 2, Door System 1. Weapons (3 slots): Mini Beam, Dual Lasers. Drones: none (requires system). Augments: Titanium System Casing, Long-Ranged Scanners. Resources: 16 fuel, 0 missiles, 0 drone parts. Image: `StealthASystems.png`.
- **B, DA-SR 12.** Two of three Stealth achievements. Reactor 7. Piloting 1, Doors 1, Sensors 2, Medbay 1, Oxygen 1, Engines 2, Cloaking 2, Weapons 4. Weapon: Glaive Beam. Augment: Long-Ranged Scanners. Resources: 16 fuel, 0 missiles, 0 drone parts. Image: `StealthBSystems.png`.
- **C, Simo-H.** Sector 8 on Stealth B with Advanced Mode on. Reactor 7. Piloting 1, Doors 1, Clone Bay 1, Oxygen 1, Engines 3, Weapons 2, Drones 2. Weapons: Laser Charger (S), Mini Beam. Drones: Shield Overcharger +, Anti-Drone. Augment: Long-Ranged Scanners. Resources: 16 fuel, 0 missiles, 16 drone parts. Image: `StealthCSystems.png`.

### Crystal — `The Crystal Cruiser`

No layout C. Achievements: Sweet Revenge (destroy a ship with a Crystal Vengeance shard); No Escape (trap 4 enemy crew in one room with the crystal power or Lockdown Bomb); Clash of the Titans (destroy 10 Rock ships).

- **A, Bravais.** Ancestry, or flagship wins on A and B of every ship except Lanius. Reactor 8. Crew: 2 Human, 2 Crystal. Shields 2, Engines 2, Medbay 1, Oxygen 1, Weapon Control 3, Piloting 1, Sensors 1, Door System 1. Weapons: Crystal Burst Mark I, Heavy Crystal Mark I. Drones: none (requires system). Augment: Crystal Vengeance. Resources: 16 fuel, 0 missiles, 0 drone parts. Image: `CrystalASystems.png`.
- **B, Carnelian.** Two of three Crystal achievements. Reactor 8. Crew: 3 Crystal. Shields 2, Engines 2, Medbay 1, Oxygen 1, Teleporter 1, Cloaking 1, Weapon Control 1, Piloting 1, Sensors 1, Door System 1. Weapons: none. Drones: none (requires system). Augment: Crystal Vengeance. Resources: 16 fuel, 0 missiles, 0 drone parts. Image: `CrystalBSystems.png`.

### Lanius — `The Lanius Cruiser`

No layout C. Advanced Edition. Achievements: Advanced Mastery (Hacking, Mind Control, and the Battery active at once); Scrap Hoarder (at least 600 scrap in storage); Loss of Cabin Pressure (sector 8 without net oxygen above 20 percent, counted after the first jump).

- **A, Kruos.** Unlock 4 ships excluding the Kestrel. Reactor 8. Crew: 1 Human, 2 Lanius. Piloting 1, Doors 1, Sensors 1, Clone Bay 1, Oxygen 1, Shields 2, Engines 1, Weapons 3, Hacking 1. Weapons: Chain Burst Laser, Ion Stunner. Augment: Emergency Respirators. Resources: 16 fuel, 3 missiles, 9 drone parts. Slots: 4 weapon, 2 drone (system required). Image: `LaniusASystems.png`.
- **B, The Shrike.** Two of three Lanius achievements. Reactor 8. Crew: 1 Engi, 2 Lanius. Piloting 1, Doors 1, Clone Bay 1, Oxygen 1, Shields 2, Engines 1, Teleporter 1, Weapons 1, Mind Control 1. Weapon: Advanced Flak. Augment: Emergency Respirators. Resources: 16 fuel, 0 missiles, 0 drone parts. Image: `LaniusBSystems.png`.

Every player ship starts with Piloting, Engines, Oxygen, and Weapon Control. (`Systems`)

## 5. Sector map and jumps

Picture: `Sector_Map.png` on page `Sectors`. Title SECTOR MAP. A node graph runs left to right. The current ship sits on the left node. Numbered labels name the next sectors (the picture shows "1. Uncharted Nebula" and "2. Uncharted Nebula"). Nodes are green, red, or purple. The legend is Civilian (green), Hostile (red), Nebula (purple). A red node is the right-hand end. How many choices appear is the rolled map, not a fixed count.

- A run is 8 sectors, then the flagship. (`FTL: Faster Than Light (about the game)`)
- Each sector has 19 to 24 beacons. (`Sectors`)
- Next-sector color chance is 48% green, 32% red, 20% purple. Color is not a reliable danger ranking. (`Sectors`)
- Beacon positions use a 6 by 4 grid. Each square has an 80% chance of a beacon unless too many squares are already empty. A beacon links to beacons in adjacent squares within 165 pixels. (`Sectors`)
- Beacons are then filled from the sector's event lists, minimum to maximum counts, unique events only once per sector. Filling stops when beacons run out. (`Sectors`)
- All beacons except the sector's starting beacon begin unexplored. The exit is always visible, on the side opposite the start, marked EXIT with a green border. (`Beacons`)
- Distress beacons and stores are marked when adjacent (one jump). Distress text: "Distress Beacon. Someone might need help." Store text: "Unvisited. Reported merchant location." / "You previously found a store at this location." Store marker is STORE with a gray border. Pictures: `Distress_beacon_(cursor).png`, `Store_beacon_(cursor).png`. (`Beacons`)
- Quest markers say "Unvisited. Quest destination." and are visible from any distance once spawned. If few jumps remain, the quest moves to the next sector. In sector 7 that cancels the quest, with the text that there is no time and the quest is left for another day. Quests are not allowed in sector 8. Picture: `Quest_marker_beacon.png`. (`Beacons`, `Random Events`)
- A jump needs a ready FTL drive, working engines, working piloting, 1 fuel, and a crewmember in piloting. (`Beacons`)
- With no hazard and no enemy, the FTL drive charges instantly. A nebula or an ion storm is not a hazard for that rule. With a hazard or a boarder and no enemy ship, the base charge is 23 seconds, then reduced by engines. (`Engines`)
- In-combat charge times (seconds) by engines level, columns unmanned / skill 0 / skill 1 / skill 2: L1 67.9 / 61.8 / 58.0 / 54.3; L2 53.1 / 48.3 / 45.4 / 42.6; L3 43.6 / 39.6 / 37.2 / 34.9; L4 36.9 / 33.6 / 31.6 / 29.5; L5 32.1 / 29.0 / 27.5 / 25.7; L6 28.3 / 25.7 / 24.2 / 22.6; L7 25.4 / 23.1 / 21.7 / 20.3; L8 23.0 / 20.9 / 19.6 / 18.4. The in-game charge readout is wrong; these are the stated actual times. (`Engines`)
- The jump key default is J. (`ConfigureControls1.png`)
- Options can draw paths when the pointer hovers a beacon. (`Game patches`)
- Long-Ranged Scanners reveal hazards and possible ships on adjacent beacons, including beacons already left behind. (`Augmentations`, `Beacons`)
- Adv. FTL Navigation allows a jump to a previously visited beacon that the Rebel fleet later took. (`Augmentations`)
- Out of fuel: the map spells NO FUEL and offers Wait. The fleet advances as for a jump, slower in a nebula. A distress beacon can be turned on before waiting. Picture: `NO_FUEL.png`. (`Stores and resources`)
- Waiting is also allowed in sector 8 even with fuel. (`Sectors`)

## 6. Events

- Jumping, or being out of fuel, can start a fight, a local interaction, or nothing. (`Random Events`)
- Most choices have more than one outcome. (`Template:In-game tips`)
- A blue choice is a special option opened by current equipment. (`Template:In-game tips`)
- The event UI is a text panel with numbered or listed choices, then Continue where the page prints "Continue...". Exact widget chrome is **not stated** beyond that flow and the font-size keys.
- Event text size changes with the font keys (section 19). (`Template:In-game tips`)
- Default fight rewards, surrender offers, and escape attempts are defined per ship in the data files and summarized on `Rewards` and `Template:SurrenderEscape`. A surrendered ship offers resources; accepting or refusing is a choice on that event page. (`Rewards`)
- Standard auto-reward: a scrap tier, low resources (2 random among fuel, missiles, drone parts), and about a 3% bonus item. Stuff auto-reward: a resource tier, low scrap, and about a 6% bonus item. (`Rewards`)
- Scrap amounts by sector, tier, and difficulty are in section 14. (`Rewards`)
- Event article text is quoted from the game files and is not rewritten here. Each namespace-0 event page is the rule for that beacon. (`Random Events`)
- Event indexes are categories, not one article: Random Events, and one category per sector (Abandoned, Civilian, Engi Controlled, Engi Homeworlds, Hidden Crystal Worlds, Mantis Controlled, Mantis Homeworlds, Pirate Controlled, Rebel Controlled, Rebel Stronghold, Rock Controlled, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, The Last Stand, Uncharted Nebula). (`Random Events`)
- Further category splits used by the wiki include distress beacons, boarding, hull damage, crew loss, fuel use, out-of-fuel, store opening, quest markers, and blue-option tags. Those categories state which events carry the risk or reward; the numbers live on the event page.
- Cut-content events are not in an unmodified game and have no normal event articles. (`Random Events`, `Cut content`)

## 7. Stores

- Stores are beacons or event rewards. They sell for scrap. (`Stores and resources`)
- Since Advanced Edition, many stores have 2 pages. (`Beacons`)
- Sell is a SELL tab at the top. Weapons, drones, and augments sell for half the purchase price, rounded down. (`Template:In-game tips`, `Scrap`)
- A store sells unlimited hull repair, limited fuel, missiles, and drone parts, and 2–4 slots of systems, weapons, drones, augments, and crew. (`Stores and resources`)
- Each item slot holds three random items of that type. No duplicate weapons, drone schematics, or augments. Crew may duplicate. (`Stores and resources`)
- Hull repair price per point: 2 in sectors 1–3, 3 in 4–6, 4 in 7–8. (`Template:Stores: hull repairs in stores`)
- Stock and price: fuel 3–7 at 3 scrap; missiles 2–6 at 6; drone parts 2–4 at 8. (`Template:Stores: resources in stores`) Refuel-station events sell fuel at 2 scrap. (`Stores and resources`)
- Systems install in a fixed room. Buying a teleporter always gives two slots, not four. A medical purchase replaces the other medical system and keeps upgrade levels. Shields are guaranteed if missing. A medical system is guaranteed if missing. Drones are guaranteed if the store also sells drone schematics. (`Stores and resources`, `Systems`)
- Purchase prices: Shields 125, Medbay 50, Clone Bay 50, Crew Teleporter 90, Cloaking 150, Mind Control 75, Hacking 80, Drone Control 75 or 85, Sensors 40, Door System 60, Backup Battery 35. (`Template:Purchasable systems`) Which of 75 or 85 applies to Drone Control is the two numbers in that cell; the template does not label the split.
- If the ship has fewer than 11 systems plus subsystems, there is a 50% chance the first store slot is forced to systems. (`Stores and resources`)
- Filled system slots do not stop stores from offering systems you cannot buy, except that a medical system still replaces the current one. (`Stores and resources`)
- You cannot uninstall a system. The medical swap is the only substitute. Eight main-system slots and four subsystem slots. (`Systems`)
- Rarity 1 is common and 5 is rare. Rarity 0 is not a random store or drop item. (`Stores and resources`)
- Guaranteed store counts (not event-spawned stores), columns Civilian start, Civilian, Engi, Zoltan, Abandoned, Mantis, Pirate, Rebel, Rock, Slug nebulas, Uncharted Nebula, Hidden Crystal Worlds, Last Stand: stores 1–2, 2–3, 2–3, 2, 2, 1–2, 1–2, 1–2, 2, 0–1, 0–1, 2–3, 1. (`Template:Stores: number of stores, by sectors`) Nebula-store row is in that same template; the starting civilian cell is a dash.
- Reloading at an event-generated store removes it. Leaving the store UI while enemy boarders are aboard also removes it. Reloading any store rerolls crew skills and forces a Defence Drone Mark I with drone control. (`Stores and resources`)
- With Advanced Edition off, item slots are often empty. (`Stores and resources`)
- Open Store is a control on the keyboard page and is unbound in the default picture (`....`). (`ConfigureControls1.png`)

## 8. Combat

- A hostile beacon starts a fight against the enemy ship. Weapons, drones, crew, and hazards act until the enemy hull or crew hits zero, the enemy escapes, you jump, or you are destroyed. (`Beacons`, `Score`)
- Defeating a ship for the score means reducing hull or crew to zero. The flagship's three phases do not add a kill. (`Score`)
- Killing all flagship crew does not win the fight. A message says the AI took control, and undamaged systems count as manned. (`The Rebel Flagship`)
- Subsystems need no reactor power. Main systems do. (`Ship`, `Systems`)
- Reactor bars are green and sit at the bottom left. Zoltan bars are yellow. Battery bars are extra and temporary. (`Ship`)
- The system bar is powered from the GUI left to right in the order listed in section 12. Left-click adds one bar. Right-click removes one bar. (`Systems`)
- Upgrades are the Upgrades tab in the Ship menu at the top of the screen, and only when the ship is not IN DANGER. Nebulas and ion storms still allow the upgrade menu if there is no hostile ship and no intruders. (`Systems`, `Ship`, `Environmental Hazards`)
- Solar flares, asteroid fields, pulsars, and enemy anti-ship batteries force IN DANGER for the whole stay: no ship menu, no reactor upgrade, no cargo swap of weapons or drone schematics, no crew management. (`Environmental Hazards`)
- Pause stops time. Crew orders and system power still work while paused. (`Template:In-game tips`)
- You may queue a shot before a weapon finishes charging. It fires when charged. (`Template:In-game tips`)
- Autofire keeps a weapon on its target. (`Template:In-game tips`)
- An enemy trying to jump shows an indicator, and whether it is able to. (`Game patches`)
- Priority targets named by the tips: weapons and shields, or engines and piloting if the enemy is fleeing. (`Template:In-game tips`)
- A destroyed system (fire or boarders) also deals 1 hull damage. (`Template:In-game tips`, `Systems`)
- Ion damage removes 1 power per point and locks the system 5 seconds per point, up to 5 ion points. Ion on shields is applied to the Shields system. (`Template:In-game tips`, `Systems`)
- Bombs teleport onto a ship, ignore shields and defense drones, do not damage hull, and cost one missile. (`Template:In-game tips`)
- Missiles ignore shields, cost one missile, and can be shot down by defense drones. (`Template:In-game tips`, `Missile (Weapons)`)
- Each shield bubble blocks 1 damage of a beam and blocks one laser shot regardless of that shot's damage. (`Template:In-game tips`, `Shields`)
- Beams cannot be dodged. A beam that has started keeps going if you cloak. (`Cloaking`)
- Cloaking adds 60 evasion and stops the enemy locking weapons. It also stops their weapon charge while the cloak is up, per the tip text. (`Template:In-game tips`, `Cloaking`)
- Rock Plating has a 15% chance to negate hull damage from weapons and asteroids, not from fires, sabotage, solar flares, or events. (`Ship`, `Augmentations`)
- There is no single in-combat screenshot cited as the HUD diagram. The room plan used in play is the hangar cutaway for that layout (section 4).

## 9. Weapons

Mouse and keyboard, page `Weapon Control` unless noted.

- Left-click a weapon slot, or keys 1–4, powers it and starts the charge.
- Click or press again: the cursor becomes a target. Left-click a room to confirm. Right-click cancels targeting.
- Right-click, or Shift plus 1–4, depowers that weapon.
- Ctrl plus 1–4, or Ctrl plus left-click, flips autofire for that slot only.
- Toggle Autofire for all weapons is V. Autofire Modifier (hold plus aim) is Left Ctrl. (`ConfigureControls1.png`)
- Drag a weapon (or drone schematic) to reorder it. The leftmost slot is the last to lose power when the system is damaged. (`Weapon Control`, `Template:In-game tips`)
- One ion point drops reactor power out of any weapon, even a 4-power weapon. Ion or an active hack blocks manual power changes. An active hack also blocks firing stored charges, but does not delete them. Slot order can still be changed while ionized. (`Weapon Control`)
- Zoltan power fills weapon slots from the left. A Zoltan leaving without spare reactor power depowers those weapons. (`Weapon Control`)
- Manning cuts charge time by 10% / 15% / 20% at skill 0 / 1 / 2. (`Weapon Control`)
- A full charge can be stored by moving a charged weapon into cargo. (`Weapon Control`)
- Weapon Pre-Igniter fully charges weapons that were powered at the previous beacon, on arrival. It does not skip later chain-weapon cycles. (`Augmentations`, `Weapon Control`)
- Automated Re-loader improves the cooldown between shots by 10%. It stacks with itself and with crew skill. (`Augmentations`)
- Upgrade costs (scrap) and power: level 1 is free and 1 power; then 40/2, 25/3, 35/4, 50/5, 75/6, 90/7, 100/8. (`Weapon Control`)

Tables below are purchase price in scrap (or "sells" if it has no buy price), power, charge seconds, shots, damage, the fire/breach/stun cell as printed, projectile speed, store rarity. Column meaning is the template header. A `*` marks a footnote on that cell in the template.

Lasers (`Template:Laser weapons`). Fire/breach cell is the template's "Fire, breach" column; each row has three numbers. A shot cannot be both fire and breach; fire is rolled first.

- Basic Laser: sells 10, 1, 10s, 1 shot, 1 dmg, 10/0/0, speed 60, rarity 0.
- Dual Lasers: sells 12, 1, 10s, 2, 1, 10/0/0, 60, 0. Enemies never use it.
- Burst Laser I: 50, 2, 11s, 2, 1, 10/0/0, 60, 1.
- Burst Laser II: 80, 2, 12s, 3, 1, 10/0/0, 60, 4.
- Burst Laser III: 95, 4, 19s, 5, 1, 0/0/0, 60, 4.
- Heavy Laser I: 50, 1, 9s, 1, 2, 30/21/20, 60, 2.
- Heavy Pierce I: sells 27, 2, 10s, 1*, 2, 30/21/0, 60, 0. Enemies never use it. Crystal weapons and Heavy Pierce bypass 1 shield layer. (`Shields`)
- Heavy Laser II: 65, 3, 13s, 2, 2, 30/21/20, 60, 4.
- Hull Laser I: 55, 2, 14s, 2, 1*, 0/20/0, 75, 2.
- Hull Laser II: 75, 3, 15s, 3, 1*, 10/27/0, 90, 3.
- Chain Laser: 65, 2, 16–7*, 2, 1, 10/0/0, 60, 3. Cooldown drops each shot; green lights show how many times it has fired. (`Template:In-game tips`)
- Chain Vulcan: 95, 4, 11.1–1.1*, 1, 1, 10/0/0, 60, 5.
- Laser Charger (S): sells 15, 1, 5.5s, 1–2 shots, 1, 0/0/0, 60, 0.
- Laser Charger: 55, 2, 6s, 1–2, 1, 0/0/0, 60, 3.
- Laser Charger II: 70, 3, 5s, 1–4, 1, 10/0/0, 60, 3.
- Boss Laser: no price, power varies, 10–25s*, 3, 1, 10/9/0, 60, 0. Flagship artillery level 3 in phases 1 and 2, level 4 in phase 3. (`Template:Laser weapons`, `The Rebel Flagship`)

Charge weapons may be fired early with fewer shots ready. (`Template:In-game tips`)

Hull Laser I and II and Hull Missiles deal double damage to a room with no system and no subsystem. (`Ship`, `Template:In-game tips`)

Beams (`Template:Beam weapons`): price, power, charge, beam length, damage, fire %, speed, rarity. Damage is per room hit, reduced by 1 per enemy shield bar. Crew damage is per tile and equals normal damage times 15 HP; damage to crew drones is halved.

- Mini Beam: sells 10, 1, 12s, length 45, 1, fire 10, speed 3, rarity 0.
- Pike Beam: 55, 2, 16s, 170, 1, no fire, 13, 2.
- Hull Beam: 70, 2, 14s, 100, 1*, no fire, 5, 3.
- Halberd Beam: 65, 3, 17s, 80, 2, no fire, 5, 2.
- Glaive Beam: 95, 4, 25s, 80, 3, no fire, 5, 5.
- Fire Beam: 50, 2, 20s, 140, 0, fire 80, 5, 3. No hull damage, so it does not pierce shields. (`Template:In-game tips`)
- Anti-Bio Beam: 50, 2, 16s, 140, 0*, no fire, 13, 5. No hull damage. (`Template:In-game tips`)
- Artillery Beam: no price, power 1–4*, charge 50–20s*, length 500*, damage 1*, fire 10, speed 13, rarity 0. Pierces all shields. More power shortens the cooldown. (`Artillery Beam`, `Systems`)
- Boss Beam: no price, power 3*, charge 19.5–32.5s*, length 100, damage 2, no fire, speed 5, rarity 0.

Flak (`Template:Flak weapons`): price, power, charge, shots, damage, radius, fake flak, speed, rarity. Flak targets an area, not one room. (`Template:In-game tips`)

- Advanced Flak: sells 30, 1, 8s, 3, 1, radius 40, fake 3, speed 26, rarity 0.
- Flak I: 65, 2, 10s, 3, 1, 42, 3, 26, 1. Advanced Edition.
- Flak II: 80, 3, 21s, 7, 1, 55, 6, 26, 4.
- Flak Artillery: no price, power 1–4*, charge 50–20s*, 7 shots, 1 damage, radius 35*, fake 7, speed 26, rarity 0. (`Flak Artillery`)

Ions (`Template:Ion weapons`): price, power, charge, shots, ion damage, stun %, speed, rarity.

- Ion Blast: 30, 1, 8s, 1, ion 1, stun 10, speed 30, rarity 3.
- Ion Blast II: 70, 3, 4s, 1, ion 1, stun 10, 30, 4.
- Heavy Ion: 45, 2, 13s, 1, ion 2, stun 20, 40, 3.
- Ion Stunner: 35, 1, 10s, 1, ion 1, stun 100*, 30, 4. Advanced Edition.
- Ion Charger: 50, 2, 6s, 1–3* shots, ion 1, no stun, 30, 3.
- Chain Ion: 55, 3, 14s, 1 shot, ion 1–4*, no stun, 30, 4. Damage rises each shot; green lights show the count. (`Template:In-game tips`)
- Boss Ion: no price, power 3*, charge 21–35s*, 3 shots, ion 1, no stun, speed 40, rarity 0.

Missiles (`Template:Missile weapons`): price, power, charge, shots, damage, fire/breach/stun cell, speed, rarity. One missile ammo per shot, unless Explosive Replicator (50% to not spend one; multi-shot launchers spend one ammo per volley and still get that 50%). (`Missile (Weapons)`, `Augmentations`)

- Leto: sells 10, 1, 9s, 1, 1, 10/9/10, speed 35, rarity 0.
- Artemis: sells 19, 1, 11s, 1, 2, 10/9/10, 35, 0.
- Artemis (enemy): no price, power 2, 10s, 1, 2, 10/9/10, 35, 0.
- Hermes: 45, 3, 14s, 1, 3, 30/14/10, 35, 2.
- Breach Missiles: 65, 3, 22s, 1, 4, 30/56/10, 35, 3.
- Hull Missile: 65, 2, 17s, 1, 2*, 10/27/10, 35, 3. Enemies never use it.
- Swarm: 65, 2, 7s, 1–3 shots, 1*, 10/9/0, 45, 4. Advanced Edition. Enemies never use it.
- Pegasus: 60, 3, 20s, 2, 2, 30/14/10, 35, 3. Enemies never use it.
- Boss Missile: no price, power varies, 11.5–28.75s*, 3, 1, 30/14/0, 35, 0. The flagship missile does not spend ammo. (`The Rebel Flagship`)

Bombs (`Template:Bomb weapons`): price, power, charge, system damage, crew damage, fire/breach/stun cell, rarity. They never damage hull. They can be fired at your own ship. Repair Burst never misses your own ship. Heal Bomb can miss the enemy. (`Template:In-game tips`)

- Small Bomb: 45, 1, 13s, system 2, crew 30, 10/0/0, rarity 1.
- Breach Bomb I: sells 25, 1, 9s, 1, 30, 0/100/0, 0.
- Breach Bomb II: 60, 2, 17s, 3, 45, 0/100/0, 4.
- Fire Bomb: 50, 2, 15s, 0, 30, 100/0/0, 2.
- Ion Bomb: 55, 1, 22s, 0*, crew 0, 0/0/20, 3.
- Stun Bomb: 45, 1, 17s, 0*, 0*, 0/0/100, 2. Advanced Edition.
- Healing Burst: 40, 1, 18s, 0, crew −150, no fire cell, rarity 3.
- Repair Burst: 40, 1, 14s, system −8, crew 0, no fire cell, rarity 3.
- Lock Bomb: 45, 1, 15s, 0*, 0, no fire cell, rarity 0*.

Crystal (`Template:Crystal weapons`): purchasable only in Hidden Crystal Worlds. Projectiles pierce one shield layer and can be shot by Defense Drone I and II. Columns: price, power, charge, shots, damage, breach/stun cell, speed, rarity.

- Crystal Burst I: 20, 2, 15s, 2, 1, 10/10, speed 50, rarity 1.
- Crystal Burst II: 20, 3, 17s, 3, 1, 10/10, 50, 4.
- Heavy Crystal I: 20, 1, 13s, 1, 2, 10/20, 50, 2.
- Heavy Crystal II: 20, 3, 19s, 1, 4, 100/20, 50, 5.

Crystal weapons pierce a single shield layer. Only shields level 2 and higher stop them, per the weapon tip; Heavy Pierce is the other one-layer bypass. (`Template:In-game tips`, `Shields`)

## 10. Drones

- Drone keys are 5, 6, and 7. Clicking the schematic does the same. (`Drone Control`, `Template:In-game tips`)
- Deploying spends one drone part, then the drone needs constant power. (`Template:In-game tips`)
- Power drops from the rightmost drone slot when the system is damaged, same ordering rule as weapons. (`Template:In-game tips`)
- Drag to reorder. (`Template:In-game tips`)
- Hacking also spends a drone part to launch. (`Hacking`, `Stores and resources`)
- Drone Recovery Arm returns non-destroyed external drones on jump so the part can be reused: combat drones after the fight, defense drones when the jump starts. (`Augmentations`)
- Ship interior drone power and behavior are on `Drone Control`. Prices and power:

| Drone | Scrap | Rarity | Power | Other stated stat |
| --- | --- | --- | --- | --- |
| Combat I | 50 | 2 | 2 | |
| Combat II | 75 | 5 | 4 | |
| Beam I | 50 | 3 | 2 | beam speed 3 |
| Beam II | 60 | 5 | 3 | beam speed 8; Advanced Edition |
| Fire Drone | 50 in the purchasable list the control page prices the fire drone at 50 with rarity 4; the purchasable-drone template cell labeled Fire Drone is 60 / 4 |  | 3 | beam speed 2; Advanced Edition |
| Defense I | 50 | 1 | 2 | shoots missiles and some other incoming shots |
| Defense II | 70 | 3 | 3 | |
| Anti-Combat | 35 | 1 | 1 | Advanced Edition |
| Shield Overcharger | 60 | 4 | 3 | Advanced Edition |
| Shield Overcharger + | not a store item | 0 | not stated here | equipped on Stealth C |
| Anti-Personnel | 35 | 2 | 2 | health 150 |
| System Repair | 30 | 1 | 1 | health 25; repairs, seals breaches, and fights fires at Engi speed |
| Hull Repair | 85 | 4 | not stated in the price block read | repairs hull |
| Boarding | 70 | 4 | 3 | health 150; speed 18 in space |
| Ion Intruder | 65 | 4 | 3 | health 125; speed 18; ion pulse 3 and a stun; Advanced Edition |

The Fire Drone price conflict is the two templates/sections above; both are in the dump. (`Template:Purchasable drones`, `Drone Control`)

- Offensive drones pick a new angle at least 90 degrees from the last, but the game does not wrap 360 degrees, so they can fire faster on the right side of the enemy. (`Drone Control`)
- Defense drones can shoot asteroids and often miss before the rock drops a shield. (`Environmental Hazards`)
- Drone Control system level costs are on that page's upgrade table. The per-level scrap numbers were not copied into this spec beyond the store purchase price.

## 11. Crew

- Eight races. Lanius needs Advanced Edition. (`Crew`)
- A ship starts with 1 to 4 crew and holds 8. A ninth crew forces you to dismiss someone. (`Crew`, `Ship`)
- Losing every crew member is a game over, same as losing all hull. (`Crew`, `Game Over`)
- Orders can be given while paused. (`Template:In-game tips`)
- Desktop click-to-move is **not stated** as its own sentence. The iPad page states the touch form (section 19).
- Select crew 1–8 is F1–F8. Select all crew is Q. Return to stations is Return. Save stations is `/`. (`ConfigureControls1.png`)
- Crew box is where the Crystal ability is clicked, or key P. (`Crystal Lockdown`)
- Skill is gained by manning. Doors and sensors do not train a skill; manning them adds one system level. (`Systems`)
- Ionized, damaged, hacked, on fire, breached, or intruder-occupied systems cannot be manned, except auto-ships keep the manning bonus until the system is damaged. (`Systems`)
- Medbay heals crew inside it. Clone Bay clones the dead with a skill penalty and heals a little per jump with no power. They replace each other. (`Systems`, `FTL: Advanced Edition`)
- Comparison (`Template:Crew races (comparison)`). Columns: store cost, max health, repair multiplier, seconds per fire, combat multiplier, move multiplier, blue-option count.

| Race | Cost | HP | Repair | Fire (s) | Combat | Move | Blue options | Stated trait |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Human | 45 | 100 | ×1 | 10.4 | ×1 | ×1 | 1 | −10% experience required |
| Engi | 50 | 100 | ×2 | 5.2 | ×0.5 | ×1 | 8 | exceptional engineers (`Engi`) |
| Mantis | 55 | 100 | ×0.5 | 20.8 | ×1.5 | ×1.2 | 2 (3) | warrior race (`Mantis`) |
| Rock | 55 | 150 | ×1 | 6.2 | ×1 | ×0.5 | 5 (6) | immune to fire |
| Zoltan | 60 | 70 | ×1 | 10.4 | ×1 | ×1 | 2 | +1 power in the room they occupy |
| Slug | 45 | 100 | ×1 | 10.4 | ×1 | ×1 | 10 (11) | immune to mind control; shows living enemy crew |
| Crystal | 60 | 125 | ×1 | 12.5 | ×1 | ×0.8 | 3 | Lockdown; −50% suffocation damage |
| Lanius | 50 | 100 | ×1 | 10.4 | ×1 | ×0.85 | 11 | immune to suffocation; drains oxygen in the room |

- Unmodified crew damage is 3–7 HP per hit. System sabotage is the same for every race. An untrained human takes 12.5 seconds to repair one system bar or one breach. (`Template:Crew races (comparison)`)
- Zoltan power is not halved by ion storms and is not stripped by ion weapons. Subsystems cannot be ion-proofed by a Zoltan. (`Ship`)
- An enemy Zoltan death can kill crew with the explosion's recoil. The player-Zoltan explosion damage number is **not stated** on `Game Over` beyond that sentence. (`Game Over`)
- Crystal Lockdown (key P) coats the room so nobody passes. It does not stop airlocks. Open-all-doors (Z) overrides the coating. A broken door stays open 7 seconds. (`Crystal Lockdown`, `Door System`)
- Names can be changed mid-run. Same-race crew can have different colors. (`FTL: Advanced Edition`)

## 12. Systems and power

GUI order, left to right: Shields, Engines, Medbay, Clone Bay, Oxygen, Crew Teleporter, Cloaking, Mind Control, Artillery Beam, Flak Artillery, Hacking, Weapon Control, Drone Control, then subsystems Piloting, Sensors, Door System, Backup Battery. (`Systems`)

- Left-click the system bar to add one power. Right-click to remove one. (`Systems`)
- Middle-row keys match systems in the order they are present: the key adds one bar, Shift+key removes one bar. (`Systems`)
- The default picture names the power keys, which are not a strict A-S-D-F walk of the GUI order: Shields A, Engines S, Oxygen F, Medbay/Clone D, Teleporter G, Cloaking H, Mind Control K, Hacking L, Artillery Y, Weapons W, Drones E. De-power keys and "Power System 1–8" are unbound (`....`) in that picture. (`ConfigureControls2.png`)
- Subsystems are always powered until damaged. (`Systems`)
- Reactor holds 25 bars. Bar costs: 1–5 cost 30 each, 6–10 cost 20, 11–15 cost 25, 16–20 cost 30, 21–25 cost 35. Fully upgrading from 8 power costs 490 scrap. (`Ship`, `Template:Reactor power cost`)
- Absolute power cap stated: 25 reactor + 8 Zoltan + 4 battery = 37. (`Ship`)
- Enemy ships have exactly enough reactor power to run their ship, except ion storms halve it. (`Ship`)
- Self-ion cooldown is usually 20 seconds after a timed system ends. Teleporter cooldown is 20 / 15 / 10 seconds at level 1 / 2 / 3. Battery cooldown is 20 seconds, or 10 with Battery Charger. Maximum cooldown from extra ion is 25 seconds. (`Systems`)
- Ion lock persists across jumps and clears at a safe beacon, except Clone Bay stays ionized for the full time. Teleporter and Cloaking do not reset their cooldown when jumping from a danger beacon. (`Systems`)
- Any ion at all on Door System blocks door controls, including hotkeys. (`Systems`)

Shields (`Shields`). Each bubble blocks one laser, flak, or asteroid. Beams do not pop bubbles; extra beam damage goes through. Layers: every 2 system levels adds one bubble. Recharge: layers 1 and 2 in 2 seconds, 3rd in 1.72, 4th in 1.5, 5th in 1.33. Manning adds 10 / 20 / 30% recharge rate by skill. Upgrade scrap: level 2 is 100 or 125 (100 is Zoltan B's upgrade from 1 to 2); then 20, 30, 40, 60, 80, 100 to reach levels 3 through 8 (4 bubbles). Enemies can have level 9 or 10 (5 bubbles).

Engines (`Engines`). Dodge everything except beams. Powered-level evasion with a working pilot: 5, 10, 15, 20, 25, 28, 31, 35% at levels 1–8. Upgrade scrap: 10, 15, 30, 40, 60, 80, 120 for levels 2–8. Manning adds +5 / +7 / +10% evasion by engines skill and also speeds FTL. Piloting manning adds evasion and does not speed FTL. Combined manning bonus is at most +20%. No working pilot (level 1 empty, stunned, or mind-controlled) or a hacked engines or piloting system sets evasion to 0. Autopilot is 50% of evasion at Piloting 2 and 80% at Piloting 3, minimum 2% with unmanned engines and Piloting 2. FTL Recharge Booster multiplies charge time by 80%, two by 67%, three by 57%.

Oxygen (`Oxygen`). Refills air. A room turning from tan to red, with red hazard stripes, means oxygen is failing; crew take damage and fires die. (`Template:In-game tips`) Upgrade increases refill rate. Level numbers for the rate are on the Oxygen page table and are **not copied here**.

Medbay and Clone Bay. Medbay heals inside the room; higher level heals faster. Clone Bay is Advanced Edition, replaces the medbay, clones combat and event deaths unless it is broken mid-clone, and jump-heal needs no power. (`Systems`, `FTL: Advanced Edition`, `Clone Bay`)

Teleporter. Sends crew to the enemy ship. Keys: send T, return R. (`ConfigureControls1.png`, `Crew Teleporter`) Zoltan Shield blocks teleporter and boarding drones unless Zoltan Shield Bypass is installed. Event boarders still arrive, with the line that they must have a Super Shield bypass. (`Boarding`, `Augmentations`)

Cloaking. Key C. +60 evasion even with no pilot. Firing a non-beam weapon shortens the cloak unless Stealth Weapons is installed. Beams do not shorten it. (`Cloaking`, `Game patches`, `Augmentations`)

Mind Control. Key M. Needs vision of the crew. Slugs are immune. Higher levels last longer and add health and combat. (`Mind Control`, `FTL: Advanced Edition`) Mind-controlled crew cannot be selected with hotkeys. (`Game patches`)

Hacking. Key N. Spends a drone part, locks the room's doors, grants vision, then a pulse. Stated pulse examples: drones self-destruct; weapons charge down; shields decharge; teleporter recalls boarders; medbay hurts; mind control flips to the enemy crew. (`Hacking`, `FTL: Advanced Edition`) Hacking Stun stuns crew in the room for the pulse, yours and theirs. (`Augmentations`)

Artillery (Federation) and Flak Artillery. Key Y for artillery. They are main systems. More power, faster cooldown. (`Systems`, `Artillery Beam`, `Flak Artillery`)

Door System. Open and close doors and airlocks. Level 1 is remote doors (60 scrap; Rock B does not start with it). Level 2 blast doors, 35 scrap. Level 3 improved, 50 scrap. Level 4 exists only while manned. (`Door System`) Keys: open all Z, close all X. (`Door System`, `ConfigureControls1.png`) Pictures: `Door_System_room.png`, `Door_System_door_status_toggle_buttons.png`. Hits to break a door, levels 2 / 3 / 4: Hard 6 / 10 / 15, Normal 8 / 12 / 18, Easy 12 / 16 / 20. Broken doors stay open 7 seconds, then close if Close All was ordered. Closed doors slow fire 1.75×; blast doors 10×. (`Door System`) Venting puts out fires. (`Fires`, `Template:In-game tips`)

Sensors. Reveals your interior and enemy information. If the ship goes dark, the sensors subsystem is down. (`Template:In-game tips`, `Sensors`) Nebulas disable sensors. Level 3 shows enemy weapon cooldowns. Level 4 shows power bars. Manning adds a level. The flagship caps your sensors at level 2. (`Game patches`, `The Rebel Flagship`)

Piloting. Required to dodge and to jump. Level 2 and 3 add autopilot. (`Piloting`, `Engines`)

Backup Battery. Key B. Advanced Edition subsystem. Level 1: 35 scrap, 2 bars for 30 seconds. Level 2: 50 scrap, 4 bars for 30 seconds. Then 20 seconds cooldown (10 with Battery Charger). Not halved by ion storms. If hacked, the bars drop and 2 real reactor bars are drained for the hack. Picture: `Backup_Battery_interface.png`. (`Backup Battery`, `Ship`, `FTL: Advanced Edition`)

The Advanced Edition also says the battery cooldown is 25 seconds in one official-site summary, and the system page says 20 seconds after a 30-second boost. Both sentences are in the dump. (`FTL: Advanced Edition`, `Backup Battery`)

## 13. Augments

Three augment slots. Cargo cannot hold a fourth. Most stat boosts stack. Non-stacking augments are greyed out in the store if owned. (`Augmentations`, `Template:In-game tips`)

Purchasable, price and rarity, then the quote on the page:

- Automated Re-loader, 40, rarity 2. "Cooldown between weapon shots is improved by 10 percent."
- Defense Scrambler, 80, 4, Advanced Edition. "Prevents enemy defense drones from targeting anything."
- Explosive Replicator, 60, 3, Advanced Edition. "Missile based weapons have a 50 percent chance of not using a missile."
- Hacking Stun, 60, 3, Advanced Edition. "All crew inside a room during a Hacking Pulse will be stunned for the duration."
- Stealth Weapons, 50, 3. "Prevents your weapon fire from disrupting your cloak, allowing you to shoot at will while cloaked."
- Weapon Pre-Igniter, 120, 4. "Weapons are made immediately available after an FTL jump."
- Zoltan Shield Bypass, 55, 3, Advanced Edition. "Allows crew/bomb teleportation and mind control to work through Zoltan Shields." Hacking drones still die on a Zoltan Shield.
- Fire Suppression, 65, 3, Advanced Edition. "Automatically put out fires throughout the ship."
- Repair Arm, 50, 3. "Repairs your hull every time you collect scrap, but reduces scrap collected by 15 percent." The repair is 2 hull. It does not reduce the score's scrap total. (`Score`)
- Reverse Ion Field, 45, 2. "Protects your ship from ion damage, giving a 50 percent chance to negate it entirely." Two or more make the ship immune, including a Zoltan Shield.
- Shield Charge Booster, 45, 2. "Boosts the ship's shield recharge rate by 15 percent." That is rate, not a 15% shorter time.
- Backup DNA Bank, 40, 2, Advanced Edition. "Your crew is safe in clone storage even if the system is off or broken."
- Emergency Respirators, 50, 2, Advanced Edition. "Crew take half damage from low oxygen."
- Reconstructive Teleport, 70, 3, Advanced Edition. "Crew gets fully healed by teleportation." Also heals mind-controlled enemies.
- Adv. FTL Navigation, 50, 3. "Allows the ship to jump to any previously visited Beacon."
- Distraction Buoys, 55, 3, Advanced Edition. "Leaves a false signal at sector start to delay Rebels 1 jump."
- FTL Jammer, 30, 3. "Scramble enemy ships' FTL computers, doubling the time it takes for them to jump."
- FTL Recharge Booster, 50, 2. "The ship's FTL Drive powers up 25 percent faster."
- Battery Charger, 40, 2, Advanced Edition. "Backup Battery's lock time is halved."
- Drone Recovery Arm, 50, 2. "Non-destroyed drones will be retrieved when jumping, allowing their parts to be reused."
- Lifeform Scanner, 40, 3, Advanced Edition. "Detects the location of any life forms, even when sensors don't function."
- Long-Ranged Scanners, 30, 1. "Adds additional info about nearby Beacons on the star map."
- Scrap Recovery Arm, 50, 1. "Allows the ship to collect 10 percent more scrap from any source." Rounded down. Extra scrap from this arm does not count toward score. (`Score`)

Not sold in stores (equipped or quest):

- Crystal Vengeance. 10% on taking damage to fire a shard: 1 damage, 10% breach, 20% stun for 3 seconds with Advanced Edition, ignores shields, can still miss. (`Augmentations`)
- Damaged Stasis Pod. No function until a quest repairs it into Ruwen. (`Augmentations`)
- Drone Reactor Booster. Crew-drone move speed +25% (from 50% of crew speed to 62.5%). (`Augmentations`)
- Engi Med-bot Dispersal. Heals outside the medbay, 1.6 HP per second. (`Augmentations`)
- Mantis Pheromones. Crew move +25%, on your ship and while boarding. (`Augmentations`)
- Rock Plating. 15% to negate hull damage; the system in the room is still damaged. (`Augmentations`)
- Slug Repair Gel. Seals all breaches at 75% of crew speed. (`Augmentations`)
- Titanium System Casing. 15% to negate system damage on a hit; hull damage still applies. Not solar flares, fire, or sabotage. (`Augmentations`)
- Zoltan Shield. On arrival, a green shield absorbs 5 damage before normal shields and hull. Only an FTL jump recharges it. (`Augmentations`, `Zoltan Shield`)

## 14. Resources

Scrap is the currency for upgrades, reactor bars, store goods, and some event choices. (`Scrap`)

- Score scrap `s` is scrap collected, excluding the starting 30/10/0, scrap from selling, and Scrap Recovery Arm bonus. Repair Arm does not subtract from `s`. (`Score`)
- Fight and event scrap depends on sector number, tier, and difficulty. (`Scrap`, `Rewards`)

Low / medium / high scrap by sector (`Template:Scrap rewards (Easy)`, `Template:Scrap rewards (Normal)`, `Template:Scrap rewards (Hard)`):

| Sector | Easy | Normal | Hard |
| --- | --- | --- | --- |
| 1 | 10–14 / 16–27 / 27–32 | 7–10 / 12–19 / 19–23 | 7–10 / 12–19 / 19–23 |
| 2 | 13–18 / 21–35 / 35–41 | 10–14 / 16–27 / 27–32 | 7–10 / 12–19 / 19–23 |
| 3 | 16–23 / 26–42 / 42–51 | 13–18 / 21–35 / 35–41 | 10–14 / 16–27 / 27–32 |
| 4 | 19–27 / 31–50 / 50–60 | 16–23 / 26–42 / 42–51 | 13–18 / 21–35 / 35–41 |
| 5 | 22–31 / 36–58 / 58–69 | 19–27 / 31–50 / 50–60 | 16–23 / 26–42 / 42–51 |
| 6 | 25–35 / 40–66 / 66–79 | 22–31 / 36–58 / 58–69 | 19–27 / 31–50 / 50–60 |
| 7 | 28–39 / 45–74 / 74–88 | 25–35 / 40–66 / 66–79 | 22–31 / 36–58 / 58–69 |
| 8 | 31–44 / 50–81 / 81–97 | 28–39 / 45–74 / 74–88 | 25–35 / 40–66 / 66–79 |

Fuel. "Powers your FTL drive. One jump per fuel." Every jump costs 1, including backtracking. All ships start with 16. Store price 3; refuel events 2. (`Stores and resources`)

Missiles. "Multipurpose ammo for any missile based weapon." One per missile or bomb shot. (`Stores and resources`)

Drone parts. "Allows you to deploy drone schematics you've found. Each deployment costs one drone part." Also one per hacking launch. (`Stores and resources`)

Hull. Player ships start at 30 maximum. Repair at stores, with a Hull Repair Drone, with Repair Arm, at some events, and at Last Stand repair beacons. (`Ship`)

## 15. Sectors

Groups: Civilian (green), Hostile (red), Nebula (purple), plus Hidden Crystal Worlds (never on the choice map) and The Last Stand. (`Sectors`)

Named types on `Sectors`: Civilian (Starting), Civilian, Engi Controlled, Engi Homeworlds, Zoltan Controlled, Zoltan Homeworlds, Abandoned, Mantis Controlled, Mantis Homeworlds, Pirate Controlled, Rebel Controlled, Rebel Stronghold, Rock Controlled, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Hidden Crystal Worlds, The Last Stand.

- The starting sector is always sector 1 and is not the same as a later Civilian sector: fewer stores, items, quests, and nebulas. (`Sectors`)
- Starting-sector beacon rolls: 0–4 nebula, 1–2 stores, 1 items event, 2–4 neutral civilian, 1–2 empty, 1–2 distress, 4–6 hostile civilian, 1 quest, 2 hostile1. The page warns these counts are the event-list rolls, not a guarantee of what you see. (`Sectors`)
- Each other sector section on `Sectors` states its own beacon rolls, crew rarities, and soundtrack. Those per-sector rolls are **not repeated here**; the page is the source.
- Sector 8 is always The Last Stand, once per run. On entry the ship gets 10 hull repairs and 10 fuel. The flagship is on the right and jumps every two jumps you make. The fleet takes random beacons (flashing red), not a wall from the left. The Federation base is right of center, cannot be taken by the fleet, and acts as an empty beacon. Three repair stations: 15 hull, 22–44 scrap, 5 fuel, 4 missiles, 5 drone parts, once each. Beacon rolls: 1 store, 3 repair stations, 6 hostile, 7–10 neutral. (`Sectors`, `Beacons`)
- Hidden Crystal Worlds is not offered on the map. Exit from it does not let you choose the next sector. (`Ancestry`)
- Exploring is how you upgrade; the exit is not the only goal. Later sectors are harder. (`Template:In-game tips`)

## 16. Rebel fleet

- The fleet is the red area on the map, plus arrows and the word "warning" for where it will be after one jump. Picture: `Rebels.png`. Page: `Rebel Fleet`. Trailer still: `FTL AE Pursuit.png`.
- It advances every jump. (`Rebel Fleet`, `Template:In-game tips`)
- A beacon the fleet has taken shows two exclamation marks in a red circle. Hover text: "The Rebels have expanded their search here. Very dangerous." (`Rebel Fleet`)
- Jumping into the fleet fights a Rebel Elite. The only reward is 1 fuel. If you are out of fuel when they take your beacon, destroying that Elite yields 4 fuel. (`Rebel Fleet`)
- Letting a charging Rebel scout or auto-ship escape, or failing to jump before they do, doubles pursuit for one turn. The Rebel transport does not. (`Rebel Fleet`)
- A mercenary can delay the fleet 2 turns. Other events delay or speed it. (`Rebel Fleet`)
- A nebula beacon in a non-nebula sector halves that turn's advance. In a nebula sector the reduction is one fifth. Distraction Buoys delay the first advance of a sector by 1. (`Rebel Fleet`, `Environmental Hazards`)
- Taking a beacon erases its old event and hazard. A taken nebula becomes an ion storm, except nebula exits. (`Rebel Fleet`)
- The fleet's anti-ship battery fires a shot of 3 hull damage plus a breach. It can be dodged, including by cloak, or left behind by jumping. It is not on nebula beacons, with the out-of-fuel exceptions on `Rebel Fleet`. It is never on Easy exit beacons. (`Rebel Fleet`, `Environmental Hazards`)

## 17. Environmental hazards

While one of these is active, the ship is IN DANGER (section 8). (`Environmental Hazards`)

- Red giant. Flares every 28–34 seconds, warning 5 seconds ahead. Shields up: 1 or 2 fires. Shields down: 3–6 fires. A room with one new fire has a 33% chance of 1 hull and system damage; two fires, 66%. Extra shield layers do not change this. A Zoltan Shield counts as shields up. Pictures: `Solar_Flare_danger.png`, `Solar_Flare_text.png`. (`Environmental Hazards`)
- Asteroids. Each rock, if not dodged, drops one shield layer or deals 1 hull and 1 system damage in a random room, with a small chance of fire or breach. They hit the enemy too. The gap between rocks is random and shortens as your shield system level rises, even if the shields are currently down. Pictures: `Asteroid_danger.png`. (`Environmental Hazards`)
- Pulsar. Advanced Edition only. An ion pulse every 11–18 seconds, warning 5 seconds ahead, ionizes 2 random systems on each ship. Ion amount is 1 + 0.5 × system power, rounded down. If shields are powered, one of the two hits is always shields. A Zoltan Shield absorbs the pulse (3 or 4 ion) unless the ship has no shield system, in which case the pulse ignores the Zoltan Shield. Pictures: `Pulsar_danger.png`, `Pulsar_text.png`. (`Environmental Hazards`)
- Nebula. Sensors off. Fleet slower (section 16). Not an environmental danger for the Tactical Approach achievement. Picture: `Danger_nebula.png`. (`Environmental Hazards`)
- Plasma / ion storm. Main reactor runs at half. Spare power left in the reactor before the jump avoids an automatic power drop. Battery power and Zoltan power are not halved. Picture: `Danger_storm.png`. (`Environmental Hazards`, `Ship`)
- Anti-ship battery. Shield-piercing 3 damage, random room, always a breach, can be dodged, cannot be shot down, ignores a Zoltan Shield (the shield takes none of it; the hull does). Picture: `ASB_danger.png`. (`Environmental Hazards`)

## 18. The flagship

Page: `The Rebel Flagship`. Pictures: `Flagship1stStage.png`, `Rebel_Flagship_-Outside_Phase_1-.png`, and the phase 2 and 3 pairs `Flagship2ndStage.png`, `Rebel_Flagship_-Outside_Phase_2-.png`, `Flagship3rdStage.png`, `Rebel_Flagship_-Outside_Phase_3-.png`.

- It is in The Last Stand. Its silhouette marks a beacon. It reaches the base in 6, 8, or 10 turns (every two jumps you make). Three turns sitting on the base destroys the base. (`The Rebel Flagship`, `Sectors`)
- Three stages. After stage 1 and 2 it jumps away, waits one turn, then jumps toward the base. Hull, systems, breaches, and fires reset next stage. Crew persist, except a retreat during stage 1 replaces the crew. (`The Rebel Flagship`)
- Stage 1 and 2 each pay a high scrap reward at sector-1 value. Stage 3 pays no scrap reward. (`The Rebel Flagship`)
- Weapons are artillery rooms. They are not manned. They do not spend missiles. (`The Rebel Flagship`)
- Your clone bay can revive crew left aboard after it jumps. Other fights cannot. (`The Rebel Flagship`)
- Sensors against it are capped at level 2. (`The Rebel Flagship`)

Stage 1. Hull 20. Reactor 42. Crew 11 Humans. Drone parts 10. Weapons: Boss Ion, Boss Laser, Boss Missile, Boss Beam, each artillery level 3. Systems: Piloting 3, Shields 8, Doors 3, Cloaking 2, Medbay 3, Engines 2, Oxygen 2, Hacking 3 if Advanced Edition. Dodge 10% base, 20% manned, 8% if piloting is empty, 20% if the AI is in control. Crew are unskilled on every difficulty.

Stage 2. Hull 22. Reactor 44. Crew: whoever lived, minus the ion-room crew if that one lived. Drone parts 10. Weapons: Boss Laser, Boss Missile, Boss Beam. Systems: Piloting 3, Shields 8, Medbay 3, Engines 3, Oxygen 2, Drones 8. Lost: hacking, doors, cloaking. Drones: Combat I, Beam I, Defense I, Boarding (boss), each power 2 in the list. Power surge: 4 / 6 / 7 extra Combat I and Beam I by difficulty, 20–30 seconds apart, 5-second warning, two shots then they vanish, not stopped by hacking the drone system, and they do not spend drone parts. Dodge 15% base, 25% manned, 12% empty piloting, 25% AI.

Stage 3. Hull 20. Reactor 32. Zoltan Shield 12. Crew: survivors minus the beam-room crew if that one lived. Weapons: Boss Laser and Boss Missile at artillery level 4. Systems: Piloting 3, Shields 8, Teleporter 2, Medbay 3, Engines 6, Oxygen 2, Mind Control 3 if Advanced Edition. Drones are gone. Power surge alternates a 7-shot laser volley with a full Zoltan Shield restore on every 4th surge. Cooldown 20–30 seconds, warning 5 seconds. Crew aboard when the shield returns are stuck until it breaks, unless you have Zoltan Shield Bypass. Those surge lasers are Heavy Laser I art but deal 1 damage, with 30% fire, 21% breach, 20% stun. Dodge 28% base, 38% manned, 22% empty piloting, 38% AI.

Flagship weapon chances: lasers 10% fire and 9% breach; missiles 30% fire and 14% breach; no stun on the artillery weapons. Charge times are a table on the page by system level. (`The Rebel Flagship`)

Easy shield exception and Hard connecting rooms: section 3.

Victory text and picture: section 19.

## 19. End of run

Victory. Destroying the flagship ends the run as a Federation victory. The credits picture shows "Thanks to the valiant effort of:", the ship name, "And her successful crew:", the crew names, and "The Rebel's flagship was destroyed, throwing their fleet into chaos and ensuring a Federation victory." Picture: `Victory.jpg` (also `Victory-0.jpg`, `Flawless_Victory.png`). (`The Rebel Flagship`, `Game patches`)

- The credits and victory screen close only with Escape, not a stray key. (`Game patches`)
- After a win or a loss, stats and a score are shown. (`Score`, `FTL: Faster Than Light (about the game)`)
- Score = (s + 10b + 20k) × D, rounded down. `s` is eligible scrap (section 14). `b` is beacons visited: the first beacon of sector 1 counts; rebel-controlled or about-to-be-controlled beacons do not; revisits count if not rebel-held; in sector 8, waiting counts, except waiting while the flagship is jumping toward that beacon, and waiting at the base with the flagship incoming does not. `k` is ships defeated, not the flagship. `D` is 1 / 1.25 / 1.5. (`Score`)
- High scores can be viewed later in the high scores section if they beat previous ones. (`FTL: Faster Than Light (about the game)`, `Score`)
- A world-record figure and a "fleet farming" method are described on `Score`. They are not a control spec.

Defeat (`Game Over`):

- Hull gone. Picture `Gameover_explode.png`. Text: "One last explosion marks your fate as your ship is torn apart."
- All crew dead. Picture `Gameover_crewdeath.png`. Text: "All crew members have died. Your ship will continue to drift for eternity, or until looters destroy it."
- Flagship holds the Federation base for three turns. Picture `Gameover_rebelvictory.png`. Text: "The Rebel Flagship is within range of the Federation Base. All is lost, they've won." The picture also shows SCORE and "New High Score!" when that run qualifies.
- All three pictures show STATS, RESTART, HANGAR, MAIN MENU, QUIT.
- Dying in the tutorial uses different copy: "Somehow you've died during the introduction training exercise. Feel free to try again but this doesn't bode well for your mission." Picture: `Death_message.PNG` and `Tutorial_death_message.PNG`.
- A clone-bay queue with a destroyed clone bay and no way to repair it, while Backup DNA Bank is installed, can soft-lock without the game-over screen. (`Crew`)

What the STATS panel lists, field by field, is **not stated** beyond the score formula.

## 20. Options, pause, stats

Stated options (`Template:In-game tips`, `Game patches`, `ConfigureControls1.png`, `ConfigureControls2.png`):

- Escape opens the in-game menu. From there you can restart or change options.
- The options menu turns sound effects and music on or off.
- Event font size is customizable. The tip says +/- . The control picture labels Increase Event Font as `-` and Decrease Event Font as `=`.
- Colorblind mode changes palettes and adds symbols.
- Hotkeys are remapped from Options. Remapping the options button must not open the options screen by itself.
- V-Sync and frame limiting are in options.
- Beacon-hover paths can be enabled.
- Dialog keys have a short delay before they work; the delay can be disabled.
- Fullscreen and resolution behavior is described in the patch notes, including a manual mode in `settings.ini`. The current options-screen layout is **not stated** as a labeled screenshot. `ConfigureControls1.png` and `ConfigureControls2.png` are the control pages only: title CONFIGURE CONTROLS, PAGE 1 and PAGE 2, DEFAULTS, CLOSE.
- Open Options is O on page 1 of that picture.
- Open Upgrades is U. Open Inventory is I. Open Store and Open Crew Manifest are unbound in the picture.

Pause:

- Space pauses and unpauses. Orders and power still work. (`Template:In-game tips`)
- Middle mouse button also pauses. (`Game patches`)
- The iPad pause control is a button at the bottom right. (`FTL iPad Edition`)

Stats: the score formula in section 19, the game-over STATS button, and the high-scores section. No other stats fields are stated.

## 21. Keyboard

Defaults from `ConfigureControls1.png` and `ConfigureControls2.png`, which are pictures of the options pages. Article text that names the same key is cited too. Keys shown as `....` are unbound in the picture.

Page 1:

- F1–F8 select crew 1–8.
- Q selects all crew.
- Return returns crew to stations.
- `/` saves stations.
- P is Secret Alien Ability. The Crystal page calls this Lockdown. (`Crystal Lockdown`)
- Z opens all doors. (`Door System`)
- X closes all doors. (`Door System`)
- C activates cloaking.
- T teleports crew out. R returns them.
- N starts hacking.
- M is mind control.
- B activates the battery.
- 5, 6, 7 are drone slots 1–3. (`Template:In-game tips`)
- 1, 2, 3, 4 are weapon slots. (`Weapon Control`, `Template:In-game tips`)
- V toggles autofire.
- Left Ctrl is Autofire Modifier (hold while aiming). (`Weapon Control`, `Game patches`)
- Space pauses. (`Template:In-game tips`)
- J is FTL jump.
- U opens upgrades.
- I opens inventory.
- Open Store: unbound.
- Open Crew Manifest: unbound.
- O opens options.
- `-` increases event font. `=` decreases event font. The tip text says this is +/- and is customizable. (`Template:In-game tips`)

Page 2, power one bar:

- A shields, S engines, F oxygen, D medbay or clone bay, G teleporter, H cloaking, K mind control, L hacking, Y artillery, W weapons, E drones.
- De-power Shields, Engines, Oxygen, Medbay/Clone, Teleporter, Cloaking, Mind Control, Hacking, Artillery, Weapons, and Drones are unbound in the picture.
- Power System 1–8 and De-power System 1–8 are unbound in the picture.
- The systems article says the middle keyboard row (A, S, D, F, and so on) follows the systems in the order they are installed, and Shift plus that key removes one bar. (`Systems`) That sentence and the named defaults on page 2 are both in the dump; they do not list the same key order.

Also stated, not a separate row on the picture:

- Shift+1 through Shift+4 depowers a weapon. (`Weapon Control`)
- Ctrl+1 through Ctrl+4 flips one weapon's autofire. (`Weapon Control`)
- Escape opens the in-game menu and is the only key that closes the victory screen. (`Template:In-game tips`, `Game patches`)
- On Mac, Left Ctrl plus left-click equals right-click. (`Game patches`)

Any other key is **not stated**.

## 22. Mouse

- Left-click a system in the system bar: add one power. Right-click: remove one. (`Systems`)
- Left-click a weapon slot: arm it. Left-click again: targeting cursor. Left-click a room: fire. Right-click: cancel targeting. Right-click a weapon: depower it. (`Weapon Control`)
- Ctrl plus left-click a weapon slot: flip that slot's autofire. (`Weapon Control`)
- Middle mouse button: pause. (`Game patches`)
- Drag a weapon or drone schematic to another slot. (`Weapon Control`, `Template:In-game tips`)
- Hover a beacon: if the option is on, the path is drawn. (`Game patches`) Hover a rebel-taken beacon: the warning sentence in section 16. (`Rebel Fleet`)
- Tooltips exist for cloaking and teleporting, and they clear when an event or sub-window opens. (`Game patches`)
- Door open/close is also the GUI buttons, including open-all and close-all. Pictures: `Door_System_door_status_toggle_buttons.png`, `Open_the_doors_button.png`, `Close_the_doors_button.png`. (`Door System`)
- Crystal ability can be clicked in the crew box. (`Crystal Lockdown`)
- Store purchases and the SELL tab are clicks. The exact hit targets inside a store are **not stated** beyond the SELL tab and the item slots. (`Template:In-game tips`)
- Ship-menu and upgrade clicks are the Ship menu at the top. (`Systems`)
- How a desktop pointer moves one crewmember (click crew, then room) is **not stated**. The iPad page states that gesture for touch.

## 23. Mobile

The wiki's touch build is the iPad edition, not a phone. It is the PC game on a touch screen, including Advanced Edition, starting on the Kestrel, with the same unlocks. It does not run on iPhone or iPod. No Android version is stated. (`FTL iPad Edition`)

Picture: `IPadWeapons.PNG` (weapon panel on the left). Icon: `FTLiPad.png`.

Where the wiki states a mouse or keyboard action, the touch control is the same action. Do not add gestures the iPad page does not describe.

- Move crew: tap a crewmember, then tap the room. Or drag across several crew, then tap the room. (`FTL iPad Edition`)
- Selecting crew auto-pauses until you pick the room. (`FTL iPad Edition`)
- Firing: tap a weapon in the weapon panel (auto-pause), then tap the target room. That is the touch form of arming and confirming a target. (`FTL iPad Edition`, `Weapon Control`)
- Depower a weapon: tap the Off button in the weapons panel. That replaces right-click. (`FTL iPad Edition`)
- System description: slide an arrow to the right on that system. That replaces the desktop tooltip hover. (`FTL iPad Edition`)
- Pause: the button at the bottom right, same action as Space or the middle mouse button. Auto-pause is additional and is stated only for selecting crew and firing weapons. (`FTL iPad Edition`)
- Keys 1–4, 5–7, system power keys, door keys, jump, and the other keyboard commands have no separate iPad gesture stated. The touch control is the on-screen control that performs that same action (weapon panel, system bar, doors, jump). (`FTL iPad Edition`)
- Achievements also post to Apple Game Center (50 achievements, 20 points each). In-game high scores are not saved to Game Center. (`FTL iPad Edition`)

## 24. Not stated

Collected so a later pass does not invent them:

- Title-menu button labels and their order.
- A labeled diagram of the in-combat HUD (hull number placement, pause button on PC, scrap counter position).
- Desktop click sequence for moving one crewmember.
- The meaning of the hangar glyphs V and Q.
- The STATS panel's fields.
- The full options-screen layout besides the controls pages and the settings named in section 20.
- Per-sector beacon roll tables other than the starting sector and The Last Stand (they are on `Sectors`, and this spec does not copy them).
- Oxygen refill rates by level, Drone Control upgrade scrap by level, and Medbay heal rates by level (they are on those pages).
- Enemy ship loadout tables (they are on `Enemy Ships` and the race ship pages).
- Individual event outcomes (they are on each event article).
