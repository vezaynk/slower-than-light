/**
 * Lines the screens render from the loaded archive.
 * A sentence that exists in the archive is read from there. The code does not keep a second copy.
 * Per the user: a screen uses an archive phrase in its own place. It does not list a screen's strings.
 */
import {
  allItemBlueprints,
  archivePhrase,
  tutorialScript,
  weaponDef,
  type WeaponKind,
} from "@stl/pack";

/**
 * Hover keys the screens request. The sentences come from the loaded archive, not from the stand-in table.
 * `standin_tooltip_*` has no ftl.dat key. The catalog file says which line that is.
 */
const HUD_TIP_KEYS = [
  "tooltip_jump_noPiloting",
  "tooltip_jump_noCrew",
  "tooltip_jump_noEngines",
  "tooltip_jump_noFuel",
  "tooltip_fuelCount",
  "tooltip_hull",
  "tooltip_missileCount",
  "tooltip_droneCount",
  "tooltip_evadeDisplay",
  "tooltip_oxygenDisplay",
  "mainmenu_options",
  "escape_options",
  "hotkey_savePositions",
  "hotkey_loadPositions",
  "help_power_text_pc_add",
  "help_power_text_pc_remove",
  "tooltip_shields",
  "tooltip_shields_enemy",
  "tooltip_engines",
  "tooltip_engines_enemy",
  "tooltip_oxygen",
  "tooltip_oxygen_enemy",
  "tooltip_weapons",
  "tooltip_weapons_enemy",
  "tooltip_drones",
  "tooltip_drones_enemy",
  "tooltip_medbay",
  "tooltip_medbay_enemy",
  "tooltip_pilot",
  "tooltip_pilot_enemy",
  "tooltip_sensors",
  "tooltip_sensors_enemy",
  "tooltip_doors",
  "tooltip_doors_enemy",
  "tooltip_teleporter",
  "tooltip_teleporter_enemy",
  "tooltip_cloaking",
  "tooltip_cloaking_enemy",
  "tooltip_artillery",
  "tooltip_artillery_enemy",
  "tooltip_battery",
  "tooltip_battery_enemy",
  "tooltip_clonebay",
  "tooltip_clonebay_enemy",
  "tooltip_mind",
  "tooltip_mind_enemy",
  "tooltip_hacking",
  "tooltip_hacking_enemy",
  "standin_tooltip_in_danger",
  "standin_tooltip_clone_queue",
  "standin_tooltip_launch_cost",
  "standin_tooltip_ftl_needs_crew",
] as const;

const SYSTEM_TIP: Record<string, string> = {
  shields: "tooltip_shields",
  engines: "tooltip_engines",
  oxygen: "tooltip_oxygen",
  weapons: "tooltip_weapons",
  drones: "tooltip_drones",
  medbay: "tooltip_medbay",
  pilot: "tooltip_pilot",
  sensors: "tooltip_sensors",
  doors: "tooltip_doors",
  teleporter: "tooltip_teleporter",
  cloaking: "tooltip_cloaking",
  artillery: "tooltip_artillery",
  battery: "tooltip_battery",
  clonebay: "tooltip_clonebay",
  mind: "tooltip_mind",
  hacking: "tooltip_hacking",
};

const JUMP_TIP = {
  piloting: "tooltip_jump_noPiloting",
  crew: "tooltip_jump_noCrew",
  engines: "tooltip_jump_noEngines",
  fuel: "tooltip_jump_noFuel",
} as const;

/** A hover line from the loaded archive. A missing key paints nothing. */
export function hudTip(name: string): string {
  return archivePhrase(name) ?? "";
}

/** Keys the screens hover. Coverage reads each one back from the loaded archive. */
export function hudTipKeys(): readonly string[] {
  return HUD_TIP_KEYS;
}

/** Every hover line the loaded archive supplied for those keys. */
export function tooltipLines(): string[] {
  return HUD_TIP_KEYS.map((key) => hudTip(key)).filter((line) => line.length > 0);
}

/** The system icon's hover. Enemy chips use the `_enemy` key. */
export function systemTip(id: string, enemy = false): string {
  const key = SYSTEM_TIP[id];
  if (!key) return "";
  return hudTip(enemy ? `${key}_enemy` : key);
}

/**
 * The jump-block sentence. A missing archive line stays a real block: empty is not null,
 * and the gates treat empty as allowed.
 */
export function jumpBlockTip(why: keyof typeof JUMP_TIP): string {
  return archivePhrase(JUMP_TIP[why]) ?? why;
}

export function phraseOr(key: string, fallback: string): string {
  return archivePhrase(key) ?? fallback;
}

/** A phrase from the loaded archive. Missing keys paint nothing: the sentence is not stored here. */
function archiveLine(key: string): string {
  return archivePhrase(key) ?? "";
}

/** Game Over and the victory card. */
export function verdictTitle(victory: boolean): string {
  return archiveLine(victory ? "gameover_title_victory" : "gameover_title_gameover");
}

/** Body for a named ending. Undefined for hull loss, which is the blow-up line. */
export function verdictEnding(outcome: string): string | undefined {
  const key =
    outcome === "victory"
      ? "gameover_win"
      : outcome === "tutorial"
        ? "gameover_tutorial"
        : outcome === "crew"
          ? "gameover_crew"
          : outcome === "rebel"
            ? "gameover_fedbase"
            : undefined;
  if (!key) return undefined;
  return archiveLine(key);
}

/** The card body. A named ending uses its phrase. Hull loss uses the blow-up line. */
export function verdictBody(outcome: string | undefined): string {
  return verdictEnding(outcome ?? "") ?? verdictBlowup();
}

export function verdictBlowup(): string {
  return archiveLine("gameover_blowup");
}

export function verdictScoreLabel(): string {
  return archiveLine("gameover_score");
}

/** `gameover_score` is a format. `\1` is the score. */
export function verdictScoreLine(score: number): string {
  return verdictScoreLabel().replaceAll("\\1", String(score));
}

export function verdictHighScore(): string {
  return archiveLine("new_high");
}

export function verdictRestartLabel(): string {
  return archiveLine("gameover_button_restart");
}

export function verdictHangarLabel(): string {
  return archiveLine("gameover_button_hangar");
}

export function verdictMenuLabel(): string {
  return archiveLine("gameover_button_mainmenu");
}

export function verdictStatsLabel(): string {
  return archiveLine("gameover_button_stats");
}

export function verdictQuitLabel(): string {
  return archiveLine("gameover_button_quit");
}

/** The victory cinema. The crew list uses the archive's comma and the word before the last name. */
export function victoryCinema(): {
  ship: string;
  crew: string;
  comma: string;
  join: string;
  ending: string;
} {
  return {
    ship: archiveLine("thank_ship"),
    crew: archiveLine("thank_crew"),
    comma: archiveLine("crewlist_comma"),
    join: archiveLine("crewlist_and"),
    ending: archiveLine("credit_victory"),
  };
}

/** Crew names on the victory cinema, joined with the archive's separators. */
export function victoryCrewLine(names: readonly string[]): string {
  const cinema = victoryCinema();
  if (names.length < 2) return names.join("");
  const last = names[names.length - 1] ?? "";
  return `${names.slice(0, -1).join(cinema.comma)}${cinema.join}${last}`;
}

/** Every verdict sentence the loaded archive can replace. The screen paints these same calls. */
export function verdictArchiveLines(): string[] {
  const cinema = victoryCinema();
  return [
    verdictTitle(true),
    verdictTitle(false),
    verdictEnding("victory") ?? "",
    verdictEnding("tutorial") ?? "",
    verdictEnding("crew") ?? "",
    verdictEnding("rebel") ?? "",
    verdictBlowup(),
    verdictScoreLabel(),
    verdictHighScore(),
    verdictRestartLabel(),
    verdictHangarLabel(),
    verdictMenuLabel(),
    verdictStatsLabel(),
    verdictQuitLabel(),
    cinema.ship,
    cinema.crew,
    cinema.comma,
    cinema.join,
    cinema.ending,
  ];
}

/** The tutorial's continue button. The stand-in keeps the word Continue. */
export function tutorialContinueLabel(): string {
  return phraseOr("event_TUTORIAL_START_c1_c2_choice", "Continue");
}

/** Raw tutorial step text, plus the continue phrase when the archive has one. */
export function tutorialLines(): string[] {
  const lines: string[] = [];
  for (const order of tutorialScript()) {
    for (const step of order.steps) {
      if (step.text.trim()) lines.push(step.text);
    }
  }
  const label = archivePhrase("event_TUTORIAL_START_c1_c2_choice");
  if (label) lines.push(label);
  return lines;
}

/** Fuel, missile, and drone-part titles and descriptions. The store shows these on the supply chips. */
export function itemLines(): string[] {
  const lines: string[] = [];
  for (const row of allItemBlueprints()) {
    if (row.title.trim()) lines.push(row.title);
    if (row.desc?.trim()) lines.push(row.desc);
  }
  return lines;
}

/** Crystal is a missile that spends no ammo. The card prints that as type_crystal. */
export function isCrystalMissile(
  row: { kind?: WeaponKind; ammo?: boolean } | null | undefined,
): boolean {
  return row?.kind === "missile" && !row.ammo;
}

/**
 * Smoke trail, arc, orange blast, and missileHit.
 * An ammo-less missile is a crystal, the same split as weaponTypeKey. A shot with no
 * missile row (the battery, a fake flak pellet) stays a warhead.
 */
export function presentsAsWarhead(shot: { kind: string; defId?: string }): boolean {
  if (shot.kind !== "missile") return false;
  return !isCrystalMissile(shot.defId ? weaponDef(shot.defId) : undefined);
}

/** Archive missileHit file. Null skips the blast. 1 is the large warhead, used when damage is at least 3. */
export function missileHitVariant(shot: {
  kind: string;
  defId?: string;
  damage: number;
}): 0 | 1 | null {
  if (!presentsAsWarhead(shot)) return null;
  return shot.damage >= 3 ? 1 : 0;
}

/** FTL WeaponBlueprint::GetDescription. Ion is a laser with ion damage. Crystal is a missile that spends none. */
function weaponTypeKey(row: {
  kind?: WeaponKind;
  ion?: number;
  ammo?: boolean;
}): string | undefined {
  if (row.kind === "ion" || (row.kind === "laser" && (row.ion ?? 0) > 0)) return "type_ion";
  if (row.kind === "laser") return "type_laser";
  if (row.kind === "beam") return "type_beam";
  if (row.kind === "bomb") return "type_bomb";
  if (row.kind === "flak") return "type_burst";
  if (row.kind === "missile") return isCrystalMissile(row) ? "type_crystal" : "type_missile";
  return undefined;
}

/** Hull damage, or a bomb's system bars when hull damage is 0. */
export function weaponDamageLabel(row: {
  damage?: number;
  sysDamage?: number;
  shots?: number;
}): string | null {
  const hull = row.damage ?? 0;
  const bars = row.sysDamage ?? 0;
  const n = hull > 0 ? hull : bars > 0 ? bars : 0;
  if (n <= 0) return null;
  const shots = row.shots ?? 1;
  return shots > 1 ? `${shots}×${n}` : String(n);
}

export function weaponCopy(row: {
  kind?: WeaponKind;
  ion?: number;
  ammo?: boolean;
  short?: string;
  detail?: string;
  flavor?: string;
}): string[] {
  const type = archivePhrase(weaponTypeKey(row));
  return [type, row.short, row.detail, row.flavor].filter((line): line is string =>
    Boolean(line?.trim()),
  );
}

export function droneCopy(row: { short?: string; detail?: string } | undefined): string[] {
  if (!row) return [];
  return [row.short, row.detail].filter((line): line is string => Boolean(line?.trim()));
}

export function crewCopy(
  row: { short?: string; detail?: string; powers?: string[] } | undefined,
): string[] {
  if (!row) return [];
  return [row.short, row.detail, ...(row.powers ?? [])].filter((line): line is string =>
    Boolean(line?.trim()),
  );
}

/** The archive keeps `\\n` as two characters. Screens turn that into a newline when they paint. */
export function displayPhrase(text: string): string {
  return text.replace(/\\n/g, "\n");
}
