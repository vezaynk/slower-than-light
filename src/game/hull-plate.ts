/**
 * Pixel hull under the room tiles. Floor cells stay empty so rooms cover them.
 * Skin is the Chebyshev neighbourhood, plus one hash-chosen fin, inside the
 * one-tile margin (x and y run from -1 through cols / rows).
 */

export type HullInk = "skin" | "edge" | "accent" | "glow" | "mark";

export type HullCell = { x: number; y: number; ink: HullInk };

export type HullPaint = { skin: string; edge: string; accent: string; glow: string; mark: string };

type Room = { x: number; y: number; w: number; h: number; omit?: { x: number; y: number }[] };

type PlateArgs = {
  id: string;
  faction: string;
  pirate?: boolean;
  facing: "left" | "right";
  cols: number;
  rows: number;
  rooms: Room[];
};

type Kind =
  | "kestrel"
  | "fed"
  | "rebel"
  | "auto"
  | "engi"
  | "zoltan"
  | "lanius"
  | "stealth"
  | "rock"
  | "slug"
  | "mantis"
  | "crystal"
  | "flagship";

type Cell = { x: number; y: number };

const MARK = "#e6c84a";

/** Family colours from the pixel stamps. Motif changes, not these. */
const PAINT: Record<Exclude<Kind, "flagship">, HullPaint> = {
  kestrel: { skin: "#c8c2b4", edge: "#5c6770", accent: "#e07030", glow: "#f7f4ee", mark: MARK },
  fed: { skin: "#8b93a0", edge: "#4e565e", accent: "#c45a3a", glow: "#f7f4ee", mark: MARK },
  rebel: { skin: "#6a7078", edge: "#4e565e", accent: "#c45a3a", glow: "#f7f4ee", mark: MARK },
  auto: { skin: "#6a7078", edge: "#4e565e", accent: "#c45a3a", glow: "#7ee0d0", mark: MARK },
  engi: { skin: "#7f946c", edge: "#44523c", accent: "#d6e878", glow: "#f4f7c8", mark: MARK },
  zoltan: { skin: "#f3f0e4", edge: "#f0e27a", accent: "#f0e27a", glow: "#f0e27a", mark: MARK },
  lanius: { skin: "#8b98a6", edge: "#3e4852", accent: "#3e4852", glow: "#f7f4ee", mark: MARK },
  stealth: { skin: "#3a414a", edge: "#1a1e24", accent: "#1a1e24", glow: "#1a1e24", mark: MARK },
  rock: { skin: "#b4a48c", edge: "#6b5344", accent: "#6b5344", glow: "#f7f4ee", mark: MARK },
  slug: { skin: "#6a8f62", edge: "#6a8f62", accent: "#d2e68a", glow: "#d2e68a", mark: MARK },
  mantis: { skin: "#d06a3c", edge: "#6e3030", accent: "#6e3030", glow: "#f7f4ee", mark: MARK },
  crystal: { skin: "#f0d4ee", edge: "#a878b8", accent: "#a878b8", glow: "#f7f4ee", mark: MARK },
};

const KINDS = new Set<string>(Object.keys(PAINT));

export function factionPaint(faction: string): HullPaint {
  const kind = kindOf("", faction);
  if (kind === "flagship") return PAINT.rebel;
  return PAINT[kind];
}

export function plateOf(args: PlateArgs): HullCell[] {
  const kind = kindOf(args.id, args.faction);
  const floor = floorOf(args.rooms);
  const ink = new Map<string, HullInk>();
  const { cols, rows, facing } = args;
  const inside = (x: number, y: number) => x >= -1 && x <= cols && y >= -1 && y <= rows;

  for (let y = -1; y <= rows; y++) {
    for (let x = -1; x <= cols; x++) {
      if (floor.has(key(x, y))) continue;
      if (nearFloor(x, y, floor)) ink.set(key(x, y), "skin");
    }
  }

  const nose = (c: Cell) => (facing === "right" ? c.x : -c.x);
  const tail = (c: Cell) => -nose(c);

  if (kind === "mantis" || kind === "lanius") addFlanks(ink, floor, inside, facing, kind === "lanius");
  paintBody(kind, ink, floor, rows, nose, tail);

  const h = fnv(args.id);
  applyFin(ink, floor, inside, facing, h);
  applyBand(kind, ink, h, rows);
  if (kind === "auto") panelBreaks(ink);
  if (kind === "stealth") applySlit(ink, h, nose, rows);
  else applyLights(ink, h);
  if (args.pirate) applyPirate(ink, h);

  for (const id of [...ink.keys()]) {
    if (floor.has(id)) ink.delete(id);
  }

  const out: HullCell[] = [];
  for (const [id, paint] of ink) {
    const [x, y] = id.split(",").map(Number);
    if (!inside(x, y) || floor.has(id)) continue;
    out.push({ x, y, ink: paint });
  }
  out.sort((a, b) => a.y - b.y || a.x - b.x);
  return out;
}

function kindOf(id: string, faction: string): Kind {
  if (id.startsWith("flagship") || faction.toLowerCase() === "flagship") return "flagship";
  const f = faction.toLowerCase();
  if (f === "federation" || f === "fed") return "fed";
  if (KINDS.has(f)) return f as Exclude<Kind, "flagship">;
  return "rebel";
}

function fnv(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mix(h: number, salt: number): number {
  let n = Math.imul(h ^ Math.imul(salt + 1, 0x9e3779b9), 16777619);
  n ^= n >>> 16;
  n = Math.imul(n, 2246822519);
  n ^= n >>> 13;
  return n >>> 0;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function floorOf(rooms: Room[]): Set<string> {
  const floor = new Set<string>();
  for (const room of rooms) {
    const skip = new Set((room.omit ?? []).map((c) => key(c.x, c.y)));
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (!skip.has(key(x, y))) floor.add(key(x, y));
      }
    }
  }
  return floor;
}

function nearFloor(x: number, y: number, floor: Set<string>): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (floor.has(key(x + dx, y + dy))) return true;
    }
  }
  return false;
}

function cellsOf(ink: Map<string, HullInk>): Cell[] {
  return [...ink.keys()].map((id) => {
    const [x, y] = id.split(",").map(Number);
    return { x, y };
  });
}

function orthoFloor(x: number, y: number, floor: Set<string>): boolean {
  return floor.has(key(x + 1, y)) || floor.has(key(x - 1, y)) || floor.has(key(x, y + 1)) || floor.has(key(x, y - 1));
}

function diagFloor(x: number, y: number, floor: Set<string>): boolean {
  return (
    floor.has(key(x + 1, y + 1)) ||
    floor.has(key(x - 1, y + 1)) ||
    floor.has(key(x + 1, y - 1)) ||
    floor.has(key(x - 1, y - 1))
  );
}

/** A plate cell with an empty orthogonal neighbour. The outer ring, not a bay. */
function rim(c: Cell, ink: Map<string, HullInk>, floor: Set<string>): boolean {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const id = key(c.x + dx, c.y + dy);
    if (!ink.has(id) && !floor.has(id)) return true;
  }
  return false;
}

function paintBody(
  kind: Kind,
  ink: Map<string, HullInk>,
  floor: Set<string>,
  rows: number,
  nose: (c: Cell) => number,
  tail: (c: Cell) => number,
) {
  const cells = cellsOf(ink);
  if (!cells.length) return;
  const mid = (rows - 1) / 2;

  if (kind === "kestrel") {
    for (const side of ["top", "bottom"] as const) {
      const pool = cells.filter((c) => (side === "top" ? c.y <= mid : c.y >= mid));
      const block = [...pool].sort((a, b) => tail(b) - tail(a) || (side === "top" ? a.y - b.y : b.y - a.y));
      const first = block[0];
      if (!first) continue;
      ink.set(key(first.x, first.y), "accent");
      const second = block.find((c) => Math.abs(c.x - first.x) + Math.abs(c.y - first.y) === 1) ?? block[1];
      if (second) ink.set(key(second.x, second.y), "accent");
    }
  }

  if (kind === "fed") {
    for (const c of cells) {
      if (!orthoFloor(c.x, c.y, floor) && diagFloor(c.x, c.y, floor)) ink.set(key(c.x, c.y), "edge");
    }
    chevron(ink, cells, nose, mid);
  }

  if (kind === "engi") {
    for (const c of cells) {
      if (!rim(c, ink, floor)) continue;
      let empty = 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const id = key(c.x + dx, c.y + dy);
        if (!ink.has(id) && !floor.has(id)) empty++;
      }
      // Corners and every third rim cell: a dark ring, olive skin still shows.
      if (empty >= 2 || (c.x + c.y) % 3 === 0) ink.set(key(c.x, c.y), "edge");
    }
    const bays = cells.filter((c) => ink.get(key(c.x, c.y)) === "skin");
    const cores = [...bays].sort((a, b) => Math.abs(a.y - mid) + Math.abs(a.x) - (Math.abs(b.y - mid) + Math.abs(b.x)));
    for (const c of cores.slice(0, 3)) ink.set(key(c.x, c.y), "accent");
  }

  if (kind === "lanius") {
    const max = Math.max(...cells.map(nose));
    for (const c of cells) {
      if (nose(c) === max) ink.set(key(c.x, c.y), "edge");
      else if (!orthoFloor(c.x, c.y, floor) && diagFloor(c.x, c.y, floor)) ink.set(key(c.x, c.y), "edge");
    }
  }

  if (kind === "rock") {
    const max = Math.max(...cells.map(nose));
    for (const c of cells) {
      if (nose(c) >= max - 1) ink.set(key(c.x, c.y), "edge");
      else if (rim(c, ink, floor) && (c.x + c.y) % 4 === 0) ink.set(key(c.x, c.y), "edge");
    }
  }

  if (kind === "slug") {
    const band = Math.max(1, rows / 5);
    for (const c of cells) {
      if (Math.abs(c.y - mid) <= band) ink.set(key(c.x, c.y), "accent");
    }
  }

  if (kind === "crystal") {
    for (const c of cells) {
      if (rim(c, ink, floor) && (c.x + c.y) % 2 === 0) ink.set(key(c.x, c.y), "accent");
    }
    shard(ink, cells, nose, mid);
  }

  if (kind === "flagship") {
    spine(ink, cells, mid);
    const engines = [...cells].sort((a, b) => tail(b) - tail(a) || a.y - b.y).slice(0, 8);
    for (const c of engines) ink.set(key(c.x, c.y), "edge");
    for (const c of engines.slice(0, 4)) ink.set(key(c.x, c.y), "accent");
  }
}

function chevron(ink: Map<string, HullInk>, cells: Cell[], nose: (c: Cell) => number, mid: number) {
  const max = Math.max(...cells.map(nose));
  const tip = cells
    .filter((c) => nose(c) === max)
    .sort((a, b) => Math.abs(a.y - mid) - Math.abs(b.y - mid))[0];
  if (!tip) return;
  ink.set(key(tip.x, tip.y), "accent");
  const back = nose({ x: 1, y: 0 }) > 0 ? -1 : 1;
  for (const dy of [-1, 1]) {
    const id = key(tip.x + back, tip.y + dy);
    if (ink.has(id)) ink.set(id, "accent");
  }
}

function shard(ink: Map<string, HullInk>, cells: Cell[], nose: (c: Cell) => number, mid: number) {
  const max = Math.max(...cells.map(nose));
  const tip = cells
    .filter((c) => nose(c) === max)
    .sort((a, b) => Math.abs(a.y - mid) - Math.abs(b.y - mid))[0];
  if (!tip) return;
  const back = nose({ x: 1, y: 0 }) > 0 ? -1 : 1;
  for (const c of [
    tip,
    { x: tip.x + back, y: tip.y - 1 },
    { x: tip.x + back, y: tip.y + 1 },
    { x: tip.x + back * 2, y: tip.y },
  ]) {
    const id = key(c.x, c.y);
    if (ink.has(id)) ink.set(id, "accent");
  }
}

function spine(ink: Map<string, HullInk>, cells: Cell[], mid: number) {
  const byX = new Map<number, Cell[]>();
  for (const c of cells) {
    const list = byX.get(c.x);
    if (list) list.push(c);
    else byX.set(c.x, [c]);
  }
  for (const list of byX.values()) {
    list.sort((a, b) => Math.abs(a.y - mid) - Math.abs(b.y - mid));
    const c = list[0];
    if (c && ink.get(key(c.x, c.y)) === "skin") ink.set(key(c.x, c.y), "edge");
  }
}

/** Mantis prongs and lanius blades: two cells off each flank, still outside the floor. */
function addFlanks(
  ink: Map<string, HullInk>,
  floor: Set<string>,
  inside: (x: number, y: number) => boolean,
  facing: "left" | "right",
  blades: boolean,
) {
  const cells = cellsOf(ink);
  const xs = [...new Set(cells.map((c) => c.x))].sort((a, b) => a - b);
  if (!xs.length) return;
  const dx = facing === "right" ? 1 : -1;
  const stations = [xs[Math.floor(xs.length * 0.28)], xs[Math.floor(xs.length * 0.72)]];
  for (const x of stations) {
    for (const dy of [-1, 1]) {
      const col = cells.filter((c) => c.x === x);
      if (!col.length) continue;
      const yEdge = dy < 0 ? Math.min(...col.map((c) => c.y)) : Math.max(...col.map((c) => c.y));
      const spots = [
        { x, y: yEdge + dy },
        { x: x + dx, y: yEdge + dy },
      ];
      let placed = 0;
      for (const s of spots) {
        if (!inside(s.x, s.y) || floor.has(key(s.x, s.y))) continue;
        ink.set(key(s.x, s.y), "edge");
        placed++;
      }
      if (placed === 0) {
        const edge = [...col].sort((a, b) => (dy < 0 ? a.y - b.y : b.y - a.y))[0];
        if (edge) ink.set(key(edge.x, edge.y), "edge");
      }
    }
  }
  if (!blades) return;
  for (const c of cellsOf(ink)) {
    const id = key(c.x, c.y);
    if (ink.get(id) === "edge") continue;
    const mates = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].filter(([dx0, dy0]) => ink.has(key(c.x + dx0, c.y + dy0)) || floor.has(key(c.x + dx0, c.y + dy0))).length;
    if (mates <= 1) ink.set(id, "edge");
  }
}

/** One extra 2-cell fin on the hash-chosen side. */
function applyFin(
  ink: Map<string, HullInk>,
  floor: Set<string>,
  inside: (x: number, y: number) => boolean,
  facing: "left" | "right",
  h: number,
) {
  const cells = cellsOf(ink);
  if (!cells.length) return;
  const top = (mix(h, 1) & 1) === 0;
  const dy = top ? -1 : 1;
  const dx = facing === "right" ? 1 : -1;
  const xs = [...new Set(cells.map((c) => c.x))].sort((a, b) => a - b);
  const x0 = xs[mix(h, 2) % xs.length];
  const col = cells.filter((c) => c.x === x0);
  const yEdge = top ? Math.min(...col.map((c) => c.y)) : Math.max(...col.map((c) => c.y));
  const spots = [
    { x: x0, y: yEdge + dy },
    { x: x0 + dx, y: yEdge + dy },
  ];
  let placed = 0;
  for (const s of spots) {
    if (!inside(s.x, s.y) || floor.has(key(s.x, s.y))) continue;
    ink.set(key(s.x, s.y), "edge");
    placed++;
  }
  if (placed >= 2) return;
  const rest = cells
    .filter((c) => c.x === x0 || c.x === x0 + dx)
    .sort((a, b) => (top ? a.y - b.y : b.y - a.y) || a.x - b.x);
  for (const c of rest) {
    if (placed >= 2) break;
    ink.set(key(c.x, c.y), "edge");
    placed++;
  }
}

function applyBand(kind: Kind, ink: Map<string, HullInk>, h: number, rows: number) {
  if (kind === "stealth") {
    const pool = skinPool(ink);
    const picked = spread(pool.length ? pool : cellsOf(ink), 1, h, 4);
    for (const c of picked) ink.set(key(c.x, c.y), "edge");
    return;
  }
  const cells = cellsOf(ink);
  if (!cells.length) return;
  let pool: Cell[];
  if (kind === "rebel" || kind === "auto" || kind === "flagship" || kind === "zoltan") {
    const mid = (rows - 1) / 2;
    const top = (mix(h, 3) & 1) === 0;
    if (kind === "zoltan") {
      const line = cells.filter((c) => Math.abs(c.y - mid) <= 1);
      pool = line.length ? line : cells;
    } else {
      const ys = cells.map((c) => c.y);
      const y = top ? Math.min(...ys) : Math.max(...ys);
      const line = cells.filter((c) => c.y === y);
      pool = line.length ? line : cells;
    }
    pool = [...pool].sort((a, b) => a.x - b.x || a.y - b.y);
    const len = Math.max(3, Math.ceil(pool.length * 0.5));
    const start = mix(h, 6) % pool.length;
    for (let i = 0; i < len; i++) {
      const c = pool[(start + i) % pool.length];
      if (ink.get(key(c.x, c.y)) === "skin") ink.set(key(c.x, c.y), "accent");
    }
    return;
  }
  pool = skinPool(ink);
  if (!pool.length) pool = cells;
  const count = 3 + (mix(h, 6) % 3);
  for (const c of spread(pool, count, h, 7)) {
    if (ink.get(key(c.x, c.y)) !== "glow") ink.set(key(c.x, c.y), "accent");
  }
}

function panelBreaks(ink: Map<string, HullInk>) {
  for (const c of cellsOf(ink)) {
    const id = key(c.x, c.y);
    if (ink.get(id) === "skin" && (Math.abs(c.x * 3 + c.y) % 4 === 0)) ink.set(id, "edge");
  }
}

function applyLights(ink: Map<string, HullInk>, h: number) {
  const count = 1 + (mix(h, 5) % 3);
  const pool = skinPool(ink);
  const source = pool.length ? pool : cellsOf(ink);
  for (const c of spread(source, count, h, 8)) ink.set(key(c.x, c.y), "glow");
}

function applySlit(ink: Map<string, HullInk>, h: number, nose: (c: Cell) => number, rows: number) {
  const count = 1 + (mix(h, 5) % 3);
  const pool = skinPool(ink);
  const source = pool.length ? pool : cellsOf(ink);
  if (!source.length) return;
  const mid = (rows - 1) / 2;
  const ranked = [...source].sort((a, b) => nose(b) - nose(a) || Math.abs(a.y - mid) - Math.abs(b.y - mid) || a.x - b.x);
  const origin = ranked[mix(h, 9) % ranked.length];
  const nearest = [...source].sort(
    (a, b) => Math.abs(a.x - origin.x) + Math.abs(a.y - origin.y) - (Math.abs(b.x - origin.x) + Math.abs(b.y - origin.y)) || a.x - b.x || a.y - b.y,
  );
  for (const c of nearest.slice(0, count)) ink.set(key(c.x, c.y), "glow");
}

function applyPirate(ink: Map<string, HullInk>, h: number) {
  const cells = cellsOf(ink);
  if (!cells.length) return;
  const pool = skinPool(ink);
  const source = pool.length ? pool : cells;
  const origin = [...source].sort((a, b) => a.y - b.y || a.x - b.x)[mix(h, 11) % source.length];
  ink.set(key(origin.x, origin.y), "mark");
  for (const n of [
    { x: origin.x + 1, y: origin.y },
    { x: origin.x - 1, y: origin.y },
    { x: origin.x, y: origin.y + 1 },
    { x: origin.x, y: origin.y - 1 },
  ]) {
    const id = key(n.x, n.y);
    if (!ink.has(id)) continue;
    ink.set(id, "mark");
    break;
  }
}

function skinPool(ink: Map<string, HullInk>): Cell[] {
  return cellsOf(ink).filter((c) => ink.get(key(c.x, c.y)) === "skin");
}

function spread(pool: Cell[], count: number, h: number, salt: number): Cell[] {
  if (!pool.length || count <= 0) return [];
  const sorted = [...pool].sort((a, b) => a.y - b.y || a.x - b.x);
  const n = sorted.length;
  const start = mix(h, salt) % n;
  const step = 1 + (mix(h, salt + 17) % Math.max(1, n - 1));
  const out: Cell[] = [];
  const used = new Set<number>();
  let i = start;
  let guard = 0;
  while (out.length < count && out.length < n && guard < n * 3) {
    const at = i % n;
    if (!used.has(at)) {
      used.add(at);
      out.push(sorted[at]);
    }
    i += step;
    guard++;
  }
  return out;
}
