/**
 * Side-by-side checker for moving a code event to the archive (wiki/README.md, "How to migrate an event module").
 *
 * Each side is a beacon flag: the code module's flag (the old version) and the flag the beacon dealer gives the
 * archive page (`filler:<ID>` for a list page, `<ID>` for a sector page). Both sides start from the same seed, land
 * on a beacon carrying that flag, take one opening choice, and click through the result cards. The checker reports
 * every field that differs: the opening card, each choice's lock, and what each choice changed.
 *
 * CLI (stand-in by default; `--dat` loads another archive first):
 *   node --experimental-strip-types src/game/event-diff.ts --sector ENGI_SECTOR \
 *     --old engi-cache --archive filler:ENGI_FLEET_DELAY [--seeds 1-20] [--dat path/to/ftl.dat]
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { eventDef, onPackWarning } from "@stl/pack";
import type { BeaconKind, Game } from "./types.ts";
import { choiceDisabled, choose, commitJump, createGame } from "./sim.ts";
import { placeIn } from "./fixtures.ts";
import { heldSchematics } from "./wiki/make-room.ts";

export type EventSide = {
  /** The beacon flag that makes the sim play this version. */
  flag: string;
  /** Beacon kind the dealer gives this flag. Default "event". */
  kind?: BeaconKind;
  /** Beacon name the dealer gives this flag. Default: the loaded page's title, or the flag. */
  name?: string;
};

export type EventDiffCase = {
  sector: string;
  old: EventSide;
  archive: EventSide;
  seeds: readonly number[];
  /** Run state before the jump. The default is sector 3, 8 fuel, 6 missiles, fleet 4. */
  setup?: (g: Game) => void;
};

/** What one side shows and what one choice did. */
export type EventSnapshot = {
  title: string;
  body: string;
  labels: string[];
  locks: (string | null)[];
  /** Per opening choice: the resource deltas, items gained, and the result cards' text. */
  outcomes: Record<string, string>[];
  warnings: string[];
};

export type EventDifference = { seed: number; field: string; old: string; archive: string };

function defaultSetup(g: Game) {
  g.sector = 3;
  g.fuel = 8;
  g.missiles = 6;
  g.fleet = 4;
}

/** A game on its seed, standing next to a beacon that carries `side.flag`. Nothing is rolled after the setup. */
function stage(c: EventDiffCase, seed: number, side: EventSide): { g: Game; dest: string } {
  const g = createGame(seed, "PLAYER_SHIP_HARD", "normal");
  (c.setup ?? defaultSetup)(g);
  placeIn(g, c.sector);
  for (const b of g.beacons) if (b.flag === side.flag) b.flag = "";
  const here = g.beacons.find((b) => b.id === g.here)!;
  const dest = g.beacons.find(
    (b) => b.id !== here.id && b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss",
  )!;
  if (!here.links.includes(dest.id)) here.links.push(dest.id);
  dest.flag = side.flag;
  dest.kind = side.kind ?? "event";
  dest.name = side.name ?? eventDef(side.flag.replace(/^filler:/, ""))?.dest ?? side.flag;
  dest.asteroid = false;
  dest.resolved = false;
  delete dest.quest;
  // Out of the fleet's reach, so the jump lands on the page and not on a fleet fight.
  dest.col = 6;
  return { g, dest: dest.id };
}

function tally(g: Game) {
  return {
    scrap: g.scrap,
    fuel: g.fuel,
    missiles: g.missiles,
    parts: g.player.parts,
    fleet: g.fleet,
    hull: g.player.hull,
    crew: g.crew.filter((c) => c.side === "player").length,
  };
}

function items(g: Game): string[] {
  return [
    ...g.player.weapons.map((w) => `weapon:${w.defId}`),
    ...heldSchematics(g).map((id) => `drone:${id}`),
    ...(g.augments ?? []).map((id) => `augment:${id}`),
  ].sort();
}

/** Click the first button of each result card until the beacon is left or a fight starts. */
function settle(g: Game): string[] {
  const cards: string[] = [];
  for (let i = 0; i < 6 && g.phase === "event" && g.event; i++) {
    cards.push(g.event.body);
    const next = g.event.choices[0];
    if (!next) break;
    choose(g, next.id);
  }
  if (g.phase === "combat") cards.push(`fight:${g.enemy?.name ?? "?"}`);
  return cards;
}

/** Plays one side on one seed: the opening card, then each choice from a fresh copy of the same state. */
export function playSide(c: EventDiffCase, seed: number, side: EventSide): EventSnapshot {
  const warnings: string[] = [];
  const restore = onPackWarning((message) => warnings.push(message));
  try {
    const open = stage(c, seed, side);
    commitJump(open.g, open.dest);
    const ev = open.g.event;
    const snap: EventSnapshot = {
      title: ev?.title ?? `(phase ${open.g.phase})`,
      body: ev?.body ?? "",
      labels: ev?.choices.map((choice) => choice.label) ?? [],
      locks: ev?.choices.map((choice) => choiceDisabled(open.g, choice.id)) ?? [],
      outcomes: [],
      warnings,
    };
    for (let i = 0; i < snap.labels.length; i++) {
      const run = stage(c, seed, side);
      commitJump(run.g, run.dest);
      const before = tally(run.g);
      const had = items(run.g);
      const choice = run.g.event?.choices[i];
      if (!choice) continue;
      choose(run.g, choice.id);
      const cards = settle(run.g);
      const after = tally(run.g);
      const out: Record<string, string> = {};
      for (const key of Object.keys(before) as (keyof typeof before)[]) {
        const delta = after[key] - before[key];
        if (delta !== 0) out[key] = String(delta);
      }
      const gained = items(run.g).filter((id) => !had.includes(id));
      const lost = had.filter((id) => !items(run.g).includes(id));
      // A random schematic or weapon is a kind, not an id: the two sides roll from different lists.
      if (gained.length) out.gained = gained.map((id) => id.split(":")[0]).join(",");
      if (lost.length) out.lost = lost.join(",");
      out.cards = cards.join(" | ");
      out.end = run.g.phase === "combat" ? `combat:${run.g.enemy?.name ?? "?"}` : run.g.phase;
      snap.outcomes.push(out);
    }
    return snap;
  } finally {
    restore();
  }
}

/** Every field where the archive side differs from the code side, per seed. */
export function diffEvent(c: EventDiffCase): EventDifference[] {
  const out: EventDifference[] = [];
  for (const seed of c.seeds) {
    const a = playSide(c, seed, c.old);
    const b = playSide(c, seed, c.archive);
    const push = (field: string, x: unknown, y: unknown) => {
      const sx = JSON.stringify(x ?? null);
      const sy = JSON.stringify(y ?? null);
      if (sx !== sy) out.push({ seed, field, old: sx, archive: sy });
    };
    push("title", a.title, b.title);
    push("body", a.body, b.body);
    push("choices", a.labels.length, b.labels.length);
    const n = Math.max(a.labels.length, b.labels.length);
    for (let i = 0; i < n; i++) {
      push(`choice ${i} label`, a.labels[i], b.labels[i]);
      push(`choice ${i} lock`, a.locks[i], b.locks[i]);
      const keys = new Set([
        ...Object.keys(a.outcomes[i] ?? {}),
        ...Object.keys(b.outcomes[i] ?? {}),
      ]);
      for (const key of keys)
        push(`choice ${i} ${key}`, a.outcomes[i]?.[key], b.outcomes[i]?.[key]);
    }
    push("pack warnings", a.warnings, b.warnings);
  }
  return out;
}

/** Folds identical differences across seeds: one line per field and value pair, with its seed count. */
export function formatDiffs(diffs: readonly EventDifference[], seeds: number): string {
  if (diffs.length === 0) return `No differences across ${seeds} seeds.`;
  const rows = new Map<string, number[]>();
  for (const d of diffs) {
    const key = `${d.field}\n  old:     ${d.old}\n  archive: ${d.archive}`;
    rows.set(key, [...(rows.get(key) ?? []), d.seed]);
  }
  return [...rows]
    .map(
      ([key, list]) =>
        `${key}\n  seeds:   ${list.length}/${seeds} (${list.slice(0, 8).join(", ")})`,
    )
    .join("\n");
}

function seedRange(text: string): number[] {
  const [lo, hi] = text.split("-").map(Number);
  const out: number[] = [];
  for (let s = lo!; s <= (hi ?? lo!); s++) out.push(s);
  return out;
}

async function main(argv: string[]) {
  const arg = (name: string) => {
    const at = argv.indexOf(`--${name}`);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const sector = arg("sector");
  const old = arg("old");
  const archive = arg("archive");
  if (!sector || !old || !archive) {
    console.error(
      "usage: event-diff.ts --sector ID --old FLAG --archive FLAG [--seeds 1-20] [--dat FILE]",
    );
    process.exit(2);
  }
  const dat = arg("dat");
  if (dat) {
    const { installArchive } = await import("./archive-play.ts");
    await installArchive(new Uint8Array(readFileSync(dat)));
  }
  const seeds = seedRange(arg("seeds") ?? "1-20");
  const diffs = diffEvent({ sector, old: { flag: old }, archive: { flag: archive }, seeds });
  console.log(formatDiffs(diffs, seeds.length));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main(process.argv.slice(2));
}
