# @stl/pack

This package defines the content model the game plays (`ContentPack`), the readers that build one, and the
registry the game reads it from.

- **`packFromFtl`** (`src/ftl.ts`): reads an unpacked FTL archive (ftl.dat, the stand-in, or either one with
  mods applied) into a pack. This is the path the game loads.
- **`parsePack`** (`src/parse.ts`): reads the project's own single-document pack format, which `emitPack`
  writes.
- **`emitFtlShips`, `emitFtlSectors`, `emitFtlAchievements`** (`src/ftl-emit.ts`) write records the way ftl.dat
  does. **`emitGapDocument`** and the `emit*Append` functions (`src/emit.ts`) write the campaign gap mod (see
  `@stl/campaign`).
- **`loadPack`** and the `all*`/`*Def` lookups (`src/registry.ts`) hold the loaded pack. `src/extras/` adds
  archive pieces outside the core records: name lists, sounds, animations, fonts and images.

When a record has bad data (an unknown name, a missing attribute, an empty list), the reader logs a `warnPack`
warning and falls back to what the game would do. A file that is not well-formed XML fails the load, naming the
file.

## Does the game use everything in ftl.dat?

`apps/game/src/game/archive-cover.ts` checks this. It loads an archive the way the setup screen does, then
looks at every piece of the archive:

- every record (ships, weapons, drones, augments, crew, systems, sectors, events, lists, stores, achievements,
  empty beacons), and whether a game rule reads it;
- every file, and whether it has a reader;
- every image and ship drawing, and whether it is drawn;
- every font, and whether it is installed and parses;
- every sound and music track, and whether it is played;
- every English text string of six or more characters, and whether the game ever shows it. The known unused
  UI strings (`apps/game/src/game/unused-ui-strings.ts`) are skipped: the 930 tooltips and menu keys `ftl.dat`
  never shows. Any other unshown string still fails.

Run it against the real archive with:

```sh
FTL_DAT=/path/to/ftl.dat pnpm --filter @stl/game test:src
```

CI has no `ftl.dat`, so it checks only the stand-in. The ignored-string count is checked when `FTL_DAT` is set
(`archive-cover-strings.test.ts`) and skipped otherwise. That file also runs a fake string table with no archive:
a known tooltip key is ignored, an unknown key is reported, and a shown string is not.

As of November 2026 (FTL 1.6.13):

| Archive             | Coverage                                                                                                                                                                                                                                                                                                                                                                  | Play-through (`archive-play.test.ts`)                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `totallynotftl.dat` | Everything is used                                                                                                                                                                                                                                                                                                                                                        | Reaches sector 2 and saves                                                |
| `ftl.dat`           | All of it is used except **930** known UI strings (of 5,176 English keys). Most are tooltips and menu text from `text_misc.xml` and `text_tooltips.xml` (`tooltip_oxygen`, `tooltip_doors`, `tooltip_shields`). The coverage check ignores that set and still fails if any other long string is not shown. With `FTL_DAT` set, the ignored count is asserted to stay 930. | **Fails**: "Engines are unpowered" at the first combat beacon of sector 1 |

English record text comes from the `text_*.xml` tables. Each translation (`text-de.xml` and the rest) is read
into `pack.locales`, and the title screen offers it as a language. The coverage check skips those files, so it
does not require their strings to be shown.

## Known warnings

Some warnings come from `ftl.dat` itself. The reader still logs them (the game's play log and Sentry both see
them), but they are known and intentionally ignored:

| Warning                                                                | Cause                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `A <status> system "engine" is not one this ship uses; it is skipped.` | A typo in `ftl.dat` 1.6.13's `TEST_EVENT2` (`data/events.xml`): `system="engine"` instead of `"engines"`. No sector or list loads that test event, so skipping the row changes nothing. It is reported on every load of `ftl.dat`. |
