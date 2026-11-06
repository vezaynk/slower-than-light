# @stl/totallynotftl

`totallynotftl.dat` is the stand-in for FTL's `ftl.dat`. It is a PKG archive laid out like the real one, but
every record, picture, sound and font in it is original. With no `ftl.dat`, it is the base game the setup
screen loads.

The archive is generated:

```sh
pnpm totallynotftl:dat   # writes totallynotftl.dat and archive/
```

`archive/` holds every file of the dat at its path inside the dat, so any change to the stand-in shows up as a
diff. CI's `goldens` job fails if either output is stale.

The records come from `@stl/catalog` through `@stl/campaign`, which writes them as ftl.dat's XML. The pictures
and sounds are drawn in `src/png.ts`, `src/wav.ts` and `src/media.ts`.

The stand-in is always loaded together with the campaign gap mod (`@stl/campaign`, `base.ftl`). That mod holds
the rules the real FTL keeps in its executable rather than in `ftl.dat`.

## Is it equivalent to ftl.dat?

**For this engine, yes.** It is held to that by three tests:

- **`src/parity.test.ts`**: for each record type, every field the local `ftl.dat` fills, the stand-in fills too.
  - The exceptions are listed in `UNPLAYED`. Each one is something the stand-in would have to invent with no effect on play, such as a gun list, a short label, or a palette.
  - It runs when `FTL_DAT` points at a real `ftl.dat`.
- **`apps/game/src/game/archive-cover.test.ts`**: every record, image, sound, font, ship layout and text string in the stand-in is loaded and used by some part of the game. It passes for the stand-in.
- **`apps/game/src/game/archive-play.test.ts`**: plays the stand-in from the start beacon into sector 2, then saves and loads the run. It passes.

**For the real FTL, no.** It cannot yet be dropped into FTL 1.6 in place of `ftl.dat`. This was tried on
FTL 1.6.13 (macOS), by swapping the dat in a copy of the app.

| What             | State                                                                                                                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container        | Fixed in #164. The writer left each index row's path hash at 0, so FTL could not open any file. With the hash written, FTL reads the stand-in's text files.                                                                                                                                                                      |
| UI text          | **Missing.** FTL looks up its interface strings by key in `data/text_*.xml` (5,176 keys in 1.6.13; `window_title` is the first lookup). The stand-in has none of those files, and FTL exits with a bus error right after creating its window.                                                                                    |
| Text file names  | FTL loads every `data/text*.xml` as a language file. It also tries the stand-in's `text_lists.xml` (crew and ship names) and `text-eo.xml` (the sample locale).                                                                                                                                                                  |
| Ship blueprints  | All 90 stand-in ship blueprints use ftl.dat's names. The other 48 are missing, including ones the executable asks for by name: `BOSS_1`–`BOSS_3` with their difficulty variants, `PLAYER_SHIP_EASY`, `PLAYER_SHIP_TUTORIAL` and `PLAYER_SHIP_ANAEROBIC_3`. The stand-in's flagship is its own `flagship-1`–`flagship-3` layouts. |
| Other blueprints | Of ftl.dat's names, the stand-in has: weapons 59 of 68, drones 13 of 21, augments 25 of 43, crew 8 of 10, systems 15 of 16, sectors 19 of 21. It writes 51 achievements; ftl.dat has 52. Two of the stand-in's 61 weapons use their own names.                                                                                   |
| Events           | 277 of ftl.dat's 503 event names are shared, and 3 of its 302 event-list names. The stand-in writes its own pages under its own names.                                                                                                                                                                                           |
| Data files       | Not written: `dlcBlueprints.xml`, `dlcBlueprintsOverwrite.xml`, `dlcPirateBlueprints.xml`, `autoBlueprints.xml`, `bosses.xml`, `dlcEvents.xml`, `dlcEventsOverwrite.xml`, `newEvents.xml`, `nameEvents.xml`, `events_imageList.xml`, `rooms.xml`, `tutorial.xml`, `credits.txt`, and the nine translations.                      |
| Ship layouts     | The stand-in's layout files use their own stems (`rebel-fighter.txt`), not ftl.dat's (`rebel_long.txt`). A blueprint names its layout, so this only matters to code that asks for a file by name. The boss layouts are among those.                                                                                              |
| Media            | 695 images (ftl.dat: 2,837), 126 sounds (174), 10 fonts (18). FTL loads many interface images by a fixed path. Most of those are not drawn yet.                                                                                                                                                                                  |

So reaching FTL's title screen needs, at a minimum:

- an original English dictionary for every key the executable reads,
- the boss and tutorial blueprints by name,
- the interface images at the paths FTL opens.

Running a whole campaign would need the rest of the table as well. None of it changes this engine, which reads
the stand-in today.
