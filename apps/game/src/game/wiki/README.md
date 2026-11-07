# `wiki/`: what is left, and where it goes

The game was first built from the FTL wiki dump, before it could read `ftl.dat`. This folder holds what is still
transcribed from the wiki. The goal is no game data in the game code:

- **Content** (ships, events, quests, stores, sectors, layouts, text) comes from the archive: `ftl.dat`, the stand-in
  `totallynotftl.dat`, or a mod.
- **Rules** that FTL keeps in its executable live in the campaign gap mod (`@stl/campaign`), as XML the archive reader
  loads.
- **Code** only interprets them. It cites the wiki where a rule's behaviour comes from there, but carries no tables.

Audit of November 2026: 57 modules, about 30,500 lines. Eleven modules that nothing in the game imported (only their
own tests did) were removed with this README: `events-0`–`events-3`, `enemies-factions`, `enemies-rebel`, `stores`,
`kin-gaps`, `hangar-sheet`, `drones-missing` and `cite`.

## 1. Content that duplicates the archive: replace with archive reads, then delete

| Module                                    | Lines | What it holds                                              | Archive source                                                               |
| ----------------------------------------- | ----: | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `hangar-bay.ts`, `augments-missing.ts`    |   297 | Hangar loadout article; augments the catalog lacked        | The player blueprint's lists and `augBlueprint`s                             |
| `flagship.ts`, `flagship-layout.ts`       |   274 | Flagship stage numbers; traced cutaways                    | `BOSS_*` blueprints and `data/boss_*.txt` (ftl.dat), `flagship-*` (stand-in) |
| `projectile-speed.ts`, `cited-weapons.ts` |   112 | Shot speed; crew damage per weapon                         | `weaponBlueprint` `<speed>` and `<persDamage>`                               |
| `skills.ts`                               |    86 | Skill speed tables; crew races per sector for pirate crews | Skill tables are a rule (section 3). Races: the sector's `<rarityList>`      |

## 2. Events written in code: move to the archive, then delete

These transcribe event pages as TypeScript. They run even with `ftl.dat` loaded, next to its own `events.xml`, so a
beacon can play the wiki's version of an event instead of the archive's. The archive (`ftl.dat`, and the stand-in for
its own campaign) is the source; the code should only interpret event XML.

| Module                                                                                                                          | Lines | What it holds                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------- |
| `quests.ts`, `quests-a.ts`, `quests-b.ts`                                                                                       | 8,514 | Quest openers, markers and chains                                                           |
| `filler-events.ts`                                                                                                              | 4,635 | Plain-beacon events (fallback lists, distress, refugees, traders)                           |
| `cited-events.ts`, `cited-missing.ts`                                                                                           | 3,985 | Event pages with their choices, rows and outcomes                                           |
| `surrender.ts`                                                                                                                  | 1,552 | Surrender offers per event, plus the surrender rule (section 3)                             |
| `cited-stores.ts`                                                                                                               |   692 | Store rows and prices                                                                       |
| `beacon-mix.ts`, `cited-sectors.ts`, `engi-cache.ts`, `ruwen-entry.ts`, `cited-fuel.ts`, `cited-flare.ts`                       |   690 | Where events are placed in a sector, sector specials, out-of-fuel waits, sun fights         |
| `choice-locks.ts`, `stock-labels.ts`, `stock-spend.ts`, `event-bands.ts`, `event-prices.ts`, `event-grades.ts`, `fuel-gifts.ts` |   730 | Helpers that read a loaded page. They stay as code once the pages above are archive events. |

Order: per event, check that the archive's version plays correctly (as `TRADER_CIV` was checked), then delete the
code page and its tests. The stand-in's catalog then has to carry its own version of any event that only exists here.

## 3. Rules FTL keeps in its executable: keep as code, move the numbers to the gap mod

These are behaviour, not content. Their logic stays; any table or constant becomes gap XML (the dialect in
`packages/campaign/README.md`), and the modules move out of `wiki/` once they cite rather than carry the wiki.

| Module                                                                                                                                                                                                                                                                                              | Rule                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `escape.ts`, `surrender.ts` (rule part)                                                                                                                                                                                                                                                             | When an enemy runs or surrenders. Odds are already gap data. |
| `targeting.ts`, `swarm-aim.ts`                                                                                                                                                                                                                                                                      | Enemy weapon targeting; swarm missile spread                 |
| `sector-map.ts`                                                                                                                                                                                                                                                                                     | Map generation and the fleet's advance (xftl notes)          |
| `flagship-systems.ts`, `flagship-weapons.ts`, `cited-enemies.ts`                                                                                                                                                                                                                                    | Flagship stages, surge, artillery charge table               |
| `cited-combat2.ts`, `cited-overcharger.ts`, `cited-intruder.ts`, `cited-booster.ts`, `cited-scrambler.ts`, `cited-bypass.ts`, `cited-zoltan-power.ts`, `cited-nav.ts`, `cited-vengeance.ts`, `cited-chain.ts`, `cited-asteroid.ts`, `cited-pulsar.ts`, `weapons-beam.ts`, `weapons-flak-crystal.ts` | Drone, augment, weapon and hazard behaviour                  |
| `make-room.ts`, `bonus-item.ts`                                                                                                                                                                                                                                                                     | Full racks; bonus reward odds                                |
| `achievement-track.ts`, `achieve-notes.ts`                                                                                                                                                                                                                                                          | Achievement counters. Conditions are already gap data.       |
| `kin`-related lines in `skills.ts`                                                                                                                                                                                                                                                                  | Skill speed tables                                           |

## Steps

1. **Done (#173):** a blueprint-list fight draws from the ships its sector allows, instead of falling back to a wiki class.
   With `ftl.dat`, every ship event now meets an `ftl.dat` ship.
2. **Done (#175, #176, and the class-picker removal):** the stand-in carries `ftl.dat`'s `SHIPS_*` lists and full
   enemy blueprints (written by `@stl/catalog` from the faction pages), every fight resolves to an archive ship
   (`enemy-gen.ts` `archiveFight`), and `enemy-ships.ts`, `enemy-layouts.ts` and `sector-hostiles.ts` are gone.
3. **Content modules** in section 1, one at a time. Done: `layout-pages.ts` (the hangar reads its cruisers from the
   archive, `game/hangar-roster.ts`; the unreachable "Playable ships" article went with it).
4. **Events** in section 2, one page at a time.
5. **Rules** in section 3: move constants to the gap mod and the modules out of `wiki/`.
