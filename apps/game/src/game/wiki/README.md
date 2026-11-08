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

| Module                                    | Lines | What it holds                                              | Archive source                                                          |
| ----------------------------------------- | ----: | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `hangar-bay.ts`, `augments-missing.ts`    |   297 | Hangar loadout article; augments the catalog lacked        | The player blueprint's lists and `augBlueprint`s                        |
| `projectile-speed.ts`, `cited-weapons.ts` |   112 | Shot speed; crew damage per weapon                         | `weaponBlueprint` `<speed>` and `<persDamage>`                          |
| `skills.ts`                               |    86 | Skill speed tables; crew races per sector for pirate crews | Skill tables are a rule (section 3). Races: the sector's `<rarityList>` |

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

| Module                                                                                                                                                                                                                                                                                              | Rule                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `surrender.ts` (rule part)                                                                                                                                                                                                                                                                          | When an enemy surrenders. Odds are already gap data.   |
| `targeting.ts`, `swarm-aim.ts`                                                                                                                                                                                                                                                                      | Enemy weapon targeting; swarm missile spread           |
| `sector-map.ts`                                                                                                                                                                                                                                                                                     | Map generation and the fleet's advance (xftl notes)    |
| `flagship-systems.ts`, `cited-enemies.ts`                                                                                                                                                                                                                                                           | Flagship stages, surge, artillery charge rule          |
| `cited-combat2.ts`, `cited-overcharger.ts`, `cited-intruder.ts`, `cited-booster.ts`, `cited-scrambler.ts`, `cited-bypass.ts`, `cited-zoltan-power.ts`, `cited-nav.ts`, `cited-vengeance.ts`, `cited-chain.ts`, `cited-asteroid.ts`, `cited-pulsar.ts`, `weapons-beam.ts`, `weapons-flak-crystal.ts` | Drone, augment, weapon and hazard behaviour            |
| `make-room.ts`, `bonus-item.ts`                                                                                                                                                                                                                                                                     | Full racks; bonus reward odds                          |
| `achievement-track.ts`, `achieve-notes.ts`                                                                                                                                                                                                                                                          | Achievement counters. Conditions are already gap data. |
| `kin`-related lines in `skills.ts`                                                                                                                                                                                                                                                                  | Skill speed tables                                     |

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
   is gone. Left as rules for step 5: the stage-3 Zoltan Shield and the crew seats. Still to read from the archive:
   the stage-2 drone loadout (`droneList`).
4. **Events** in section 2, one page at a time.
5. **Rules** in section 3: move constants to the gap mod and the modules out of `wiki/`. Done: `escape.ts`, now
   `game/rules/escape.ts`. Faction odds are gap `<shipBlueprint name>` › `<escape chance min max>` beside the
   surrender row, the 15 s and 90 s timers are gap `<escapeTimers hull lastFuel>`, and a ship event's own `<escape>`
   already came from the archive. The per-page lines (run from the start, page hull rows, never-run pages, the 80 s
   out-of-fuel wait) are content of the section-2 event pages, so they sit in `wiki/escape-events.ts` and go with
   those pages.

## How to move a rule module

`escape.ts` (step 5) is the worked example; follow its diff.

1. **Inventory** every constant and table. Sort each into: a _rule number_ FTL keeps in its executable (gap XML);
   _content_ that belongs to a ship, event or blueprint (read it from the archive; check `ftl.dat` first, e.g.
   `events_ships.xml` `<escape>`); or a _pure mechanic_ with no tunable number (stays code).
2. **Gap tag.** Prefer an existing element (escape odds went on the faction `<shipBlueprint>` that already holds
   `<surrender>`); otherwise add a root tag FTL ignores (`<escapeTimers>`). In `packages/pack`: a type and a
   `ContentPack` field (`types.ts`), a reader in `parse.ts` used by `ftl.ts` `packFromFtl` (and `parsePack`), state with
   base/append/reset handling and a getter in `registry.ts`, export from `index.ts`, and an emitter in `emit.ts`
   `emitGapDocument`. A malformed row calls `warnPack` and is skipped; a getter whose value no pack set calls
   `warnPack` once and returns FTL's number (registry `escapeTimer`).
3. **Data.** The wiki numbers move to `packages/catalog/src/wiki/` (with their citations), are loaded in
   `catalog/src/pack/base.ts` `loadCatalog`, and reach the gap through `campaign/src/xml.ts` (`campaignPack` and the
   `gap` half of `splitCampaign`). Run `pnpm campaign:xml && pnpm totallynotftl:dat`, and document the tag in
   `packages/campaign/README.md`.
4. **Code.** The game reads the getter (a function, not an exported constant, so a mod's value is seen). Content
   tables the module still carries go to their own `wiki/` file next to the content they belong to. Move the module
   to `game/rules/`, keep its wiki quotes as comments, and fix every import (`rules/*.test.ts` is in `test:src`).
5. **Prove it.** A probe in the scratchpad over many seeds with the stand-in and `ftl.dat`, run before and after: the
   output must be identical. Add a pack test (parse, emit round trip, override, warning fallback) and a game test that
   a gap file overriding one number changes play.
