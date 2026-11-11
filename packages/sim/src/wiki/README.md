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

| Module          | Lines | What it holds                                                                                                                                             | Archive source                                            |
| --------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `hangar-bay.ts` |  done | Done: `game/hangar-bay.ts`. Titles are `systemBlueprint` titles; an artillery kit uses its weapon blueprint's title. An untitled tune keeps `systemLabel` | The player blueprint's lists and `systemBlueprint` titles |

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
| `beacon-mix.ts`, `cited-sectors.ts`, `ruwen-entry.ts`                                                                           |   468 | Where events are placed in a sector, and sector specials                                    |
| `choice-locks.ts`, `stock-labels.ts`, `stock-spend.ts`, `event-bands.ts`, `event-prices.ts`, `event-grades.ts`, `fuel-gifts.ts` |   730 | Helpers that read a loaded page. They stay as code once the pages above are archive events. |

Order: per event, check that the archive's version plays correctly (as `TRADER_CIV` was checked), then delete the
code page and its tests. The stand-in's catalog then has to carry its own version of any event that only exists here.

Done: `engi-cache.ts` (the pilot, November 2026). Engi cache is `ENGI_FLEET_DELAY` in both archives: ftl.dat deals it
from `ITEMS_ENGI`, the stand-in from its Engi sector lists (`@stl/catalog` `cited-events-engi-next.ts`).

Done: `cited-fuel.ts` and `cited-flare.ts` (November 2026). An out-of-fuel wait loads `NO_FUEL` or `NO_FUEL_DISTRESS`.
Duplicate `<event load>` rows are the weights (nothing is 4/11 with distress off and 2/12 with it on; Rebel fleet delay
is 1/11). The flare clock stays code (`game/rules/flare.ts`). Which fight is a sun is `<environment type="sun">` on
`AUTO_SUN`, `MANTIS_SUN_FIGHT`, `PIRATE_SUN`, `ROCK_PIRATE_SUN`, `BOARDERS_SUN`, `ROCK_BOARDERS_SUN`, and the stand-in's
`arrive-rock-sun` (alias `quest-rock-sun`). `ruwen-entry.ts` stays: Ancient device is `ROCK_CRYSTAL_BEACON`, and painting
the quest marker is an executable rule with no archive id.

Done: Rock arrival fights (November 2026). `ROCK_FIGHT_ASTEROID`, `ROCK_PIRATE`, `ROCK_PIRATE_ASTEROID`, and
`ROCK_PIRATE_SUN` play as the page wrote them. The first text is empty, so the card uses one of the later sentences.
The button and the ship stay on the choice.

### How to migrate an event module

1. **Map it.** List the module's events, its importers (`git grep`), and each event's archive id
   (`packages/catalog/src/wiki/ftl-event-ids.ts` maps a wiki title to it). Find the page in ftl.dat
   (`events*.xml`) and in the stand-in (`packages/totallynotftl/archive/data/`).
2. **Compare before deleting.** `src/game/event-diff.ts` plays both versions of one event from the same seeds and
   prints every field that differs: title, body, buttons, locks, resource deltas, items gained, result text, end
   phase, and pack warnings. Each side is a beacon flag: the code module's flag, and the archive id
   (`filler:<ID>` when only a list deals it).

   ```sh
   cd apps/game
   node --experimental-strip-types src/game/event-diff.ts --sector ENGI_SECTOR \
     --old engi-cache --archive ENGI_FLEET_DELAY --seeds 1-20              # stand-in
   node --experimental-strip-types src/game/event-diff.ts --sector ENGI_SECTOR \
     --old engi-cache --archive filler:ENGI_FLEET_DELAY --dat "$FTL_DAT"   # ftl.dat
   ```

3. **Close every difference.** A missing or different stand-in page goes into the catalog (`packages/catalog`), in
   ftl.dat's own shape where the dialect allows it. If the dialect cannot say it, extend `packages/pack/src/emit.ts`
   and `parse.ts` together and add the line to the `HEADER` in `emit.ts`, which documents the event dialect inside
   the archive. Regenerate with `pnpm campaign:xml && pnpm totallynotftl:dat`. A rule FTL keeps in its executable
   stays code, in the archive interpreter (`archive-pay.ts`, `cited-events.ts`), not per event. What is left is
   intended (ftl.dat wins: its text, its list placement) and goes in the PR.
4. **Delete** the module, its tests, and its wiring in `sim.ts` (stamps, `eventFor`, `choose` cases,
   `choiceDisabled`). Add the event to `src/game/archive-events.test.ts`, which plays it on the stand-in and, with
   `FTL_DAT`, on ftl.dat through the same checker.
5. **Verify** with both archives (that test, and a dealing probe), then mark the module done here.

## 3. Rules FTL keeps in its executable: keep as code, move the numbers to the gap mod

These are behaviour, not content. Their logic stays; any table or constant becomes gap XML (the dialect in
`packages/campaign/README.md`), and the modules move out of `wiki/` once they cite rather than carry the wiki.

| Module                                                                                                                                                                                                                                          | Rule                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `surrender.ts` (rule part)                                                                                                                                                                                                                      | Done: `rules/surrender.ts`. Faction odds stay gap surrender rows. Stalemate 40/60/2 is gap `<stalemate threshold seconds fuel>`. Boss and elite stay code.                                                                                                                                                                                  |
| `targeting.ts`, `swarm-aim.ts`                                                                                                                                                                                                                  | Done: `rules/targeting.ts` and `rules/swarm-aim.ts`. Aim chances and Hard list lines are gap `<aiTarget>`; swarm spread stays the printed odds of the blueprint `<radius>`                                                                                                                                                                  |
| `sector-map.ts`                                                                                                                                                                                                                                 | Done: `rules/sector-map.ts`. Grid, cell, margin, empty chance, y limits, link, danger circle, exit and Federation-base seats, and flagship jumps are one gap `<sectorMap>`. The stand-in ships margin 28 (FTL prints 10) so beacons stay tappable; a missing tag warns and uses 10. Connecting a split map and diagonal adjacency stay code |
| `flagship-systems.ts`, `cited-enemies.ts`                                                                                                                                                                                                       | Flagship stages, surge, artillery charge rule                                                                                                                                                                                                                                                                                               |
| `cited-nav.ts`, `weapons-beam.ts`, `weapons-flak-crystal.ts`. Done: `cited-overcharger.ts`, `cited-intruder.ts`, `cited-booster.ts`, `cited-scrambler.ts`, `cited-bypass.ts`, `cited-zoltan-power.ts`, `cited-vengeance.ts` (now `game/rules/`) | Drone, augment, weapon and hazard behaviour                                                                                                                                                                                                                                                                                                 |
| `projectile-speed.ts`, `cited-weapons.ts`                                                                                                                                                                                                       | Shot flight time from `<speed>` (speed 60 flies 0.7 s; bombs 1.35 s); crew damage, systemless hull and pierce read from the blueprint                                                                                                                                                                                                       |
| `achievement-track.ts`, `achieve-notes.ts`                                                                                                                                                                                                      | Achievement counters. Conditions are already gap data.                                                                                                                                                                                                                                                                                      |
| `skills.ts`                                                                                                                                                                                                                                     | Done: `rules/skills.ts`. Repair and combat rates are gap `<skillSpeed repair0 repair1 repair2 combat0 combat1 combat2>` (1 / 1.1 / 1.2). A missing value warns and uses FTL's.                                                                                                                                                              |

The anti-ship battery shot is `rules/asb.ts`. It reads PDS_SHOT. Selling weapons, drones, augments, and cargo is `rules/sell.ts`. Half the blueprint price, rounded down; a printed sell price replaces that half. Store rows stay in `cited-stores.ts`.

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
   unknown id raw, with a warning; stores and random rewards skip a missing or 0 rarity, as FTL's GetRandomAugment
   does, and a store row naming a rarity-0 grant is refused without spending scrap; a sale pays half the blueprint
   cost), Flak Artillery's speed 26
   (both archives write `<speed>` on `ARTILLERY_FED_C`) and the one-layer pierce set (both archives write `<sp>`). `projectile-speed.ts` and
   `cited-weapons.ts` now hold only rules (section 3). `skills.ts`: races done. Pirate and other `random` crews, and crew rewards that name no race, draw from
   the current sector's `<rarityList>` over each `crewBlueprint`'s `<rarity>`, weighted `6 - rarity` (FTL's
   GetRandomCrew; the rule is `game/rarity.ts`). The stand-in writes Hidden Crystal Worlds' list too. Skill rates
   are gap `<skillSpeed>` (`rules/skills.ts`).
   Done: `hangar-bay.ts` (the hangar reads the player blueprint in `game/hangar-bay.ts`. A system title is the
   `systemBlueprint` title; an artillery kit uses its weapon blueprint's title. A tune the archive leaves untitled
   keeps `systemLabel`, and does not warn).
4. **Events** in section 2, one page at a time.
5. **Rules** in section 3: move constants to the gap mod and the modules out of `wiki/`. Done: `escape.ts`, now
   `game/rules/escape.ts`; `cited-asteroid.ts`, `cited-pulsar.ts`, and `cited-combat2.ts`, now `game/rules/asteroid.ts`,
   `pulsar.ts`, and `combat2.ts` (gap `<asteroidField>`, `<pulsar>`, `<droneOrbit>`); `cited-chain.ts`, now
   `game/rules/chain.ts` (the blueprint's `<boost>`, not a second table). Faction odds are gap `<shipBlueprint name>` › `<escape chance min max>` beside the
   surrender row, the 15 s and 90 s timers are gap `<escapeTimers hull lastFuel>`, and a ship event's own `<escape>`
   is the page's line. A hull already inside that band is running, and `<gotaway>` `<modifyPursuit amount="1">`
   doubles the next fleet advance. The stand-in writes those ships (`REBEL_AUTO_WARNING`, `SQUAT_WARNING`,
   `REBEL_FUEL`, and the rest) and the pages load them. `wiki/escape-events.ts` is gone.
   Done: `targeting.ts` and `swarm-aim.ts`, now `game/rules/`. The aim chances and Hard list lines (easy 0.2, normal
   0.33, hard room 0.5, hard any-system 0.25, evasion 25, oxygen 50, artillery 4 s) are gap `<aiTarget>`. Swarm
   missile `SWARM_CUTS` stay code: they are the printed room percents for `<radius>31` already on the
   `MISSILE_CHARGEGUN` blueprint, not a second number.
   Done: `make-room.ts` and `bonus-item.ts`, now `game/rules/make-room.ts` and `game/rules/bonus-item.ts`. The cargo hold's 4 slots are gap `<cargoSlots slots>`. The bonus item's kind weights are gap `<bonusItem weapon augment drone>` (each 1; the page does not split the three). The 3% and 6% chances already live on the reward table, and the 25 scrap duplicate stays code.
   Done: `sector-map.ts`, now `game/rules/sector-map.ts`. The grid, cell, margin, empty chance, y limits, link distance, danger circle, exit seat, Federation-base seat, and flagship jumps are one gap `<sectorMap>`. Connecting a split map and diagonal adjacency stay code. The stand-in ships margin 28 (FTL prints 10) so beacons stay tappable; a missing tag warns and uses 10.

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
   `gap` half of `splitCampaign`). A `<pack>` mod round-trips through `packages/hyperspace` `emitMod` / `packFromMod`:
   add the field there too (`omitEmpty`, and the `emitGapDocument` call for a root tag) and to its `mod.test.ts`
   fixture. Run `pnpm campaign:xml && pnpm totallynotftl:dat`, and record the tag in
   `packages/campaign/README.md`.
4. **Code.** The game reads the getter (a function, not an exported constant, so a mod's value is seen). Content
   tables the module still carries go to their own `wiki/` file next to the content they belong to. Move the module
   to `game/rules/`, keep its wiki quotes as comments, and fix every import (`rules/*.test.ts` is in `test:src`).
5. **Prove it.** A probe in the scratchpad over many seeds with the stand-in and `ftl.dat`, run before and after: the
   output must be identical. Add a pack test (parse, emit round trip, override, warning fallback) and a game test that
   a gap file overriding one number changes play.
