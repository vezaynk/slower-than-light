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

Ships:

- Mantis: The Gila Monster, The Basilisk, The Theseus
- Crystal: Bravais, Carnelian
- Named but not fitted: Halberd Beam, Pike Beam, Ion Charger, Anti-Bio Beam, Breach Bomb, Healing Burst, Chain Burst Laser, Hull Missile, Heavy Pierce Laser, Swarm Missiles, Heavy Crystal, Mini Beam, Glaive Beam, Advanced Flak, Zoltan Shield, Slug Repair Gel, Engi Med-bot Dispersal, Drone Reactor Booster
- Unlocks are labels only
- Room art is not traced from the wiki images

Enemies:

- One shared room grid and a few tiers
- No Rebel, Engi, Zoltan, Mantis, Slug, Rock, Pirate, Auto, or Lanius hulls
- No Flagship room layout

Weapons fitted today: Burst Laser II, Basic Laser, Dual Lasers, Heavy Laser I, Ion Blast, Ion Blast II, Heavy Ion, Ion Stunner, Artemis, Leto, one beam (`shear`), Flak I, Fire Bomb. `dart` is not a wiki weapon.

Also missing as pages: wiki sector types, the random-event and quest catalog, achievements, and store stock for the weapons and augments above. Sector names in `SECTOR_NAMES` are invented.

## Next session

1. Read this file, then `src/game/hulls.ts` and `src/game/hulls.test.ts`.
2. Fetch one wiki page. If it 403s, try `?action=edit`. If that fails, stop on that page and record it here.
3. Add the missing thing in the matching file. Comment the wiki paragraph it came from. Mark anything inferred with `INFERRED` or `INVENTED`.
4. Suggested order: Mantis and Crystal loadouts, then the unfitted weapons those pages name, then enemy hulls, then events.
5. Re-run the game tests above before calling a page done.
6. Update the "Still missing" list in this file when an item is actually in the tree.
