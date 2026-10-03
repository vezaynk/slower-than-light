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
node --experimental-strip-types --test src/game/selftest.ts src/game/hulls.test.ts src/game/extras/*.test.ts
```

`npm run typecheck` is `tsc --noEmit`.

## Where the game lives

| Path | Role |
|---|---|
| `src/game/sim.ts` | Tick, combat, map, events, stores, `createGame`, `applyHull` |
| `src/game/content.ts` | Weapon defs that are actually fitted, evade and scrap tables |
| `src/game/hulls.ts` | Hangar loadouts |
| `src/game/layouts.ts` | Room grids. Square counts are published totals. Positions are not the wiki pictures |
| `src/game/extras/` | Cloaking, hacking, mind control, clone bay, teleporter, drones, battery, artillery, augments, crew |
| `src/components/game/GameApp.tsx` | Title, hangar, map, combat, ship sheet |
| `src/styles.css` | Pixel-tile UI |

Default `createGame()` with no hull id is still the invented Lark (Ada Voss, Ivo Park, Nen Hale). Hangar launches use wiki ship names. Keep the Lark path so existing tests stay green unless you replace it on purpose.

## Do not claim the wiki is done

The checklist was never a full pass of the wiki. Only pages that returned text were used. Fandom often answers 403. If a page is empty, leave the item missing and say so. Do not invent a loadout.

## Still missing

Progress is tracked in `WIKI-CHECKLIST.md`. Do not treat a catalog file as a working system.

Ships now in the hangar: Mantis A/B/C (Gila Monster, Basilisk, Theseus) and Crystal A/B (Bravais, Carnelian), plus the earlier cruisers. Room art is still not traced. Unlocks are still labels. New hulls use the shared player grid.

Named guns are mounted even when they need more power than the starting bars. The player switches one off, or moves reactor bars, and `powerMask` powers the next gun in the list. Zoltan Shield, Slug Repair Gel, Engi Med-bot Dispersal, Drone Reactor Booster, Mantis Pheromones, Crystal Vengeance, Shield Overcharger +, and Anti-Drone are still names only.

`dart` is still an invented missile. Id `shear` is invented; its display name is Pike Beam. Boss Ion power is 3. Boss Missile power is 4. Boss Laser and Boss Beam have no printed power, so they are BLOCKED.

Enemies:

- One shared room grid and invented tier names
- Rebel, auto, and faction rows are catalogued in `src/game/wiki/` and are not what `makeEnemy` spawns
- Flagship phase numbers are catalogued. The boss fight is still invented. No flagship room layout

`SECTOR_NAMES` are still invented. Sector types, achievements, store rules, missing augments, and missing drones are catalogs. Kin gaps are catalogs except the Zoltan death burst (15 HP to enemy crew in the same room). Crystal lockdown, the Zoltan power bar, and the other racial abilities are not wired. Event slices 0–3 classify 881 pages as mechanic or no-mechanic. Those outcomes are not playable events. Score was not fetched.

## Next session

1. Read this file, then `src/game/hulls.ts` and `src/game/hulls.test.ts`.
2. Fetch one wiki page. If it 403s, try `?action=edit`. If that fails, stop on that page and record it here.
3. Add the missing thing in the matching file. Comment the wiki paragraph it came from. Mark anything inferred with `INFERRED` or `INVENTED`.
4. Suggested order: Mantis and Crystal loadouts, then the unfitted weapons those pages name, then enemy hulls, then events.
5. Re-run the game tests above before calling a page done.
6. Update the "Still missing" list in this file when an item is actually in the tree.
