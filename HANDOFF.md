# Hand-off

Private snapshot of the wiki-spec cruiser game. The next session should continue the wiki checklist. Do not treat this tree as complete.

## Run

```bash
npm install
npm run dev
```

Dev server is Vite on port 8080 (`package.json` script `dev`).

Game tests are not wired into `npm test`. Run them directly:

```bash
node --experimental-strip-types --test src/game/selftest.ts src/game/hulls.test.ts src/game/zoltan-burst.test.ts src/game/extras/*.test.ts src/game/wiki/*.test.ts
```

`npm run typecheck` is `tsc --noEmit`.

## Where the game lives

| Path | Role |
|---|---|
| `src/game/sim.ts` | Tick, combat, map, events, stores, `createGame`, `applyHull` |
| `src/game/content.ts` | Weapon defs that are actually fitted, evade and scrap tables |
| `src/game/hulls.ts` | Hangar loadouts |
| `src/game/layouts.ts` | Room grids. Player hangar squares and doors are traced from the hangar pictures. Enemy ships still use one shared grid |
| `src/game/extras/` | Cloaking, hacking, mind control, clone bay, teleporter, drones, battery, artillery, augments, crew |
| `src/components/game/GameApp.tsx` | Title, hangar, map, combat, ship sheet |
| `src/styles.css` | Pixel-tile UI |

Default `createGame()` with no hull id is still the invented Lark (Ada Voss, Ivo Park, Nen Hale). Hangar launches use wiki ship names. Keep the Lark path so existing tests stay green unless you replace it on purpose.

## Do not claim the wiki is done

The checklist was never a full pass of the wiki. Only pages that returned text were used. Fandom often answers 403. If a page is empty, leave the item missing and say so. Do not invent a loadout.

## Still missing

Progress is tracked in `WIKI-CHECKLIST.md`. Do not treat a catalog file as a working system.

Ships now in the hangar: Mantis A/B/C (Gila Monster, Basilisk, Theseus) and Crystal A/B (Bravais, Carnelian), plus the earlier cruisers. Player hangar cutaways are traced from the hangar pictures. Enemy ships still use one shared grid. Unlocks are still labels.

Named guns are mounted even when they need more power than the starting bars. The player switches one off, or moves reactor bars, and `powerMask` powers the next gun in the list. Engi A starts with Engi Med-bot Dispersal. Slug A/B/C start with Slug Repair Gel. Mantis A/B/C start with Mantis Pheromones. Shield Overcharger + and Anti-Drone are still names only. Crystal Vengeance is not sold and no cruiser starts with it. When the player hull drops, a fitted copy has a 10 percent chance to throw a 1-damage shard that ignores regular shields, can miss to evasion, can be shot down by an enemy Defense Drone I or II, and is absorbed by a Zoltan Shield. The shard names no room, so breach and stun are not applied. Drone Reactor Booster is not sold and no cruiser starts with it. When it is fitted, the System Repair drone moves at 62.5 percent of the 0.6 second crew walk instead of 50 percent, and it still applies no repair rate. Zoltan Shield is `ship.zoltan` on the Zoltan hulls, not an augment id. The Flagship's third stage sets that bubble to 12.

`dart` is still an invented missile. Id `shear` is invented; its display name is Pike Beam. Boss Ion power is 3. Boss Missile power is 4. Boss Laser and Boss Beam have no printed power, so they are BLOCKED.

Enemies:

- One shared room grid and invented tier names
- Rebel, auto, and faction rows are catalogued in `src/game/wiki/` and are not what `makeEnemy` spawns
- A new boss fight applies Rebel Flagship stage 1 on that grid: hull 20, reactor 42, shields 8, engines 2, oxygen 2, piloting 3, weapons bar 3, 11 humans, Boss Ion on, Boss Missile mounted and unpowered. Destroying that hull applies stage 2 (hull 22, reactor 44, engines 3, Boss Missile only), then stage 3 (hull 20, reactor 32, engines 6, weapons level 4, Zoltan Shield 12). The ion-room crew stay. The cutaway is traced (stage 1 is 52 squares, stage 2 is 42, stage 3 is 32, Hard links are 4) and the fight still uses the two-row grid. Boss Laser and Boss Beam stay blocked. Destroying stage 1 or 2 pays sector-1 high scrap (Easy 27–32, Normal and Hard 19–23) without pausing the fight. Stage 3 pays none

`SECTOR_NAMES` are still invented. Entering The Last Stand still grants 10 hull and 10 fuel, then three Federation Repair Stations pay 15 hull, scrap 22–44, 5 fuel, 4 missiles, and 5 drone parts once. A nebula beacon advances the fleet 0.5 outside a nebula sector and 0.8 inside one. The anti-ship battery shot is 3 hull and a breach. A defense drone does not shoot it down, and a Zoltan Shield does not take it. It stays off on a nebula beacon and on an Easy exit. The shot timer is still 14 seconds. Jumping into an overtaken beacon before sector 8 fights a Rebel Elite and pays 1 fuel, with no scrap. Waiting there with no fuel pays 4 fuel. Sector 8 does not use that column. The Elite's hull and guns stay the shared grid, because the page prints ranges. A fueled wait still scrapes 2 hull, which the page does not state. Rebel-held beacons still count toward score. Distraction Buoys skip the next advance when the map starts the fleet at 0. Healing Burst adds 150 HP. Repair Burst removes 8 system damage and does not clear fire or a breach. Heavy Pierce and the four crystal guns ignore one shield layer. The store lists missing systems at the printed prices except Drone Control, plus catalog augments and the front of the crew price list. Weapons and augments sell for half the purchase price, or for a printed sell line. Item slots beyond the weapon slot are 1, 2, or 3. Buying Medbay or Clone Bay replaces the other and keeps its level. Drone schematics are not stocked. Achievements and missing drones stay catalogs. Crystal lockdown coats a room for 12 seconds and recharges in 50. The Zoltan death burst is 15 HP. A living Zoltan in shields, engines, oxygen, medbay, or weapons adds one power bar, and ion does not remove that bar. A full system does not free a reactor bar. Piloting, sensors, and doors stay unaffected. Adv. FTL Navigation costs 50 and a jump can target any beacon already visited, including one the Rebel Fleet overtook. That jump still spends one fuel. A Rock's share of the inferred 0.45 extinguish is multiplied by 1.67, and a Crystal's by 0.83. Other crew stay at 0.45. Fire Suppression stays 2 per second and is not scaled. Defense Scrambler costs 80. It stops an enemy Defense Drone I or II that is actually deployed from shooting down a shot at your ship, and that drone does not spend its cooldown. Your own defense drones still fire. Generated enemies still leave the schematic undeployed, and Anti-Combat still has no enemy-drone list. Drone Reactor Booster is not sold. When fitted, the System Repair drone moves at 0.625 of the 0.6 second crew walk instead of 0.5, and it still applies no repair rate. It is not fitted on the Engi cruiser. Zoltan Shield Bypass is sold for 55. With it fitted, crew teleport, bomb teleport, and mind control pass a Zoltan Shield without spending it, and a damage bomb strikes the room. Hacking still cannot launch: the drone part is kept when the augment is fitted, and spent when it is not. A boarding drone is destroyed on contact either way and does not spend the bubble. An enemy teleporter party does not cross a player bubble. The event exception for an initial boarding party has no separate path. Crystal Vengeance is not sold. A fitted copy sells for 40. Combat Drone Mark II deploys at 4 power and emits no shot, because the page prints no cooldown. The Ion Intruder pulses on a wait drawn from 8.2 to 10 seconds, applies 3 ion to a live system, stuns enemy crew in that room for 6 seconds, and then changes room. The timer freezes while unpowered. Friendly boarders and leashed crew are not stunned. Health 125, speed 18, and the door-break rate are not applied. Neither drone is a SwarmKind and neither schematic is stocked. The other racial abilities are not wired. Event slices 0–3 classify 881 pages as mechanic or no-mechanic. 162 of those pages now place one beacon in a sector the page names and run a stated scrap tier, trade, hull change, fleet delay, or fight. Rebel defector, in Rebel Controlled Sector and Rebel Stronghold, fights a Rebel ship when the proposal is accepted. The random crew, 3 hull, engine damage, doubled pursuit, and boarders are not applied, and rejecting him is not a choice. Crystal scrap collector, in Hidden Crystal Worlds, spends 35 scrap. The Crystal crewmember, Crystal Lockdown Bomb, and Crystal Burst Mark II are not granted. Crew, a map reveal, an upgrade, and an unnamed item are not granted. A fight uses the shared enemy grid. A busy sector runs out of beacons before the later pages. Out-of-fuel pages are written and not placed, because they name no sector. Engi cache is still partial: in Engi Controlled Sector and Engi Homeworlds, spending 2 missiles delays the Rebel Fleet for 2 turns, and securing the cache grants medium scrap. The page does not name the drone schematic, so none is granted. A page that states no amount, including Free scrap with resources (Engi), stays unwired. Score D is 1 / 1.25 / 1.5, and the lit hangar button sets scrap to 30 / 10 / 0.

## Next session

1. Read this file, then `src/game/hulls.ts` and `src/game/hulls.test.ts`.
2. Fetch one wiki page. If it 403s, try `?action=edit`. If that fails, stop on that page and record it here.
3. Add the missing thing in the matching file. Comment the wiki paragraph it came from. Mark anything inferred with `INFERRED` or `INVENTED`.
4. Suggested order: event pages that state an amount and are not among the 162 already placed. Out-of-fuel pages are written and still not placed. The template lists which pages match distress on or off, and does not say which one plays. Flagship stages 2 and 3 apply on the shared grid. The cutaway is traced and is not the fight's rooms. Do not restart the 1380-page list. Do not invent Boss Laser or Boss Beam power. Do not pick a Drone Control price. Do not turn Elite hull ranges into one loadout. Do not grant an unnamed weapon, schematic, augment, or crew member.
5. Re-run the game tests above before calling a page done.
6. Update the "Still missing" list in this file when an item is actually in the tree.
