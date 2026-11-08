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

| Module          | Lines | What it holds                                                         | Archive source                                            |
| --------------- | ----: | --------------------------------------------------------------------- | --------------------------------------------------------- |
| `hangar-bay.ts` |   129 | Hangar loadout article; system titles it prefers over the blueprint's | The player blueprint's lists and `systemBlueprint` titles |

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

| Module                                                                                                                                                                                                                                                                                              | Rule                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `escape.ts`, `surrender.ts` (rule part)                                                                                                                                                                                                                                                             | When an enemy runs or surrenders. Odds are already gap data.                                                                          |
| `targeting.ts`, `swarm-aim.ts`                                                                                                                                                                                                                                                                      | Enemy weapon targeting; swarm missile spread                                                                                          |
| `sector-map.ts`                                                                                                                                                                                                                                                                                     | Map generation and the fleet's advance (xftl notes)                                                                                   |
| `flagship-systems.ts`, `cited-enemies.ts`                                                                                                                                                                                                                                                           | Flagship stages, surge, artillery charge rule                                                                                         |
| `cited-combat2.ts`, `cited-overcharger.ts`, `cited-intruder.ts`, `cited-booster.ts`, `cited-scrambler.ts`, `cited-bypass.ts`, `cited-zoltan-power.ts`, `cited-nav.ts`, `cited-vengeance.ts`, `cited-chain.ts`, `cited-asteroid.ts`, `cited-pulsar.ts`, `weapons-beam.ts`, `weapons-flak-crystal.ts` | Drone, augment, weapon and hazard behaviour                                                                                           |
| `make-room.ts`, `bonus-item.ts`                                                                                                                                                                                                                                                                     | Full racks; bonus reward odds                                                                                                         |
| `projectile-speed.ts`, `cited-weapons.ts`                                                                                                                                                                                                                                                           | Shot flight time from `<speed>` (speed 60 flies 0.7 s; bombs 1.35 s); crew damage, systemless hull and pierce read from the blueprint |
| `achievement-track.ts`, `achieve-notes.ts`                                                                                                                                                                                                                                                          | Achievement counters. Conditions are already gap data.                                                                                |
| `skills.ts`                                                                                                                                                                                                                                                                                         | Skill speed tables                                                                                                                    |

## Steps

1. **Done (#173):** a blueprint-list fight draws from the ships its sector allows, instead of falling back to a wiki class.
   With `ftl.dat`, every ship event now meets an `ftl.dat` ship.
2. **Done (#175, #176, and the class-picker removal):** the stand-in carries `ftl.dat`'s `SHIPS_*` lists and full
   enemy blueprints (written by `@stl/catalog` from the faction pages), every fight resolves to an archive ship
   (`enemy-gen.ts` `archiveFight`), and `enemy-ships.ts`, `enemy-layouts.ts` and `sector-hostiles.ts` are gone.
3. **Content modules** in section 1, one at a time. Done: `layout-pages.ts` (the hangar reads its cruisers from the
   archive, `game/hangar-roster.ts`; the unreachable "Playable ships" article went with it), `flagship.ts` (each
   stage's hull, reactor, system and subsystem levels and artillery come from its `BOSS_*` blueprint; the stand-in
   catalog writes them from `catalog/src/wiki/flagship-stages.ts`). `flagship-layout.ts` already reads the blueprint's
   grid and stays as code. Each artillery pod charges at its own blueprint power from its weapon's `<cooldown>` (FTL's
   artillery rule: the cooldown is the level-2 charge, a quarter more or less per level); `wiki/flagship-weapons.ts`
   is gone. Drone Control flies the stage blueprint's `droneList` in its order (ftl.dat's `BOARDER_BOSS` flies by its
   droneBlueprint type, at its own power: `extras/flown.ts` `flownAs`). Left as rules for step 5: the stage-3 Zoltan
   Shield and the crew seats.
   Also done: `augments-missing.ts` (the stand-in catalog writes the seven ship and event augments it lacked, Zoltan
   Shield to Damaged Stasis Pod, as `augBlueprint`s with store rarity 0; the hangar reads `augmentDef` and shows an
   unknown id raw, with a warning; stores and random rewards skip rarity 0, as FTL does), Flak Artillery's speed 26
   (both archives write `<speed>` on it; `projectile-speed.ts` only maps the stand-in's `flak-artillery` id to
   ftl.dat's `ARTILLERY_FED_C`) and the one-layer pierce set (both archives write `<sp>`). `projectile-speed.ts` and
   `cited-weapons.ts` now hold only rules (section 3). `skills.ts`: races done. Pirate and other `random` crews, and crew rewards that name no race, draw from
   the current sector's `<rarityList>` over each `crewBlueprint`'s `<rarity>`, weighted `6 - rarity` (FTL's
   GetRandomCrew; the rule is `game/rarity.ts`). The stand-in writes Hidden Crystal Worlds' list too. The skill speed
   tables stay in `skills.ts` as rules for step 5.
4. **Events** in section 2, one page at a time.
5. **Rules** in section 3: move constants to the gap mod and the modules out of `wiki/`.
