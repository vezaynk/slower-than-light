# Wiki checklist

Pass 2 of the FTL wiki (`ftl.fandom.com`, namespace 0, 1380 pages) against `src/`.

Each page is a check. Each nested line is one testable or observable behavior. A page is checked only when every behavior under it is checked. An open behavior is a rule the sim does not perform yet. A checked behavior is one the sim already performs, including a confirmed absence such as a shot that does not miss, a choice where nothing happens, or a page with no playable rule.

Reactor bars in this code: only shields, engines, oxygen, medbay, weapons, and kits draw power. Piloting, doors, and sensors do not.

## Pass 2 surface

Wired into the hangar (`HULLS`) and the weapon list (`WEAPONS`):

- Mantis A/B/C and Crystal A/B loadouts. Teleporter power on the Mantis layouts is INFERRED. Crystal Vengeance stays unfitted. Mantis A/B/C start with Mantis Pheromones, which speed your crew by 25%. Player hangar cutaways are traced from the hangar pictures. Enemy ships are rolled from the 47 documented classes (`enemy-gen.ts`, `wiki/enemy-ships.ts`). Forty-five interiors are traced in `wiki/enemy-layouts.ts`. Engi Hacker and Crystal Outrider stay generated from the system list (INFERRED). An unlabeled system sits in an empty hall of the largest connected interior (INFERRED). The bitmaps are not copied.
- Wiki weapon rows, except `pike` (the same Pike Beam row is already id `shear`). Boss Laser and Boss Beam are WeaponDefs (`wiki/flagship-weapons.ts`). Their power fields, 4 and 3, are the chosen artillery maxima. No power line is printed, and the sim does not charge them from the Weapons pool. Charge times are the printed table (laser 25/20/15/10, beam 32.5/26/19.5). Boss Ion power is 3. Boss Missile power is 4. The flagship copy of Boss Missile uses breach 0.14.
- Starting guns are mounted even when their power sum is above the powered bars. `powerMask` feeds the list in order; switching one off or raising the weapon bars powers the next. That includes Halberd on Zoltan A, Ion Charger on Zoltan C, Breach Bomb I on Slug A, and Heavy Pierce on Rock B. Anti-Bio on Slug A, Healing Burst on Slug B, Hull Missile on Rock A, Swarm Missiles and Heavy Crystal I on Rock C, Mini Beam on Stealth A, Glaive Beam on Stealth B, Pike Beam on Zoltan B.
- Bombs do not subtract hull. Bomb (Weapons) lead. Printed bomb and beam crew HP is applied. Aiming any bomb at your own ship is a control, and that shot does not miss. Healing Burst adds 150 HP to living crew in that room on the shooter's side, including a leashed crew member. It can still miss the enemy ship. Repair Burst removes 8 system damage, does not miss the shooter's own ship, and does not clear fire or a breach. Neither spends a Zoltan Shield. Heavy Pierce and the four crystal guns ignore one shield layer; a second layer stops the shot and drops one bubble. A Hull Beam deals 2 hull damage on a systemless room, and each shield layer cuts that figure by one. Hull Smasher I and II deal 2 hull damage on a systemless room and do not raise crew damage. A Hull Missile deals 4 hull damage there, and crew stay on the system-room 2 (INFERRED). A drone in the struck room that already has health takes half that crew damage. Beam pierce and beam chain stay gaps. `WeaponDef` has no pierce field.

Enemy systems and fight endings now run (2026-10-04): enemy Cloaking, Crew Teleporter, Clone Bay, Mind Control, Drone Control, and Hacking on either hull (`extras/veil.ts`, `sling.ts`, `cradle.ts`, `leash.ts`, `swarm.ts`, `spike.ts`); escapes and surrenders per Enemy Ships, "Surrenders and escape attempts" (`wiki/escape.ts`, `wiki/surrender.ts`), including the anti-stalemate 2 fuel; boarder and fire sabotage (`extras/sabotage.ts`); Lanius oxygen drain and the Human XP table (`extras/lineage.ts`); repair 12.5 s per bar or breach and fire oxygen 0.96%/s. Each module cites its page and marks INFERRED / INVENTED gaps. Also running (2026-10-04, later): firefighting by the Crew races formula (repair × fire × skill × 8%/s, 0.096 of a fire per second for a Human); external drones lost on an FTL jump; enemy crew AI (`extras/crewai.ts`: stations, shields first, defenders per intruder, two on a fire, heal and flee rules); enemy weapon targeting with the Hard priority list (`wiki/targeting.ts`); hostile encounter lists per sector type (`wiki/sector-hostiles.ts`: the Civilian templates, the other sectors derived from each event page's Locations line); scripted surrender rewards for eight event pages; player hacking controls (dock orb, H, one target per fight). Also running (2026-10-04, last round): the Rebel Flagship's traced per-stage rooms and systems (`wiki/flagship-systems.ts`: stage 1 Cloaking/Hacking/Door/Medbay, stage 2 Drone Control and drone surges, stage 3 Teleporter/Mind Control and the 7-laser or Zoltan surge, crew carry-over, AI takeover); player kits seated in real rooms (`layouts.ts` seatKits; non-traced seats INFERRED, Lark grows a room, INVENTED); player hacking's paused queue, 2–3 s drone flight, and Sensors/subsystem targets; repair skill +10%/+20% (Skills); pirate crews from the sector's race list; five more surrender pages (`wiki/cited-events-surrender.ts`); cited events placed in a seeded order so every sector event can appear. Also running (2026-10-04, final round): Flagship artillery on its own per-stage charge table outside the Weapons pool (`wiki/flagship-weapons.ts`: Boss Laser, Boss Beam), retreat stage memory, drawn surge drones, surge-laser stun (3 s INFERRED), AI dodge off during an Engines/Piloting pulse; staggered damage numbers; quest markers (`wiki/quests.ts`, Beacons page) with every cited event that names one, Slug comm tapping and Engi fleet discussion, page win rewards (`PAGE_WINS`); per-sector beacon mix from the Sectors page "Beacons:" lists (`wiki/beacon-mix.ts`, counts scaled to the ~12-beacon map, INFERRED). Enemy Sensors: the wiki says "Enemy ships do not have Sensors subsystem", so there is nothing to model. Also running (2026-10-05): per-room Flagship artillery (`FlagshipState.guns`); fights can name a ship class (`classIdFor` in enemy-gen.ts); twelve more quest openers with full chains (`wiki/quests-a.ts`, `wiki/quests-b.ts`); ship unlocks (`unlocks.ts`, `unlock-store.ts`; "UNLOCK ALL" in the hangar, `?unlockAll=1`); plain beacons draw from the wiki's NEUTRAL (filler), NEBULA, DISTRESS_BEACON and ITEMS lists and the per-sector Empty beacon pages (`wiki/filler-events.ts`); the invented filler events are removed. Still missing here: maps of 19–24 beacons; 12 of 51 achievements are tracked (`achievement-track.ts`), so most Layout B and C unlocks cannot be earned yet; hacking a Flagship artillery room drains that one gun; distress/items list rows with no card yet (listed in `wiki/filler-events.ts`); boarders-only outcomes with no ship; the exit-beacon text and picket (INVENTED); the Hidden Crystal Worlds jump (Ancient device puts its marker on the current map instead). Filler choices reuse `c:<slug>:<n>` ids and `fillerChoose` runs before `citedChoose`.

Named and still not installed, because they are not an augment or a drone id, or the effect has no field to run in:

- Zoltan Shield is the bubble on Zoltan hulls (`ship.zoltan`), not an augment id. The Flagship's third stage sets that bubble to 12. Shield Overcharger deploys at 3 power and Shield Overcharger + at 2. Both add one Zoltan Shield point after 8, 10, 13, 16, then 20 seconds for 0 through 4 existing layers, and neither adds a point once 5 or more layers are present. Losing power resets that timer. Speed 5 is a flight figure, the same number Defense Drone Mark I prints, and it does not change those waits (INFERRED: not seconds). Neither schematic is stocked. A fitted Shield Overcharger + quotes its sell price of 30. An unfitted copy does not, and the regular Shield Overcharger is not quoted. Stealth C does not start with it. A bubble created while the ship had none is lost on an FTL jump. A bubble that was already present still recharges to 5. Anti-Drone is still a name only. Crystal Vengeance is not sold and no cruiser starts with it. When the player hull drops, a fitted copy has a 10 percent chance to throw a 1-damage shard that ignores regular shields, can miss to evasion, can be shot down by an enemy Defense Drone I or II, and is absorbed by a Zoltan Shield. The shard names no room, so breach and stun are not applied. Drone Reactor Booster is not sold and no cruiser starts with it. When it is fitted, the System Repair drone moves at 62.5 percent of the 0.6 second crew walk instead of 50 percent, and that drone repairs at an Engi's pace, one bar or breach in 6.25 seconds. The booster does not change that pace. Slug Repair Gel seals player breaches at 75% crew repair speed. Engi Med-bot Dispersal heals at 1.6 HP/s outside a powered medbay. Engi A starts with the med-bot. Slug A/B/C start with the gel. Mantis A/B/C start with the pheromones. None of the three is sold. Emergency Respirators halves low-oxygen damage for the player's own crew, including while boarding. A Crystal with it takes a quarter. Enemy hulls that list the augment do not apply it.

Some catalog numbers now run. The rest stay in `src/game/wiki/` and the fight does not use them:

- Flagship stage numbers are written onto the traced cutaway (`flagshipStage` replaces the leftover two-row placeholder). Stage 1: hull 20, reactor 42, shields 8, engines 2, oxygen 2, piloting 3, artillery 3, Cloaking 2, Hacking 3. Stage 2: hull 22, reactor 44, engines 3, Drone Control 8. Stage 3: hull 20, reactor 32, engines 6, artillery 4, Teleporter 2, Mind Control 3, Zoltan Shield 12. Each stage mounts its printed artillery, including Boss Laser and Boss Beam, on that gun's own charge row, outside the Weapons pool. Crew in a lost artillery room (the ion room into stage 2, the beam room into stage 3) are removed. Stages 1 and 2 pay sector-1 high scrap. Stage 3 pays none. Square counts stay 52 / 42 / 32, and Hard adds the two link rooms (4). Hacking one Flagship artillery room drains that gun at its base charge. A weapons hack on a normal ship still drains every gun. A shot or ion on one artillery room slows only that gun. Faction pages drive enemy generation (`wiki/enemy-ships.ts`); the older `enemies-rebel.ts` / `enemies-factions.ts` note catalogs are superseded. `SECTOR_NAMES` stay INVENTED. The Last Stand stamps three Federation Repair Stations and pays 15 hull, scrap 22–44, 5 fuel, 4 missiles, and 5 drone parts once. Jumping into an overtaken beacon, before sector 8, fights a Rebel Elite whose only reward is 1 fuel. Waiting with no fuel when that column arrives pays 4 fuel. The Elite is Elite Fighter or Elite Assault, rolled inside the printed ranges. Store rows now include the printed system prices, catalog augments, and the front of the crew price list. Drone Control is offered as a bundle: 75 scrap with a System Repair Drone, 85 with a Defense Drone Mark I or a Combat Drone Mark I. The store seed picks which of the three and is not advanced (INFERRED). The naked 60 is not a shelf price. Weapons and augments sell for half the purchase price, or for a printed sell line, and that scrap is in the score. Drone schematics are not stocked. Buying Medbay or Clone Bay replaces the other and keeps its level. Twelve of 51 achievements are tracked. Hard flagship wins are stored and are not an achievement. The other 39 stay untracked. Combat Drone Mark II, the Ion Intruder, Shield Overcharger, and Shield Overcharger + remain on the missing-schematic list and are not SwarmKind ids. Mark II deploys at 4 power and fires when its orbit leg finishes. Speed 28 is movement. The page prints no cooldown. A 90 degree leg at Speed 15 takes the 2 second shield restore (INFERRED). The angle check does not wrap. The Ion Intruder has 125 HP and, after a pulse, walks to another system at an inferred 0.6 seconds per room. Speed 18 is the space figure and is not that step. A shut blast door loses two hits a second (INFERRED). A Lockdown coating is a separate 60 hits (INFERRED). The pulse wait is still drawn from 8.2 to 10 seconds. Hull Repair adds one hull point every 3 seconds (INVENTED) for a rolled 3 to 5, then self-destructs. Depowering removes it and does not return the part. Shield Overcharger needs 3 power and Shield Overcharger + needs 2. Both add one Zoltan Shield point after 8, 10, 13, 16, and 20 seconds for 0 through 4 existing layers, then stop. Unpowered time resets that timer. Speed 5 is a flight figure, the same number Defense Drone Mark I prints, and it does not change those waits (INFERRED: not seconds). Neither is stocked. A fitted copy quotes the sell price of 30, and Stealth C does not start with it. A bubble created while none was present is lost on an FTL jump. A bubble that was already present still recharges to 5. The other missing drone schematics stay catalogs.
- Kin gaps, except the Zoltan death burst and the Zoltan power bar. Wiki page "Zoltans", section "Race characteristics": 15 HP to enemy crew in the room, and one power bar for a living Zoltan in shields, engines, oxygen, medbay, or weapons. Ion does not remove that bar. One Zoltan in a full even shield does not free a reactor bar. Two Zoltans replace one shield pair and do not fill a lone buffer. A full weapons or drone system frees one reactor bar per Zoltan, and spare puts it back when they leave. Piloting, sensors, and doors stay unaffected. A living Zoltan in a kit room adds one bar to cloaking, hacking, the teleporter, mind control, drones, the clone bay, and the artillery beam. That bar does not free a reactor bar, except in a full Drone Control system, which frees one per Zoltan and puts it back from spare when they leave. Backup Battery and Flak Artillery do not read it. While cloaking, hacking, the teleporter, or mind control is cooling, a Zoltan who enters that room frees one locked reactor bar. The yellow bar they already grant stands in its place, and leaving does not put the reactor power back. A Zoltan already in the room when the cooldown starts does not peel until they leave and come back. Player Mind Control still has no ordinary cooldown. A drone that already has health and is in the room loses 7.5. That covers the Ion Intruder, the Boarding Drone, the Anti-Personnel Drone, and the System Repair drone. An orbiting drone has no health field. Humans use the printed XP column 13/13/50/58/16/7; other races keep 15/15/55/65/18/8. A living Lanius drains 12 oxygen per second, the same inferred breach rate, and several in one room stack. Repair skill is ×1 / ×1.1 / ×1.2, and that multiplier is inside the fire-fighting share (0.096 of a fire per second for an untrained Human). Rock fire-fighting is 1.67 of that share and Crystal is 0.83. Fire Suppression is not scaled.
- Event slices 0–3: 881 titles classified mechanic or no-mechanic from revision wikitext. 162 of those pages were placed as one beacon in a sector the page names. Later filler, quest, and surrender cards added more, and this audit did not recount them. A map reveal is still not granted. An unnamed weapon or drone schematic is still not granted. A fight uses a documented class of the named faction (47 classes). Out-of-fuel pages are written and not placed, because they name no sector. Engi cache stays separate and partial. A page that states no amount, including Free scrap with resources (Engi), stays unwired. Narrative was not copied in. Rebel defector fights a Rebel ship when the proposal is accepted. The random crew, 3 hull, engine damage, doubled pursuit, and boarders are not applied. Crystal scrap collector spends 35 scrap. The Crystal crewmember, Crystal Lockdown Bomb, and Crystal Burst Mark II are not granted.

Still a picture, or not fetched:

- Forty-five non-flagship interiors are traced in `wiki/enemy-layouts.ts`. Engi Hacker and Crystal Outrider stay generated from the system list (INFERRED). The Rebel Flagship fight uses the traced cutaways. Player hangar cutaways are traced from the hangar pictures, and their square counts are those pictures. The bitmaps are not copied.
- Score. The lead formula runs: D is 1 / 1.25 / 1.5 and the lit hangar button sets scrap to 30 / 10 / 0. Rebel-held beacons still count, because that fleet column is INVENTED. Selling a weapon or augment adds that scrap to s.

## Counts

| | |
|---|---|
| Pages | 1380 |
| Pages fully checked | 942 |
| Behaviors checked | 2700 |
| Behaviors open | 536 |

Recount under `## All pages`. A page line matches `^- \[[ x]\] `. A behavior line matches `^  - \[[ x]\] `. Check a page only when every behavior under it is checked. Do not put `present`, `partial`, `missing`, or `not-a-surface` back on a page line.

The checklist is not complete while any behavior stays open. This was not a new pass of all 1380 pages.

Second pass checked the Score lead formula and the store resource table against the dump and against `runScore` / `rollStock`. Weapon-family rows that still said those guns were absent were corrected against `WEAPONS`. Engines, Mind Control, and Ion Blast Mark II still match the tables the sim reads. Rows that were only a title string in `src/` keep that limit open: the article was not re-opened. Alias, meta, and no-mechanic catalog rows are checked as having no playable rule of their own. A catalog number the fight does not read stays an open behavior. Event prose was not copied into the run.

## Work tracker

| Id | Point | Output | Status |
|---|---|---|---|
| mantis | The Mantis Cruiser A/B/C | hulls-mantis.ts, spread into HULLS | wired loadout. Shared room grid. A/B/C start with pheromones. |
| crystal | The Crystal Cruiser A/B | hulls-crystal.ts, spread into HULLS | wired loadout. Shared room grid. Vengeance unfitted. |
| w-laser | Laser rows | weapons-laser.ts, cited-weapons.ts, cited-chain.ts | wired. Heavy Pierce ignores one shield layer. Chain Burst charges 16/13/10/7 and Chain Vulcan charges 11.1 down to 1.1. Losing power resets either chain. Boss Laser is a WeaponDef. Power 4 is the chosen artillery maximum, not a Weapons-pool cost. Charge times are 25/20/15/10. |
| w-beam | Beam rows | weapons-beam.ts, cited-weapons.ts | crew HP applied (Mini/Pike/Hull 15, Halberd 30, Glaive 45, Anti-Bio 60). Fire Beam dash stays null. A systemless room takes 2 hull damage from a Hull Beam, and each shield layer cuts that figure by one. A drone in the room that already has health takes half the crew damage. A player beam hits the rooms on the straight line between two clicks on the enemy ship. A tiny edge counts. Printed beam length does not shorten that line, and Halberd's 3–5 room sentence is not the room rule. An enemy beam still starts in the aimed room and adds one neighbour (INFERRED). Pierce and chain stay gaps. pike is still id shear. Boss Beam is a WeaponDef. Power 3 is the chosen artillery maximum, not a Weapons-pool cost. Charge times are 32.5/26/19.5. |
| w-ion | Ion Charger, Chain Ion, Boss Ion | weapons-ion.ts, cited-chain.ts | wired. Chain Ion deals 1, then 2, 3, and 4 ion on a 14 second charge. Losing power resets that streak (INFERRED; the section does not print the reset). Ion Charger early fire stays a gap. |
| w-missile | Missile rows other than Artemis and Leto | weapons-missile.ts | wired. Swarm Missiles banks up to 3 at 7 seconds a shot. A click spends one missile for the bank. Autofire spends one missile per shot. Pegasus still fires two from one charge. A 1x2 room keeps 67.85 percent of shots, and each long-side tile takes 8.04 percent. A 2x2 room stays put. An empty long-side tile misses. A 2x1 uses that split. Other shapes have no printed percent. Radius 31 is not resimulated as pixels. |
| w-bomb | Bomb rows other than Fire Bomb | weapons-bomb.ts, cited-weapons.ts | wired. strikeRoom skips hull damage. Printed crew HP is applied (Small and Breach I 30, Breach II 45, Fire Bomb 30; ion, stun, heal, repair, and lockdown bombs 0). Healing Burst adds 150 HP. Repair Burst removes 8 system damage and does not clear fire or a breach. Aiming any bomb at your own ship is a control, and that shot does not miss. |
| w-flak | Adv. Flak, Flak II, crystal weapons | weapons-flak-crystal.ts, cited-weapons.ts | wired. The four crystal guns ignore one shield layer. That 1 is not a WeaponDef field. |
| augs | Augment rows missing from CATALOG | augments-missing.ts, extras/augments.ts | medbot, gel, and pheromone run and are not sold. Engi A, Slug A/B/C, and Mantis A/B/C start with them. Distraction Buoys skip the next advance when the fleet is already at 0. Adv. FTL Navigation is sold for 50 and the jump runs. Defense Scrambler is sold for 80 and blocks a deployed enemy Defense Drone I or II. Drone Reactor Booster stays out of the catalog and, when fitted, moves the System Repair drone at 62.5 percent of crew speed. The repair itself stays an Engi's 6.25 seconds a bar. Zoltan Shield Bypass is sold for 55. Crystal Vengeance stays out of the catalog and sells for the printed 40. The other missing rows stay catalog-only. Emergency Respirators halves the player's own crew, including boarders. A Crystal takes a quarter. Enemy hulls do not carry it. |
| sectors | Sector types | sectors.ts, cited-sectors.ts | Last Stand repair stations pay. Nebula fleet advance is 0.5 or 0.8. SECTOR_NAMES stay INVENTED. Beacon roll counts are not the map. |
| rebels | Rebel and auto-ship rows | enemy-ships.ts, enemy-gen.ts | auto-scout, auto-surveyor, auto-assault, and auto-hacker roll inside printed ranges. The enemies-rebel.ts note catalog is not what the fight reads. |
| flagship | Flagship phase numbers | flagship.ts, flagship-systems.ts, flagship-weapons.ts | traced cutaway per stage (52/42/32 squares, Hard links 4). Stage kits run. Boss Laser and Boss Beam charge on the printed table, outside the Weapons pool. Power 4 and 3 are the chosen artillery maxima. Crew in a lost artillery room are removed. Hacking one Flagship artillery room drains that gun. A normal ship's weapons hack still drains every gun. |
| factions | Other non-player ship pages | enemy-ships.ts | 47 classes drive makeEnemy. The enemies-factions.ts note catalog is not what the fight reads. Forty-five interiors are traced. Engi Hacker and Crystal Outrider stay generated (INFERRED). |
| achievements | Achievement list | achievements.ts, achievement-track.ts, unlocks.ts | 12 of 51 are tracked. Hangar START is off when the layout is locked. Hard wins are stored and are not a rule. The other 39 have no counter. |
| stores | Store resource prices | sim.ts rollStock, cited-stores.ts | fuel, missiles, parts, and hull repair unchanged. Missing systems use the printed prices except Drone Control (75 and 85, unlabeled). Catalog augments and the front of the crew list are offered. Weapons and augments sell for half the purchase price, or for a printed sell line. citedStock adds 1, 2, or 3 slots from the seed, on top of the weapon slot in rollStock. Buying Medbay or Clone Bay replaces the other and keeps its level. Drone schematics are not stocked. A fitted Shield Overcharger + quotes 30 scrap. A bought system does not add a room. |
| drones | Drone schematics missing from swarm.ts | drones-missing.ts | Combat Drone Mark II deploys at 4 power and fires when its orbit leg finishes. Speed 28 is movement. The page prints no cooldown. A 90 degree leg at Speed 15 takes the 2 second shield restore (INFERRED). The angle check does not wrap. The Ion Intruder has 125 HP, pulses inside 8.2–10 seconds, applies 3 ion, stuns for 6 seconds, and then walks to another system at an inferred 0.6 seconds per room. Speed 18 is the space figure. A shut blast door loses two hits a second (INFERRED). A fitted Shield Overcharger + quotes 30 scrap. Shield Overcharger (3 power) and Shield Overcharger + (2 power) add one Zoltan Shield point on 8/10/13/16/20 seconds for 0–4 existing layers, then stop. Unpowered time resets that timer. None of the four is a SwarmKind and none is stocked. The other rows stay catalog-only. |
| kin | Racial abilities missing from kin.ts | kin-gaps.ts, sim.ts | Zoltan death burst of 15 HP in reap. A living Zoltan adds 1 bar in shields, engines, oxygen, medbay, or weapons, and in a kit room for cloaking, hacking, the teleporter, mind control, drones, the clone bay, and the artillery beam. Ion does not remove the system bar. A kit has no ion track. One Zoltan in a full even shield does not free a reactor bar. Two Zoltans replace one shield pair. A full weapons or drone system frees one reactor bar per Zoltan. Backup Battery and Flak Artillery do not read the kit bar. While cloaking, hacking, the teleporter, or mind control is cooling, a Zoltan who enters frees one locked reactor bar and the yellow bar stands in its place. Leaving does not put that reactor power back. A Zoltan already there when the cooldown starts does not peel until they leave and come back. Player Mind Control still has no ordinary cooldown. Crystal lockdown coats for 12s and recharges in 50s. A coated door has 60 hits (INFERRED). A drone that already has health and is in the room loses 7.5. An orbiting drone has no health field. Humans use the printed XP column 13/13/50/58/16/7; other races keep 15/15/55/65/18/8. A living Lanius drains 12 oxygen per second. Repair skill is ×1 / ×1.1 / ×1.2 and is inside the fire-fighting share (0.096 for an untrained Human). Rock is 1.67 of that share and Crystal is 0.83. Fitted Fire Suppression puts out every burning room at a Crystal crew member's speed, 0.096 times 0.83, and that rate is not scaled. Other racial abilities stay catalog-only. |
| events | 881 remaining titles, four slices | events-0.ts through events-3.ts, cited-events.ts | The old 162-placed count is no longer the whole set. Filler cards, quest openers, and surrender pages also run, and this audit did not recount placed pages. Engi cache stays partial. Out-of-fuel pages are written and not placed. The template does not say which matching out-of-fuel page plays. Trade scrap for upgrades is still a list row with no card. Rebel defector fights a Rebel ship. Its random crew, hull, pursuit, and boarders are not applied. Crystal scrap collector spends 35 scrap. Its crew and named weapons are not granted. |
| comments | Paragraph cites on existing modules | content, hulls, sim, extras, UI | second pass landed. INFERRED or INVENTED marks the blocks with no wiki paragraph. |
| score | Score lead formula | sim.ts runScore, Hangar START | D is 1 / 1.25 / 1.5. Initial scrap is 30 / 10 / 0 from the lit button. Rebel-held beacons still count. |

## Still pictures, not text

Player hangar cutaways are traced from the hangar pictures in layouts.ts. The Rebel Flagship fight uses those traced cutaways. Forty-five other enemy interiors are traced in enemy-layouts.ts. Engi Hacker and Crystal Outrider stay generated from the class system list. Do not copy those bitmaps into the app.

## All pages

- [x] AI-Controlled Rebel Ships
  - [x] auto-scout, auto-surveyor, auto-assault, and auto-hacker are classes in enemy-ships.ts.
  - [x] rollEnemy places hull and systems inside the printed ranges, not one loadout.
  - [x] Their four interiors are traced in enemy-layouts.ts.
  - [x] An unlabeled system sits in an empty hall (INFERRED).
  - [x] They repair every damaged system at one third of a human, 37.5 seconds a bar (INFERRED: all at once).
  - [x] A breach is not repaired, and a breached system does not progress.
  - [x] A fire resets that progress.
  - [x] The Flagship AI repairs at that same 37.5 second pace (INFERRED from behaving like an automated ship) and still skips a room with fire or a breach.

- [x] ASB
  - [x] No playable control, number, layout, or rule.

- [ ] Abandoned Sector
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Abandoned Space Station
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Abandoned space station
  - [x] same title as "Abandoned Space Station" with different capitalization.

- [x] Abandoned station
  - [x] Both the quest card and filler-events.ts draw low scrap, a Pirate fight with 2 boarders, 2–4 boarders and a planet battery with no ship, scrap-the-machinery, or an empty shell.
  - [x] Killing those boarders pays no scrap and is not a ship kill.
  - [x] The Clone Bay DNA option is on the quest card only.
  - [x] Staying near the beacon shows the printed examine sentence and nothing happens.
  - [x] At Abandoned station, one of the three printed opening intros is shown.
  - [x] Examining the station can show the printed destroyed-hull sentence and still pays low scrap.

- [x] Achievement
  - [x] No playable control, number, layout, or rule.

- [ ] Achievements
  - [x] 51 rows in achievements.ts.
  - [x] achievement-track.ts tracks 12: just-getting-started, federation-base-in-range, federation-victory-easy, federation-victory-normal, your-own-fleet, the-united-federation, full-arsenal, artillery-mastery, ancestry, givin-her-all-shes-got-captain, manpower, scrap-hoarder.
  - [x] Hard wins are stored on the unlock save and are not a rule.
  - [ ] The other 39 store no counter.
  - [x] Hangar START follows unlocks.ts.
  - [x] An event offer that upgrades the reactor does not block Manpower, and an upgrades-tab bar does.

- [x] Adv. FTL Navigation
  - [x] Purchase price 50.
  - [x] With it fitted, a jump can target any beacon already visited, including one the Rebel Fleet overtook.
  - [x] The jump still spends one fuel.
  - [x] The page redirects to Augmentations.

- [ ] Advanced Edition
  - [x] several AE systems exist.
  - [ ] Not gated.

- [ ] Advanced FTL Navigation
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Advanced Mastery
  - [x] No playable control, number, layout, or rule.

- [ ] Ancestry
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Ancient Device
  - [x] Same card as dest "Ancient device" (quests-a-pages.ts).
  - [x] Scrap rolls high scrap or a Rock fight.
  - [x] Reactivate needs a Crystal.
  - [x] It grants 1 fuel and spends that fuel jumping to the Hidden Crystal Worlds at the same sector number, then places the crystal-unlock marker on that map.
  - [x] The exit does not open the chart: it picks a random later sector, or The Last Stand when the number is already 7.
  - [x] Stores there sell crystal weapons, including the Lockdown Bomb, and only a Crystal crewmember.
  - [x] A crew-kill salvage weapon is one of those guns.
  - [x] A hull kill still uses the general priced pool.
  - [x] A living Crystal named Ruwen marks the Ancient device beacon as a quest in Rock Homeworlds, and that card still opens.
  - [x] Another Crystal does not.
  - [x] A dead Ruwen does not count (INFERRED).
  - [x] A resolved Ancient device beacon is not marked again (INFERRED).
  - [x] A different quest already on that beacon stays (INFERRED).
  - [x] Restarting while in the Hidden Crystal Worlds, from the verdict RESTART button on the game-over still on screen or the HANGAR button that keeps that run for the next hangar start, reads that run and starts the new run in a Civilian sector, and that exit does not open the sector map, so sector 2 is chosen at random.
  - [x] The title screen is a placeholder and is not that run (INVENTED).
  - [x] The starting-sector beacons are cleared first (INFERRED).
  - [x] The route marker then sits on a same-name node in that column, or the first node there (INFERRED).

- [x] Ancient device
  - [x] same title as "Ancient Device" with different capitalization.

- [ ] Anti-Bio Beam
  - [x] Beam (Weapons) row id antibio is in WEAPONS and fitted on Slug A.
  - [x] One regular shield blocks an Anti-Bio Beam, and the 60 crew damage still lands when that bubble is down.
  - [ ] Pierce stays a gap.
  - [x] Breach Bomb I is mounted beside it and waits for a free weapon bar.

- [ ] Anti-Ship Battery Firing on Lanius Ships
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Anti-ship battery firing on Lanius ships
  - [x] same title as "Anti-Ship Battery Firing on Lanius Ships" with different capitalization.

- [ ] Ariolimax
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Artillery Beam
  - [x] An Artillery Beam's power is its level from 1 to 4, and charge time follows the filled bars from 50 seconds at one down by ten seconds each to 20 at four.
  - [x] An Automated Re-loader divides that charge time by 1.1, three of them raise the firing rate by 30 percent, and the system cannot be manned so crew skill does not shorten it.
  - [x] Each swipe deals 2 damage to a Zoltan Shield, and a bubble with points left still protects the hull.
  - [x] Each tile the swipe passes rolls a 10 percent chance to start a fire.
  - [x] A cloaked ship stops the charge unless that clock is 20 seconds or less.

- [x] Artillery Mastery
  - [x] No playable control, number, layout, or rule.

- [x] Asteroid Field
  - [x] No playable control, number, layout, or rule.

- [x] Asteroid Field Events
  - [x] No playable control, number, layout, or rule.

- [x] Asteroid Field Lanius Scavengers
  - [x] No playable control, number, layout, or rule.

- [x] Asteroid Fields
  - [x] No playable control, number, layout, or rule.

- [x] Asteroid Mining Colony
  - [x] No playable control, number, layout, or rule.

- [x] Asteroid belt distress
  - [x] cited-events-quests-b.ts opens the hail.
  - [x] quests-b.ts then rolls the save (1 hull, a room fire, high fuel and scrap), the breakup (4 hull, low scrap), or the stray rock (low scrap).

- [x] Asteroid field Lanius scavengers
  - [x] same title as "Asteroid Field Lanius Scavengers" with different capitalization.

- [x] Asteroid mining colony
  - [x] same title as "Asteroid Mining Colony" with different capitalization.
  - [x] Giving the miners 5 missiles yields 10 hull, one reactor bar, or 15 to 25 scrap, and 15 missiles yields 15 hull plus one reactor bar, no augment, or 30 to 40 scrap plus 5 hull.

- [ ] Augmentation
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Augmentations
  - [x] Purchasable rows are in extras/augments.ts.
  - [x] Engi Med-bot Dispersal heals at 1.6 HP/s outside a powered medbay and does nothing with a clone bay.
  - [x] Slug Repair Gel adds 0.75 breach repair per second on every breached player room.
  - [x] Mantis Pheromones multiply your crew's move by 1.25.
  - [x] None of the three is sold.
  - [x] Engi A starts with the med-bot, Slug A/B/C start with the gel, and Mantis A/B/C start with the pheromones.
  - [x] Distraction Buoys skip the next fleet advance when the sector starts the fleet at 0, and they do nothing in sector 8.
  - [x] Adv.
  - [x] FTL Navigation is sold for 50.
  - [x] With it fitted, a jump can target any beacon already visited, including one the fleet overtook, and that jump still spends one fuel.
  - [x] Defense Scrambler is sold for 80.
  - [x] While it is fitted, an enemy Defense Drone I or II that is actually deployed does not shoot down a shot at your ship, and that drone does not spend its cooldown.
  - [x] Your own defense drones still fire.
  - [x] A generated enemy leaves its drone schematic undeployed, and Anti-Combat still has no enemy-drone list to stun.
  - [x] Drone Reactor Booster is not sold.
  - [x] When it is fitted, the System Repair drone moves at 62.5 percent of the 0.6 second crew walk instead of 50 percent, and that drone repairs at an Engi's pace, one bar or breach in 6.25 seconds.
  - [x] The booster does not change that pace.
  - [x] Zoltan Shield Bypass is sold for 55.
  - [x] With it fitted, crew teleport, bomb teleport, and mind control pass a Zoltan Shield without spending it, and a damage bomb strikes the room.
  - [x] Hacking still cannot launch: the drone part is kept when the augment is fitted, and spent when it is not.
  - [x] A boarding drone is destroyed on contact either way.
  - [x] An enemy teleporter party does not cross a player bubble.
  - [x] The event exception for an initial boarding party has no separate path.
  - [x] Crystal Vengeance is not sold.
  - [x] A fitted copy sells for 40.
  - [x] A player hull hit rolls the 10 percent shard.
  - [x] Breach and stun are not applied, because the shot names no room.
  - [x] A friendly defense drone shoots a Crystal Vengeance shard down, and a friendly projectile still does not meet it because the shard resolves immediately (INFERRED: no flight time is printed).
  - [x] Crystal cruisers do not start with it.
  - [x] Emergency Respirators is sold for 50.
  - [x] Player crew take half low-oxygen damage, including while boarding, and a Crystal with it takes a quarter.
  - [x] An enemy hull that lists the augment does not apply it.

- [ ] Augments
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Auto-Ship Warning in Nebula
  - [x] No playable control, number, layout, or rule.

- [ ] Auto-ship attacking civilian
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays low scrap with resources, and contacting the civilian pays low scrap, five repairs, medium scrap, low scrap with resources, or nothing.
  - [x] Staying out shows the printed scanning-range sentence and nothing happens.

- [ ] Auto-ship attacking outpost
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays low scrap with resources, and the outpost then pays medium scrap with resources.
  - [x] Intervening to defend the outpost shows the printed higher-threat sentence and fights an Auto-ship.
  - [x] Avoiding the conflict shows the printed steer-clear sentence and nothing happens.

- [x] Auto-ship attacking refueling outpost
  - [x] No playable control, number, layout, or rule.

- [x] Auto-ship attacking small outpost
  - [x] No playable control, number, layout, or rule.

- [ ] Auto-ship carrying shield virus
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] An Auto-ship carrying shield virus fight halves your Shields, rounding down.
  - [x] Opening the beacon shows the printed computer-alerts sentence.
  - [x] Countering the remote hack shows the printed assault sentence, takes Hacking offline, and starts an Auto-ship fight without halving shields.
  - [x] Destroying that ship pays medium scrap with resources, and a crew kill is not a separate reward.

- [ ] Auto-ship close to star
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Auto-ship fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the nine printed intros is shown before the default Auto-ship fight.
  - [x] A destroyed ship pays medium scrap with resources, and a crew kill is not a separate reward.

- [ ] Auto-ship fight (Crystal)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap with resources, and a crew kill is not a separate reward.

- [ ] Auto-ship fight in asteroid field
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The fight starts inside an asteroid field.
  - [x] A destroyed ship pays medium scrap with resources, and a crew kill is not a separate reward.

- [ ] Auto-ship fight in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Auto-ship fight in nebula, one of the five printed intros is shown before Fight an Auto-ship, which still fights an Auto-ship.
  - [x] A destroyed ship pays medium scrap with resources, and a crew kill is not a separate reward.

- [ ] Auto-ship fight in plasma storm
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Engines level 3 to 5 loses the ship or starts that fight, level 6 or higher loses the ship, and cloaking loses the ship.
  - [x] The printed storm sentence is shown before those choices.
  - [x] A destroyed ship pays medium scrap with resources, and a crew kill is not a separate reward.

- [ ] Auto-ship fight near sun
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap with resources, and a crew kill is not a separate reward.

- [x] Auto-ship in asteroid belt
  - [x] No playable control, number, layout, or rule.

- [ ] Auto-ship in nebula
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Auto-ship in plasma storm
  - [x] No playable control, number, layout, or rule.

- [ ] Auto-ship near radar station
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap only, a combat drone spends one part and opens the station or starts that fight, hacking spends one part and delays the fleet one turn, and the station delays the fleet, doubles pursuit, or pays nothing.
  - [x] Approaching the station shows the printed power-up sentence and starts an Auto-ship fight.

- [ ] Auto-ship near sensor station
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays low scrap only, level 3 sensors start that fight or pay nothing, and a teleporter pays nothing.

- [ ] Auto-ship near small space-station
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Auto-ship near storage station
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap only, cloaking starts that fight or opens the station.
  - [ ] The station pays low scrap without the unnamed weapon or schematic, medium resources with some scrap, or nothing.
  - [x] The printed storage sentence is shown before those choices.

- [ ] Auto-ship near storage station in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap only, cloaking or hacking starts that fight or opens the station, improved cloaking or hacking opens the station, and hacking spends one drone part.

- [x] Auto-ship near storage vessel
  - [x] No playable control, number, layout, or rule.

- [ ] Auto-ship near sun
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Auto-ship pursuing civilian ship
  - [x] No playable control, number, layout, or rule.

- [x] Auto-ship sits dormant
  - [x] No playable control, number, layout, or rule.

- [ ] Auto-ship warning
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays low scrap with resources, the ship runs from the start for 40 seconds, and an escape doubles Rebel Fleet pursuit.
  - [x] One of the nine printed intros shared with Auto-ship fight is shown before Fight an Auto-ship that is running away, which still fights a running Auto-ship.
  - [x] Fighting that ship shows the printed FTL sentence, and the 40 second pursuit stays.

- [ ] Auto-ship warning in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays low scrap with resources, the ship runs from the start for 40 seconds, and an escape doubles Rebel Fleet pursuit.
  - [x] The printed scout sentence is shown before that fight.

- [ ] Automated Re-Fueling Ship
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Automated Re-loader
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Automated Rebel Scout Attacking Refueling Outpost
  - [x] No playable control, number, layout, or rule.

- [x] Automated Rebel Ship Close to Star
  - [x] No playable control, number, layout, or rule.

- [x] Automated Rebel scout attacking refueling outpost
  - [x] same title as "Automated Rebel Scout Attacking Refueling Outpost" with different capitalization.

- [x] Automated re-fueling ship
  - [x] same title as "Automated Re-Fueling Ship" with different capitalization.

- [x] Automated rebel ship close to star
  - [x] same title as "Automated Rebel Ship Close to Star" with different capitalization.

- [x] Automated refueling ship
  - [x] No playable control, number, layout, or rule.

- [ ] Avast, ye scurvy dogs!
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Backup Battery
  - [x] cell.ts.
  - [x] Enemy-start rule INVENTED.
  - [x] If the ship is not in danger when the 30 seconds run out, the battery does not enter its cooldown.
  - [x] Combat, boarders, a solar flare, a pulsar, an asteroid field, or a hostile anti-ship battery still starts that cooldown.
  - [x] The 30 seconds keep counting on the map (INFERRED).
  - [x] An FTL jump resets that cooldown immediately.
  - [x] Waiting does not.
  - [x] Ion that covers every Backup Battery level in one hit starts its maximum 25 second cooldown.
  - [x] A smaller hit does not, and the charger does not shorten that 25.
  - [x] Two 1-ion sources at the same time lock an activated level 2 battery for that 25.
  - [x] A later time does not add (INFERRED), and that single ion is not shown as ion damage.
  - [x] When the extra bars leave, assigned power is pulled back.
  - [x] An active cloak that loses its bar starts its 20 second cooldown, and an active mind-control hold ends.
  - [x] Mind Control states no ordinary cooldown, so that early end does not start a numbered wait.
  - [x] A bar locked into a cloak that is already cooling still comes off when the battery ends, and that cooldown stays where it was.
  - [x] The power button cannot drop that bar while the cooldown lasts.
  - [x] The reactor purchase still stops at 25.
  - [x] A running battery adds its bars on top, so the ship can assign 29.
  - [x] Those bars count as spare reactor power when a Zoltan leaves weapons, and the system takes them back.
  - [x] Bonus bars are drawn after the regular reactor bars and keep an orange border.
  - [x] Assigned ones are the bars that come off first (INFERRED).
  - [x] Unassigned ones keep the outline.

- [ ] Backup DNA Bank
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Badly Damaged Lanius Craft
  - [x] No playable control, number, layout, or rule.

- [x] Badly damaged Lanius craft
  - [x] same title as "Badly Damaged Lanius Craft" with different capitalization.

- [ ] Battery
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Battery Charger
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Battle Royale
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Battlefield wreckage
  - [x] filler-events.ts rolls little remains (weight 4), a Slug ship that leaves, medium salvage, or a Mantis, Rebel, or Zoltan fight.
  - [x] This audit did not re-open the article.
  - [x] Scanning at Sensors level 2 shows the printed salvage sentence and pays medium resources with some scrap.
  - [x] At Battlefield wreckage, one of the two printed opening intros is shown.

- [ ] Beacon
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Beacons
  - [x] The map is a 6×4 grid of 19–24 beacons.
  - [x] Each beacon line is a count between its minimum and maximum, then the next line, and the map stops when it is full.
  - [x] Named specials and the three Last Stand repair stations keep exact counts.
  - [x] Beacons left after the list take the neutral fallback.
  - [x] Taking the supplies grants 15 hull, scrap 22–44, 5 fuel, 4 missiles, and 5 drone parts, once.
  - [x] A marker that would land in sector 8 is cancelled, and a nebula beacon cannot hold one.

- [ ] Beam (Weapon)
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Beam (Weapons)
  - [x] Pike is id shear.
  - [x] Halberd, Glaive, Mini, and Anti-Bio are in WEAPONS.
  - [x] Crew HP is the printed per-room figure (15, 30, 45, or 60) and is not multiplied by tiles.
  - [x] Boss Beam is a WeaponDef.
  - [x] Power 3 is the chosen artillery maximum, not a Weapons-pool cost.
  - [x] Charge times are 32.5/26/19.5, outside the Weapons pool.
  - [x] A systemless room takes 2 hull damage, and each shield layer cuts that figure by one.
  - [x] Crew damage stays 15.
  - [x] A drone in that room that already has health takes half that crew damage.
  - [x] A player beam hits the rooms on the straight line between two clicks on the enemy ship.
  - [x] A tiny edge counts.
  - [x] Printed beam length does not shorten that line, and Halberd's 3–5 room sentence is not the room rule.
  - [x] An enemy beam still starts in the aimed room and adds one neighbour (INFERRED).
  - [ ] Printed length, pierce, and chain stay gaps.
  - [x] Fire Beam has no crew figure.
  - [x] One regular shield blocks a Fire Beam, and the fire roll still lands when that bubble is down.
  - [x] A beam's first Zoltan Shield tick is at 33 percent of the path and the second is at 80 percent, except a Beam Drone 1 or a Fire Drone.
  - [x] A beam never misses, and a ship that dodges every other shot still takes the hit.
  - [x] A drawn beam damages crew only when the line crosses the tile they stand on, and every other weapon still hits everyone in the room.

- [ ] Bird of Prey
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Black Market Weapon Trader
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Black Market Weapons Trader
  - [x] No playable control, number, layout, or rule.

- [x] Black Raven
  - [x] No playable control, number, layout, or rule.

- [x] Black market weapons trader
  - [x] same title as "Black Market Weapons Trader" with different capitalization.

- [x] Blue Options
  - [x] No playable control, number, layout, or rule.

- [x] Boarders: Crystal
  - [x] Two or three crystal boarders beam aboard your ship from Boarders: Crystal, with no enemy ship.
  - [x] At Boarders: Crystal, one of the three printed intros is shown.

- [x] Boarders: Humans (Abandoned)
  - [x] No playable control, number, layout, or rule.

- [x] Boarders: Humans (Pirate)
  - [x] Three to five human boarders beam aboard your ship from Boarders: Humans (Pirate), with no enemy ship.
  - [x] At Boarders: Humans (Pirate), one of the five printed intros is shown.

- [x] Boarders: Humans in nebula
  - [x] Two to four human boarders beam aboard your ship from Boarders: Humans in nebula, with no enemy ship.
  - [x] At Boarders: Humans in nebula, one of the three printed intros is shown.

- [ ] Boarders: Humans in plasma storm
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Three or four human boarders beam aboard your ship when you take the medium scrap from Boarders: Humans in plasma storm.
  - [x] Opening the beacon shows the printed boarding-party sentence.

- [x] Boarders: Humans jammed sensors
  - [x] Three to five human boarders from Boarders: Humans jammed sensors disable your sensors until the next jump, unless Hacking counters the jam.
  - [x] At Boarders: Humans jammed sensors, continuing logs the printed jam sentence and Hacking logs the printed counter sentence.

- [x] Boarders: Humans near sun
  - [x] Two to four human boarders beam aboard your ship from Boarders: Humans near sun, with no enemy ship, and the red giant arms the flare clock.
  - [x] At Boarders: Humans near sun, the printed sentence is shown in full before the boarders.

- [x] Boarders: Mantis
  - [x] Two to four mantis boarders beam aboard your ship from Boarders: Mantis, with no enemy ship.
  - [x] At Boarders: Mantis, one of the three printed intros is shown.

- [x] Boarders: Rockmen near sun
  - [x] Two or three rock boarders beam aboard your ship from Boarders: Rockmen near sun, with no enemy ship, and the red giant arms the flare clock.
  - [x] At Boarders: Rockmen near sun, one of the two printed intros is shown.

- [x] Boarders: rebels in nebula
  - [x] Three or four human boarders beam aboard your ship from Boarders: rebels in nebula, with no enemy ship.

- [x] Boarders in Nebula
  - [x] No playable control, number, layout, or rule.

- [ ] Boarders in Plasma Storm
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Boarders in nebula
  - [x] same title as "Boarders in Nebula" with different capitalization.

- [x] Boarders in plasma storm
  - [x] same title as "Boarders in Plasma Storm" with different capitalization.

- [x] Boarding
  - [x] Player and enemy teleporters run (sling.ts).
  - [x] Enemy crew AI (crewai.ts) stations crew, repairs shields first, puts two on a fire, flees a fire at 20% HP and an airless room below 25% oxygen, and heals below 25% HP.
  - [x] The 0.5 s plan interval and the heal line are INFERRED.
  - [x] Not the full page.
  - [x] During a hacking pulse, enemy crew in the medbay break out rather than fight, a lockdown keeps them, and one phase-1 Flagship medbay crew stays.
  - [x] A hacked room's doors are level-3 blast doors that block that ship's crew and let boarders and mind-controlled crew through.
  - [x] Depowering Hacking lets that ship's crew through a hacked room's doors, and powering it again closes those doors on them.
  - [x] An Ion Stunner stuns every crew member and drone in the room for 5 seconds.
  - [x] An Ion Intruder stuns enemy crew in the room for 6 seconds, including crew the player is mind-controlling, and a friendly boarder stays free.
  - [x] An unskilled human deals 3 to 7 HP per hit, and the pause between blows stays inferred.

- [ ] Bomb (Weapon)
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Bomb (Weapons)
  - [x] src/game/content.ts — the bomb rows are in WEAPONS.
  - [x] strikeRoom skips hull damage.
  - [x] Printed crew HP is flat (Small Bomb 30, Breach I 30, Breach II 45, Fire Bomb 30; ion, stun, heal, repair, and lockdown bombs 0).
  - [x] Healing Burst adds 150 HP.
  - [x] Repair Burst removes 8 system damage, does not miss the shooter's own ship, and does not clear fire or a breach.
  - [x] Neither spends a Zoltan Shield.
  - [x] Aiming a bomb at your own ship is a control, and that shot does not miss, including Healing Burst and Repair Burst.
  - [x] A Healing Burst aimed at the enemy can still miss.
  - [x] An Ion Bomb puts 4 ion on the targeted system, deals no hull and no crew damage, and ignores regular shields.
  - [x] A Zoltan Shield spends double and stops it.
  - [x] The low stun chance prints no percent, so it is not rolled.
  - [x] A Stun Bomb puts 1 ion on that system and stuns every crew member and drone in the room for 15 seconds.
  - [x] A Zoltan Shield spends 2 and stops it.

- [x] Bravais
  - [x] crystal-a in HULLS.
  - [x] Crystal Vengeance stays unfitted.
  - [x] Room grid is the shared player grid.

- [x] Brutal Exchange Between Several Ships
  - [x] No playable control, number, layout, or rule.

- [x] Brutal Exchange between Several Ships
  - [x] same title as "Brutal Exchange Between Several Ships" with different capitalization.

- [x] Brutal exchange between several ships
  - [x] same title as "Brutal Exchange Between Several Ships" with different capitalization.

- [ ] Bulwark
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Bump Hulls with Mantis Ship
  - [x] No playable control, number, layout, or rule.

- [x] Bump hulls with Mantis ship
  - [x] same title as "Bump Hulls with Mantis Ship" with different capitalization.

- [ ] Capture the ship
  - [x] cited-events-quests-b.ts.
  - [x] Offer services is a decline.
  - [x] Teleporter, Fire Bomb, and Anti-Bio open the offer in quests-b.ts.
  - [x] The capture quest marker and the merchant investigation use the printed button Fight a Pirate ship.
  - [ ] The anti-ship battery variants on the later assist fight are not wired.

- [x] Carnelian
  - [x] crystal-b in HULLS.
  - [x] Crystal Vengeance stays unfitted.
  - [x] Room grid is the shared player grid.

- [ ] Cerenkov
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Chain Vulcan
  - [x] id vulcan is in WEAPONS.
  - [x] Charge steps are 11.1, 9.1, 7.1, 5.1, 3.1, then 1.1.
  - [x] Losing power resets the chain to 11.1.
  - [x] The 35.5s spin-up is the sum of the first five.

- [x] Civilian Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Civilian FTL Haywire Escort
  - [x] No playable control, number, layout, or rule.

- [x] Civilian FTL haywire escort
  - [x] same title as "Civilian FTL Haywire Escort" with different capitalization.

- [x] Civilian Sector
  - [x] No playable control, number, layout, or rule.

- [ ] Civilian Ship Chased by Pirate
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Civilian Ship Fleeing from Lanius
  - [x] No playable control, number, layout, or rule.

- [x] Civilian Ship Out Of FTL Fuel
  - [x] No playable control, number, layout, or rule.

- [x] Civilian Ship fleeing from Lanius
  - [x] same title as "Civilian Ship Fleeing from Lanius" with different capitalization.

- [x] Civilian Vessel Under Fire from a Lanius Ship
  - [x] No playable control, number, layout, or rule.

- [x] Civilian empty beacon
  - [x] same title as "Civilian Empty Beacon" with different capitalization.

- [x] Civilian ship chased by Pirate
  - [x] same title as "Civilian Ship Chased by Pirate" with different capitalization.

- [ ] Civilian ship chased by Pirate (distress)
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Civilian ship chased by pirate
  - [x] same title as "Civilian Ship Chased by Pirate" with different capitalization.

- [x] Civilian ship fleeing from Lanius
  - [x] same title as "Civilian Ship Fleeing from Lanius" with different capitalization.

- [x] Civilian vessel under fire from a Lanius ship
  - [x] same title as "Civilian Vessel Under Fire from a Lanius Ship" with different capitalization.

- [x] Civilians Under Fire from Lanius
  - [x] No playable control, number, layout, or rule.

- [x] Civilians fleeing from Lanius
  - [x] No playable control, number, layout, or rule.

- [x] Civilians under fire from Lanius
  - [x] same title as "Civilians Under Fire from Lanius" with different capitalization.

- [x] Civilized Trader
  - [x] No playable control, number, layout, or rule.

- [x] Civilized trader
  - [x] same title as "Civilized Trader" with different capitalization.

- [x] Clash of the Titans
  - [x] No playable control, number, layout, or rule.

- [x] Cloaking
  - [x] veil.ts on either hull, including Flagship stage 1 at level 2.
  - [x] Power-bar count INFERRED.
  - [x] A charged player weapon still fires at a cloaked enemy when your crew, a boarding drone, or a mind-controlled enemy crew member is aboard, and the charge itself stays frozen.
  - [x] A hacking drone holds in space while the ship it is flying to is cloaked, and continues when that cloak ends.
  - [x] An external combat drone keeps moving around a cloaked ship but does not fire.
  - [x] A hacking pulse that ends an active cloak puts Cloaking on a full 20 second cooldown.
  - [x] A boarding drone still in space does not let a charged weapon fire at a cloaked ship, and one that has boarded a room does.

- [x] Clone Bay
  - [x] cradle.ts on either hull.
  - [x] Revive HP and power bar INFERRED.
  - [x] The Abandoned station quest card offers the DNA search when a Clone Bay is fitted.
  - [x] The calm result is weight 2 and the crazed boarder is weight 1.
  - [x] The filler copy of that station has no DNA option.
  - [x] Cloning starts after the death animation, 2 seconds for Rock, Crystal, and Engi, 1.8 for Humans, Slugs, and Lanius, 1.7 for Mantis, and 1.5 for Zoltans, and a body with no kin waits the Human 1.8 (INFERRED).
  - [x] Living crew left on the enemy ship when you jump are not revived, and crew already in the clone queue still are.
  - [x] A death while an enemy Clone Bay is already destroyed does not enter the cloning queue, and the dying animation still finishes before that fight ends.

- [ ] Clonebay
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Closed Mining Fields
  - [x] No playable control, number, layout, or rule.

- [x] Closed mining fields
  - [x] same title as "Closed Mining Fields" with different capitalization.

- [x] Confused Mantis
  - [x] Sending help returns Robert Smith or loses a crewmember, and a Mantis or Mind Control pays the printed scrap.
  - [x] At Confused Mantis, the printed hail is shown in full before Listen to their problem and the leave choice.

- [x] Crew
  - [x] eight lineages in kin.ts from the race table.
  - [x] Several racial abilities are not fields.
  - [x] A player ship carries at most eight crewmembers.

- [ ] Crew Member
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Crew Members
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Crew Teleporter
  - [x] sling.ts on either hull, including Flagship stage 3.
  - [x] Pad count and several timings INFERRED.
  - [x] The stage-3 trip cap is INFERRED as unlimited.
  - [x] When the ship is not in danger, that cooldown resets instantly.
  - [x] Combat, boarders, a solar flare, a pulsar, an asteroid field, or a hostile anti-ship battery still counts as danger.
  - [x] A cloak on either ship blocks crew teleport onto or off the other ship, and the teleporter does not start its cooldown.
  - [x] A Crew Teleporter retrieve brings back at most four crew, and crew who cannot fit in the teleporter room are placed in an adjacent room.
  - [x] A Crew Teleporter sends as many crew as that room has pads: two from a 2-tile room, and four from Mantis B, Mantis C, and Crystal B.
  - [x] A Crew Teleporter send takes only crew standing in the teleporter room, and someone walking through that room is not sent.
  - [x] A hacked Crew Teleporter retrieve lands crew in the teleporter room, and crew who cannot fit are placed in an adjacent room.

- [ ] Crew hiring station
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Crew member
  - [x] same title as "Crew Member" with different capitalization.

- [x] Crew members
  - [x] same title as "Crew Members" with different capitalization.

- [x] Crew races
  - [x] No playable control, number, layout, or rule.

- [x] Crew skills
  - [x] Combat skill multiplies the attacker's hand-to-hand damage by 1, 1.1, or 1.2 and does not scale sabotage.
  - [x] Piloting, engines evasion, engines FTL, weapons charge, and shields recharge use the printed tables.
  - [x] A non-flagship automated ship keeps the level-0 manning bonus; ion does not remove it, and system damage does.
  - [x] Flagship artillery stays on the printed charge table unless a gunner is there.
  - [x] XP thresholds in content.ts stay INFERRED.
  - [x] A cloak blocks piloting and engines experience, and a shield bubble hit still trains.
  - [x] Repair experience is one point when a system bar finishes, not while the crew is still working, and sealing a breach still trains nothing.
  - [x] Combat experience is one point for the killing blow or for damaging one system level, and killing a cloned crew member trains nothing.
  - [x] An artillery beam or a flak burst trains Weapon Control once, and the seven flak shots stay one fire.
  - [x] An ion projectile blocked by shields ionizes the Shields system and does not train the crew there.
  - [x] The aimed room stays clear.
  - [x] Turning a weapon off just after the skill increment drops that shot, keeps the point, and returns a missile that shot had spent, and that window is 0.15 seconds (INFERRED).
  - [x] Firing a bomb at your own ship trains Weapon Control once and spends one missile.
  - [x] Putting out a fire trains nothing.
  - [x] A clone keeps 80 percent of each skill and loses one Combat point.
  - [x] Destroying a crew drone trains nothing.
  - [x] Enemy crew stay untrained and cannot reach a higher skill level.
  - [x] Mind-controlled crew still gain a skill point by performing the task.
  - [x] A repair drone finishes a system bar and trains nobody.
  - [x] Every player crew member starts at skill level 0.
  - [x] Every race gains one repair point for a finished bar.
  - [x] An Engi repairs faster and a Mantis kills faster, and the inverse holds.
  - [x] A Human, an Engi, and a Mantis sabotage a system at the same rate.
  - [x] Each dodge trains piloting and engines once, and a hit trains neither.
  - [x] A weapon point lands as the shot leaves, hit or miss.
  - [x] A shield bubble hit trains shields once, and a miss trains nothing.
  - [x] A three-shot burst grants one weapon point.
  - [x] An untrained human finishes one system bar in 12.5 seconds.
  - [x] An untrained human seals one breach in 12.5 seconds.
  - [x] One boarder breaks one system bar in 12.5 seconds, skill and race aside.
  - [x] A Rock fights a fire at 1.67 and a Crystal at 0.83.
  - [x] A human needs 13, 13, 50, 58, 16, and 7 to raise those skills.
  - [x] Level 1 repairs 10 percent faster and level 2 repairs 20 percent faster.
  - [x] Level 1 and level 2 cost the same experience again.
  - [x] A fully trained crew charges a Basic Laser in 8 seconds, down from 10 unmanned.
  - [x] Fully trained shields turn a 2 second recharge into 1.54 seconds.
  - [x] A fully trained crew hits an onboard drone for 20 percent more.
  - [x] Every non-human race shares one experience table, and a human needs less.
  - [x] Combat costs the least experience, weapons the most, and piloting matches engines.
  - [x] An Engi fights a fire twice as fast as a human, and a Mantis half as fast.
  - [x] A dodged asteroid during the fight trains piloting and engines.
  - [x] An asteroid that depletes the bubble during the fight trains shields.
  - [x] Repair skill speeds fire-fighting by 10 percent, then 20 percent.
  - [x] Piloting and engines experience are gained at different consoles.
  - [x] A crew blow against an onboard drone is 3 to 7 HP, times combat skill.
  - [x] One crewmember who finishes a system bar receives the repair point, and a helper who stays in the room does not.

- [ ] Crewmembers
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Crushed Pirate
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Crushed pirate
  - [x] same title as "Crushed Pirate" with different capitalization.
  - [x] Shooting the rocks deals 2 hull and 2 system damage with low scrap, or medium scrap with resources, and looting pays medium scrap with resources or starts a pirate fight.

- [x] Crystal
  - [x] stat row.
  - [x] Lockdown coats a room for 12 seconds and recharges in 50.
  - [x] Fire-fighting is 0.83 of that crew member's share of the 0.096 crew-races extinguish, with repair skill included.
  - [x] It is not fireTaken.

- [x] Crystal (Weapon)
  - [x] No playable control, number, layout, or rule.

- [ ] Crystal (Weapons)
  - [x] rows are in weapons-flak-crystal.ts and WEAPONS.
  - [x] kind stays laser.
  - [ ] Pierce 1 is only in FLAK_CRYSTAL_GAPS.

- [x] Crystal Auto-ship fight
  - [x] No playable control, number, layout, or rule.

- [ ] Crystal Auto Fight
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Crystal Boarders
  - [x] No playable control, number, layout, or rule.

- [x] Crystal Burst Mark II
  - [x] No playable control, number, layout, or rule.

- [x] Crystal Civilian Question
  - [x] No playable control, number, layout, or rule.

- [ ] Crystal Collector of Alien Artifacts
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Crystal Cruiser
  - [x] No playable control, number, layout, or rule.

- [x] Crystal Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Crystal Fight
  - [x] No playable control, number, layout, or rule.

- [x] Crystal Lockdown
  - [x] a Crystal coats the room for 12 seconds and the ability recharges in 50.
  - [x] An FTL jump clears that cooldown unless the Crystal is in the clone bay.
  - [x] A coated door has 60 hits (INFERRED: five crew at one attack a second for the 12 second coat).
  - [x] The door level does not change that count, and blast-door health is still reset.
  - [x] Breaking the coating breaks the door and sticks it open for 7 seconds.
  - [x] Crew leaving through a shut coated door punch at one hit a second.
  - [x] A drone punches at two.
  - [x] A room coated before a hacking drone attaches leaves those doors with 4 hits after the coating disappears, and a disruption pulse during that coating or another lockdown keeps the Normal level-3 health of 12, since the page's 10 is the Hard cell.

- [x] Crystal Lockdown ability
  - [x] No playable control, number, layout, or rule.

- [x] Crystal Rebel Fight
  - [x] No playable control, number, layout, or rule.

- [x] Crystal Rebel fight
  - [x] same title as "Crystal Rebel Fight" with different capitalization.

- [x] Crystal Ships
  - [x] No playable control, number, layout, or rule.

- [x] Crystal Store
  - [x] No playable control, number, layout, or rule.

- [ ] Crystal Vengeance
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Crystal attacking Federation loyalists
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Crystal boarders
  - [x] same title as "Crystal Boarders" with different capitalization.

- [x] Crystal chat
  - [x] No playable control, number, layout, or rule.

- [x] Crystal civilian question
  - [x] same title as "Crystal Civilian Question" with different capitalization.

- [x] Crystal collector of alien artifacts
  - [x] same title as "Crystal Collector of Alien Artifacts" with different capitalization.

- [x] Crystal empty beacon
  - [x] same title as "Crystal Empty Beacon" with different capitalization.

- [ ] Crystal fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Crystal fight, one of the seven printed intros is shown before Fight a Crystal ship, which still fights a default Crystal ship.
  - [x] At Crystal fight, accepting a surrender is a Crystal crewmember, resources, or nothing, and ignoring them keeps the fight going.

- [ ] Crystal fight choice
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Crystal fight choice, the Crystal ship never surrenders.
  - [x] Leaving them alone shows the printed jump sentence and nothing happens.
  - [x] Engaging the Rebel ship shows the printed obliteration sentence and starts a Crystal fight.

- [ ] Crystal fight with surrender offer (Human crew)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed shards sentence.
  - [x] Destroying the ship or killing the crew pays medium scrap with resources.
  - [ ] The surrender human is not granted on that win.
  - [x] Accepting their surrender shows the printed prisoner sentence and the fight continues, and finishing them off shows the printed humans-saved sentence.

- [ ] Crystal fight with surrender offer (hull repairs)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed convoy sentence.
  - [x] Destroying the ship or killing the crew pays medium scrap with resources.
  - [ ] The surrender fuel and 8 repairs are not applied on that win.
  - [x] Stopping the fight shows the printed explanation and apology sentences and still pays the low fuel, low scrap, and 8 repairs, and finishing them off shows the printed pick-a-fight sentence.

- [ ] Crystal scrap collector
  - [x] one beacon in Hidden Crystal Worlds.
  - [x] Offering 35 scrap spends 35 scrap.
  - [ ] The Crystal crewmember, Crystal Lockdown Bomb, and Crystal Burst Mark II are not granted.
  - [x] Turning him down does nothing.

- [x] Crystal sector
  - [x] No playable control, number, layout, or rule.

- [ ] Crystal ship attacking Federation loyalists
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The Crystal ship never surrenders.
  - [x] Saving the Federation ship shows the printed intercept sentence and fights a Crystal ship.
  - [x] Preparing to leave shows the printed mission sentence and nothing happens.
  - [ ] A destroyed ship pays medium scrap with resources and a crew kill pays high scrap with resources, then contacting the Federation ship pays low scrap with resources without the unnamed crewmember, or a random amount of resources with some scrap.

- [ ] Crystal ship convoy fight
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Crystal store
  - [x] same title as "Crystal Store" with different capitalization.

- [x] Crystalline Border Guard
  - [x] No playable control, number, layout, or rule.

- [x] Crystalline Cache
  - [x] No playable control, number, layout, or rule.

- [ ] Crystalline Man Buried
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Crystalline Men Buried
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Crystalline Research Facility
  - [x] No playable control, number, layout, or rule.

- [x] Crystalline Ship Carrying Humans
  - [x] No playable control, number, layout, or rule.

- [ ] Crystalline Ship Engaged with Rebel
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Crystalline Ship Messaging About Rebels
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed havoc sentence.
  - [x] Giving the flight plans pays high scrap and doubles pursuit for 1 jump.
  - [x] False plans, with no printed odds, either delay pursuit for 1 jump with high scrap or start a Crystal fight with 1-2 crystal boarders.
  - [x] Distraction Buoys delay pursuit for 1 jump with high scrap.
  - [x] Refusing shows the printed apology and nothing happens.

- [x] Crystalline border guard
  - [x] same title as "Crystalline Border Guard" with different capitalization.

- [x] Crystalline cache
  - [x] same title as "Crystalline Cache" with different capitalization.

- [x] Crystalline men buried
  - [x] same title as "Crystalline Men Buried" with different capitalization.

- [x] Crystalline research facility
  - [x] same title as "Crystalline Research Facility" with different capitalization.

- [x] Crystalline ship carrying humans
  - [x] same title as "Crystalline Ship Carrying Humans" with different capitalization.

- [x] Crystalline ship engaged with Rebel
  - [x] same title as "Crystalline Ship Engaged with Rebel" with different capitalization.

- [x] Crystalline ship messaging about Rebels
  - [x] same title as "Crystalline Ship Messaging About Rebels" with different capitalization.

- [x] Cut content
  - [x] wiki process, not a game system.

- [ ] DA-SR 12
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Damaged Lanius Absorbing Jump Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Damaged Lanius absorbing jump beacon
  - [x] same title as "Damaged Lanius Absorbing Jump Beacon" with different capitalization.

- [x] Damaged Space Station
  - [x] No playable control, number, layout, or rule.

- [ ] Damaged Stasis Pod
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Damaged Vessel docked with Beacon
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Damaged and Dilapidated Space Station
  - [x] No playable control, number, layout, or rule.

- [x] Damaged space station
  - [x] same title as "Damaged Space Station" with different capitalization.

- [x] Damaged stasis pod
  - [x] same title as "Damaged Stasis Pod" with different capitalization.

- [x] Dangerous-looking ship
  - [x] No playable control, number, layout, or rule.

- [ ] Dangerous Looking Ship
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Dangerous looking ship
  - [x] same title as "Dangerous Looking Ship" with different capitalization.

- [ ] Dangerous looking slug ship
  - [ ] The page states a mechanic and it is not a playable event.

- [x] De-Activated Rebel Automated Scout
  - [x] No playable control, number, layout, or rule.

- [ ] Deactivated Auto-ship
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Downloading the data pays low scrap with resources or starts an Auto-ship fight, sensors level 3 either pays that same low scrap with resources or asks whether to try, and a yes uses the download, a no does nothing.

- [ ] Deactivated Rebel Automated Scout
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Deactivated rebel automated scout
  - [x] same title as "Deactivated Rebel Automated Scout" with different capitalization.

- [x] Debris Field Zoltan Cruiser
  - [x] No playable control, number, layout, or rule.

- [x] Debris field Zoltan cruiser
  - [x] same title as "Debris Field Zoltan Cruiser" with different capitalization.

- [x] Default rewards (generic)
  - [x] No playable control, number, layout, or rule.

- [x] Defense Drones Don't Do D'anything!
  - [x] No playable control, number, layout, or rule.

- [x] Defense Scrambler
  - [x] Sold for 80.
  - [x] An enemy Defense Drone I or II that is actually deployed does not shoot down a shot at the ship carrying it, and does not spend cooldown.
  - [x] The player's own defense drones still fire.
  - [x] Generated enemies leave the drone schematic undeployed.
  - [x] Anti-Combat is named by the block and still has no enemy-drone list to stun.

- [ ] Dense Asteroid Field Distress Call
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Dense asteroid field distress
  - [x] Searching deals 5 hull and 1 engine damage, pays random scrap, or opens the remains, and Rock Plating skips to a Damaged Stasis Pod or low scrap.

- [x] Dense asteroid field distress call
  - [x] same title as "Dense Asteroid Field Distress Call" with different capitalization.

- [x] Destroyed Cargo Ship
  - [x] Same card as dest "Destroyed cargo ship" (cited-events-surrender.ts).
  - [x] Bring aboard rolls medium supplies, low scrap, 2–4 boarders with no ship, or a Pirate fight with boarders.
  - [x] Killing the shipless boarders pays no scrap and is not a ship kill.
  - [x] Leaving the cargo shows the printed jump sentence and nothing happens.
  - [x] Scanning at Sensors level 2 or with Long-Ranged Scanners pays 20-35 scrap, pays medium scrap with resources, or opens the printed pirate ambush.

- [x] Destroyed cargo ship
  - [x] same title as "Destroyed Cargo Ship" with different capitalization.

- [x] Diplomatic Immunity
  - [x] No playable control, number, layout, or rule.

- [ ] Disabled Rock Transport
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Disabled Rock ship
  - [x] Stripping pays random scrap, a patrol may fight after that scrap, and leaving does nothing twice as often as it starts a Rock fight.

- [x] Disabled Rock transport
  - [x] same title as "Disabled Rock Transport" with different capitalization.

- [ ] Disintegration Ray
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Distraction Buoys
  - [x] before sector 8, a fleet already at 0 skips its next advance.
  - [x] A fleet already ahead still loses one jump at sector start.
  - [ ] The article was not re-opened, so other sentences on the page are not claimed.

- [x] Distress: Civilian Ship Chased by Pirate
  - [x] No playable control, number, layout, or rule.

- [x] Distress: civilian ship chased by Pirate
  - [x] same title as "Distress: Civilian Ship Chased by Pirate" with different capitalization.

- [x] Distress Beacon Events
  - [x] No playable control, number, layout, or rule.

- [x] Distress Signal Emitter Consumed
  - [x] No playable control, number, layout, or rule.

- [x] Distress Signal from Slug Ship Under Attack by the Lanius
  - [x] No playable control, number, layout, or rule.

- [x] Distress Signal from Slug Ship Under attack by the Lanius
  - [x] same title as "Distress Signal from Slug Ship Under Attack by the Lanius" with different capitalization.

- [x] Distress Signals
  - [x] No playable control, number, layout, or rule.

- [x] Distress beacon
  - [x] No playable control, number, layout, or rule.

- [x] Distress signal emitter consumed
  - [x] same title as "Distress Signal Emitter Consumed" with different capitalization.

- [x] Distress signal from Slug ship under attack by Lanius
  - [x] No playable control, number, layout, or rule.

- [x] Distress signal from Slug ship under attack by the Lanius
  - [x] same title as "Distress Signal from Slug Ship Under Attack by the Lanius" with different capitalization.

- [x] Door System
  - [x] upgrade prices cited.
  - [x] Airflow percents in sim are INFERRED.
  - [x] Door hits follow the printed table: level 2 is 6, 8, or 12, level 3 is 10, 12, or 16, and level 4 is 15, 18, or 20, for Hard, Normal, and Easy.
  - [x] A damaged door's leftover hits scale with the new maximum when the Door System level changes, so on Hard a level-2 door with 1 hit left still needs 1 after manning and a door with 2 left needs 3.

- [ ] Doors
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Drifting Debris
  - [x] No playable control, number, layout, or rule.

- [x] Drifting Refugee Ship
  - [x] No playable control, number, layout, or rule.

- [ ] Drifting Refugee Ship (Pirate)
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Drifting Refugee Ship (Slug)
  - [x] No playable control, number, layout, or rule.

- [x] Drifting Refugee Ship (Zoltan)
  - [x] No playable control, number, layout, or rule.

- [x] Drifting Refugee Ship Distress
  - [x] No playable control, number, layout, or rule.

- [ ] Drifting Refugee Ship Distress (Pirate)
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Drifting Refugee Ship Distress (Slug)
  - [x] No playable control, number, layout, or rule.

- [x] Drifting Refugee Ship Distress (Zoltan)
  - [x] No playable control, number, layout, or rule.

- [x] Drifting debris
  - [x] same title as "Drifting Debris" with different capitalization.

- [x] Drifting refugee ship
  - [x] same title as "Drifting Refugee Ship" with different capitalization.

- [x] Drifting refugee ship (Pirate)
  - [x] same title as "Drifting Refugee Ship (Pirate)" with different capitalization.

- [x] Drifting refugee ship (Slug)
  - [x] same title as "Drifting Refugee Ship (Slug)" with different capitalization.

- [x] Drifting refugee ship (Zoltan)
  - [x] same title as "Drifting Refugee Ship (Zoltan)" with different capitalization.

- [x] Drifting refugee ship distress
  - [x] same title as "Drifting Refugee Ship Distress" with different capitalization.

- [x] Drifting refugee ship distress (Pirate)
  - [x] same title as "Drifting Refugee Ship Distress (Pirate)" with different capitalization.

- [x] Drifting refugee ship distress (Slug)
  - [x] same title as "Drifting Refugee Ship Distress (Slug)" with different capitalization.

- [x] Drifting refugee ship distress (Zoltan)
  - [x] same title as "Drifting Refugee Ship Distress (Zoltan)" with different capitalization.

- [ ] Drone Control
  - [x] eight SwarmKind ids in swarm.ts.
  - [x] Anti-Combat is wardcut (power 1, 7s cooldown, 5s stun, 47.8% chance to destroy the shot) and ticks on both sides.
  - [x] Generated enemies deploy their class drones on the first combat tick.
  - [x] Combat Drone Mark II deploys at 4 power and fires when its orbit leg finishes.
  - [x] Speed 28 is movement.
  - [x] The page prints no cooldown.
  - [x] A 90 degree leg at Speed 15 takes the 2 second shield restore (INFERRED).
  - [x] The angle check does not wrap.
  - [x] The Ion Intruder has 125 HP.
  - [x] It pulses on a wait drawn from 8.2 to 10 seconds, applies 3 ion to a system that is not destroyed, stuns enemy crew and hostile drones in that room for 6 seconds, and a boarding drone or another Ion Intruder stays free, and then walks to another system.
  - [x] The walk is an inferred 0.6 seconds per room on the door graph.
  - [x] Speed 18 is the space figure and is not that step.
  - [x] A shut blast door loses two hits a second (INFERRED: twice a crew member's one attack a second).
  - [x] Attacking one skips the cooldown once.
  - [x] A Lockdown door takes the same two hits a second off a separate 60-hit coating (INFERRED), and that attack still skips the cooldown once.
  - [x] Hull Repair adds one hull point every 3 seconds (INVENTED) for a total rolled from 3 to 5, then self-destructs and waits out the 10 second rebuild.
  - [x] Filling the hull ends it early.
  - [x] Depowering removes it and does not return the part or start that wait.
  - [x] Speed 20 is movement and is not this rate.
  - [x] Jumping while a Hull Repair drone is still out after 2 repairs returns its drone part.
  - [x] A drone that already broke apart after 3–5 does not.
  - [x] A live drone with fewer than 2 repairs is the same retrieve (INFERRED).
  - [x] The timer freezes while unpowered, and it does not walk while unpowered.
  - [x] Neither id is a SwarmKind.
  - [ ] Neither schematic is stocked.
  - [x] Enemy crew in the room can destroy the player's drone.
  - [x] Shield Overcharger needs 3 power and Shield Overcharger + needs 2.
  - [x] Both add one Zoltan Shield point on 8/10/13/16/20 seconds for 0–4 existing layers, then stop.
  - [x] Unpowered time resets that timer.
  - [x] Speed 5 is a flight figure, the same number Defense Drone Mark I prints, and it does not change those waits (INFERRED: not seconds).
  - [x] At 5 or more layers there is no printed wait, so none is invented.
  - [x] A bubble created while none was present is lost on jump.
  - [x] An existing bubble still recharges to 5.
  - [x] A fitted Shield Overcharger + quotes the printed sell of 30.
  - [x] The regular Shield Overcharger is not quoted.
  - [ ] Neither schematic is stocked.
  - [x] A store sells it at 75 with a System Repair Drone and at 85 with Defense Drone Mark I or Combat Drone Mark I, at level 2, with that schematic selected.
  - [x] The store seed picks which of the three and is not advanced (INFERRED).
  - [x] The naked 60 is not charged.
  - [ ] Standalone schematics stay unstocked.
  - [x] Some drone pages not split out.
  - [x] An enemy Anti-Combat drone stuns or destroys a deployed Boarding Drone or Ion Intruder with the same 5 second stun and 47.8 percent chance.
  - [x] A player boarding drone holds in space while the enemy is cloaked, then breaches the hull and attacks inside.
  - [x] A boarding drone on either hull breaks one system bar in 12.5 seconds, and the drone page prints no separate duration so that figure is the crew sabotage time (INFERRED).
  - [x] A boarding drone deals 3 to 7 HP per hit, the unskilled human range, and each integer in that range is equally likely (INFERRED).
  - [x] Once that system is destroyed and no hostile crew remain, it moves to the nearest system room, counted in interior doors, a tie is an even draw, and no walk time is printed so the move is immediate (INFERRED).
  - [x] An enemy anti-personnel drone deals 3 to 7 HP per hit, the same damage as an untrained human.

- [x] Drone Reactor Booster
  - [x] Not sold.
  - [x] A fitted copy moves the System Repair drone at 62.5 percent of the 0.6 second crew walk; without it, that drone moves at 50 percent.
  - [x] Boarding, combat, hull, and defense drones are not sped up.
  - [x] The drone repairs at an Engi's pace, one bar or breach in 6.25 seconds, and the booster does not change that pace.
  - [x] The walk uses the printed order: Oxygen under 25 percent average air, then a fire, then Shields, then a breach.
  - [x] Engi cruisers do not start with it.

- [ ] Drone Recovery Arm
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Drone Schematic
  - [x] No playable control, number, layout, or rule.

- [ ] Drone Schematics
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Drone parts
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Drones
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Drones salesman
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Dual Lasers
  - [x] src/game/content.ts — Laser (Weapons), Dual Lasers: price is 0 because it cannot be bought.
  - [x] The sell figure 12 is not a sell control.
  - [x] Fitted as twin.

- [x] Easter Eggs and Trivia
  - [x] No playable control, number, layout, or rule.

- [x] Easter eggs and trivia
  - [x] wiki process, not a game system.

- [x] Emergency Respirators
  - [x] Purchase 50.
  - [x] Player crew take half low-oxygen damage, including while boarding an enemy ship.
  - [x] A Crystal with the augment takes a quarter, the racial half times this half.
  - [x] The half follows the crew member's own side (INFERRED; a leash does not lend it to an enemy).
  - [x] An airless level 1 medbay still heals at 6.4, so those crew net-heal.
  - [x] Enemy hulls that list the augment do not apply it.
  - [x] In Abandoned Sector, weak and hungry humans beam 3–4 boarders aboard with no ship.
  - [x] After a Lanius fight, and on a repeat before another fight, those boarders have Emergency Respirators (INFERRED: the last fight's faction is remembered).

- [x] Empty beacon (Civilian)
  - [x] No playable control, number, layout, or rule.

- [x] Empty beacon (Crystal)
  - [x] No playable control, number, layout, or rule.

- [x] Empty beacon (Engi)
  - [x] No playable control, number, layout, or rule.

- [x] Empty beacon (Lanius)
  - [x] No playable control, number, layout, or rule.

- [x] Empty beacon (Last Stand)
  - [x] No playable control, number, layout, or rule.

- [x] Empty beacon (Mantis)
  - [x] No playable control, number, layout, or rule.

- [x] Empty beacon (Pirate)
  - [x] No playable control, number, layout, or rule.

- [x] Empty beacon (Rebel)
  - [x] No playable control, number, layout, or rule.

- [x] Empty beacon (Rock)
  - [x] No playable control, number, layout, or rule.

- [x] Empty beacon (Slug)
  - [x] No playable control, number, layout, or rule.

- [x] Empty beacon (Zoltan)
  - [x] No playable control, number, layout, or rule.

- [x] Empty nebula beacon
  - [x] No playable control, number, layout, or rule.

- [x] Empty nebula beacon (Slug)
  - [x] No playable control, number, layout, or rule.

- [x] Encrypted Federation Signal
  - [x] Same card as dest "Encrypted federation signal" (cited-events-quests-b.ts).
  - [x] The away party rolls a base marker, an assist marker with medium resources, a high cache, a Rebel fight with 2–3 boarders, or an empty outpost.
  - [x] Equal odds are INFERRED.

- [x] Encrypted federation signal
  - [x] same title as "Encrypted Federation Signal" with different capitalization.

- [x] Enemy Ships
  - [x] makeEnemy uses pickEnemy and rollEnemy over the 47 classes in enemy-ships.ts.
  - [x] Rooms for 45 classes are the traced interiors in enemy-layouts.ts.
  - [x] Engi Hacker and Crystal Outrider stay generated from the system list (INFERRED).
  - [x] An unlabeled system sits in an empty hall (INFERRED).
  - [x] Elite hulls stay inside the printed ranges.
  - [x] enemies-rebel.ts and enemies-factions.ts are not what the fight reads.

- [x] Enemy ships' weapons (tables)
  - [x] No playable control, number, layout, or rule.

- [x] Enemy ships weaponry (tables)
  - [x] No playable control, number, layout, or rule.

- [x] Engi
  - [x] stat row in kin.ts.

- [x] Engi Colony Hiding
  - [x] No playable control, number, layout, or rule.

- [ ] Engi Controlled Sector
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Engi Cruiser
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Engi Distress Call
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Engi Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Engi Fleet Discussion
  - [x] Same card as dest "Engi fleet discussion" (cited-events-surrender.ts), Engi Homeworlds only.
  - [x] A plain hail is declined.
  - [x] Ignoring the fleet shows the printed wonder sentence and nothing happens.
  - [x] An Engi crewmember adds two quest markers.
  - [x] The marker fights are in quests.ts.

- [ ] Engi Free Stuff
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Engi Homeworlds
  - [x] No playable control, number, layout, or rule.

- [x] Engi Mantis Fight
  - [x] No playable control, number, layout, or rule.

- [x] Engi Mantis fight
  - [x] same title as "Engi Mantis Fight" with different capitalization.

- [x] Engi Med-bot Dispersal
  - [x] heals your crew at 1.6 HP per second outside the medbay while that medbay is powered.
  - [x] A clone bay stops it.
  - [x] Crew on another ship are skipped.
  - [x] Medbay level does not change the rate.
  - [x] No purchase price, so it is not sold.
  - [x] Engi A starts with it.
  - [x] Engi A's medbay power is 0, so the heal waits for a bar.

- [x] Engi Pirate Fight
  - [x] No playable control, number, layout, or rule.

- [x] Engi Pirate fight
  - [x] same title as "Engi Pirate Fight" with different capitalization.

- [x] Engi Rebel Fight
  - [x] No playable control, number, layout, or rule.

- [x] Engi Rebel fight
  - [x] same title as "Engi Rebel Fight" with different capitalization.

- [ ] Engi Research Station
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Engi Ships
  - [x] No playable control, number, layout, or rule.

- [x] Engi Store
  - [x] No playable control, number, layout, or rule.

- [x] Engi Surrender
  - [x] Same card as dest "Engi surrender" (cited-events-surrender.ts).
  - [x] Explain rolls nothing or a random scrap-with-resources offer.
  - [x] Accept always transfers that offer.
  - [x] The branches run in surrender.ts.

- [ ] Engi attacked by Mantis
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Engi attacked by Rebel
  - [x] No playable control, number, layout, or rule.

- [ ] Engi cache
  - [x] wiki/engi-cache.ts.
  - [x] In Engi Controlled Sector and Engi Homeworlds, booby-trapping spends 2 missiles and delays the Rebel Fleet for 2 turns.
  - [x] Securing grants medium scrap from Template:Scrap rewards (Medium) for the hangar difficulty and sector.
  - [ ] The page does not name the drone schematic, so none is granted.

- [x] Engi colony hiding
  - [x] same title as "Engi Colony Hiding" with different capitalization.

- [ ] Engi distress
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Engi distress Rebel fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [ ] A destroyed ship pays low scrap with resources, a crew kill pays medium, the Rebel never runs or surrenders, 25 scrap does nothing or mounts Healing Burst and does not grant the unnamed drone schematic, and 40 scrap with 2 missiles and 2 fuel fits Engi Med-bot Dispersal.

- [x] Engi distress call
  - [x] same title as "Engi Distress Call" with different capitalization.

- [x] Engi empty beacon
  - [x] same title as "Engi Empty Beacon" with different capitalization.

- [ ] Engi fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Engi fight, the printed debris-field sentence is shown in full before Fight an Engi ship, which still fights a default Engi ship.

- [x] Engi fight (Zoltan)
  - [x] No playable control, number, layout, or rule.

- [x] Engi fleet discussion
  - [x] same title as "Engi Fleet Discussion" with different capitalization.

- [x] Engi free stuff
  - [x] same title as "Engi Free Stuff" with different capitalization.

- [x] Engi mantis fight
  - [x] same title as "Engi Mantis Fight" with different capitalization.

- [x] Engi pirate fight
  - [x] same title as "Engi Pirate Fight" with different capitalization.

- [x] Engi research station
  - [x] same title as "Engi Research Station" with different capitalization.

- [ ] Engi ship attacked by Mantis ship
  - [x] quests-b.ts rolls a Mantis fight or a Mantis-crewed Engi ship with 1–2 boarders.
  - [x] The later weapon and drone-schematic lines pay low scrap only.
  - [ ] The unnamed item is not granted.

- [ ] Engi ship distress call
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Engi ship under attack by Rebel
  - [x] No playable control, number, layout, or rule.

- [ ] Engi smashed ships
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Winning pays nothing, and an Engi crewmember is paid random resources with some scrap.
  - [x] Opening the beacon shows the printed smashed-ships sentence.
  - [x] Prying the ships apart shows the printed hostile sentence and fights an Engi ship.

- [x] Engi store
  - [x] same title as "Engi Store" with different capitalization.

- [x] Engi surrender
  - [x] same title as "Engi Surrender" with different capitalization.

- [ ] Engi virus
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Engines
  - [x] src/game/content.ts — Engines, System Upgrades and FTL Drive charge time: evasion and the charge tables are what evasionPercent reads.

- [ ] Environmental Hazard
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Environmental Hazards
  - [x] a nebula beacon advances the fleet by 0.5 outside a nebula sector and by 0.8 inside one.
  - [x] The anti-ship battery shot is 3 hull and a breach.
  - [x] A defense drone does not shoot it down.
  - [x] A Zoltan Shield does not take it; the hull does.
  - [x] It does not arm on a nebula beacon.
  - [x] A warning lands 15–20 seconds after the fight starts, then the real shot 5–10 seconds later, and that cycle repeats until escape.
  - [x] The uniform roll is INFERRED.
  - [x] Cosmetic fake shots are not drawn.
  - [x] An asteroid has a small chance to cause a fire or a breach, and one rock does not start both.
  - [x] The 5 percent each is INFERRED.
  - [x] A pulsar fight warns 5 seconds ahead of a pulse every 11–18 seconds.
  - [x] The span is uniform and the top is not its own bucket (INFERRED).
  - [x] Powered shields are always one of the two systems.
  - [x] Ion is 1 + 0.5 times power, rounded down.
  - [x] A level-2 door with a body takes 3.
  - [x] A Zoltan Shield on a ship that has Shields spends 3 or 4 and the systems stay clear.
  - [x] A ship with no Shields system ignores the bubble.
  - [x] One Reverse Ion Field negates a whole pulsar pulse half the time and does not spend a Zoltan Shield.
  - [x] Two copies always do.
  - [x] A red giant fight warns 5 seconds ahead of a flare every 28–34 seconds.
  - [x] Shields or a Zoltan Shield start 1 or 2 fires and are not spent, and shields down start 3–6.
  - [x] A lit room takes 1 hull and 1 system damage 33 percent of the time for one fire and 66 percent for two.
  - [x] The even split, the 3–6 buckets, and at most 2 fires in a room are INFERRED.
  - [x] An overtaken nebula beacon halves the reactor, rounded up, and an exit beacon does not.
  - [x] Power already assigned above that pool comes off on arrival.
  - [x] Zoltan bars and Backup Battery bars stay whole.
  - [x] Enemy reactors are halved the same way.
  - [x] Only that always-case is used (INFERRED).
  - [x] An out-of-fuel wait that the fleet overtakes removes the nebula environment, so the anti-ship battery and a Rebel Elite are both there.
  - [x] A fueled wait keeps the ion storm.
  - [x] A jump onto that nebula keeps the storm and does not arm the battery.
  - [x] A last-fuel jump onto that nebula, or its exit, sends the Rebel Elite running on a 90 second timer.
  - [x] While the ship is in danger from a fight, boarders, a solar flare, an asteroid field, a pulsar, or a hostile anti-ship battery, the ship info screen stays closed and a reactor or system upgrade does not apply, and a nebula or an ion storm still allows that screen when there is no fight and no boarders.
  - [x] An asteroid strikes the enemy ship the same way it strikes yours.
  - [x] The gap between asteroids is random and shortens as your shield system level rises, and ion that drops shield power does not slow it.
  - [x] The seconds are INFERRED.
  - [x] Rocks keep coming after the enemy is destroyed or escapes, and those rocks do not train shields or evasion.
  - [x] A jump leaves the field.
  - [x] A damaged subsystem, including a Backup Battery, still takes ion equal to its system level, and a manned Sensors console counts one level higher, capped at 4.

- [x] Escape Pod Floating Nearby
  - [x] No playable control, number, layout, or rule.

- [x] Escape pod
  - [x] Prying it open beams one Mantis boarder aboard and loses a crewmember, and a clone bay brings that crewmember back.
  - [x] That boarder result logs the printed furious sentence.

- [x] Escape pod floating nearby
  - [x] same title as "Escape Pod Floating Nearby" with different capitalization.

- [ ] Escort FTL haywire civilian ship
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Escort Nearby Ship
  - [x] No playable control, number, layout, or rule.

- [x] Escort civilian ship
  - [x] No playable control, number, layout, or rule.

- [ ] Escort civilians
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Escort civilians, one of the three printed intros is shown before Accept and Decline.
  - [x] Declining shows the printed understanding sentence and nothing happens.
  - [x] Accepting shows the printed down-payment sentence and still adds the quest marker.

- [ ] Escort civilians FTL haywire
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Advanced FTL Navigation pays high scrap with resources.
  - [x] Declining shows the printed wait-for-the-next-ship sentence and nothing happens.
  - [x] Leading them shows the printed down-payment sentence and still adds the quest marker.

- [x] Escort nearby ship
  - [x] same title as "Escort Nearby Ship" with different capitalization.

- [ ] Event
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Events
  - [x] No playable control, number, layout, or rule.

- [x] Events commented out
  - [x] No playable control, number, layout, or rule.

- [x] Exit Beacons
  - [x] No playable control, number, layout, or rule.

- [ ] Explore the System
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Explore the system
  - [x] same title as "Explore the System" with different capitalization.

- [ ] Explosive Replicator
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] FTL: Advanced Edition
  - [ ] The page states a mechanic and it is not a playable event.

- [x] FTL: Faster Than Light
  - [x] No playable control, number, layout, or rule.

- [x] FTL: Faster Than Light (about the game)
  - [x] wiki process, not a game system.

- [x] FTL: Faster Than Light Wiki
  - [x] wiki process, not a game system.

- [ ] FTL Jammer
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] FTL Recharge Booster
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] FTL haywire civilian ship escort
  - [x] No playable control, number, layout, or rule.

- [x] FTL iPad Edition
  - [x] wiki process, not a game system.

- [ ] Federation Cruiser
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Federation Deserters
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed glitch sentence.
  - [x] Attacking the traitors shows the printed cowards sentence and fights a Federation ship.
  - [x] Leaving them be shows the printed warning sentence and nothing happens.
  - [x] Offering supplies spends 15 to 25 scrap and 1 to 3 fuel, shows the printed flight-plan sentence, and the current sector map is revealed.

- [x] Federation Fleet
  - [x] No playable control, number, layout, or rule.

- [x] Federation Fleet and Rebel Fleet Fight
  - [x] No playable control, number, layout, or rule.

- [x] Federation Science-Craft Docked with Lanius
  - [x] No playable control, number, layout, or rule.

- [x] Federation Science-Craft docked with Lanius
  - [x] same title as "Federation Science-Craft Docked with Lanius" with different capitalization.

- [ ] Federation Ship in Need of Aid
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Federation Ship in need of Aid
  - [x] same title as "Federation Ship in Need of Aid" with different capitalization.

- [x] Federation Ships
  - [x] No playable control, number, layout, or rule.

- [x] Federation Terraforming Team C12
  - [x] No playable control, number, layout, or rule.

- [x] Federation base assist
  - [x] No playable control, number, layout, or rule.

- [x] Federation deserters
  - [x] same title as "Federation Deserters" with different capitalization.

- [x] Federation fleet and Rebel fleet fight
  - [x] same title as "Federation Fleet and Rebel Fleet Fight" with different capitalization.

- [x] Federation science-craft docked with Lanius
  - [x] same title as "Federation Science-Craft Docked with Lanius" with different capitalization.

- [x] Federation ship in need of aid
  - [x] same title as "Federation Ship in Need of Aid" with different capitalization.

- [ ] Federation signal broadcast
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Federation terraforming team C12
  - [x] same title as "Federation Terraforming Team C12" with different capitalization.

- [x] Fight in Last Stand
  - [x] No playable control, number, layout, or rule.

- [ ] Fire
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Fire Suppression
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Fire chance
  - [x] No playable control, number, layout, or rule.

- [x] Fire on Small Research Station
  - [x] No playable control, number, layout, or rule.

- [x] Fire on research station
  - [x] Sending the crew loses one crewmember and pays low scrap, or pays high scrap, and docking deals 4 hull and 1 system damage or Dr. Jones joins with low scrap.

- [x] Fire on small research station
  - [x] same title as "Fire on Small Research Station" with different capitalization.

- [x] Fires
  - [x] A fire burns 0.96% oxygen per second and dies below 10% oxygen.
  - [x] A fire below 10 percent oxygen dies on a timer from 5 to 14 seconds, so none beside it lasts 2.08 to 5.83 seconds and four beside it last up to 29.17 seconds.
  - [x] Fire-fighting is the crew-races share: 0.096 of a fire per second for an untrained Human, times repair skill ×1 / ×1.1 / ×1.2, times Rock 1.67 or Crystal 0.83.
  - [x] Fitted Fire Suppression puts out every burning room at a Crystal crew member's speed, 0.096 times 0.83, and that rate is not scaled.
  - [x] The 2.128 crew-damage cite is not this path.
  - [x] The same oxygen loss, extinguish, crew damage, and 7-second spread run on the map.
  - [x] Repair, venting, oxygen refill, and system sabotage stay on the combat tick.
  - [x] Enemy crew give up a 2x2 only when all four tiles have a flame, and a full breached 2x1 or 2x2 makes every race leave.

- [ ] Fires and venting
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Flagship
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Flak (Weapon)
  - [x] No playable control, number, layout, or rule.

- [ ] Flak (Weapons)
  - [x] src/game/content.ts — Flak I, Adv.
  - [x] Flak, and Flak II are in WEAPONS.
  - [ ] Radius and fake pellets stay in gaps.
  - [x] Flak Artillery is a system.
  - [x] A Flak I shot aimed at a 1x2 room stays there 44.21 percent of the time, with 11.96 percent on each long-side tile, 3.63 percent on each short-side tile, and 0.17 percent on each corner, and a shot aimed at a 2x2 room stays 84.08 percent of the time.
  - [x] A Flak II shot aimed at a 1x2 room stays there 25.78 percent of the time, with 12.06 percent on each long-side tile, 7.02 percent on each short-side tile, 2.70 percent on each corner, and 0.29 percent on each tile past the long sides, and a shot aimed at a 2x2 room stays 51.56 percent of the time, with 5.90 percent on each side tile and 0.31 percent on each corner.
  - [x] An Adv.
  - [x] Flak shot aimed at a 1x2 room stays there 48.74 percent of the time, with 11.51 percent on each long-side tile, 2.57 percent on each short-side tile, and 0.02 percent on each corner, and a shot aimed at a 2x2 room stays 89.59 percent of the time with 1.30 percent on each side tile.
  - [x] A Flak I burst adds three fake pellets that deal no damage and do not drop shields, and a defense drone can shoot one down.

- [x] Flak Artillery
  - [x] flakart.ts.
  - [x] Flight time and spread INFERRED.
  - [x] A Flak Artillery shot aimed at a 1x2 room stays there 60.90 percent of the time and otherwise lands on a long-side tile at 9.78 percent each, and a shot aimed at a 2x2 room always stays.
  - [x] A Flak Artillery burst adds seven fake pellets that deal no damage and do not drop shields, and a defense drone can shoot one down.
  - [x] Charge time follows the filled power level, 50 seconds at one bar, 40 at two, 30 at three, and 20 at four, and powering off drains the charge.
  - [x] An Automated Re-loader divides that charge time by 1.1, three of them raise the firing rate by 30 percent, and the system cannot be manned so crew skill does not shorten it.
  - [x] A cloaked ship stops charging and firing at every power level.

- [x] Forward Scout of Rebel Fleet
  - [x] No playable control, number, layout, or rule.

- [x] Forward scout of Rebel fleet
  - [x] same title as "Forward Scout of Rebel Fleet" with different capitalization.

- [ ] Free Drone Schematic
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.

- [x] Free Stuff
  - [x] No playable control, number, layout, or rule.

- [x] Free Weapon
  - [x] No playable control, number, layout, or rule.

- [x] Free drone schematic
  - [x] same title as "Free Drone Schematic" with different capitalization.

- [ ] Free scrap with resources
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the six printed intros is shown, then the medium scrap with resources.

- [ ] Free scrap with resources (Engi)
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Free scrap with resources (Lanius)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed damaged-craft sentence.

- [x] Free scrap with resources (Zoltan)
  - [x] No playable control, number, layout, or rule.

- [x] Free stuff
  - [x] same title as "Free Stuff" with different capitalization.

- [ ] Free weapon
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the six printed intros is shown, then low scrap.
  - [ ] The unnamed weapon is not granted.

- [x] Friendly Refugee
  - [x] No playable control, number, layout, or rule.

- [x] Friendly Ship Out of Fuel
  - [x] Same card as dest "Friendly ship out of fuel" (filler-events.ts).
  - [x] Giving 2–4 fuel rolls high scrap (weight 2), a weapon, a reactor bar, or a map line.
  - [x] The sector map is not revealed.

- [ ] Friendly Slaver
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Friendly refugee
  - [x] same title as "Friendly Refugee" with different capitalization.

- [x] Friendly ship out of fuel
  - [x] same title as "Friendly Ship Out of Fuel" with different capitalization.

- [x] Friendly slaver
  - [x] same title as "Friendly Slaver" with different capitalization.

- [ ] Fuel
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Fuel Auto-ship
  - [x] No playable control, number, layout, or rule.

- [x] Fuel Automated Rebel Scout
  - [x] No playable control, number, layout, or rule.

- [ ] Fuel Engi Ship Repair
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Fuel Engi ship repair
  - [x] same title as "Fuel Engi Ship Repair" with different capitalization.

- [ ] Fuel Fleet Delay
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Fuel Fleet delay
  - [x] same title as "Fuel Fleet Delay" with different capitalization.

- [x] Fuel Mantis Attack
  - [x] No playable control, number, layout, or rule.

- [x] Fuel Mantis attack
  - [x] same title as "Fuel Mantis Attack" with different capitalization.

- [x] Fuel Trader
  - [x] No playable control, number, layout, or rule.

- [ ] Fuel Trader (Distress)
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Fuel Wait Fail
  - [x] No playable control, number, layout, or rule.

- [x] Fuel Wait Fail (Distress)
  - [x] No playable control, number, layout, or rule.

- [x] Fuel automated Rebel scout
  - [x] same title as "Fuel Automated Rebel Scout" with different capitalization.

- [x] Fuel for Drone
  - [x] No playable control, number, layout, or rule.

- [x] Fuel for drone
  - [x] same title as "Fuel for Drone" with different capitalization.

- [x] Fuel for drone parts
  - [x] No playable control, number, layout, or rule.

- [x] Fuel trader
  - [x] same title as "Fuel Trader" with different capitalization.

- [x] Fuel trader (distress)
  - [x] same title as "Fuel Trader (Distress)" with different capitalization.

- [x] Fuel wait fail
  - [x] same title as "Fuel Wait Fail" with different capitalization.

- [x] Fuel wait fail (Distress)
  - [x] same title as "Fuel Wait Fail (Distress)" with different capitalization.

- [x] Fuel wait fail (distress)
  - [x] same title as "Fuel Wait Fail (Distress)" with different capitalization.

- [ ] Full Arsenal
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Galactic Federation
  - [x] No playable control, number, layout, or rule.

- [x] Game Bugs
  - [x] No playable control, number, layout, or rule.

- [x] Game Over
  - [x] defeat phase exists.
  - [x] Page not opened.

- [x] Game bugs
  - [x] wiki process, not a game system.

- [x] Game patches
  - [x] wiki process, not a game system.

- [x] General Store
  - [x] No playable control, number, layout, or rule.

- [x] General store
  - [x] same title as "General Store" with different capitalization.

- [ ] Giant Alien Spiders
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Giant alien spiders
  - [x] same title as "Giant Alien Spiders" with different capitalization.
  - [x] Sending the crew loses one crewmember or pays high resources with some scrap, a fitted Anti-Personnel Drone or Boarding Drone spends one drone part unless the reward includes drone parts, and an Anti-Bio Beam pays high resources with some scrap.

- [x] Givin' her all she's got, Captain!
  - [x] No playable control, number, layout, or rule.

- [ ] Glaive Beam
  - [x] Fitted on Stealth B.
  - [ ] Beam length and shield profile stay in gaps.
  - [x] Cloak power 0 is INFERRED so the 4-power gun fits reactor 7.

- [x] Guides and Tips
  - [x] No playable control, number, layout, or rule.

- [x] Guides and tips
  - [x] wiki process, not a game system.

- [x] Hacking
  - [x] spike.ts on either hull, including Flagship stage 1 at level 3.
  - [x] Several timings INFERRED.
  - [x] Hacking the weapons system on a normal ship drains every gun.
  - [x] On a Flagship, hacking one artillery room drains that gun at its base charge, and the other guns keep charging.
  - [x] A shot or ion on one artillery room slows only that gun.
  - [x] Depowering a hacked Crew Teleporter stops the enemy pulse from retrieving your crew, unless Zoltans, a cooldown, and spare reactor put a bar back and force them home.

- [ ] Hacking Stun
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.
  - [x] Hacking Stun stuns crew and drones in the hacked room for the rest of the pulse, and someone who enters is stunned for the time still left.

- [ ] Hazards
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Healing Burst
  - [x] Bomb (Weapons) row is in WEAPONS and fitted on Slug B.
  - [x] Hull damage is 0.
  - [x] A hit adds 150 HP to living crew in that room on the shooter's side, including a leashed crew member, and does not spend a Zoltan Shield.
  - [x] It can still miss the enemy ship.
  - [x] Aiming it at your own ship is a control, and that shot does not miss.

- [ ] Heavily Damaged Federation Ship
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Heavily Damaged Federation Ship Random Event
  - [x] No playable control, number, layout, or rule.

- [x] Heavily damaged Federation ship
  - [x] same title as "Heavily Damaged Federation Ship" with different capitalization.

- [x] Hidden Crystal Worlds
  - [x] No playable control, number, layout, or rule.

- [ ] Hidden federation base
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Hiring Crewmembers Station
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Hiring crewmembers station
  - [x] same title as "Hiring Crewmembers Station" with different capitalization.

- [x] Home Sweet Home
  - [x] No playable control, number, layout, or rule.

- [x] Hostile Lanius Ship
  - [x] No playable control, number, layout, or rule.

- [x] Hostile Lanius ship
  - [x] same title as "Hostile Lanius Ship" with different capitalization.

- [x] Hostile Pirate in Lanius Sector
  - [x] No playable control, number, layout, or rule.

- [x] Hostile Rebel in Lanius Sector
  - [x] No playable control, number, layout, or rule.

- [x] Hostile Rebel in Lanius sector
  - [x] same title as "Hostile Rebel in Lanius Sector" with different capitalization.

- [x] Hostile pirate in Lanius sector
  - [x] same title as "Hostile Pirate in Lanius Sector" with different capitalization.

- [x] Huge Rebel Shipyard
  - [x] No playable control, number, layout, or rule.

- [x] Huge Rebel shipyard
  - [x] same title as "Huge Rebel Shipyard" with different capitalization.

- [ ] Hull
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Human
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Human Boarders
  - [x] No playable control, number, layout, or rule.

- [x] Human Boarders Sensors Jammed
  - [x] No playable control, number, layout, or rule.

- [x] Human boarders
  - [x] same title as "Human Boarders" with different capitalization.

- [x] Human boarders in abandoned sector
  - [x] No playable control, number, layout, or rule.

- [x] Human boarders in nebula
  - [x] No playable control, number, layout, or rule.

- [x] Human boarders in pirate sector
  - [x] No playable control, number, layout, or rule.

- [ ] Human boarders in plasma storm
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Human boarders jammed sensors
  - [x] No playable control, number, layout, or rule.

- [x] Human boarders near sun
  - [x] No playable control, number, layout, or rule.

- [x] Human boarders sensors jammed
  - [x] same title as "Human Boarders Sensors Jammed" with different capitalization.

- [x] Humans
  - [x] The printed XP column runs: 13/13/50/58/16/7 via xpNeedFor.
  - [x] Other races keep 15/15/55/65/18/8.
  - [x] The column is not collapsed to 0.9×.
  - [x] The rest of the race page is not this path.

- [x] I hardly lifted a finger
  - [x] No playable control, number, layout, or rule.

- [ ] I hardly lifted a finger (Achievement)
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Improve Reactor for Supplies
  - [x] No playable control, number, layout, or rule.

- [x] Improve reactor for supplies
  - [x] same title as "Improve Reactor for Supplies" with different capitalization.
  - [x] A convoy trades one shown bundle of missiles, drone parts, or fuel for one reactor bar, and a full reactor still takes the supplies.

- [x] Intelligent Lifeform on Planet
  - [x] No playable control, number, layout, or rule.

- [x] Intelligent life form on planet
  - [x] No playable control, number, layout, or rule.

- [ ] Intelligent life forms planet
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Intelligent lifeform on planet
  - [x] same title as "Intelligent Lifeform on Planet" with different capitalization.

- [x] Intelligent ponies
  - [x] filler-events.ts opens talk, sell, and leave.
  - [x] Talk grants an Engi plus low scrap, or nothing.
  - [x] Sell loses a crewmember, or nothing.
  - [x] Equal odds are INFERRED.
  - [x] Ignoring the readings shows the printed move-on sentence and nothing happens.

- [x] Intercept Comm Chatter from Mantis Ship
  - [x] No playable control, number, layout, or rule.

- [x] Intercept comm chatter from Mantis ship
  - [x] same title as "Intercept Comm Chatter from Mantis Ship" with different capitalization.

- [ ] Ion (Weapons)
  - [x] Ion Blast, Ion Blast II, Heavy Ion, Ion Stunner, Ion Charger, Chain Ion, and Boss Ion are in WEAPONS.
  - [x] Boss Ion power is 3.
  - [x] Chain Ion deals 1, then 2, 3, and 4 ion on a 14 second charge.
  - [x] Losing power resets that streak (INFERRED).
  - [ ] Ion Charger early fire stays a gap.
  - [x] A blocked Ion Stunner stuns crew and drones in the Shields room for 5 seconds, and the aimed room stays clear.

- [x] Ion Blast Mark II
  - [x] src/game/content.ts — Ion (Weapons), Ion Blast Mark II: power 3, charge 4, ion 1, price 70, fitted as ion2 on the Engi A hull.

- [x] Ion Storm
  - [x] No playable control, number, layout, or rule.

- [x] Ion Storm Events
  - [x] No playable control, number, layout, or rule.

- [x] Ion Storms
  - [x] No playable control, number, layout, or rule.

- [x] Ions (Weapon)
  - [x] No playable control, number, layout, or rule.

- [x] Is it warm in here?
  - [x] No playable control, number, layout, or rule.

- [ ] KazaaakplethKilik
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Kestrel Cruiser
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Kruos
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] LRS
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Lanius
  - [x] Suffocation immunity stays in kin.ts.
  - [x] Each living Lanius drains 12 oxygen per second from its room (the inferred breach rate) and several stack.
  - [x] Movement 0.85 is the measured footnote (INFERRED vs the printed 0.85 note).

- [x] Lanius Absorbing Rebel Base
  - [x] No playable control, number, layout, or rule.

- [x] Lanius Absorbing Rebel Scout
  - [x] No playable control, number, layout, or rule.

- [ ] Lanius Attacking Civilian
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Lanius Cruiser
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Lanius Distress Beacon Empty
  - [x] No playable control, number, layout, or rule.

- [x] Lanius Distress Signal Blinks Out
  - [x] No playable control, number, layout, or rule.

- [x] Lanius Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [ ] Lanius Merchant
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Lanius Merchant with Improved Translator
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Lanius Pirate fight
  - [x] No playable control, number, layout, or rule.

- [x] Lanius Rebel fight
  - [x] No playable control, number, layout, or rule.

- [ ] Lanius Salvaging Small Asteroid Belt
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Lanius Salvaging Small Civilian Craft
  - [x] No playable control, number, layout, or rule.

- [x] Lanius Scavenger Trader
  - [x] No playable control, number, layout, or rule.

- [x] Lanius Ship Mining Mantis Ship's Hull
  - [x] No playable control, number, layout, or rule.

- [x] Lanius Ships
  - [x] No playable control, number, layout, or rule.

- [x] Lanius Store
  - [x] No playable control, number, layout, or rule.

- [x] Lanius Vessel in Rich Debris Field
  - [x] No playable control, number, layout, or rule.

- [x] Lanius absorbing Auto-ship
  - [x] No playable control, number, layout, or rule.

- [x] Lanius absorbing Rebel base
  - [x] same title as "Lanius Absorbing Rebel Base" with different capitalization.

- [x] Lanius absorbing Rebel scout
  - [x] same title as "Lanius Absorbing Rebel Scout" with different capitalization.

- [ ] Lanius absorbing automated scout
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Lanius absorbing jump beacon
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Lanius absorbing rebel base
  - [x] same title as "Lanius Absorbing Rebel Base" with different capitalization.

- [x] Lanius attacking Civilian
  - [x] same title as "Lanius Attacking Civilian" with different capitalization.

- [x] Lanius attacking Mantis
  - [x] No playable control, number, layout, or rule.

- [x] Lanius attacking Mantis ship
  - [x] No playable control, number, layout, or rule.

- [ ] Lanius attacking Rock
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Lanius attacking Rock ship
  - [x] No playable control, number, layout, or rule.

- [x] Lanius attacking Slug
  - [x] No playable control, number, layout, or rule.

- [x] Lanius attacking Slug ship
  - [x] No playable control, number, layout, or rule.

- [x] Lanius attacking civilian
  - [x] same title as "Lanius Attacking Civilian" with different capitalization.

- [ ] Lanius attacking civilian distress
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Lanius craftsmen
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Lanius distress beacon empty
  - [x] same title as "Lanius Distress Beacon Empty" with different capitalization.

- [x] Lanius distress signal blinks out
  - [x] same title as "Lanius Distress Signal Blinks Out" with different capitalization.

- [x] Lanius empty beacon
  - [x] same title as "Lanius Empty Beacon" with different capitalization.

- [x] Lanius empty beacon distress
  - [x] No playable control, number, layout, or rule.

- [x] Lanius empty distress beacon
  - [x] No playable control, number, layout, or rule.

- [x] Lanius empty distress beacon 1
  - [x] No playable control, number, layout, or rule.

- [x] Lanius empty distress beacon 2
  - [x] No playable control, number, layout, or rule.

- [ ] Lanius fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the eleven printed intros is shown before the default Lanius ship fight, and the repeated line is included.

- [ ] Lanius fight distress
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed sentence is shown before the default Lanius ship fight.

- [x] Lanius fight distress trap
  - [x] No playable control, number, layout, or rule.

- [ ] Lanius fight in asteroid field
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The fight starts inside an asteroid field.
  - [x] The printed sentence is shown before the default Lanius ship fight.

- [ ] Lanius fight near pulsar
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed sentence is shown before the default Lanius ship fight, which still starts beside a pulsar.

- [ ] Lanius fight with friendly ASB support
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The Lanius fight with friendly ASB support fires the Anti-Ship Battery at the other ship.
  - [x] The Lanius ship never surrenders.
  - [x] The Lanius ship never escapes.
  - [x] A destroyed ship pays medium scrap with resources and a crew kill pays high scrap with resources, then after the fight the defense team repairs 8 hull or nothing happens.

- [ ] Lanius free stuff
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Lanius lone ship
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Contacting them opens a store, starts a default Lanius fight, or does nothing, and a Lanius opens the store.
  - [x] The printed fleeing sentence is shown before those choices.
  - [x] Attacking the Lanius ship shows the printed retreat sentence and starts a Lanius fight.
  - [x] Staying out shows the printed escape sentence and nothing happens.

- [x] Lanius merchant with improved translator
  - [x] same title as "Lanius Merchant with Improved Translator" with different capitalization.

- [ ] Lanius powered-down ship
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Scanning, attacking, or stripping can start a default Lanius fight, stripping can pay low scrap, a Lanius takes medium resources with some scrap, and level 2 piloting pays medium scrap.
  - [x] The printed drifting sentence is shown before those choices.
  - [x] Scanning the ship shows the printed hibernation sentence and starts a Lanius fight.

- [x] Lanius salvaging
  - [x] No playable control, number, layout, or rule.

- [x] Lanius salvaging small civilian craft
  - [x] same title as "Lanius Salvaging Small Civilian Craft" with different capitalization.

- [x] Lanius scavenger trader
  - [x] same title as "Lanius Scavenger Trader" with different capitalization.

- [ ] Lanius ship absorbing automated scout
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed Lanius pays medium scrap with resources, a crew kill pays high, an escape pays none, and inspecting the scout pays random scrap or that scrap with a one-turn fleet delay.
  - [x] Fighting the ship shows the printed weapons sentence and starts a Lanius fight.
  - [x] Leaving them alone shows the printed move-on sentence and nothing happens.

- [ ] Lanius ship absorbing jump beacon
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Lanius ship absorbing rebel base
  - [x] Asking them pays medium scrap and delays the fleet one turn, starts a Lanius fight, or does nothing, and a Lanius crewmember pays that same scrap and delay.

- [ ] Lanius ship attacking Mantis
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Winning either ending pays medium scrap with resources, and contacting the Mantis pays 2-4 missiles with medium scrap or another medium scrap with resources.
  - [x] The Lanius ship never surrenders.
  - [x] The Lanius ship never escapes.
  - [x] Attacking the Lanius ship shows the printed fray sentence and fights a Lanius ship.
  - [x] Leaving the Mantis shows the printed remains sentence and nothing happens.
  - [x] Opening the beacon shows the printed distress sentence.

- [ ] Lanius ship attacking Rock
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Winning either ending pays medium scrap with resources, and contacting the Rockmen pays another medium or nothing.
  - [x] The Lanius ship never surrenders.
  - [x] The Lanius ship never escapes.
  - [x] Attacking the Lanius ship shows the printed help sentence and fights a Lanius ship.
  - [x] Leaving the Rockmen shows the printed engines-explode sentence and nothing happens.

- [ ] Lanius ship attacking Slug
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Winning either ending pays medium scrap with resources, and contacting the Slugs pays another medium or nothing.
  - [x] The printed distress sentence is shown before that fight.
  - [x] The Lanius ship never surrenders.
  - [x] The Lanius ship never escapes.
  - [x] Leaving the Slugs shows the printed jump sentence and nothing happens.

- [ ] Lanius ship attacking civilian
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap with resources, a crew kill pays high, and contacting the civilians pays low scrap, five repairs, medium scrap, low scrap with resources, or nothing.
  - [x] Avoiding the conflict shows the printed mission sentence and nothing happens.
  - [x] One of the three printed intros is shown before Attack the Lanius ship, which still fights a Lanius ship.
  - [x] The Lanius ship never surrenders.
  - [x] The Lanius ship never escapes.
  - [x] At Lanius ship attacking civilian, attacking logs the printed charge sentence and fights a Lanius ship.

- [ ] Lanius ship attacking civilian distress
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap with resources, a crew kill pays high, a Lanius crewmember starts that fight or powers the ship down, and contacting the civilians pays low scrap, five repairs, medium scrap, low scrap with resources, or nothing.
  - [x] Avoiding the conflict shows the printed greater-good sentence and nothing happens.
  - [x] Fighting the Lanius ship shows the printed intercept sentence and fights a Lanius ship.
  - [x] The Lanius ship never surrenders.
  - [x] The Lanius ship never escapes.

- [ ] Lanius ship in rich debris field
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Winning either ending pays medium scrap with resources, the debris pays high, medium, or low, and piloting level 2 harvests medium scrap while level 3 harvests high.
  - [x] The Lanius ship never surrenders.
  - [x] Harvesting the debris shows the printed close-approach sentence and fights a Lanius ship.
  - [x] The Lanius ship never escapes.
  - [x] Attacking the vessel shows the printed offensive sentence and fights a Lanius ship.
  - [x] Ignoring the vessel shows the printed jump sentence and nothing happens.

- [x] Lanius ship mining Mantis ship's hull
  - [x] same title as "Lanius Ship Mining Mantis Ship's Hull" with different capitalization.

- [x] Lanius ship mining Mantis ship hull
  - [x] No playable control, number, layout, or rule.

- [ ] Lanius ship salvager
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Requesting scrap with a Lanius pays medium scrap only, a scoff, or nothing, and either fight stays on default Lanius rewards.
  - [x] Opening the beacon shows one of the five printed intros.
  - [x] Attacking the ship shows the printed weapons sentence and fights a Lanius ship.
  - [x] Leaving them alone shows the printed jump sentence and nothing happens.

- [x] Lanius store
  - [x] same title as "Lanius Store" with different capitalization.

- [ ] Lanius trader
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One shown trade pays the printed fuel, missile, or drone band, and a Lanius asks for the better scrap band.
  - [x] Opening the beacon shows one of the three printed intros before that trade.
  - [x] Declining the trade shows the printed leave sentence and spends nothing.

- [ ] Lanius trader with translator
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One shown trade pays the printed fuel, missile, or drone band, and 40 scrap hires a Lanius named Translator.
  - [x] Opening the beacon shows the printed merchant sentence before that trade.
  - [x] Declining the trade shows the printed leave sentence and spends nothing.

- [x] Lanius vessel in rich debris field
  - [x] same title as "Lanius Vessel in Rich Debris Field" with different capitalization.

- [x] Lanius with Federation science craft
  - [x] No playable control, number, layout, or rule.

- [x] Lanius with docked science craft
  - [x] No playable control, number, layout, or rule.

- [x] Large Asteroid Field
  - [x] Same card as dest "Large asteroid field" (filler-events.ts).
  - [x] Explore rolls fuel 3–6, missiles 2–4 plus medium scrap, 1 drone part plus medium scrap, a Pirate fight in an asteroid field, or nothing.
  - [x] The rock result deals 5 hull, 1 damage to a random system, and 1 damage with 1–2 fires on a random room.
  - [x] The second fire is a coin flip (INFERRED).
  - [x] A systemless room still burns.
  - [x] A fitted Scrap Recovery Arm mines high scrap and nothing else.
  - [x] Without that augment the choice stays closed.

- [ ] Large Convoy
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Large Trade Station
  - [x] No playable control, number, layout, or rule.

- [x] Large asteroid field
  - [x] same title as "Large Asteroid Field" with different capitalization.

- [x] Large convoy
  - [x] same title as "Large Convoy" with different capitalization.

- [x] Large trade station
  - [x] same title as "Large Trade Station" with different capitalization.

- [ ] Laser (Weapons)
  - [x] src/game/content.ts — the laser rows are in WEAPONS.
  - [x] Hull Smasher I and II deal 2 hull damage on a systemless room and do not raise crew damage.
  - [ ] Pierce stays a gap.
  - [x] Chain Burst charges 16/13/10/7 and Chain Vulcan charges 11.1 down to 1.1.
  - [x] Losing power resets either chain.
  - [x] Boss Laser is a WeaponDef.
  - [x] Power 4 is the chosen artillery maximum, not a Weapons-pool cost.
  - [x] Charge times are 25/20/15/10, outside the Weapons pool.
  - [x] Fire 10% and breach 9% are the flagship page's figures.
  - [x] A Heavy Laser rolls its 30 percent fire chance first and rolls the 30 percent breach chance only when that shot starts no fire (INFERRED: heavy, heavy2, and heavypierce).

- [x] Laser Charger (S)
  - [x] No playable control, number, layout, or rule.

- [x] Lasers (Weapon)
  - [x] No playable control, number, layout, or rule.

- [x] Last Stand empty beacon
  - [x] No playable control, number, layout, or rule.

- [ ] Legendary Thief KazaaakplethKilik Random Event
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Legendary thief KazaaakplethKilik
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed armor-plating sentence.
  - [x] Preparing to fight fields a Mantis ship whose crew are all Mantis.
  - [x] Hailing with a Mantis shows the printed haka sentence and starts an all-Mantis fight.

- [x] Legendary thief KazaaakplethKilik Random Event
  - [x] same title as "Legendary Thief KazaaakplethKilik Random Event" with different capitalization.

- [x] Legendary thief KazaaakplethKilik random event
  - [x] same title as "Legendary Thief KazaaakplethKilik Random Event" with different capitalization.

- [ ] Lifeform Scanner
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.
  - [x] A fitted Lifeform Scanner reveals live enemy crew the way a Slug does, and it does not open room interiors.

- [x] Lone Lanius ship
  - [x] No playable control, number, layout, or rule.

- [ ] Long-Range Scanners
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Long-Ranged Scanners
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.
  - [x] Fitted Long-Ranged Scanners show an environmental hazard and possible ship presence on adjacent beacons, and selling them hides that again.

- [x] Loss of Cabin Pressure
  - [x] No playable control, number, layout, or rule.

- [x] Lumbering Zoltan Freighter
  - [x] No playable control, number, layout, or rule.

- [x] Lumbering Zoltan freighter
  - [x] same title as "Lumbering Zoltan Freighter" with different capitalization.

- [x] Main Page
  - [x] No playable control, number, layout, or rule.

- [ ] Malfunction Defense System
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Malfunction defense system
  - [x] same title as "Malfunction Defense System" with different capitalization.

- [ ] Malfunctioning defense system
  - [x] The page is a branch with no odds, not the events-2 extract of 5 hull.
  - [ ] Simply fire is either 5 hull plus one system and one breach, or low scrap with resources.
  - [ ] Ion, Cloaking, and an Engi crew are blue options.
  - [ ] Leave them alone does nothing.
  - [ ] Not wired.

- [ ] Man of War
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Manpower
  - [x] No playable control, number, layout, or rule.

- [x] Mantis
  - [x] src/game/extras/kin.ts — the comparison-table row is read by movement, repair, and combat.
  - [x] The ship is The Mantis Cruiser, not this page.

- [x] Mantis Attacking Civilian
  - [x] No playable control, number, layout, or rule.

- [ ] Mantis Attacking Engi Station
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Mantis Attacking Slug
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Attacking Smaller Crystal Ship
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Boarders
  - [x] No playable control, number, layout, or rule.

- [ ] Mantis Controlled Sector
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Mantis Cruiser
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Mantis Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Fight
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Fight with Boarders
  - [x] No playable control, number, layout, or rule.

- [ ] Mantis Fuel Attack
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Mantis Fugitive
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Mantis Homeworlds
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Hunting Slugs
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Pheromones
  - [x] your crew move 25% faster on your ship and while boarding.
  - [x] No purchase price, so it is not sold.
  - [x] Mantis A/B/C start with it.
  - [x] The event text on this title is not a separate playable event.

- [x] Mantis Ship-Collectors
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Ship Doesn't See You
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Ship Rock Body Parts
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Ship Rock body parts
  - [x] same title as "Mantis Ship Rock Body Parts" with different capitalization.

- [x] Mantis Ships
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Ships Battle for Rock Freighter
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Store
  - [x] No playable control, number, layout, or rule.

- [x] Mantis Venture Close to Sun
  - [x] No playable control, number, layout, or rule.

- [ ] Mantis War Camp
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed request sentence.

- [x] Mantis attacking Crystal
  - [x] No playable control, number, layout, or rule.

- [x] Mantis attacking Crystal ship
  - [x] No playable control, number, layout, or rule.

- [x] Mantis attacking Engi station
  - [x] same title as "Mantis Attacking Engi Station" with different capitalization.

- [x] Mantis attacking Slug
  - [x] same title as "Mantis Attacking Slug" with different capitalization.

- [x] Mantis attacking Slug ship
  - [x] No playable control, number, layout, or rule.

- [x] Mantis attacking civilian
  - [x] same title as "Mantis Attacking Civilian" with different capitalization.

- [x] Mantis attacking slug
  - [x] same title as "Mantis Attacking Slug" with different capitalization.

- [x] Mantis attacking smaller Crystal ship
  - [x] same title as "Mantis Attacking Smaller Crystal Ship" with different capitalization.

- [x] Mantis boarders
  - [x] same title as "Mantis Boarders" with different capitalization.

- [x] Mantis empty beacon
  - [x] same title as "Mantis Empty Beacon" with different capitalization.

- [ ] Mantis fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the twenty printed intros is shown before the default Mantis ship fight.

- [ ] Mantis fight (Engi)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the four printed intros is shown before the default Mantis ship fight.

- [ ] Mantis fight (Slug)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Mantis fight (Slug), the printed sentence is shown in full before Fight a Mantis ship.

- [ ] Mantis fight (Zoltan)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.

- [ ] Mantis fight choice
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the six printed intros is shown before Attack the ship, which still fights a Mantis ship.
  - [x] At Mantis fight choice, remaining concealed fights twice as often as it slips away, and cloaking slips away twice as often as it is spotted.

- [ ] Mantis fight choice in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Mantis fight choice in nebula, the printed sentence is shown in full before the fight and the move-on choice.

- [ ] Mantis fight in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the five printed intros is shown before the default Mantis ship fight.

- [ ] Mantis fight in nebula (Slug)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Mantis fight in nebula (Slug), the printed sentence is shown in full, including Weapons up.

- [x] Mantis fight in nebula choice
  - [x] No playable control, number, layout, or rule.

- [ ] Mantis fight near sun
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Mantis fight near sun, the printed sentence is shown in full before Fight a Mantis ship, which still fights a default Mantis ship.

- [x] Mantis fight with boarders
  - [x] same title as "Mantis Fight with Boarders" with different capitalization.

- [x] Mantis fight with boarders (Zoltan)
  - [x] No playable control, number, layout, or rule.

- [x] Mantis fugitive
  - [x] same title as "Mantis Fugitive" with different capitalization.
  - [x] Siding with him deals 5 hull, one system bar, and one room bar before a mantis-controlled Engi fight, or fights an Engi ship without adding the unnamed Mantis, and the bounty pays high scrap, that scrap with 5 hull and 1-2 fires, or one Mantis boarder.

- [x] Mantis hunting Slugs
  - [x] same title as "Mantis Hunting Slugs" with different capitalization.

- [x] Mantis in Nebula
  - [x] No playable control, number, layout, or rule.

- [x] Mantis in nebula
  - [x] same title as "Mantis in Nebula" with different capitalization.

- [ ] Mantis outcasts
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Two or three Mantis boarders beam aboard your ship when you fight the Mantis ship from Mantis outcasts.

- [ ] Mantis ship-collectors
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The Mantis Fighter and the Mantis Bomber from Mantis ship-collectors fight with a crew entirely composed of Mantis.
  - [x] At Mantis ship-collectors, the printed hail is shown in full before Fight a Mantis Fighter.

- [x] Mantis ship Rock body parts
  - [x] same title as "Mantis Ship Rock Body Parts" with different capitalization.

- [ ] Mantis ship attacking Crystal
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Attacking the Mantis shows the printed full-attention sentence and starts a Mantis fight.
  - [x] Ignoring them shows the printed low-profile sentence and nothing happens.
  - [x] A destroyed ship pays medium scrap with resources and a crew kill pays high scrap with resources, then contacting the Crystal ship pays random resources, nothing, or no Crystal weapon.

- [ ] Mantis ship attacking Slug ship
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [ ] Saving the Slugs pays medium scrap with resources, finishing them pays low scrap or a random standard reward and does not grant the unnamed augmentation, and destroying the Slug ship pays high scrap with resources.
  - [x] At Mantis ship attacking Slug ship, the printed distress sentence is shown in full before the three existing choices.

- [ ] Mantis ship attacking civilian
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship or a crew kill pays medium scrap with resources, and contacting the civilian pays low scrap, five repairs, medium scrap, low scrap with resources, or nothing.
  - [x] At Mantis ship attacking civilian, one of the five printed intros is shown before Aid the civilian ship, which still fights a default Mantis ship.
  - [x] At Mantis ship attacking civilian, staying out shows one of the three printed sentences and nothing happens.
  - [x] Aiding the civilian shows the printed frown sentence and fights a Mantis ship.

- [x] Mantis ship comm chatter
  - [x] No playable control, number, layout, or rule.

- [x] Mantis ship comm chatter intercept
  - [x] No playable control, number, layout, or rule.

- [x] Mantis ship doesn't see you
  - [x] same title as "Mantis Ship Doesn't See You" with different capitalization.

- [ ] Mantis ship with Rock body parts
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed hunter sentence is shown before Attack, which still fights a Mantis ship.
  - [x] Attacking shows the printed engage sentence and starts a Mantis fight.
  - [x] Ignoring them shows the printed wait sentence and nothing happens.
  - [x] Putting a Rock on the comm shows the printed pebble-man sentence and starts a Mantis fight.
  - [x] Ramming with Rock Plating shows the printed impact sentence, disables the Mantis engines, and starts a Mantis fight.

- [x] Mantis ships battle for Rock Freighter
  - [x] same title as "Mantis Ships Battle for Rock Freighter" with different capitalization.

- [x] Mantis ships battle for Rock freighter
  - [x] same title as "Mantis Ships Battle for Rock Freighter" with different capitalization Waiting fights a Mantis ship whose Weapon Control is reduced by 2 or a normal Mantis ship, both wins pay medium scrap, ignoring them does nothing, a Repair Drone pays high scrap, and a Hull Repair Drone spends one drone part then fights that ship.

- [x] Mantis store
  - [x] same title as "Mantis Store" with different capitalization.

- [x] Mantis venture close to sun
  - [x] same title as "Mantis Venture Close to Sun" with different capitalization.

- [x] Mantis war camp
  - [x] same title as "Mantis War Camp" with different capitalization.
  - [x] Pledging shows the printed thank-you sentence and still adds the quest marker.

- [ ] Master of Patience
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Medbay
  - [x] system exists.
  - [x] Upgrade row is a single price.
  - [x] Level 1 heals at 6.4, level 2 at 9.6, and level 3 at 19.2, including in an airless room.
  - [x] Level 1 nets zero for a full-rate human because suffocation is also 6.4.
  - [x] Levels 2 and 3 net-heal there without Emergency Respirators.

- [x] Mercenary
  - [x] No playable control, number, layout, or rule.

- [ ] Mercenary work
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Merchant's Request
  - [x] Same card as dest "Merchant's request" (cited-events-quests-b.ts).
  - [x] Yes opens a delivery or an investigation in quests-b.ts.
  - [x] At the research station, brace, drag, and medbay level 2 each fight 3–4 human boarders with no ship.
  - [x] Drag can turn one crewmember.
  - [x] Beam turns one crewmember and does not board if that fails.
  - [x] The capture quest marker and the merchant investigation use the printed button Fight a Pirate ship.

- [x] Merchant's request
  - [x] same title as "Merchant's Request" with different capitalization.

- [x] Merchant Fuel Ship
  - [x] No playable control, number, layout, or rule.

- [x] Merchant Ship Docked with Lanius Transport
  - [x] No playable control, number, layout, or rule.

- [x] Merchant Ship docked with Lanius Transport
  - [x] same title as "Merchant Ship Docked with Lanius Transport" with different capitalization.

- [ ] Merchant docked with Lanius
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Merchant docked with Lanius Transport
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Merchant ship docked with Lanius transport
  - [x] same title as "Merchant Ship Docked with Lanius Transport" with different capitalization.

- [x] Merchant with Conspicuous Markings
  - [x] No playable control, number, layout, or rule.

- [x] Merchant with conspicuous markings
  - [x] same title as "Merchant with Conspicuous Markings" with different capitalization.

- [x] Meta:Event Conventions
  - [x] No playable control, number, layout, or rule.

- [x] Mind Control
  - [x] src/game/extras/leash.ts — Overview and System Upgrades are what the leash runs.
  - [x] A few timings stay INFERRED.
  - [x] Mind control requires a view of that enemy crew, and a living Slug or Sensors that show them supplies it.
  - [x] A bomb that does not miss a targeted room opens that room to mind control.
  - [x] Ion that covers every Mind Control level starts a 25 second cooldown, and a normal end of a hold does not.

- [x] Mini Beam
  - [x] Fitted on Stealth A and Stealth C.
  - [x] Purchase price is 0 because the page says it sells and cannot be bought.

- [x] Missile (Weapons)
  - [x] src/game/content.ts — the wiki missile rows are in WEAPONS.
  - [x] A Hull Missile deals 4 hull damage on a systemless room.
  - [x] Crew stay on the system-room 2 (INFERRED).
  - [x] Dart stays INVENTED.
  - [x] Boss Missile power is 4.
  - [x] Swarm Missiles stores one shot every 7 seconds, up to 3.
  - [x] A click fires that bank and spends one missile.
  - [x] Autofire fires each finished shot and spends one missile.
  - [x] Weapon Pre-Igniter primes one shot.
  - [x] Pegasus fires two missiles from one 20 second charge and spends one missile.
  - [x] Neither is mounted on a generated enemy.
  - [x] A 1x2 room keeps the shot 67.85 percent of the time, and each long-side tile takes 8.04 percent.
  - [x] A 2x2 room stays in that room.
  - [x] An empty long-side tile misses.
  - [x] A 2x1 uses that split (INFERRED).
  - [x] Other shapes have no printed percent, so they stay aimed.
  - [x] Radius 31 is not resimulated as pixels.
  - [x] A fire roll that starts a fire skips the breach, and that fire is one or two flames.

- [ ] Missiles
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Missiles (Weapon)
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Mods and Tools
  - [x] No playable control, number, layout, or rule.

- [x] Mods and tools
  - [x] wiki process, not a game system.

- [x] Music
  - [x] No playable control, number, layout, or rule.

- [ ] Nebula
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Nebula Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Nebula Events
  - [x] No playable control, number, layout, or rule.

- [ ] Nebula Seen Ships Exchange Fire
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Nebula Store
  - [x] No playable control, number, layout, or rule.

- [x] Nebula Trader
  - [x] No playable control, number, layout, or rule.

- [ ] Nebula battlefield
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Nebula empty beacon
  - [x] same title as "Nebula Empty Beacon" with different capitalization.

- [x] Nebula lost ship
  - [x] filler-events.ts rolls a crewmember, a Rebel fight, or nothing.
  - [x] Equal odds are INFERRED.
  - [x] The crewmember's race is not named, so the gain is the table's unnamed crew.

- [x] Nebula seen Ships Exchange Fire
  - [x] same title as "Nebula Seen Ships Exchange Fire" with different capitalization.

- [x] Nebula seen ships exchange fire
  - [x] same title as "Nebula Seen Ships Exchange Fire" with different capitalization.

- [x] Nebula store
  - [x] same title as "Nebula Store" with different capitalization.

- [x] Nebula trader
  - [x] same title as "Nebula Trader" with different capitalization.

- [x] Nebula wreckage
  - [x] quests-b.ts.
  - [x] A Slug scan and the investigate roll (nothing weight 3, 5 hull plus a fire, or a survivor) run.
  - [x] A saved survivor's race is INFERRED.
  - [x] A fire started there spreads on the map under the same 7-second rule.

- [ ] Nisos
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] No Escape
  - [x] No playable control, number, layout, or rule.

- [ ] No fuel: Auto-ship fight
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] No fuel: Auto-ship warning
  - [ ] the choice is written and is not placed.
  - [x] The page names no sector.

- [ ] No fuel: Engi ship repair
  - [ ] the choice is written and is not placed.
  - [x] The page names no sector.

- [ ] No fuel: Mantis fight
  - [ ] the choice is written and is not placed.
  - [x] The page names no sector.

- [ ] No fuel: Rebel assistant hails
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] No fuel: Rebel fight
  - [ ] the choice is written and is not placed.
  - [x] The page names no sector.

- [ ] No fuel: Rebel fleet delay
  - [ ] the choice is written and is not placed.
  - [x] The page names no sector.

- [ ] No fuel: Slug fuel depot
  - [ ] the choice is written and is not placed.
  - [x] The page names no sector.

- [ ] No fuel: Slug fuel trader
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] No fuel: automated refueling ship
  - [ ] the choice is written and is not placed.
  - [x] The page names no sector.

- [ ] No fuel: drifting debris
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] No fuel: explore the system
  - [ ] the choice is written and is not placed.
  - [x] The page names no sector.

- [ ] No fuel: friendly refugee
  - [ ] the choice is written and is not placed.
  - [x] The page names no sector.

- [x] No fuel: fuel trader
  - [x] No playable control, number, layout, or rule.

- [x] No fuel: fuel trader (distress)
  - [x] No playable control, number, layout, or rule.

- [x] No fuel: fuel trader (distress off)
  - [x] No playable control, number, layout, or rule.

- [ ] No fuel: fuel trader (distress on)
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] No fuel: poorly armed Slug ship
  - [ ] The page states a mechanic and it is not a playable event.

- [x] No fuel: prepare to dock
  - [x] No playable control, number, layout, or rule.

- [ ] No fuel: refugee trading
  - [ ] The page states a mechanic and it is not a playable event.

- [x] No fuel: wait fail
  - [x] No playable control, number, layout, or rule.

- [x] No fuel: wait fail (distress)
  - [x] No playable control, number, layout, or rule.

- [x] No fuel: wait fail (distress off)
  - [x] No playable control, number, layout, or rule.

- [x] No fuel: wait fail (distress on)
  - [x] No playable control, number, layout, or rule.

- [ ] Noether
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Odd Moon
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Odd moon
  - [x] same title as "Odd Moon" with different capitalization.

- [ ] Orbiting Small Platform
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Orbiting refueling platform
  - [x] No playable control, number, layout, or rule.

- [x] Orbiting small platform
  - [x] same title as "Orbiting Small Platform" with different capitalization.

- [x] Oxygen
  - [x] At 5% or less, crew lose 6.4 HP per second.
  - [x] Emergency Respirators halves that for the player's own crew, including boarders.
  - [x] A level 1 medbay's 6.4 heal negates a full-rate human in that room.
  - [x] Venting rates in sim are INFERRED.
  - [x] An open airlock empties the oxygen in that room on the same tick, and a second open airlock drains a farther room sooner.

- [x] Patches
  - [x] No playable control, number, layout, or rule.

- [x] Phase Shift
  - [x] No playable control, number, layout, or rule.

- [x] Piloting
  - [x] autopilot percents are in upgrade blurbs.
  - [x] Not re-audited against the page this pass.

- [x] Pirate Attacking Civilian in Lanius Sector
  - [x] No playable control, number, layout, or rule.

- [x] Pirate Bribing You for Unknown Ship
  - [x] No playable control, number, layout, or rule.

- [x] Pirate Charges Crystalline Transport
  - [x] No playable control, number, layout, or rule.

- [ ] Pirate Controlled Sector
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Pirate Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Pirate Engine Hack
  - [x] No playable control, number, layout, or rule.

- [x] Pirate Fight
  - [x] No playable control, number, layout, or rule.

- [x] Pirate Fight Near Sun
  - [x] No playable control, number, layout, or rule.

- [x] Pirate Fight in Asteroid Field
  - [x] No playable control, number, layout, or rule.

- [x] Pirate Salesman
  - [x] No playable control, number, layout, or rule.

- [x] Pirate Ship firing on Docked Ships
  - [x] No playable control, number, layout, or rule.

- [ ] Pirate Slaver
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Pirate Smuggler
  - [x] No playable control, number, layout, or rule.

- [x] Pirate Store
  - [x] No playable control, number, layout, or rule.

- [x] Pirate Toll
  - [x] No playable control, number, layout, or rule.

- [ ] Pirate arms dealer
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Pirate at Pulsar
  - [x] No playable control, number, layout, or rule.

- [x] Pirate at pulsar
  - [x] same title as "Pirate at Pulsar" with different capitalization.

- [x] Pirate attacking Crystal
  - [x] No playable control, number, layout, or rule.

- [x] Pirate attacking Crystal ship
  - [x] No playable control, number, layout, or rule.

- [ ] Pirate attacking civilian
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Pirate attacking civilian (Lanius)
  - [x] No playable control, number, layout, or rule.

- [x] Pirate attacking civilian distress
  - [x] No playable control, number, layout, or rule.

- [x] Pirate attacking civilian in Lanius sector
  - [x] same title as "Pirate Attacking Civilian in Lanius Sector" with different capitalization.

- [x] Pirate blockade
  - [x] No playable control, number, layout, or rule.

- [ ] Pirate briber
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Accepting the bribe pays low scrap with resources, a destroyed ship pays random scrap only, a crew kill pays medium scrap with resources, an escape pays nothing, and the victim then opens a store, repairs 15, pays medium scrap only, does nothing, or is a Rebel scout that pays low scrap with resources or delays the fleet one turn.
  - [x] One of the three printed intros is shown before Accept their bribe or Try to be a hero.
  - [x] Attack the pirate.
  - [x] Attacking the pirate shows the printed pursuit sentence and fights a Pirate ship.

- [x] Pirate bribing you for unknown ship
  - [x] same title as "Pirate Bribing You for Unknown Ship" with different capitalization.

- [x] Pirate charges Crystalline transport
  - [x] same title as "Pirate Charges Crystalline Transport" with different capitalization.

- [x] Pirate empty beacon
  - [x] same title as "Pirate Empty Beacon" with different capitalization.

- [x] Pirate engine hack
  - [x] same title as "Pirate Engine Hack" with different capitalization.

- [ ] Pirate engine hacker
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A Pirate engine hacker fight limits your Engines to level 1 until that ship is destroyed.
  - [x] The printed opening warning is shown before that fight.
  - [x] The Pirate ship never tries to escape.
  - [x] The Pirate ship never surrenders.
  - [x] Countering the remote hack shows the printed assault sentence, takes Hacking offline, and starts a Pirate fight.

- [ ] Pirate fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the five printed intros is shown before the default Pirate ship fight.

- [ ] Pirate fight (Engi)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed paragraph is shown before the default Pirate ship fight.

- [ ] Pirate fight (Lanius)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the five printed intros is shown before the default Pirate ship fight.

- [ ] Pirate fight (Slug)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the three printed intros is shown before the default Pirate ship fight.

- [ ] Pirate fight (Zoltan)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the five printed intros is shown before the default Pirate ship fight.

- [ ] Pirate fight choice in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Both printed sentences are shown, attacking starts a Pirate ship fight, and keeping your distance does nothing.

- [x] Pirate fight distress
  - [x] No playable control, number, layout, or rule.

- [x] Pirate fight distress trap
  - [x] No playable control, number, layout, or rule.

- [ ] Pirate fight in asteroid field
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed wait is shown before the fight, which still starts inside an asteroid field.

- [ ] Pirate fight in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Pirate fight in nebula, one of the five printed intros is shown before Fight a Pirate ship, which still fights a default Pirate ship.

- [x] Pirate fight in nebula choice
  - [x] No playable control, number, layout, or rule.

- [ ] Pirate fight near pulsar
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the three printed intros is shown before the default Pirate ship fight.

- [ ] Pirate fight near sun
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed star warning is shown before the default Pirate ship fight.

- [x] Pirate in Nebula
  - [x] No playable control, number, layout, or rule.

- [x] Pirate in nebula
  - [x] same title as "Pirate in Nebula" with different capitalization.

- [ ] Pirate ship attacking Crystal
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap with resources, a crew kill pays high.
  - [ ] Contacting the Crystal ship pays random resources, nothing, or no unnamed weapon.
  - [x] At Pirate ship attacking Crystal, the printed opening sentence is shown in full before Attack the pirate, which still fights a pirate ship.
  - [x] Ignoring them shows the printed problems sentence and nothing happens.
  - [x] Attacking the pirate shows the printed chase sentence and starts a Pirate fight.

- [ ] Pirate ship attacking civilian
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap with resources, a crew kill pays high scrap with resources, and contacting the civilian pays low scrap, five repairs, medium scrap, low scrap with resources, or nothing.
  - [x] At Pirate ship attacking civilian, one of the six printed intros is shown before Aid the civilian ship, which still fights a pirate ship.
  - [x] At Pirate ship attacking civilian, staying out shows the printed distress-calls sentence and nothing happens.
  - [x] Aiding the civilian shows the printed engage sentence and fights a Pirate ship.
  - [x] The Pirate ship never escapes.

- [ ] Pirate ship attacking civilian (Lanius)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap with resources, a crew kill pays high scrap with resources, and contacting the civilian pays low scrap, five repairs, medium scrap, low scrap with resources, or nothing.
  - [x] At Pirate ship attacking civilian (Lanius), one of the three printed intros is shown before Attack the pirate, which still fights a pirate ship.
  - [x] At Pirate ship attacking civilian (Lanius), avoiding the conflict shows the printed mission sentence and nothing happens.
  - [x] At Pirate ship attacking civilian (Lanius), attacking logs the printed charge sentence and fights a Pirate ship.

- [ ] Pirate ship attacking civilian distress
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship pays medium scrap with resources, a crew kill pays high scrap with resources, and level 6 weapons starts that fight or sends the pirate away to contact the civilian.
  - [x] At Pirate ship attacking civilian distress, staying out shows the printed however sentence and nothing happens.
  - [x] Aiding the civilian shows the printed engage sentence and fights a Pirate ship.
  - [x] The Pirate ship never escapes.

- [ ] Pirate ship distress trap
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The intro is one of the four printed lines, and fighting starts a pirate ship for the default salvage.

- [ ] Pirate ship selling drones
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Hailing opens a dock that sells five drone parts for 25 scrap, buying nothing deals 3 hull plus engine and room damage before a pirate fight, leaving or attacking fights, hacking pays low scrap, an installed Drone Control takes one of the three printed bands.
  - [ ] The unnamed schematic is not sold.

- [x] Pirate ship selling unknown weapon
  - [x] No playable control, number, layout, or rule.

- [ ] Pirate ship selling weapon
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.

- [ ] Pirate ships in plasma storm
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Securing the fuel pays 1-3 fuel with low scrap or 3-6 fuel with high scrap, securing the ammunition pays 1-2 missiles with low scrap or 4-8 missiles with high scrap, both ships escape at 50 percent from 20-40 percent hull and never surrender, and letting them leave does nothing.
  - [x] At Pirate ships in plasma storm, the printed sentence is shown in full before the fuel, ammunition, and leave choices.
  - [x] Letting them leave shows the printed discretion sentence and nothing happens.

- [x] Pirate slaver
  - [x] same title as "Pirate Slaver" with different capitalization.

- [ ] Pirate smuggler
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The ship starts to escape at 30-40 percent hull with a 35 second timer, and that start is certain because the page prints no percent.
  - [x] With Weapons level 6 or higher, a threat opens a bribe of medium fuel (2-4) and scrap, or the same pirate fight.
  - [x] A destroyed ship or a crew kill pays the printed cargo list.
  - [ ] An unnamed weapon, schematic, crewmember, or map is not granted.
  - [x] Attacking the pirate shows the printed engage sentence and starts a Pirate fight.
  - [x] Ignoring the ship shows the printed jump sentence and nothing happens.

- [x] Pirate smuggler ship
  - [x] No playable control, number, layout, or rule.

- [x] Pirate store
  - [x] same title as "Pirate Store" with different capitalization.

- [ ] Pirate toll
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed greeting is shown before the pay and reject choices.
  - [x] Rejecting the offer shows the printed regret sentence and fights a Pirate ship.
  - [x] Paying the toll shows the printed friend sentence, spends 15 to 25 scrap, and the fight is avoided.

- [x] Pirate trap
  - [x] No playable control, number, layout, or rule.

- [x] Plagued station
  - [x] filler-events.ts.
  - [x] Board rolls low scrap, a Human plus low scrap, or low scrap and a lost crewmember.
  - [x] Scrap-the-debris rolls a random scrap tier.
  - [x] Continuing after the disease still loses that crewmember, a Clone Bay prints the stop-clone sentence, and a level 2 Medbay prints the antidote sentence instead.

- [x] Plasma Storm
  - [x] No playable control, number, layout, or rule.

- [x] Plasma Storm Automated Scout
  - [x] No playable control, number, layout, or rule.

- [x] Plasma Storm Events
  - [x] No playable control, number, layout, or rule.

- [ ] Plasma Storm Incapacitated Ships
  - [x] Same card as dest "Plasma storm incapacitated ships" (filler-events.ts).
  - [x] Search rolls 4 hull and a breach on a random system's room plus high salvage, a passenger plus low scrap, a lost crewmember plus low scrap, medium scrap, or a weapon offer plus medium scrap.
  - [x] The breach does not damage that system.
  - [x] A system with no room is skipped (INFERRED).
  - [ ] The drone schematic is not granted.

- [x] Plasma Storms
  - [x] No playable control, number, layout, or rule.

- [x] Plasma storm Auto-ship
  - [x] No playable control, number, layout, or rule.

- [x] Plasma storm automated scout
  - [x] same title as "Plasma Storm Automated Scout" with different capitalization.

- [x] Plasma storm incapacitated ships
  - [x] same title as "Plasma Storm Incapacitated Ships" with different capitalization.

- [x] Plasma storm pirate ships
  - [x] No playable control, number, layout, or rule.

- [ ] Plasma storm wreckage
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Poorly Armed Slug Ship
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Poorly armed Slug ship
  - [x] same title as "Poorly Armed Slug Ship" with different capitalization.

- [ ] Power
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Powered-Down Lanius Vessel
  - [x] No playable control, number, layout, or rule.

- [x] Powered-down Lanius vessel
  - [x] same title as "Powered-Down Lanius Vessel" with different capitalization.

- [x] Prepare to Dock
  - [x] No playable control, number, layout, or rule.

- [x] Prepare to dock
  - [x] same title as "Prepare to Dock" with different capitalization.

- [x] Pulsar
  - [x] No playable control, number, layout, or rule.

- [x] Quest beacon
  - [x] No playable control, number, layout, or rule.

- [x] RNG
  - [x] seeded rand in sim.
  - [x] Page not opened.

- [x] Races
  - [x] No playable control, number, layout, or rule.

- [x] Races/Crew
  - [x] No playable control, number, layout, or rule.

- [ ] Races/Crew Members
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Races/Crystal
  - [x] No playable control, number, layout, or rule.

- [x] Races/Engi
  - [x] No playable control, number, layout, or rule.

- [x] Races/Human
  - [x] No playable control, number, layout, or rule.

- [x] Races/Lanius
  - [x] No playable control, number, layout, or rule.

- [x] Races/Mantis
  - [x] No playable control, number, layout, or rule.

- [x] Races/Rockman
  - [x] No playable control, number, layout, or rule.

- [x] Races/Slug
  - [x] No playable control, number, layout, or rule.

- [x] Races/Zoltan
  - [x] No playable control, number, layout, or rule.

- [ ] Races (legacy page with comments)/Ancient Device
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Races (legacy page with comments)/Crew
  - [x] No playable control, number, layout, or rule.

- [x] Races (legacy page with comments)/Crystal
  - [x] No playable control, number, layout, or rule.

- [x] Races (legacy page with comments)/Engi
  - [x] No playable control, number, layout, or rule.

- [x] Races (legacy page with comments)/Human
  - [x] No playable control, number, layout, or rule.

- [x] Races (legacy page with comments)/Lanius
  - [x] No playable control, number, layout, or rule.

- [x] Races (legacy page with comments)/Mantis
  - [x] No playable control, number, layout, or rule.

- [x] Races (legacy page with comments)/Rockman
  - [x] No playable control, number, layout, or rule.

- [x] Races (legacy page with comments)/Slug
  - [x] No playable control, number, layout, or rule.

- [x] Races (legacy page with comments)/Zoltan
  - [x] No playable control, number, layout, or rule.

- [x] Random Event
  - [x] No playable control, number, layout, or rule.

- [x] Random Events
  - [x] No playable control, number, layout, or rule.

- [x] Random event
  - [x] same title as "Random Event" with different capitalization.

- [x] Rarity
  - [x] No playable control, number, layout, or rule.

- [ ] Reactor
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Rebel AI Scout Carrying Shield Virus
  - [x] No playable control, number, layout, or rule.

- [x] Rebel AI Scout carrying Shield Virus
  - [x] same title as "Rebel AI Scout Carrying Shield Virus" with different capitalization.

- [x] Rebel AI scout carrying shield virus
  - [x] same title as "Rebel AI Scout Carrying Shield Virus" with different capitalization.

- [x] Rebel Assistant Hails
  - [x] No playable control, number, layout, or rule.

- [ ] Rebel Attacking Civilians in Last Stand
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Rebel Attacking Engi
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rebel Auto-Ship Fight
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Auto-Ship Sits Dormant
  - [x] No playable control, number, layout, or rule.

- [ ] Rebel Auto-Ship Warning
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rebel Auto-Ship in Nebula
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Auto-Ship sits Dormant
  - [x] same title as "Rebel Auto-Ship Sits Dormant" with different capitalization.

- [x] Rebel Auto-ship carrying shield virus
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Auto-ship fight
  - [x] same title as "Rebel Auto-Ship Fight" with different capitalization.

- [x] Rebel Auto-ship in asteroid belt
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Auto-ship in nebula
  - [x] same title as "Rebel Auto-Ship in Nebula" with different capitalization.

- [ ] Rebel Auto-ship near sensor station
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rebel Auto-ship near small space-station
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Auto-ship near storage vessel
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Auto-ship sits dormant
  - [x] same title as "Rebel Auto-Ship Sits Dormant" with different capitalization.

- [x] Rebel Auto-ship warning
  - [x] same title as "Rebel Auto-Ship Warning" with different capitalization.

- [x] Rebel Automated-Scout in Asteroid Belt
  - [x] No playable control, number, layout, or rule.

- [ ] Rebel Automated Ship Near Sensor Station
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rebel Automated Ship Near Small Space-Station
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Automated Ship Near Small Space-station
  - [x] same title as "Rebel Automated Ship Near Small Space-Station" with different capitalization.

- [x] Rebel Automated Ship Near Storage Vessel
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Automated Ship near small space-station
  - [x] same title as "Rebel Automated Ship Near Small Space-Station" with different capitalization.

- [x] Rebel Boarders in Nebula
  - [x] No playable control, number, layout, or rule.

- [ ] Rebel Civilian Checkpoint
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rebel Controlled Sector
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Fight
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Fight in Last Stand
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Flagship
  - [x] The fight uses the traced cutaway, not the leftover two-row placeholder: stage 1 is 52 squares, stage 2 is 42, stage 3 is 32, and Hard adds two link rooms (4).
  - [x] Stage 1 hull 20, reactor 42, shields 8, engines 2, oxygen 2, piloting 3, artillery 3, Cloaking 2, Hacking 3.
  - [x] Stage 2 hull 22, reactor 44, engines 3, Drone Control 8.
  - [x] Stage 3 hull 20, reactor 32, engines 6, artillery 4, Teleporter 2, Mind Control 3, Zoltan Shield 12.
  - [x] Boss Laser and Boss Beam charge on the printed table.
  - [x] Their power fields (4 and 3) are the chosen artillery maxima, not a Weapons-pool cost, and artillery is outside the Weapons pool.
  - [x] Crew in a lost artillery room are removed.
  - [x] Stages 1 and 2 pay sector-1 high scrap (Easy 27–32, Normal and Hard 19–23).
  - [x] Stage 3 pays none.
  - [x] Hacking one Flagship artillery room drains that gun.
  - [x] A normal ship's weapons hack still drains every gun.

- [ ] Rebel Flagship Construction
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rebel Fleet
  - [x] a nebula beacon outside a nebula sector advances 0.5, and one inside a nebula sector advances 0.8.
  - [x] The battery is 3 hull and a breach, off on nebula beacons and off on an Easy exit.
  - [x] It cannot be shot down, and a Zoltan Shield does not take it.
  - [x] Jumping into an overtaken beacon before sector 8 fights a Rebel Elite and pays 1 fuel, with no scrap.
  - [x] Waiting there with no fuel pays 4 fuel for that Elite.
  - [x] Sector 8 does not use this column.
  - [x] A fueled wait does not scrape hull.
  - [x] The out-of-fuel wait exception for the battery is not decided.
  - [x] Rebel-held beacons still count toward score.
  - [x] Distraction Buoys skip the next advance when the map starts the fleet at 0.
  - [x] The Elite's hull and guns stay the shared grid, because Elite Fighter and Elite Assault print ranges.

- [x] Rebel Fleet Fight
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Fleet fight
  - [x] same title as "Rebel Fleet Fight" with different capitalization.

- [x] Rebel Scout Attacking Refueling Outpost
  - [x] No playable control, number, layout, or rule.

- [ ] Rebel Scout Pursuing Civilian Ship
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rebel Ship Laying Down Fire on Crystalline Vessel
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Ship Nearby
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Ship With Boarders
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Ship in Nebula
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Ship with Boarders
  - [x] same title as "Rebel Ship With Boarders" with different capitalization.

- [ ] Rebel Ships
  - [x] REBEL_ROWS in enemies-rebel.ts.
  - [ ] makeEnemy names stay INVENTED.

- [x] Rebel Store
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Stronghold
  - [x] No playable control, number, layout, or rule.

- [x] Rebel Transport
  - [x] No playable control, number, layout, or rule.

- [ ] Rebel Unarmed Defector
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rebel assistant hails
  - [x] same title as "Rebel Assistant Hails" with different capitalization.

- [x] Rebel at Pulsar
  - [x] No playable control, number, layout, or rule.

- [x] Rebel at pulsar
  - [x] same title as "Rebel at Pulsar" with different capitalization.

- [x] Rebel attacking Crystal ship
  - [x] No playable control, number, layout, or rule.

- [x] Rebel attacking Engi
  - [x] same title as "Rebel Attacking Engi" with different capitalization.

- [x] Rebel attacking Federation loyalists
  - [x] No playable control, number, layout, or rule.

- [x] Rebel attacking civilians in Last Stand
  - [x] same title as "Rebel Attacking Civilians in Last Stand" with different capitalization.

- [ ] Rebel attacking poorly equipped Engi
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rebel attacking refueling outpost
  - [x] No playable control, number, layout, or rule.

- [x] Rebel automated-scout in asteroid belt
  - [x] same title as "Rebel Automated-Scout in Asteroid Belt" with different capitalization.

- [x] Rebel boarders in nebula
  - [x] same title as "Rebel Boarders in Nebula" with different capitalization.

- [ ] Rebel checkpoint
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of four intros is shown, a 10 to 15 scrap bribe contacts the civilians for low scrap, low scrap with resources, nothing, or a Rebel fight, and hiding does nothing.

- [x] Rebel civilian checkpoint
  - [x] same title as "Rebel Civilian Checkpoint" with different capitalization.

- [ ] Rebel defector
  - [x] one beacon in Rebel Controlled Sector or Rebel Stronghold.
  - [x] Accepting the proposal fights a Rebel ship on the shared grid.
  - [ ] The random crew, 3 hull, engine damage, doubled pursuit, and boarders are not applied.
  - [x] Rejecting him is not a choice, because that result branches.

- [x] Rebel empty beacon
  - [x] same title as "Rebel Empty Beacon" with different capitalization.

- [ ] Rebel fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the ten printed intros is shown before the default Rebel ship fight.

- [ ] Rebel fight (Crystal)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.

- [ ] Rebel fight (Engi)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed paragraph is shown before the default Rebel ship fight.

- [ ] Rebel fight (Lanius)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the six printed intros is shown before the default Rebel ship fight.

- [ ] Rebel fight (Slug)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the three printed intros is shown before the default Rebel ship fight.

- [ ] Rebel fight among Federation and Rebel fleets
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The Rebel ship never escapes.
  - [x] One of the six printed intros is shown before Fight a Rebel ship, which still fights a default Rebel ship.
  - [x] A hull kill pays low scrap only, and a crew kill pays medium scrap with resources.

- [ ] Rebel fight among Rebel fleet
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Rebel fight among Rebel fleet, one of the seven printed intros is shown before Fight a Rebel ship, which still fights a default Rebel ship.
  - [x] A hull kill pays low scrap only, a crew kill pays medium scrap with resources, and the ship does not run.

- [x] Rebel fight chance
  - [x] filler-events.ts.
  - [x] Go looking rolls a Rebel fight (weight 2), the same fight after one extra fleet step, or nothing.
  - [x] "Doubled for 1 jump" is that one extra step.
  - [x] Scanning with Sensors level 2 shows the printed intercept sentence and starts a Rebel fight.
  - [x] Pinpointing with Sensors level 3 shows the printed asteroid sentence, disables the Rebel engines, and starts a Rebel fight.
  - [x] At Rebel fight chance, one of the four printed opening intros is shown.

- [x] Rebel fight chance in nebula
  - [x] Staying hidden spends nothing, and chasing finds a Rebel ship, doubles pursuit, or loses the lock.

- [ ] Rebel fight choice in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed opening is shown before Attack the ship, which still starts a Rebel ship fight.
  - [x] At Rebel fight choice in nebula, remaining concealed is one of the three printed results, Engines 4+ loses the ship, a chase doubles pursuit for 1 jump, and cloaking slips away.

- [x] Rebel fight in Last Stand
  - [x] same title as "Rebel Fight in Last Stand" with different capitalization.

- [ ] Rebel fight in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Rebel fight in nebula, one of the seven printed intros is shown before Fight a Rebel ship, which still fights a default Rebel ship.

- [x] Rebel fight in nebula choice
  - [x] No playable control, number, layout, or rule.

- [ ] Rebel fight in plasma storm
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Rebel fight in plasma storm, a non-nebula beacon still halves the reactor, and fleet pursuit stays one full step.

- [ ] Rebel fight near pulsar
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the three printed intros is shown before the default Rebel ship fight.

- [ ] Rebel fight with boarders
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Two or three human boarders beam aboard your ship when you fight the Rebel ship from Rebel fight with boarders.
  - [x] One of the four printed intros is shown before that fight.

- [x] Rebel in Nebula
  - [x] No playable control, number, layout, or rule.

- [x] Rebel in Plasma Storm
  - [x] No playable control, number, layout, or rule.

- [x] Rebel in nebula
  - [x] same title as "Rebel in Nebula" with different capitalization.

- [x] Rebel in plasma storm
  - [x] same title as "Rebel in Plasma Storm" with different capitalization.

- [x] Rebel scout attacking refueling outpost
  - [x] same title as "Rebel Scout Attacking Refueling Outpost" with different capitalization.

- [x] Rebel scout pursuing civilian ship
  - [x] same title as "Rebel Scout Pursuing Civilian Ship" with different capitalization.

- [ ] Rebel ship attacking Crystal ship
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Ignoring them shows the printed sneak sentence and nothing happens.
  - [x] Attacking the Rebel shows the printed intercept sentence and starts a Rebel fight.
  - [x] Destroying that Rebel pays medium scrap with resources, a crew kill pays high scrap with resources, and the card offers to contact the Crystal ship.
  - [x] Attacking the Crystalline ship shows the printed jump sentence and starts a Crystal fight.

- [ ] Rebel ship attacking Federation loyalists
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Using this chance to escape shows the printed slip-away sentence and nothing happens.
  - [x] The Rebel ship never escapes.
  - [x] One of the three printed intros is shown before Aid the Federation ship or Use this chance to escape.
  - [x] Aiding the Federation ship shows the printed engage sentence and fights a Rebel ship.

- [ ] Rebel ship attacking civilians in Last Stand
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Preparing to fight shows the printed intercept sentence and fights a Rebel ship.
  - [x] The Rebel ship escapes at 50 percent from 40-80 percent hull.
  - [x] Getting ready to jump shows the printed horrors sentence and nothing happens.
  - [x] One of the five printed intros is shown before the two choices.
  - [x] Destroying the Rebel pays medium scrap with resources, a crew kill pays high scrap with resources, and contacting the survivors repairs 8 hull, pays medium resources with low scrap, or nothing.

- [ ] Rebel ship attacking refueling outpost
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The Rebel ship never tries to escape.
  - [x] Avoiding the conflict shows the printed warning-shots sentence and nothing happens.
  - [x] Intervening to defend the outpost shows the printed defy sentence and fights a Rebel ship.
  - [x] Opening the beacon shows the printed attack-approach sentence.
  - [x] Destroying the Rebel pays medium scrap with resources, a crew kill pays high scrap with resources, and contacting the outpost pays medium fuel and medium scrap.

- [x] Rebel ship in nebula
  - [x] same title as "Rebel Ship in Nebula" with different capitalization.

- [x] Rebel ship laying down fire on Crystalline vessel
  - [x] same title as "Rebel Ship Laying Down Fire on Crystalline Vessel" with different capitalization.

- [x] Rebel ship nearby
  - [x] same title as "Rebel Ship Nearby" with different capitalization.

- [ ] Rebel ship supplying civilians
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The Rebel ship never tries to escape.
  - [x] Opening the beacon shows one of the five printed supply sentences.
  - [x] Leaving them be does nothing.
  - [x] Destroying the ship pays low scrap with resources and a crew kill pays medium before stealing or leaving, and the stolen supplies are 1 drone part with low scrap, low scrap, 2 hull with 2 room damage and 1-2 fires or a breach, or nothing.

- [ ] Rebel ship warning
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed scout sentence is shown before the Rebel ship fight.
  - [x] Destroying the ship or killing the crew pays medium scrap with resources.
  - [x] An escape shows the printed jump sentence, and pursuit stays doubled once.
  - [x] Fighting the running ship shows the printed FTL sentence.

- [x] Rebel ship with boarders
  - [x] same title as "Rebel Ship With Boarders" with different capitalization.

- [ ] Rebel shipyard
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed shipyard sentence.
  - [x] Leaving immediately shows the printed mission sentence and nothing happens.
  - [x] Looking around logs the printed warning and fights the second Rebel Flagship.

- [x] Rebel store
  - [x] same title as "Rebel Store" with different capitalization.

- [x] Rebel supplying civilians
  - [x] No playable control, number, layout, or rule.

- [x] Rebel transport
  - [x] same title as "Rebel Transport" with different capitalization.

- [ ] Rebel transport ship
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A destroyed ship or a crew kill pays the same printed cargo list.
  - [ ] An unnamed weapon, schematic, crewmember, or map is not granted.
  - [x] Avoiding the ship shows the printed weapons-range sentence and nothing happens.
  - [x] Demanding their goods shows the printed cargo sentence and starts the running Rebel fight.

- [x] Rebel unarmed defector
  - [x] same title as "Rebel Unarmed Defector" with different capitalization.

- [ ] Rebels
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Rebels Supplying Civilians
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rebels supplying civilians
  - [x] same title as "Rebels Supplying Civilians" with different capitalization.

- [ ] Reconstructive Teleport
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Red-Tail
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Red Giant
  - [x] No playable control, number, layout, or rule.

- [x] Red Giant Events
  - [x] No playable control, number, layout, or rule.

- [ ] Red Giants
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Refuel Station
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Refuel station
  - [x] same title as "Refuel Station" with different capitalization.

- [x] Refueling Platform Garbled Broadcast
  - [x] No playable control, number, layout, or rule.

- [ ] Refueling platform
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed fueling-station sentence.
  - [x] Ignoring the platform does nothing or shows the printed bait sentence and starts a Pirate fight.
  - [x] Docking offers a 5-10 scrap trade for 5 fuel, stolen 3-5 fuel, a malfunction that pays 5 fuel or deals 3 hull and 3 engine damage with 1-2 fires and loses 3 fuel, a staff signal that boards 2-4 humans with no ship or pays 5 fuel behind level-2 blast doors, or the printed pirate ambush.

- [ ] Refueling platform garbled broadcast
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed garbled sentence is shown before the hail and ignore choices.
  - [x] Hailing the platform shows the printed screech sentence and starts a Lanius fight.
  - [x] Ignoring the platform shows the printed jump sentence and nothing happens.
  - [x] Docking then signaling abandons the station for 3-5 fuel, springs the printed Lanius trap, or breaches one room with one Lanius boarder, level-2 blast doors pay 5 fuel, and a deeper scan pays the printed fuel or drone parts.

- [ ] Refueling station
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Buying fuel there spends 12, 6, or 2 scrap for 6, 3, or 1 fuel, and ignoring the station spends nothing.

- [x] Refugee
  - [x] filler-events.ts.
  - [x] Hail rolls a shown trade, a Pirate ambush, a Zoltan fight, a pirate bait fight, or a Slug fight.
  - [x] The trade's pay and get are rolled, then offered.
  - [x] This audit did not re-open the article.

- [x] Refugee (Pirate)
  - [x] No playable control, number, layout, or rule.

- [x] Refugee (Slug)
  - [x] No playable control, number, layout, or rule.

- [ ] Refugee (Zoltan)
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Refugee Ship Trading for Scrap
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Refugee Ship with Communications Down
  - [x] No playable control, number, layout, or rule.

- [x] Refugee comms down
  - [x] filler-events.ts rolls a lost crewmember, a gained crewmember, 2–4 missiles plus medium scrap, nothing, or 2–4 human boarders with no ship.
  - [x] Killing those boarders pays no scrap and is not a ship kill.
  - [x] The cannibal loss still removes that crewmember, and a Clone Bay prints the waiting sentence and revives them.

- [x] Refugee distress
  - [x] filler-events.ts hail uses the same five results as Refugee: a shown trade, a Pirate ambush, a Zoltan fight, a pirate bait fight, or a Slug fight.

- [x] Refugee distress (Pirate)
  - [x] No playable control, number, layout, or rule.

- [x] Refugee distress (Slug)
  - [x] No playable control, number, layout, or rule.

- [x] Refugee distress (Zoltan)
  - [x] No playable control, number, layout, or rule.

- [x] Refugee ship trading for scrap
  - [x] same title as "Refugee Ship Trading for Scrap" with different capitalization.

- [x] Refugee ship with communications down
  - [x] same title as "Refugee Ship with Communications Down" with different capitalization.

- [ ] Refugee with communications down
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Remote Settlement
  - [x] No playable control, number, layout, or rule.

- [ ] Remote settlement
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Remote settlement, the printed blockade hail is shown before Attack the pirate and Ignore them.
  - [ ] The Fire Beam and Fire Bomb schematic rewards are not granted.
  - [x] Attacking the pirate shows the printed engage sentence and starts a Pirate fight.
  - [x] Ignoring them shows the printed jump sentence and nothing happens.

- [x] Repair Arm
  - [x] src/game/extras/augments.ts — the 15% cut and the 2 hull repair run only while the hull is not already full.
  - [x] Score s is not reduced by the cut.

- [x] Repair Station
  - [x] No playable control, number, layout, or rule.

- [x] Repair Station in Last Stand
  - [x] No playable control, number, layout, or rule.

- [ ] Repair station
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed station sentence is shown before the repair choices.
  - [x] Each paid repair logs the printed no-refunds line.

- [x] Repair station in Last Stand
  - [x] same title as "Repair Station in Last Stand" with different capitalization.

- [x] Research Station Near Pulsar
  - [x] No playable control, number, layout, or rule.

- [x] Research Station near Pulsar
  - [x] same title as "Research Station Near Pulsar" with different capitalization.

- [x] Research station near pulsar
  - [x] same title as "Research Station Near Pulsar" with different capitalization.

- [ ] Research station with no response
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Resources
  - [x] No playable control, number, layout, or rule.

- [ ] Reverse Ion Field
  - [x] One copy gives a 50 percent chance to negate ion damage, and two or more stop every ion source including a pulsar.
  - [x] That protection also covers a Zoltan Shield.
  - [x] A resisted ion projectile still hits the room when regular shields are down.
  - [x] Purchase price 45 is on the catalog.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Rewards
  - [x] SCRAP_MEDIUM bands.
  - [x] Label INFERRED.
  - [x] A destroyed ship's default salvage is two low resources among fuel, missiles, and drone parts.

- [x] Robotic Warfare
  - [x] No playable control, number, layout, or rule.

- [ ] Rock
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Rock Armoured Transport
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rock Boarders Near Sun
  - [x] No playable control, number, layout, or rule.

- [x] Rock Bride Transport
  - [x] No playable control, number, layout, or rule.

- [x] Rock Controlled Sector
  - [x] No playable control, number, layout, or rule.

- [ ] Rock Cruiser
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Rock Deserters
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Rock Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Rock Fight
  - [x] No playable control, number, layout, or rule.

- [x] Rock Fight With Boarders
  - [x] No playable control, number, layout, or rule.

- [x] Rock Fight With Boarders in Asteroid Field
  - [x] No playable control, number, layout, or rule.

- [x] Rock Fight in Asteroid Field
  - [x] No playable control, number, layout, or rule.

- [x] Rock Fight with Boarders
  - [x] same title as "Rock Fight With Boarders" with different capitalization.

- [x] Rock Fight with Boarders in Asteroid Field
  - [x] same title as "Rock Fight With Boarders in Asteroid Field" with different capitalization.

- [x] Rock Homeworlds
  - [x] No playable control, number, layout, or rule.

- [x] Rock Live Mine
  - [x] No playable control, number, layout, or rule.

- [x] Rock Pirate Fight
  - [x] No playable control, number, layout, or rule.

- [x] Rock Pirate Near Sun
  - [x] No playable control, number, layout, or rule.

- [x] Rock Pirate in Asteroid Field
  - [x] No playable control, number, layout, or rule.

- [ ] Rock Plating
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Rock Ship Being Mined by Lanius
  - [x] No playable control, number, layout, or rule.

- [x] Rock Ships
  - [x] No playable control, number, layout, or rule.

- [x] Rock Store
  - [x] No playable control, number, layout, or rule.

- [x] Rock War Vessel Encounter
  - [x] Same card as dest "Rock war vessel encounter" (quests-a-pages.ts), Rock Homeworlds.
  - [x] Either answer places the sun marker.
  - [x] The fight is a Rock Assault (Elite) with a 32 s escape.
  - [x] The Sun Quest Marker fight is dangerously close to an M-class star, so that Rock Assault (Elite) fight starts solar flares.
  - [x] The shipyard arrival unlocks Rock A, grants Rock Plating, and repairs 29 hull.

- [x] Rock and Slug standoff
  - [x] Hailing them spends 10-15 scrap or demands payment, which agrees, fights a Rock ship, or deals 5 hull and two system bars, and the Slug captain upgrades the reactor for free, for another 10-15 scrap, or not at all.

- [x] Rock armoured transport
  - [x] same title as "Rock Armoured Transport" with different capitalization.

- [ ] Rock atheists
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Telling them their god sent them fights a Rock ship after one of two lines, a promise refuses twice as often as it adds a Rockman, and Sensors level 2 adds one.

- [x] Rock boarders near sun
  - [x] same title as "Rock Boarders Near Sun" with different capitalization.

- [ ] Rock bride
  - [x] quests-a-pages.ts.
  - [x] Accept places the Numa V marker.
  - [x] The passenger is not a crewmember until you refuse at the marker, which adds Ariadne and a Rock fight.
  - [x] Handing her over pays low scrap only.
  - [ ] The unnamed augmentation is not granted.

- [x] Rock bride transport
  - [x] same title as "Rock Bride Transport" with different capitalization.

- [x] Rock deserters
  - [x] same title as "Rock Deserters" with different capitalization.

- [x] Rock empty beacon
  - [x] same title as "Rock Empty Beacon" with different capitalization.

- [ ] Rock fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the eight printed intros is shown before the default Rock ship fight.

- [x] Rock fight choice
  - [x] No playable control, number, layout, or rule.

- [ ] Rock fight in asteroid field
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the three printed intros is shown before the default Rock ship fight, which still starts inside an asteroid field.

- [ ] Rock fight in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Both printed sentences are shown before the default Rock ship fight.

- [ ] Rock fight with boarders
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One to three Rock boarders beam aboard your ship when you fight the Rock ship from Rock fight with boarders.
  - [x] One of the two printed intros is shown before that fight.

- [ ] Rock fight with boarders in asteroid field
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One or two Rock boarders beam aboard your ship when you fight the Rock ship from Rock fight with boarders in asteroid field.
  - [x] One of the two printed intros is shown before that fight, which still starts inside an asteroid field.

- [x] Rock live mine
  - [x] same title as "Rock Live Mine" with different capitalization Evading always leaves the mine on the hull, defusing pays medium scrap or cuts a wire for medium scrap or 6 hull and a lost crewmember, a missile deals 4 hull and 1 system damage without spending a missile, a Beam Drone spends one drone part for low scrap, and level 5 engines outrun it.

- [x] Rock pirate fight
  - [x] same title as "Rock Pirate Fight" with different capitalization.

- [x] Rock pirate fight in asteroid field
  - [x] No playable control, number, layout, or rule.

- [x] Rock pirate fight near sun
  - [x] No playable control, number, layout, or rule.

- [x] Rock pirate in asteroid field
  - [x] same title as "Rock Pirate in Asteroid Field" with different capitalization.

- [x] Rock pirate near sun
  - [x] same title as "Rock Pirate Near Sun" with different capitalization.

- [ ] Rock pirates fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the three printed intros is shown before the default Rock pirate ship fight.

- [ ] Rock pirates fight in asteroid field
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the two printed intros is shown before the default Rock pirate ship fight, which still starts inside an asteroid field.

- [ ] Rock pirates fight near sun
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the two printed intros is shown before the default Rock pirate ship fight, which still starts beside a red giant.

- [x] Rock ship being mined by Lanius
  - [x] same title as "Rock Ship Being Mined by Lanius" with different capitalization.

- [ ] Rock ship in plasma storm
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A living Rock crewmember is paid high scrap with resources.
  - [x] Opening the beacon shows the printed repugnant sentence.

- [x] Rock ship in uncharted nebula plasma storm
  - [x] No playable control, number, layout, or rule.

- [x] Rock store
  - [x] same title as "Rock Store" with different capitalization.

- [x] Rock war vessel encounter
  - [x] same title as "Rock War Vessel Encounter" with different capitalization.

- [x] Rockman
  - [x] No playable control, number, layout, or rule.

- [x] Rockmen
  - [x] stat row.
  - [x] Fire-fighting is 1.67 of that crew member's share of the 0.096 crew-races extinguish, with repair skill included.
  - [x] It is not fireTaken.
  - [x] Fire Suppression is not scaled.

- [x] Rupturing Zoltan Freighter
  - [x] No playable control, number, layout, or rule.

- [x] Rupturing Zoltan freighter
  - [x] same title as "Rupturing Zoltan Freighter" with different capitalization.

- [x] Science craft docked with Lanius
  - [x] No playable control, number, layout, or rule.

- [x] Score
  - [x] src/game/sim.ts — Score, lead formula: (s + 10b + 20k) * D, rounded down.
  - [x] D is 1 / 1.25 / 1.5.
  - [x] The lit hangar button sets initial scrap to 30 / 10 / 0, and that scrap is not in s.
  - [x] Rebel-held beacons still count because the fleet column is INVENTED.
  - [x] Selling a weapon or augment adds that scrap to s.
  - [x] Accepting a surrender does not increase the ship-kill count, because that count is only ships defeated by reducing hull or crew to zero.

- [x] Scrap
  - [x] src/game/sim.ts — scrap is the spendable currency.
  - [x] Score s excludes starting scrap and the Scrap Recovery Arm bonus.
  - [x] Repair Arm does not reduce s.

- [ ] Scrap Hoarder
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Scrap Recovery Arm
  - [x] src/game/extras/augments.ts — Misc.
  - [x] Augmentations: +10% is applied to the wallet and kept out of Score s.
  - [x] Rounded down.

- [ ] Sector
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Sectors
  - [x] SECTOR_TYPES is in sectors.ts.
  - [ ] SECTOR_NAMES in content.ts stay INVENTED.
  - [x] Each sector is a 6×4 grid of 19–24 beacons, and each beacon line is a count between its minimum and maximum, then the next line, and the map stops when it is full.
  - [x] Beacons left after the list take the neutral fallback.
  - [x] Entering The Last Stand still grants 10 hull and 10 fuel.
  - [x] Three repair stations then pay 15 hull, scrap 22–44, 5 fuel, 4 missiles, and 5 drone parts once.
  - [x] A charted sector is green 48 percent of the time, red 32 percent, and purple 20 percent.
  - [x] The Flagship jumps toward the Federation base, and three jumps spent on that base end the run.
  - [x] An unnamed crewmember is an even draw from that sector's crew list, and Hidden Crystal Worlds gives only a Crystal.

- [ ] Sell drone parts for scrap
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Selling drone parts there spends 3, 6, or 12 parts for 12, 24, or 48 scrap, and Scrap Recovery Arm and Repair Arm change that scrap.

- [x] Sell fuel for drone parts
  - [x] No playable control, number, layout, or rule.

- [ ] Sell missiles for scrap
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Selling missiles there spends 5, 10, or 15 missiles for 15, 30, or 45 scrap, and Scrap Recovery Arm and Repair Arm change that scrap.

- [x] Selling Drone Parts Station
  - [x] No playable control, number, layout, or rule.

- [x] Selling Missiles Station
  - [x] No playable control, number, layout, or rule.

- [x] Selling drone parts station
  - [x] same title as "Selling Drone Parts Station" with different capitalization.

- [x] Selling missiles station
  - [x] same title as "Selling Missiles Station" with different capitalization.

- [x] Sensors
  - [x] The level formula in sensors.ts is INFERRED.
  - [x] Level 1 shows your interiors.
  - [x] Level 2 shows the enemy interior, and still shows enemy crew through a cloak.
  - [x] A nebula beacon disables Sensors, including the level 3 enemy weapon charge bars.
  - [x] The Flagship cap of 2 keeps those bars hidden.
  - [x] Slug vision still works in a nebula.
  - [x] Enemy ships have no Sensors subsystem, so none is modelled.
  - [x] Player hacking can target Sensors.
  - [x] Level 4 sensors show an enemy system's level, power, ion damage and cooldown, and repair and sabotage progress.

- [ ] Settlement Mercenary Work
  - [x] Same card as dest "Settlement mercenary work" (cited-events-surrender.ts).
  - [x] Listen rolls a pirate-convincing fight or a space-dock rescue marker (surrender.ts).
  - [x] Decline on the opening card does nothing.
  - [ ] Letting them live shows the printed thank-you sentence and pays medium scrap without the unnamed weapon.

- [x] Settlement mercenary work
  - [x] same title as "Settlement Mercenary Work" with different capitalization.

- [ ] Shield Charge Booster
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Shields
  - [x] layer times cited.
  - [x] Heavy Pierce and the four crystal guns ignore one layer; a second layer stops the shot and drops one bubble.
  - [x] Beams still lose 1 damage per layer and do not drop a bubble.
  - [x] Full upgrade table not copied.

- [x] Shields Holding
  - [x] No playable control, number, layout, or rule.

- [ ] Ship
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Ship Achievements
  - [x] Same 51-row catalog as Achievements.
  - [x] Twelve rules are tracked, including Scrap Hoarder.
  - [ ] Repair-from-1, an artillery-only kill, a burning kill, a missile-only kill of a ship with a defense drone, and a kill before the Zoltan Shield drops stay untracked, so most Layout B unlocks cannot be earned.

- [x] Ship Achievements/Advanced Mastery
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Ancestry
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Artillery Mastery
  - [x] No playable control, number, layout, or rule.

- [ ] Ship Achievements/Avast, ye scurvy dogs!
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Ship Achievements/Battle Royale
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Bird of Prey
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Clash of the Titans
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Defense Drones Don't Do D'anything!
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Disintegration Ray
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Disintigration Ray
  - [x] No playable control, number, layout, or rule.

- [ ] Ship Achievements/Full Arsenal
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Ship Achievements/Givin' her all she's got, Captain!
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Home Sweet Home
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/I hardly lifted a finger
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Is it warm in here?
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Loss of Cabin Pressure
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Manpower
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Master of Patience
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/No Escape
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Phase Shift
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Robotic Warfare
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Scrap Hoarder
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Shields Holding
  - [x] No playable control, number, layout, or rule.

- [ ] Ship Achievements/Sweet Revenge
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Ship Achievements/Tactical Approach
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Take no prisoners!
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/The United Federation
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/The guns... They've stopped
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/Tough Little Ship
  - [x] No playable control, number, layout, or rule.

- [x] Ship Achievements/We're in position!
  - [x] No playable control, number, layout, or rule.

- [ ] Ship Being Mined by Lanius
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Ship Comparison
  - [x] No playable control, number, layout, or rule.

- [x] Ship Damaged Near Sun
  - [x] No playable control, number, layout, or rule.

- [x] Ship Scrap Comparison
  - [x] No playable control, number, layout, or rule.

- [x] Ship Strategies
  - [x] No playable control, number, layout, or rule.

- [x] Ship Without Slug Markings
  - [x] No playable control, number, layout, or rule.

- [x] Ship achievements
  - [x] same title as "Ship Achievements" with different capitalization.

- [x] Ship damaged near sun
  - [x] same title as "Ship Damaged Near Sun" with different capitalization.

- [x] Ship without Slug markings
  - [x] same title as "Ship Without Slug Markings" with different capitalization.

- [ ] Ships
  - [x] Hangar START is off when unlocks.ts says the layout is locked.
  - [x] Kestrel A starts unlocked.
  - [x] Layout B needs 2 of 3 ship achievements.
  - [ ] Only 12 of 51 achievements are tracked, so most B and C layouts cannot be earned.
  - [x] Advanced Edition stays on.
  - [ ] The article was not re-opened.

- [ ] Shivan
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Simo-H
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Single Life Form on Moon
  - [x] No playable control, number, layout, or rule.

- [x] Single life form on moon
  - [x] same title as "Single Life Form on Moon" with different capitalization.
  - [x] Inviting the survivor adds Charlie with one skill, taking him home pays high scrap, medium scrap, or 10 repairs, and bringing him back loses a crewmember, adds Charlie, or deals 5 hull and 1 system damage.

- [x] Skills
  - [x] Repair ranks multiply repair, breach sealing, and fire-fighting by 1 / 1.1 / 1.2 (skills.ts).
  - [x] The ×1.1 / ×1.2 reading is a rate increase, INFERRED.
  - [x] The other skill tables are not this path.

- [ ] Slaver (friendly)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.

- [ ] Slaver (hostile)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Outrunning at Engines level 6 shows one of the two printed get-away sentences or the printed catch sentence and a Pirate fight.
  - [x] Drawing straws loses one crewmember, and a Clone Bay prints the duplicate-law sentence without reviving them.

- [x] Slocknog
  - [x] Hiring Slocknog costs 55 scrap, rescuing him is free, and neither path stores a skill the page does not print.
  - [x] At Slocknog, the printed hire sentence is shown in full.

- [ ] Slug
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Slug Boarding Rock Freighter
  - [x] No playable control, number, layout, or rule.

- [x] Slug Captain Invites You to a Drink
  - [x] No playable control, number, layout, or rule.

- [x] Slug Comm Tapping
  - [x] Same card as dest "Slug comm tapping" (cited-events-surrender.ts).
  - [x] Tap adds a quest marker.
  - [x] Ignoring them shows the printed move-on sentence and nothing happens.
  - [x] The marker fight is in quests.ts.

- [x] Slug Controlled Nebula
  - [x] No playable control, number, layout, or rule.

- [ ] Slug Cruiser
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Slug Disable Door System
  - [x] No playable control, number, layout, or rule.

- [x] Slug Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Slug Exposed in Open Space
  - [x] No playable control, number, layout, or rule.

- [x] Slug Fight in Ion Storm
  - [x] No playable control, number, layout, or rule.

- [x] Slug Fight in Nebula
  - [x] No playable control, number, layout, or rule.

- [ ] Slug Home Nebula
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Slug Home Nebula Surrender
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Slug Home Nebula surrender
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Accepting the prototype weapon shows the printed odd-beam sentence and still grants the Anti-Bio Beam.

- [x] Slug Home nebula surrender
  - [x] same title as "Slug Home Nebula Surrender" with different capitalization.

- [x] Slug Mantis fight
  - [x] No playable control, number, layout, or rule.

- [x] Slug Mantis fight in nebula
  - [x] No playable control, number, layout, or rule.

- [x] Slug Nebula Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Slug Oxygen Malfunction
  - [x] No playable control, number, layout, or rule.

- [x] Slug Pirate
  - [x] No playable control, number, layout, or rule.

- [x] Slug Pirate fight
  - [x] No playable control, number, layout, or rule.

- [x] Slug Rebel
  - [x] No playable control, number, layout, or rule.

- [x] Slug Rebel fight
  - [x] No playable control, number, layout, or rule.

- [x] Slug Repair Gel
  - [x] every breached player room gains 0.75 repair per second, including an empty room, stacked on crew repair.
  - [x] No purchase price, so it is not sold.
  - [x] Slug A/B/C start with it.

- [x] Slug Repair Station
  - [x] No playable control, number, layout, or rule.

- [ ] Slug Sabotage Oxygen System
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Slug Ships
  - [x] No playable control, number, layout, or rule.

- [x] Slug Store
  - [x] No playable control, number, layout, or rule.

- [x] Slug Transport with Military Escort
  - [x] No playable control, number, layout, or rule.

- [ ] Slug Trapped on a Moon
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Slug and Rock Standoff
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Slug and Rock Standoff in Nebula
  - [x] No playable control, number, layout, or rule.

- [x] Slug and Rock standoff
  - [x] same title as "Slug and Rock Standoff" with different capitalization.

- [x] Slug and Rock standoff in nebula
  - [x] same title as "Slug and Rock Standoff in Nebula" with different capitalization.

- [x] Slug boarding Rock freighter
  - [x] same title as "Slug Boarding Rock Freighter" with different capitalization.

- [x] Slug boarding Rock ship
  - [x] No playable control, number, layout, or rule.

- [x] Slug captain invites you to a drink
  - [x] same title as "Slug Captain Invites You to a Drink" with different capitalization.

- [x] Slug comm tapping
  - [x] same title as "Slug Comm Tapping" with different capitalization.

- [x] Slug disable Door system
  - [x] same title as "Slug Disable Door System" with different capitalization.

- [x] Slug disable door system
  - [x] same title as "Slug Disable Door System" with different capitalization.

- [ ] Slug doors hacker
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Slug drink
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Drinking pays 10 repairs and a store or loses 25-35 scrap, and a living Rock crewmember is paid those repairs and a store or starts that Slug fight.
  - [x] Refusing shows the printed offense sentence and starts a Slug fight.
  - [x] Opening the beacon shows the printed hail sentence.

- [x] Slug empty beacon
  - [x] same title as "Slug Empty Beacon" with different capitalization.

- [x] Slug empty nebula beacon
  - [x] No playable control, number, layout, or rule.

- [x] Slug exposed in open space
  - [x] same title as "Slug Exposed in Open Space" with different capitalization.

- [x] Slug fake store
  - [x] No playable control, number, layout, or rule.

- [ ] Slug fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.

- [x] Slug fight in ion storm
  - [x] same title as "Slug Fight in Ion Storm" with different capitalization.

- [ ] Slug fight in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the five printed intros is shown before Fight a Slug ship, which still fights a default Slug ship.

- [ ] Slug fight in plasma storm
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Slug fight in plasma storm, one of the four printed intros is shown, a non-nebula beacon still halves the reactor, and fleet pursuit stays one full step.

- [ ] Slug hacker (choice)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] A Slug hacker (choice) fight halves the Shields, Oxygen, or Weapon Control you picked, rounding down.
  - [x] Opening the beacon shows the printed hail sentence.
  - [x] Choosing Shields, Oxygen, or Weapons shows that choice's printed lead-in, halves that system, and fights a Slug ship.
  - [x] Offering 35 scrap shows the printed generousss sentence, spends 35 scrap, and the fight is avoided.
  - [x] Countering with Hacking shows the printed silence sentence, takes Hacking offline, and starts a Slug fight.
  - [x] Shields pays medium scrap with resources when the ship is destroyed and high scrap with resources on a crew kill.
  - [x] Oxygen pays medium scrap with resources either way.
  - [x] Weapons and countering the hack both pay high scrap with resources either way.

- [ ] Slug hacker (doors)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Continue on Slug hacker (doors) takes your Door System offline until that fight ends.
  - [x] Opening the beacon shows the printed burn-you-out sentence.
  - [x] Countering the remote hack shows the printed assault sentence, takes Hacking offline, and starts a Slug fight.
  - [x] The Slug ship has at least one Fire Beam or Fire Bomb.
  - [x] Continue pays medium scrap with resources when the ship is destroyed and high scrap with resources when the crew are killed, and countering the hack pays high scrap with resources either way.
  - [x] Jumping to the beacon sticks the doors in the state they had before the jump, Continue keeps them offline, and countering the hack turns them back on.

- [ ] Slug hacker (medical)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Continue on Slug hacker (medical) takes your Medbay and Clone Bay offline until that fight ends.
  - [x] Two slug boarders beam aboard your ship when you continue from Slug hacker (medical).
  - [x] Opening the beacon shows the printed radiation sentence.
  - [x] Countering the remote hack shows the printed satellite sentence, beams two slug boarders, takes Hacking offline, and starts a Slug fight.
  - [x] Squeezing extra power at Medbay level 2 shows the printed flicker sentence, halves the Medbay, beams two slug boarders, and starts a Slug fight.
  - [x] A destroyed ship and a crew kill both pay high scrap with resources.

- [ ] Slug hacker (oxygen)
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Continue on Slug hacker (oxygen) takes your Oxygen system offline until that fight ends.
  - [x] The Slug ship never tries to escape.
  - [x] The Slug ship never surrenders.
  - [x] Opening the beacon shows the printed suffocate sentence.
  - [x] Squeezing extra power at Oxygen level 2 shows the printed life-support sentence, halves Oxygen, and starts a Slug fight.
  - [x] Countering the remote hack shows the printed assault sentence, takes Hacking offline, and starts a Slug fight.
  - [x] A destroyed ship and a crew kill both pay medium scrap with resources.
  - [x] The Slug ship has at least one Fire Beam or Fire Bomb.

- [x] Slug medical hacker
  - [x] No playable control, number, layout, or rule.

- [ ] Slug moons question
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Slug nebula empty beacon
  - [x] same title as "Slug Nebula Empty Beacon" with different capitalization.

- [ ] Slug oxygen hacker
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Slug oxygen malfunction
  - [x] same title as "Slug Oxygen Malfunction" with different capitalization.

- [ ] Slug question
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Slug repair station
  - [x] same title as "Slug Repair Station" with different capitalization.

- [x] Slug sabotage medical unit
  - [x] No playable control, number, layout, or rule.

- [x] Slug sabotage oxygen system
  - [x] same title as "Slug Sabotage Oxygen System" with different capitalization.

- [x] Slug ship boarding Rock ship
  - [x] Engaging fights a Slug ship for medium scrap and then nothing or another medium from the freighter, or the Slugs back down, and ignoring them does nothing twice as often as it starts a Rock fight.

- [x] Slug store
  - [x] same title as "Slug Store" with different capitalization.

- [x] Slug store ship
  - [x] No playable control, number, layout, or rule.

- [x] Slug transport with military escort
  - [x] same title as "Slug Transport with Military Escort" with different capitalization.

- [x] Slug trapped on a moon
  - [x] same title as "Slug Trapped on a Moon" with different capitalization.

- [ ] Slugman Fuel Depot
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Slugman fuel depot
  - [x] same title as "Slugman Fuel Depot" with different capitalization.

- [x] Slugs
  - [x] stat row.
  - [x] Mind-control immunity is applied.
  - [x] A slug reveals adjacent rooms (tile edge, not only doors) and live enemy crew on both ships.
  - [x] Crew drones are not revealed.
  - [x] Other slug lines stay open.

- [x] Slugs Detected Radiation From Your Medical Unit
  - [x] No playable control, number, layout, or rule.

- [x] Slugs Detected Radiation from Your Medical Unit
  - [x] same title as "Slugs Detected Radiation From Your Medical Unit" with different capitalization.

- [x] Slugs detected radiation from your medical unit
  - [x] same title as "Slugs Detected Radiation From Your Medical Unit" with different capitalization.

- [x] Small Asteroid Belt Distress Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Small Rebel Research Station
  - [x] No playable control, number, layout, or rule.

- [ ] Small Research Station with No Response
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Small asteroid belt distress beacon
  - [x] same title as "Small Asteroid Belt Distress Beacon" with different capitalization.

- [x] Small research station with no response
  - [x] same title as "Small Research Station with No Response" with different capitalization.

- [x] Smouldering Engi Research Station
  - [x] No playable control, number, layout, or rule.

- [x] Smuggler
  - [x] No playable control, number, layout, or rule.

- [x] Soundtrack
  - [x] wiki process, not a game system.

- [ ] Space Station Under Construction
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Declining shows the printed cut-transmission sentence and nothing happens.
  - [x] Opening the beacon shows the printed construction sentence.

- [x] Space Station under Construction
  - [x] same title as "Space Station Under Construction" with different capitalization.

- [x] Space station under construction
  - [x] same title as "Space Station Under Construction" with different capitalization.
  - [x] Offering help shows the printed supplies sentence and still adds the quest marker.
  - [x] Refusing to sell the Lanius shows the printed pity sentence and pays medium scrap.

- [ ] Special events crewmembers
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Specialty Work on Your Ship
  - [x] No playable control, number, layout, or rule.

- [x] Specialty Work on your Ship
  - [x] same title as "Specialty Work on Your Ship" with different capitalization.

- [x] Specialty work on your ship
  - [x] same title as "Specialty Work on Your Ship" with different capitalization.

- [x] Stasis chamber
  - [x] No playable control, number, layout, or rule.

- [ ] Stasis pod
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Stationed Rebel Ship
  - [x] No playable control, number, layout, or rule.

- [x] Stationed Rebel ship
  - [x] same title as "Stationed Rebel Ship" with different capitalization.

- [ ] Stealth Cruiser
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Stealth Weapons
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Store
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Store (Crystal)
  - [x] No playable control, number, layout, or rule.

- [x] Store (Engi)
  - [x] No playable control, number, layout, or rule.

- [x] Store (Lanius)
  - [x] No playable control, number, layout, or rule.

- [x] Store (Mantis)
  - [x] No playable control, number, layout, or rule.

- [x] Store (Pirate)
  - [x] No playable control, number, layout, or rule.

- [x] Store (Rebel)
  - [x] No playable control, number, layout, or rule.

- [x] Store (Rock)
  - [x] No playable control, number, layout, or rule.

- [x] Store (Zoltan)
  - [x] No playable control, number, layout, or rule.

- [x] Store (event)
  - [x] No playable control, number, layout, or rule.

- [x] Store beacon
  - [x] No playable control, number, layout, or rule.

- [x] Store in nebula (Slug)
  - [x] No playable control, number, layout, or rule.

- [x] Store in nebula (Uncharted)
  - [x] No playable control, number, layout, or rule.

- [x] Store in uncharted nebula
  - [x] No playable control, number, layout, or rule.

- [x] Stores
  - [x] No playable control, number, layout, or rule.

- [ ] Stores and resources
  - [x] src/game/sim.ts — Template:Stores: resources in stores: fuel stock 3–7 at 3, missiles 2–6 at 6, drone parts 2–4 at 8.
  - [x] Hull repair uses the sector rate.
  - [x] Missing systems are listed at the printed prices (Shields 125, Medbay 50, Clone Bay 50, Teleporter 90, Cloaking 150, Mind Control 75, Hacking 80, Sensors 40, Doors 60, Backup Battery 35).
  - [x] Drone Control is offered as a bundle at 75 scrap with a System Repair Drone, or 85 with a Defense Drone Mark I or a Combat Drone Mark I.
  - [x] The store seed picks which of the three and is not advanced (INFERRED).
  - [x] The naked 60 is not a shelf price.
  - [x] Catalog augments and the first crew races are buyable.
  - [x] Weapons and augments sell for half the purchase price, rounded down, unless the page prints a sell amount.
  - [ ] Drone schematics are not sold.
  - [x] A fitted Shield Overcharger + quotes 30 scrap.
  - [x] The item slots beyond fuel, missiles, drone parts, hull repair, and the weapon slot are 1, 2, or 3, from the seed.
  - [x] A bought system does not add a room.
  - [x] Buying Medbay or Clone Bay replaces the other and keeps its level.

- [ ] Surrender
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Sweet Revenge
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] System Repair Drone
  - [x] Purchase 30, 1 power, 25 HP.
  - [x] It repairs systems, breaches, and fires at an Engi's pace: one bar or breach in 6.25 seconds, and a fire at twice a human's share.
  - [x] Low oxygen does not stop it (INFERRED).
  - [x] It walks to a damaged Oxygen system when average room air is under 25 percent (INFERRED meter), then a fire, then Shields, then a breach, then the nearest other damaged system.
  - [x] A vented room's fire is skipped.
  - [x] An enemy copy walks the same route.
  - [x] Repowering while it stands in a system room finishes that system before a higher-priority job, including Oxygen under 25 percent.
  - [x] With nothing left it walks back to the Drone Control room and does not take a new job until it arrives or power returns.
  - [x] Idle there, any power in Drone Control heals it at 5 HP per second (INVENTED).
  - [x] The walking drone breaks a shut blast door at two hits a second (INFERRED).
  - [x] A redeployed drone ignores fires in other rooms until Drone Control has no damage.
  - [x] A fire in the room it already occupies is still fought.
  - [ ] The dying animation is not applied.

- [x] Systems
  - [x] eight core systems plus nine kits.
  - [x] Upgrade tables in content.ts are incomplete (INFERRED rows).
  - [x] A breach prevents manning until it is sealed, and an auto-ship keeps its manning bonus through a fire, a breach, or an intruder.

- [x] Tactical Approach
  - [x] No playable control, number, layout, or rule.

- [ ] Take no prisoners!
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Tech support
  - [x] wiki process, not a game system.

- [ ] Tektite
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Teleporter
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Terraforming federation team C12
  - [x] No playable control, number, layout, or rule.

- [x] Terraforming scan
  - [x] filler-events.ts.
  - [x] A failed scan does nothing.
  - [x] A success rolls an oxygen upgrade, a Pirate fight, or the mold bribe (15–25 scrap either way, or an oxygen upgrade if you pay).
  - [x] Improved Sensors at level 2 or higher, and a living Zoltan, skip the failed scan and roll that same success.
  - [x] A dead Zoltan does not count.
  - [x] The page prints level 2+ and not whether damage drops it, so the installed level is what counts (INFERRED).
  - [x] A plain successful scan shows the printed modulate sentence, and Improved Sensors and a living Zoltan still skip it.

- [x] Terrified Rock Crew in Zoltan Nebula
  - [x] No playable control, number, layout, or rule.

- [x] Terrified Rock crew in Zoltan nebula
  - [x] same title as "Terrified Rock Crew in Zoltan Nebula" with different capitalization.

- [ ] Tetragon
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] The Adjudicator
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] The Basilisk
  - [x] No playable control, number, layout, or rule.

- [x] The Black Raven
  - [x] cited-events-surrender.ts.
  - [x] No opens the challenge.
  - [x] Accept and decline both fight a Slug Assault pirate.
  - [x] A living Slug can duel.
  - [x] That duel beams 1–2 slug boarders into the fight, or pays high scrap and no weapon.
  - [x] The page prints no odds, so the two results are equal (INFERRED).
  - [x] A dead Slug does not count.
  - [x] The collapse prints no stun duration, so none is applied.
  - [x] The mind duel shows the printed collapse or victory sentence, accepting his surrender shows the printed transfer sentence, and ignoring him shows the printed cut-off sentence.

- [x] The Crystal Cruiser
  - [x] Bravais and Carnelian are in HULLS.
  - [x] Crystal Vengeance stays unfitted.
  - [x] Room grid is the shared player grid.
  - [x] Unlocks are labels.

- [x] The Engi Cruiser
  - [x] Torus, Vortex, Tetragon in hulls.ts.
  - [x] Torus starts with Engi Med-bot Dispersal.
  - [x] Drone Reactor Booster, the second repair drone, and Defense Scrambler stay unfitted.

- [ ] The Engi Virus
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The Engi virus fight halves your Engines and Shields, rounding down.
  - [x] Opening the beacon shows the printed awaiting sentence and the destroy sentence.
  - [x] Attacking the Engi vessel shows the printed damned sentence and fights an Engi ship.
  - [x] Purging the system code shows the printed wipe sentence, halves Engines and Shields, and fights an Engi ship.

- [x] The Engi virus
  - [x] same title as "The Engi Virus" with different capitalization.

- [x] The Federation Cruiser
  - [x] Osprey, Nisos, Fregatidae in hulls.ts.
  - [x] Artillery and flak artillery are systems, not a traced room picture.

- [ ] The Final Boss
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] The Fregatidae
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] The Gila Monster
  - [x] No playable control, number, layout, or rule.

- [ ] The Kestrel
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] The Kestrel Cruiser
  - [x] layouts A–C in hulls.ts (The Kestrel, Red-Tail, The Swallow).
  - [x] Tile positions INFERRED.
  - [x] Power fill INFERRED.
  - [x] Unlocks are labels.

- [x] The Lanius Cruiser
  - [x] Kruos starts with Chain Burst Laser and Ion Stunner.
  - [x] Shrike starts with Advanced Flak.
  - [x] Room positions are INFERRED.

- [x] The Last Stand
  - [x] No playable control, number, layout, or rule.

- [x] The Mantis Cruiser
  - [x] Gila Monster, Basilisk, and Theseus are in HULLS and start with Mantis Pheromones.
  - [x] Teleporter power is INFERRED.
  - [x] Room grid is the shared player grid.

- [ ] The Mercenary
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the six printed intros is shown before Hire the mercenary to delay the Rebels, Fight the ship, or You have no need of his services.
  - [x] Fighting the ship shows the printed honorable sentence and fights a Pirate ship.
  - [x] Hiring the mercenary shows the printed mask sentence and delays the Rebel Fleet for 2 turns.

- [ ] The Nesasio
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] The Osprey
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] The Rebel Flagship
  - [x] Phase numbers in flagship.ts are applied on the traced cutaway (flagshipStage), not the leftover two-row grid.
  - [x] Boss Laser and Boss Beam are WeaponDefs and charge on the printed table, outside the Weapons pool.
  - [x] Power 4 and 3 are the chosen artillery maxima, not a Weapons-pool cost.
  - [x] No power line is printed.
  - [x] Boss Ion power is 3.
  - [x] Boss Missile power is 4.
  - [x] The flagship copy of Boss Missile uses breach 0.14.
  - [x] Crew in a lost artillery room are removed.
  - [x] Hacking one Flagship artillery room drains that gun.
  - [x] A normal ship's weapons hack still drains every gun.

- [x] The Rebellion
  - [x] No playable control, number, layout, or rule.

- [x] The Rock Cruiser
  - [x] Bulwark starts with Artemis and Hull Missile.
  - [x] Tektite starts with Swarm Missiles and Heavy Crystal I.
  - [x] Shivan mounts the Fire Bomb and the Heavy Pierce.
  - [x] The Heavy Pierce waits until the Fire Bomb is switched off or the weapon bars are raised.
  - [x] It ignores one shield layer.

- [ ] The Shrike
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] The Slug Cruiser
  - [x] Man of War mounts Dual Lasers, Anti-Bio Beam, and Breach Bomb I.
  - [x] The bomb waits until one of the others is switched off.
  - [x] Stormwalker starts with Artemis and Healing Burst.
  - [x] Ariolimax starts with Chain Burst Laser.
  - [x] All three start with Slug Repair Gel.

- [x] The Stealth Cruiser
  - [x] Nesasio starts with Dual Lasers and Mini Beam.
  - [x] DA-SR 12 starts with the Glaive Beam and cloak power 0 (INFERRED).
  - [x] Simo-H starts with Laser Charger (S) and Mini Beam.
  - [x] Shield Overcharger + and Anti-Drone stay unfitted.

- [ ] The Stormwalker
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] The Swallow
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] The Theseus
  - [x] No playable control, number, layout, or rule.

- [ ] The Torus
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] The United Federation
  - [x] No playable control, number, layout, or rule.

- [ ] The Vortex
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] The Zoltan Cruiser
  - [x] Noether starts with two Ion Blasts and Pike Beam (id shear).
  - [x] Adjudicator mounts Leto and Halberd; the Halberd waits for bars.
  - [x] Cerenkov mounts the Ion Charger with weapon bars at 0.
  - [x] Zoltan Shield stays unfitted.

- [x] The guns... They've stopped
  - [x] No playable control, number, layout, or rule.

- [x] The mercenary
  - [x] same title as "The Mercenary" with different capitalization.

- [ ] Titanium System Casing
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Torus
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Tough Little Ship
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Trade: fuel for drone parts
  - [x] No playable control, number, layout, or rule.

- [x] Trade: sell drone parts for scrap
  - [x] No playable control, number, layout, or rule.

- [x] Trade: sell fuel for drone parts
  - [x] No playable control, number, layout, or rule.

- [ ] Trade: sell missiles for scrap
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Trade: selling drone parts station
  - [x] No playable control, number, layout, or rule.

- [x] Trade: selling missiles station
  - [x] No playable control, number, layout, or rule.

- [ ] Trade fuel for drone parts
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Trade fuel for drone parts, one of the three printed intros is shown before the fuel trade and the reject.

- [ ] Trade resources
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the four printed trades is shown before Trade or Ignore, and Ignore does nothing.

- [ ] Trade resources in nebula
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] One of the four printed trades is shown before Trade or Ignore, and Ignore does nothing.

- [x] Trade scrap for upgrades
  - [x] An items beacon offers one installed system or the reactor at the printed scrap band, and a decline spends nothing.

- [x] Trader
  - [x] No playable control, number, layout, or rule.

- [x] Trader in nebula
  - [x] No playable control, number, layout, or rule.

- [x] Trap Distress Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Two Pirate Ships in Nebula
  - [x] No playable control, number, layout, or rule.

- [ ] Two Smashed Ships
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Two pirate ships in Nebula
  - [x] same title as "Two Pirate Ships in Nebula" with different capitalization.

- [x] Two pirate ships in nebula
  - [x] same title as "Two Pirate Ships in Nebula" with different capitalization.

- [x] Two pirate ships in plasma storm
  - [x] No playable control, number, layout, or rule.

- [x] Two smashed Engi ships
  - [x] No playable control, number, layout, or rule.

- [x] Two smashed ships
  - [x] same title as "Two Smashed Ships" with different capitalization.

- [ ] Unarmed Zoltan Transport
  - [x] Card in quests-a-pages.ts, placed by beacon-mix on Zoltan Homeworlds.
  - [x] Attack rolls an unarmed Zoltan fight or a defense ship.
  - [x] Hear them out places the peace marker.
  - [x] The bloodless reply unlocks Zoltan A and rolls a Zoltan Shield plus low scrap, or a maxed Zoltan named Envoy plus high scrap.
  - [ ] The article was not re-opened, so this is not present.

- [x] Unarmed Zoltan transport
  - [x] same title as "Unarmed Zoltan Transport" with different capitalization.

- [x] Uncharted Nebula
  - [x] No playable control, number, layout, or rule.

- [ ] Unencrypted Communication Channel
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Unencrypted communication channel
  - [x] same title as "Unencrypted Communication Channel" with different capitalization.

- [ ] Unknown Disease on Mining Colony
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Unknown disease on mining colony
  - [x] same title as "Unknown Disease on Mining Colony" with different capitalization.
  - [x] Sending the crew loses one crewmember and pays medium resources, or nothing, and a clone bay does not bring them back.

- [x] Venting
  - [x] room venting exists.
  - [x] Rates INFERRED.

- [x] We're in position!
  - [x] No playable control, number, layout, or rule.

- [x] Weak and Hungry Human Intruders
  - [x] No playable control, number, layout, or rule.

- [x] Weak and hungry Human intruders
  - [x] same title as "Weak and Hungry Human Intruders" with different capitalization.

- [x] Weak and hungry human boarders
  - [x] No playable control, number, layout, or rule.

- [x] Weapon Control
  - [x] left click or 1–4 powers a slot; the next press on a powered slot enters targeting; a left click confirms the room; right click cancels targeting; right click or Shift+1–4 depowers; Ctrl+click or Ctrl+1–4 reverses that slot against the all-weapons autofire setting.
  - [x] Dragging a slot reorders weapons, and the same gesture reorders drone schematics, including while Weapon Control is ionized.
  - [x] While that system is ionized or during a hack pulse, reactor buttons and slot power do nothing.
  - [x] Ion Charger, Laser Charger (S), Laser Charger, and Laser Charger Mark II each store one shot at a time.
  - [x] A click fires the bank.
  - [x] Autofire fires each finished shot and does not bank.
  - [x] Weapon Pre-Igniter primes one shot.
  - [x] A hack pulse keeps a banked charger shot and does not let it fire.
  - [x] Ordinary weapons still drain.
  - [x] Laser Charger (S) is not mounted on a generated enemy.
  - [x] A Zoltan in the weapons room adds one bar to that pool, and the pool still feeds slots from the left.
  - [x] A full Weapon Control system spends Zoltan bars from the leftmost slot and wastes a partial bar instead of combining it.
  - [x] Leaving without spare reactor power drops the slots those bars were covering.
  - [x] A slot paid only by Zoltan bars stays online under ion.
  - [x] A cruiser's weapon cap is the slot count printed on its layout.

- [ ] Weapon Pre-Igniter
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Weapons
  - [x] family rules cited in content.ts and ordnance.ts.
  - [x] Most rows are not fitted.

- [x] Weapons/Tables
  - [x] No playable control, number, layout, or rule.

- [x] Weapons (tables)
  - [x] No playable control, number, layout, or rule.

- [x] Weapons trader
  - [x] No playable control, number, layout, or rule.

- [ ] Zoltan
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [ ] Zoltan "Great Eye"
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Zoltan "Science Ship"
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Zoltan "Wise Man"
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan "science ship"
  - [x] same title as "Zoltan "Science Ship"" with different capitalization.

- [x] Zoltan "wise man"
  - [x] same title as "Zoltan "Wise Man"" with different capitalization.

- [x] Zoltan Academy Free Augment
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Border Police
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Controlled Sector
  - [x] No playable control, number, layout, or rule.

- [ ] Zoltan Cruiser
  - [x] Title string is in src/.
  - [ ] The article was not re-opened, so this is not present.
  - [x] the exact title string occurs in src/.
  - [ ] Paragraph audit is pass 2; this is not a full page check.

- [x] Zoltan Empty Beacon
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Engi fight
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Fight
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Fight with Boarders
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Follows Mantis
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Great Eye
  - [x] Pulling closer loses a crewmember, fights a Zoltan ship, pays high scrap, or mounts Healing Burst, and a clone bay does not bring that crewmember back.
  - [x] At Zoltan Great Eye, the printed italic is shown in full before Pull the ship in closer and Leave.

- [ ] Zoltan Homeworlds
  - [ ] The page states a mechanic and it is not a playable event.

- [ ] Zoltan Life Raft
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Zoltan Mantis fight
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Mantis fight with boarders
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Pirate Fight
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Pirate fight
  - [x] same title as "Zoltan Pirate Fight" with different capitalization.

- [x] Zoltan Research Facility
  - [x] Same card as dest "Zoltan research facility" (quests-a-pages.ts).
  - [x] Participate rolls low scrap or 2 boarders and a Pirate fight.
  - [x] Medbay 3 pays for the records.
  - [x] The Damaged Stasis Pod blue option is not in this build.

- [x] Zoltan Rock fight in nebula
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Security Checkpoint
  - [x] No playable control, number, layout, or rule.

- [ ] Zoltan Shield
  - [x] ship.zoltan absorbs damage before shields and hull.
  - [x] Ion spends double.
  - [x] Beams spend double, and Anti-Bio and Fire Beam spend 2.
  - [x] Fire Bomb, Crystal Lockdown Bomb, Healing Burst, and Repair Burst leave the bubble alone.
  - [x] A jump recharges a bubble to 5.
  - [x] The bubble blocks crew teleport, mind control, hacking, boarding drones, and an enemy teleporter party.
  - [x] Bypass lets crew, bombs, and mind control through without spending it.
  - [x] The event exception for an initial boarding party has no separate path.
  - [x] Shield Overcharger adds one layer on 8/10/13/16/20 seconds for 0–4 existing layers and does not charge once 5 or more are present.
  - [x] A layer it creates from no bubble is lost on jump.
  - [x] An existing bubble still recharges to 5.
  - [x] Speed 5 is a flight figure, the same number Defense Drone Mark I prints, and it does not change those waits (INFERRED: not seconds).
  - [x] An enemy Anti-Ship Beam Drone I or Fire Drone spends 1 layer per swipe, Beam Drone II spends 2, and the player's Beam Drone I spends 1.
  - [x] That swipe does not cut the hull.
  - [x] A pulsar fight warns 5 seconds ahead of a pulse every 11–18 seconds.
  - [x] The span is uniform and the top is not its own bucket (INFERRED).
  - [x] A Zoltan Shield on a ship that has Shields spends 3 or 4 (INFERRED even split) and the systems stay clear.
  - [x] One layer is enough.
  - [x] A ship with no Shields system ignores the bubble.
  - [ ] Drone HP is not applied.
  - [x] One Reverse Ion Field resists ion damage to the bubble half the time, and two copies always do.
  - [x] A resisted ion projectile still hits the room when regular shields are down.
  - [x] A solar flare treats a Zoltan Shield as shields up and does not spend it.

- [ ] Zoltan Shield Bypass
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Zoltan Ship Tour
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Ships
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Store
  - [x] No playable control, number, layout, or rule.

- [x] Zoltan Trade Hub
  - [x] Same card as dest "Zoltan trade hub" (quests-a-pages.ts).
  - [x] Talking in can be a Zoltan fight or the hub.
  - [x] A Zoltan pays 10 scrap.
  - [x] The store-or-cantina split inside the hub is in quests-a.ts.
  - [x] Equal odds there are INFERRED.

- [x] Zoltan academy free augment
  - [x] same title as "Zoltan Academy Free Augment" with different capitalization.

- [ ] Zoltan border police
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Three or four Zoltan boarders beam aboard your ship when you fight the Zoltan ship from Zoltan border police.
  - [x] At Zoltan border police, the printed customs-check sentence is shown in full.

- [x] Zoltan empty beacon
  - [x] same title as "Zoltan Empty Beacon" with different capitalization.

- [ ] Zoltan fight
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Zoltan fight, one of the seven printed intros is shown before Fight a Zoltan ship, which still fights a default Zoltan ship.

- [ ] Zoltan fight in asteroid field
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The printed sentence is shown before the default Zoltan ship fight, which still starts inside an asteroid field.

- [x] Zoltan fight with boarders
  - [x] same title as "Zoltan Fight with Boarders" with different capitalization.

- [x] Zoltan follows Mantis
  - [x] same title as "Zoltan Follows Mantis" with different capitalization.

- [ ] Zoltan free augment
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] At Zoltan free augment, the printed sentence is shown in full before the existing choice.
  - [ ] The unnamed augmentation is not granted.

- [x] Zoltan free map
  - [x] No playable control, number, layout, or rule.

- [ ] Zoltan free stuff
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Zoltan life raft
  - [x] same title as "Zoltan Life Raft" with different capitalization.

- [ ] Zoltan odd moon
  - [ ] The page states a mechanic and it is not a playable event.

- [x] Zoltan pirate fight
  - [x] same title as "Zoltan Pirate Fight" with different capitalization.

- [ ] Zoltan quest primitives
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Leaving shows the printed solution sentence and nothing happens.
  - [x] Interfering shows the printed chant sentence and starts a Zoltan fight.
  - [x] Protecting the aliens shows the printed firing sentence and starts a Rebel fight.
  - [x] Opening the beacon shows both printed sentences, including the Rebel captain's yell.

- [x] Zoltan research facility
  - [x] same title as "Zoltan Research Facility" with different capitalization.

- [ ] Zoltan retake the ship
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed life-raft sentence.
  - [x] Leaving shows the printed drop-off sentence and nothing happens.
  - [x] Destroying the ship pays medium scrap with resources then hiring the Zoltan for 40 scrap adds one Zoltan or does nothing.
  - [ ] A crew kill pays high scrap with the unnamed augmentation not granted.

- [x] Zoltan science ship
  - [x] Same card as "Zoltan ship asks to dock" (cited-events-surrender.ts aliases).
  - [x] Dock rolls a Zoltan fight or medium fuel, missiles, and one drone part with scrap.
  - [x] Keeping their distance shows the printed leave sentence and nothing happens.
  - [x] The dump keeps both titles.

- [ ] Zoltan security checkpoint
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Submitting to profiling does nothing or demands a crewmember, refusing that fight halves Weapon Control and beams 2-4 Zoltan boarders, a destroyed scan pays low scrap with resources, a crew kill pays medium, and a Slug or Mind Control is paid 2-4 fuel.
  - [x] Attacking shows the printed shield sentence and fights a Zoltan ship.
  - [x] At Zoltan security checkpoint, the printed hail is shown with the checkpoint sentence.

- [x] Zoltan shield
  - [x] same title as "Zoltan Shield" with different capitalization.

- [x] Zoltan ship asks to dock
  - [x] cited-events-surrender.ts.
  - [x] Dock rolls a Zoltan fight or medium fuel, missiles, and one drone part with scrap.
  - [x] Keeping their distance shows the printed leave sentence and nothing happens.
  - [x] "Zoltan science ship" is the same card.

- [ ] Zoltan ship follows Mantis ship
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] The Mantis ship from Zoltan ship follows Mantis ship fights with a crew entirely composed of Mantis.
  - [x] The printed sentence is shown in full before the three existing choices.
  - [x] Saving the Mantis shows the printed underdog sentence and fights a Zoltan ship in the asteroid field.
  - [x] Helping the Zoltan shows the printed friends sentence and fights a Mantis ship in the asteroid field.
  - [x] Leaving shows the printed business sentence and nothing happens.

- [x] Zoltan ship tour
  - [x] same title as "Zoltan Ship Tour" with different capitalization.

- [x] Zoltan store
  - [x] same title as "Zoltan Store" with different capitalization.

- [x] Zoltan trade hub
  - [x] same title as "Zoltan Trade Hub" with different capitalization.

- [ ] Zoltan wise man
  - [x] one beacon in a sector the page names, while a free beacon remains.
  - [x] A stated scrap tier, trade, hull change, fleet delay, or fight on that panel runs.
  - [ ] Crew, a map reveal, an upgrade, and an unnamed item are not granted.
  - [x] A fight uses a documented class of the named faction.
  - [x] Opening the beacon shows the printed doom sentence.
  - [x] Choosing Mantis shows the printed challenge sentence and fights a Mantis ship whose crew are all Mantis.
  - [x] Choosing Slug shows the printed underbelly sentence and fights a Slug ship.
  - [x] Choosing Rockmen shows the printed veteran sentence and fights a Rock ship.
  - [x] A destroyed ship pays low scrap with resources and then high scrap with resources.
  - [x] A crew kill pays medium scrap with resources and then high scrap with resources.

- [x] Zoltans
  - [x] src/game/sim.ts — Zoltans, Race characteristics: the 15 HP death burst is applied in reap.
  - [x] A living Zoltan in shields, engines, oxygen, medbay, or weapons adds 1 power bar, and ion does not remove it.
  - [x] One Zoltan in a full even shield does not free a reactor bar.
  - [x] Two Zoltans replace one shield pair and do not fill a lone buffer.
  - [x] A full weapons or drone system frees one reactor bar per Zoltan, and spare puts it back when they leave.
  - [x] Piloting, sensors, and doors are unaffected.
  - [x] A living Zoltan in a kit room adds one bar to cloaking, hacking, the teleporter, mind control, drones, the clone bay, and the artillery beam.
  - [x] That bar does not free a reactor bar, except in a full Drone Control system, which frees one per Zoltan and puts it back from spare when they leave.
  - [x] Backup Battery and Flak Artillery do not read it.
  - [x] While cloaking, hacking, the teleporter, or mind control is cooling, a Zoltan who enters that room frees one locked reactor bar.
  - [x] The yellow bar they already grant stands in its place, and leaving does not put the reactor power back.
  - [x] A Zoltan already in the room when the cooldown starts does not peel until they leave and come back.
  - [x] Player Mind Control still has no ordinary cooldown.
  - [x] Weapon and drone slots take Zoltan power from the left.
  - [x] A full system wastes a partial Zoltan bar.
  - [x] Two Zoltans replace one shield pair.
  - [x] Engines, the medbay, and oxygen replace reactor only when the Zoltans cover every bar and ion is absent, and leaving does not put that reactor back.
  - [x] One ion point ends a hacking pulse and starts a cooldown of 5 seconds per point (INFERRED).
  - [x] A Zoltan bar keeps Mind Control up when the reactor bar is gone.
  - [x] A drone that already has health and is in the room loses 7.5.
  - [x] That covers the Ion Intruder, the Boarding Drone, the Anti-Personnel Drone, and the System Repair drone.
  - [x] An orbiting drone has no health field.
  - [x] A mind-controlled Zoltan death burst does not hurt its allies.
  - [x] A Zoltan does not restore manning on an ionized console, and ion stops at 5 points.
  - [x] Cloaking, hacking, mind control, and the teleporter cannot be activated while ionized.
  - [x] External ion does not shut down Mind Control while a Zoltan fills a bar, and unfilled levels still lower its effect and duration.
  - [x] A deployed drone fully powered solely by Zoltan power cannot be manually de-powered, and control returns when that stops being true.
  - [x] A drone that loses 7.5 HP is shown missing 8, and the stored loss stays 7.5.
