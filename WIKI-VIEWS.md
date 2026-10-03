# Wiki views

Latest-only dump at `ftl.fandom.com-dump`: 1161 `images.jsonl` rows, 1159 image files on disk. File pages are namespace 6. Quotes below are a label or one sentence from the image or the named wiki page. Screenshots of the same screen are one view.

Advanced Edition stays on. Hangar difficulty labels do not change the run, so the Score multiplier stays 1.

## Views

### Title

- **When:** The game opens on this screen.
- **Images:** `FTL_Title.png` (logo splash; embedded on User:Sulfuricwolf). `FTL-Advanced-Edition-title-screen.jpg` (page "FTL: Advanced Edition": "FTL: Advanced Edition is a major update").
- **Implemented:** Yes. `PixelMenu` in `src/components/game/PixelArt.tsx`, hit targets in `TitleScreen` (`src/components/game/GameApp.tsx`). The button row is the custom pixel menu: CONTINUE, NEW GAME, TUTORIAL, STATS, OPTIONS, CREDITS, QUIT, plus "© 2012 SUBSET GAMES" and "v. 1.01". The dump bitmaps are not used.

### Hangar

- **When:** NEW GAME. File:KestralASystems.png: "The Kestrel in the hangar showing the locations of installed systems and future upgrades."
- **Images:** Full frames of the same bay: `KestralASystems.png`, `KestralCSystems.png`, `Systems.png`, `EngiASystems.png`, `EngiBSystems.png`, `EngiCSystems.png`, `FedASystems.png`, `FederationBSystems.png`, `FederationCSystems.png`, `ZoltanASystems.png`, `ZoltanASystems2.png`, `ZoltanCSystems.png`, `SlugASystems.png`, `SlugBSystems.png`, `SlugCSystems.png`, `RockASystems.png`, `RockBSystems.png`, `RockCSystems.png`, `RockCSystems2.png`, `StealthASystems.png`, `StealthBSystems.png`, `StealthCSystems.png`, `MantisASystems.png`, `MantisBSystems.png`, `MantisCSystems.png`, `LaniusASystems.png`, `LaniusBSystems.png`, `CrystalASystems.png`, `CrystalBSystems.png`. Cruiser pages embed them ("The Kestrel Cruiser", "The Engi Cruiser", "The Federation Cruiser", "The Zoltan Cruiser", "The Slug Cruiser", "The Rock Cruiser", "The Stealth Cruiser", "The Mantis Cruiser", "The Lanius Cruiser", "The Crystal Cruiser").
- **Strip crops, same bay:** `ShipsAchievementsEmpty.png`, `ShipsAchievementsPartial.png`. Page "Ship Achievements": "The secondary Type B layout of a cruiser is unlocked when two of a ship's achievements are earned."
- **Implemented:** Yes, already. `src/components/game/Hangar.tsx`. Reach it with NEW GAME. EASY / NORMAL / HARD, START, ship list, TYPE A/B/C, HIDE ROOMS, CREW, WEAPONS, DRONES, AUGMENTATIONS. No Advanced Edition off switch.

### Sector map

- **When:** Between sectors, after leaving the exit beacon. Page "Sectors": "On the sector map, there are three groups of sectors: Civilian, Hostile, Nebula."
- **Images:** `Sector_Map.png` (page "Sectors"; the shot is headed SECTOR MAP, with "1." / "2." on the next nodes and the Civilian / Hostile / Nebula key). `Map.jpg` is the same chart cropped, headed SECTORS. `Sector_map_after_exiting_the_Hidden_Crystal_Worlds.png` (pages "Ancestry" and "Ancient device") is the same chart after that sector.
- **Implemented:** Yes. `SectorChart` in `src/components/game/GameApp.tsx`. Jump to the beacon tagged EXIT, then take the exit choice. Next nodes use sector names from `src/game/wiki/sectors.ts`. On a narrow screen the "1." / "2." names sit under the key so they stay readable. Hidden Crystal Worlds is not a normal map node. Sector 8 is The Last Stand.

### Beacon map

- **When:** Choosing the next jump inside a sector. The shot is headed BEACON MAP, with STORE, EXIT, SECTOR, a sector name, and CANCEL.
- **Images:** `3_store.jpg` (File:3 store.jpg, category Screenshots). This is the jump chart, not the store.
- **Implemented:** Yes. `MapScreen` in `src/components/game/GameApp.tsx`. It is the chart between beacons. CANCEL shows when the chart was opened from the ship. STORE and EXIT are the only beacon words. The footer is "SECTOR" plus the number, and the wiki sector name when the run has one.

### Combat

- **When:** A hostile beacon, or the flagship. The HUD is the ship, the target, hull, weapons, and drones.
- **Images:** `IPadWeapons.PNG` (page "FTL iPad Edition") is this HUD on a taller frame. `FTLiPad.png` on that page is the app icon, not a screen. Shots named victory or win-moment (`Zoltanvictory1.PNG`, `Shrikevictory1.PNG`, `FTL_HardVictory9.jpg`, `Flawless_Victory.png`, `Xenophobic_Kestrel_Win_Moment.png`, and the other `*Win_Moment.png` files) are this HUD, not the victory card. The other large in-game shots are the same HUD.
- **Implemented:** Yes, already. `PlayFrame` in `src/components/game/GameApp.tsx`.

### Event

- **When:** A non-store beacon opens a text box with numbered choices over the ship.
- **Images:** `Friendly_Slaver_intro_screen.png` (page "Slaver (friendly)"). `The_mercenary_intro_screen.png` (page "Mercenary"). Both are the same box.
- **Implemented:** Yes, already. `EventModal` in `src/components/game/GameApp.tsx`.

### Store

- **When:** A store beacon. Page "Stores and resources": "Stores can be found at designated beacons or in events. They offer goods and services in exchange for scrap."
- **Images:** `Crystal_Store.png` (File:Crystal Store.png). Headings ITEMS, HIRE CREW, REPAIR, WEAPONS. Repair buttons FIX 1, MAX, FIX ALL, MAX, and CURRENT HULL. `Store.png` is a 36×14 icon, not this screen.
- **Implemented:** Yes. `StoreBoard` in `src/components/game/WikiViews.tsx`. Jump to a beacon tagged STORE. Fuel and missiles use the stock already rolled (fuel 3 scrap, missiles 6). Hire slots stay empty: the names in the shot are one run's crew. Repair uses the existing 2 scrap per hull point. Click outside the panel to leave. No separate dismiss word is in the crop.

### Pause

- **When:** Space during combat. The help shot's pausing card shows PAUSED and "Press SPACE to resume", and "Press the Space Bar to pause."
- **Images:** No separate file. The stamp is inside `Help_screen_overlay.png` and `Tutorial_death_message.PNG`.
- **Implemented:** Yes. `PauseStamp` in `src/components/game/GameApp.tsx`, only while `phase` is combat. Space toggles it.

### Help

- **When:** Title, TUTORIAL. The overlay is the training card, not a second menu.
- **Images:** `Help_screen_overlay.png` (File:Help screen overlay.png). Sections CREW CONTROL, PAUSING, WEAPONS/DRONES, POWER DISTRIBUTION, with the sentences in that image.
- **Implemented:** Yes. `HelpScreen` in `src/components/game/WikiViews.tsx`. Open it from TUTORIAL. Click the panel to start the Kestrel A run with training set, so a death there uses the tutorial game-over sentence.

### Configure controls

- **When:** Title, OPTIONS. Page "Game patches": "Hotkeys added for many actions in the game, customizable from within the Options menu."
- **Images:** `ConfigureControls1.png`, `ConfigureControls2.png` (those file pages). Headed CONFIGURE CONTROLS, with PAGE 1, PAGE 2, DEFAULTS, CLOSE, and the key rows in the shots. Unbound rows read "....".
- **Implemented:** Yes. `ControlsScreen` in `src/components/game/WikiViews.tsx`. OPTIONS on the title opens it. PAGE 2 switches the list. DEFAULTS returns to page 1. The keys are labels, not a rebinding tool. There is no volume, fullscreen, or language shot, so those controls are not on this screen.

### Achievements and stats

- **When:** Title, STATS. Also STATS on a victory or game-over card. Page "Achievements" captions the file "Achievements screen" and says achievements are organized into General Progression, Going the Distance, and Skill and Equipment Feats.
- **Images:** `FTL_Slightly_Used_Achievement_Screen.jpg` (page "Achievements"). Tabs STATS and ACHIEVEMENTS. Category lines in the shot: "General Progression:", "Going the Distance:", "Skill and Equipment Feats:". `FTL_Achievement_Category.JPG` is a crop of that screen. Achievement names are the general rows in `src/game/wiki/achievements.ts` (the shot shows icons, the page names them).
- **Implemented:** Yes. `AchievementsScreen` in `src/components/game/WikiViews.tsx`. Title STATS, or STATS on the verdict. Locked tiles, no copied icons. CLOSE is the leave control from the configure-controls shot; the achievements crop does not show it.

### Ship best

- **When:** From stats. File:FTL ship unlock progression cropped.png: "Main Menu: Stats -> Ship Best -> List."
- **Images:** `FTL_ship_unlock_progression_cropped.png` (page "Ship"). CHOOSE YOUR SHIP, TYPE A, TYPE B, TYPE C, one open hull, locked hulls, "1 2 3".
- **Implemented:** Yes. `ShipBest` inside `AchievementsScreen`. STATS, then Ship Best. TYPE A/B/C only changes which button is lit. The open hull is the Kestrel silhouette already drawn in the game.

### Score

- **When:** The victory and game-over cards. Page "Score": "Score = (s + 10b + 20k) * D", with s scrap collected, b beacons visited, k ships defeated, and D the difficulty modifier. The same page says flagship phases do not count toward k, and that the player is shown stats and their score after winning or losing.
- **Images:** The SCORE line on `Victory-0.jpg` and the game-over shots. "New High Score!" is on `Gameover_rebelvictory.png`.
- **Implemented:** Yes, as lines on those cards, not a separate screen. `runScore` in `src/game/sim.ts`. D stays 1. Scrap collected, beacons visited, and ships defeated are on the STATS tab of a finished run. "New High Score!" shows when the score beats the previous one stored in the browser.

### Victory

- **When:** The flagship is destroyed. Page "The Rebel Flagship" captions `Victory.jpg` "Victory Screen" and `Victory-0.jpg` "Victory Text".
- **Images:** `Victory.jpg`, then `Victory-0.jpg`. Cinema lines in the shot: "Thanks to the valiant effort of:", the ship name, "And her successful crew:", the living crew, and "The Rebel's flagship was destroyed, throwing their fleet into chaos and ensuring a Federation victory". The card is VICTORY!, the congratulations sentence, SCORE, STATS, RESTART, HANGAR, MAIN MENU, QUIT.
- **Implemented:** Yes. `Verdict` in `src/components/game/WikiViews.tsx`. After the flagship, click the cinema to reach the card. The ship name and living crew are the run's, not the names printed in that one shot. RESTART starts the same hull again. HANGAR returns to the hangar. MAIN MENU and QUIT return to the title.

### Game over

- **When:** The ship is destroyed, or the crew are all dead. Page "Game Over" states those endings and the flagship-at-the-base ending.
- **Images:** `Gameover_explode.png`, `Gameover_crewdeath.png`, `Gameover_rebelvictory.png`, `Death_message.PNG`, `Tutorial_death_message.PNG` (page "Game Over"). Hull: "One last explosion marks your fate as your ship is torn apart." Crew: "All crew members have died. Your ship will continue to drift for eternity, or until looters destroy it." Base: "The Rebel Flagship is within range of the Federation Base. All is lost, they've won." Tutorial, from the death-message shot: "Somehow you've died during the introduction training exercise. Feel free to try again but this doesn't bode well for your mission." Buttons match the victory card. The tutorial shot has no SCORE.
- **Implemented:** Yes for hull, crew, and the tutorial sentence. `Verdict` in `src/components/game/WikiViews.tsx`. Hull or total crew loss opens it. The tutorial sentence is only after TUTORIAL. The base sentence is in the same card, but the run never sets that ending: the flagship does not sit on the base for three turns, so a player cannot reach it.

### Credits

- **When:** Title, CREDITS.
- **Images:** No credits screenshot. The title art already carries "© 2012 Subset Games" and "v. 1.01".
- **Implemented:** Yes, as that panel, not a credits roll. `TitlePanel` in `src/components/game/GameApp.tsx`.

## Not a separate screen

These are named in a shot or a page and have no full-screen layout to build:

- Options body for volume, fullscreen, or language. OPTIONS opens Configure controls, which is the hotkey screen the patches page describes.
- Open Upgrades (U), Open Inventory (I), and Open Crew Manifest ("....") are rows on `ConfigureControls1.png` only.
- Page "Template:In-game tips": "Open the in-game menu by pressing ESCAPE. You can restart or change options from there." No picture of that menu's buttons.
- A credits roll.
- The flagship-at-the-base game over, as above.

`ShipSheet` and `Manual` in `GameApp.tsx` are older panels. They are not these wiki screens.

## Non-view files

1107 files are not their own screen. Counts:

- 626 sprites, room art, and diagrams
- 265 other images at least 900×500 (combat HUD, ship renders, and event shots of that HUD)
- 74 icons and symbols
- 60 achievement icons, including the small ship-achievement strips listed under the hangar
- 47 drone images
- 26 beacon and map markers
- 9 thumbnails

`SystemsIcon.png` and `Store.png` are icons. Beacon files such as `Store_beacon.png` and `Exit_beacon.png` are map markers for the beacon map, not extra screens.
