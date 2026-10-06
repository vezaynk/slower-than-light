import { type ReactNode } from "react";
import { hullById } from "@/game/hulls";
import { layoutFor, roomClip, seatLayout } from "@/game/layouts";
import type { KitId } from "@/game/types";
import { DoorTicks } from "./DoorTicks";

/**
 * Original pixel drawings. Wiki bitmaps are not used.
 * Ship figures, the unlock diagram, and the 2012 title menu are drawn here.
 */

type Stamp = { rows: string[]; paint: Record<string, string> };

const HULLS: Record<string, Stamp> = {
  kestrel: {
    paint: { h: "#c8c2b4", s: "#e07030", e: "#5c6770", n: "#f7f4ee" },
    rows: [
      ".......hhhhhh.......",
      ".....hhss..sshh.....",
      "....h..........h....",
      "...heeehhhhh...hh...",
      "..heeehhhhhhhhhhh...",
      "..heeehhhhhhhhhhh...",
      "...heeehhhhh...hh...",
      "....h..........h....",
      ".....hhss..sshh.....",
      ".......hhhhhh.......",
    ],
  },
  engi: {
    paint: { b: "#7f946c", c: "#d6e878", y: "#f4f7c8", r: "#44523c" },
    rows: [
      ".......rrrr.........",
      ".....rr....rr.......",
      "....r..cccc..r......",
      "...r..cc..cc..r.....",
      "...r.cc.yy.cc.r.....",
      "...r.cc.yy.cc.r.....",
      "...r..cc..cc..r.....",
      "....r..cccc..r......",
      ".....rr....rr.......",
      ".......rrrr.........",
    ],
  },
  fed: {
    paint: { h: "#8b93a0", s: "#c45a3a", e: "#4e565e" },
    rows: [
      "......hhhhhh........",
      "....hhh....hhh......",
      "...hhsssssssshh.....",
      "..hss........ssh....",
      ".hee..........eeh...",
      ".hee..........eeh...",
      "..hss........ssh....",
      "...hhsssssssshh.....",
      "....hhh....hhh......",
      "......hhhhhh........",
    ],
  },
  zoltan: {
    paint: { h: "#f3f0e4", y: "#f0e27a" },
    rows: [
      "........hh..........",
      "......hhhhhh........",
      ".....hhyyyyhh.......",
      "....hy......yh......",
      "...hy...hh...yh.....",
      "...hy...hh...yh.....",
      "....hy......yh......",
      ".....hhyyyyhh.......",
      "......hhhhhh........",
      "........hh..........",
    ],
  },
  lanius: {
    paint: { h: "#8b98a6", e: "#3e4852" },
    rows: [
      "hh..............hh..",
      "hhh............hhh..",
      ".hhh..........hhh...",
      "..hhh..hhhh..hhh....",
      "...hhhhhhhhhhhh.....",
      "....eeeeeeeeee......",
      "...hhhhhhhhhhhh.....",
      "..hhh..hhhh..hhh....",
      ".hhh..........hhh...",
      "hhh............hhh..",
    ],
  },
  stealth: {
    paint: { h: "#3a414a", e: "#1a1e24" },
    rows: [
      ".........hh.........",
      ".......hhhhhh.......",
      ".....hh......hh.....",
      "...hhh........hhh...",
      ".eeee..........hhh..",
      ".eeee..........hhh..",
      "...hhh........hhh...",
      ".....hh......hh.....",
      ".......hhhhhh.......",
      ".........hh.........",
    ],
  },
  rock: {
    paint: { h: "#b4a48c", e: "#6b5344" },
    rows: [
      ".....hhhhhhhh.......",
      "...hh........hh.....",
      "..hh..........hh....",
      ".hh............hh...",
      ".hheeeeeeeeeeeehh...",
      ".hheeeeeeeeeeeehh...",
      ".hh............hh...",
      "..hh..........hh....",
      "...hh........hh.....",
      ".....hhhhhhhh.......",
    ],
  },
  slug: {
    paint: { h: "#6a8f62", s: "#d2e68a" },
    rows: [
      ".......hhhh.........",
      ".....hh....hh.......",
      "....h........h......",
      "...h...ssss...h.....",
      "..h...s....s...h....",
      "..h..s......s..h....",
      "..h...s....s...h....",
      "...h...ssss...h.....",
      "....h........h......",
      "......hhhhhh........",
    ],
  },
  mantis: {
    paint: { h: "#d06a3c", e: "#6e3030" },
    rows: [
      "h................h..",
      "hh..............hh..",
      ".hh............hh...",
      "..hh..hhhhhh..hh....",
      "...hhhhhhhhhhhh.....",
      "....eeeeeeeeee......",
      "...hhhhhhhhhhhh.....",
      "..hh..hhhhhh..hh....",
      ".hh............hh...",
      "hh..............hh..",
    ],
  },
  crystal: {
    paint: { c: "#f0d4ee", e: "#a878b8" },
    rows: [
      "........cc..........",
      "......cccccc........",
      ".....cc....cc.......",
      "....cc......cc......",
      "...cc...ee...cc.....",
      "...cc...ee...cc.....",
      "....cc......cc......",
      ".....cc....cc.......",
      "......cccccc........",
      "........cc..........",
    ],
  },
};

const ROOM_COLOR: Record<string, string> = {
  Engines: "#6ec8ef",
  Oxygen: "#7ddec0",
  Doors: "#f0d060",
  Shields: "#7aa2ff",
  Medbay: "#ff8d8d",
  Sensors: "#d5d8dc",
  Weapons: "#ffb45a",
  Piloting: "#c6e87a",
  "Clone Bay": "#e7a0d8",
  Teleporter: "#ff7a4a",
  Hacking: "#5dcca0",
  "Mind Control": "#c49bff",
  Cloaking: "#8aa0c8",
  Drones: "#5ec8c8",
  Artillery: "#ff9f6a",
  "Backup Battery": "#e8d070",
  Hall: "#2c343c",
  Hold: "#3a342c",
};

/** Kit rooms carry a short tag in the cutaway, so a bought or starting kit's room reads at a glance. */
const KIT_SHORT: Record<KitId, string> = {
  veil: "CLOAK",
  sling: "TELE",
  spike: "HACK",
  swarm: "DRONE",
  leash: "MIND",
  cradle: "CLONE",
  cell: "BATT",
  lance: "ARTY",
  flak: "ARTY",
};

const KIT_TAG = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  fontFamily: "inherit",
  fontSize: 13,
  letterSpacing: 0.5,
  lineHeight: 1,
  color: "#1b1714",
  overflow: "hidden",
  pointerEvents: "none",
} as const;

export function classOfPage(page: string): string {
  if (page.includes("Kestrel")) return "kestrel";
  if (page.includes("Engi")) return "engi";
  if (page.includes("Federation")) return "fed";
  if (page.includes("Zoltan")) return "zoltan";
  if (page.includes("Lanius")) return "lanius";
  if (page.includes("Stealth")) return "stealth";
  if (page.includes("Rock")) return "rock";
  if (page.includes("Slug")) return "slug";
  if (page.includes("Mantis")) return "mantis";
  return "crystal";
}

export function PixelHull({ kind, dim = false }: { kind: string; dim?: boolean }) {
  const stamp = HULLS[kind] ?? HULLS.kestrel;
  const width = Math.max(...stamp.rows.map((row) => row.length));
  const height = stamp.rows.length;
  return (
    <svg
      className={`pixel-hull${dim ? " is-dim" : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {stamp.rows.flatMap((row, y) =>
        [...row].flatMap((ch, x) =>
          ch === "." ? [] : [<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={stamp.paint[ch] ?? "#ccc"} />],
        ),
      )}
    </svg>
  );
}

/** Room squares for one cruiser layout. Missing grids still show the hull. */
export function PixelLayout({ id }: { id: string }) {
  const kind = id.replace(/-[a-c]$/, "");
  // Kit rooms: the hull's starting kits sit in their rooms (layouts.ts seatLayout), as they do in a fight.
  const raw = layoutFor(id);
  const kits = Object.keys(hullById(id)?.kits ?? {}) as KitId[];
  const layout = raw ? seatLayout(raw, kits) : undefined;
  return (
    <div className="pixel-figure">
      <PixelHull kind={kind} />
      {layout ? (
        <div
          className="room-grid"
          style={{
            aspectRatio: `${layout.cols} / ${layout.rows}`,
            ["--ar" as string]: layout.cols / layout.rows,
            gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
            gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          }}
          aria-hidden="true"
        >
          {layout.rooms.map((room) => {
            const clip = roomClip(room);
            const fill = ROOM_COLOR[room.title] ?? "#2c343c";
            return (
              <i
                key={room.id}
                className={clip ? "pixel-room is-cut" : "pixel-room"}
                style={{
                  gridColumn: `${room.x + 1} / span ${room.w}`,
                  gridRow: `${room.y + 1} / span ${room.h}`,
                  background: clip ? "transparent" : fill,
                }}
              >
                {clip ? <i className="pixel-fill" style={{ clipPath: clip, background: fill }} /> : null}
                {room.kit ? <b style={KIT_TAG}>{KIT_SHORT[room.kit]}</b> : null}
                <DoorTicks room={room} marks={layout.marks} />
              </i>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Ship page diagram: first row left to right, then down, then left along the second row. */
const UNLOCK_TOP = ["kestrel", "engi", "fed", "zoltan", "lanius"];
const UNLOCK_BOTTOM = ["crystal", "mantis", "slug", "rock", "stealth"];

export function UnlockDiagram() {
  return (
    <div className="unlock-board" aria-hidden="true">
      <div className="unlock-row">
        {UNLOCK_TOP.map((kind, i) => (
          <span key={kind} className="unlock-cell">
            <span className={`unlock-slot${i === 0 ? " is-open" : ""}`}>
              <PixelHull kind={kind} dim={i !== 0} />
              {i === 0 ? null : <i className="pixel-lock" />}
            </span>
            {i < UNLOCK_TOP.length - 1 ? <i className="pixel-arrow is-right" /> : <i className="pixel-arrow is-gap" />}
          </span>
        ))}
      </div>
      <div className="unlock-join">
        <i className="pixel-arrow is-down" />
      </div>
      <div className="unlock-row">
        {UNLOCK_BOTTOM.map((kind, i) => (
          <span key={kind} className="unlock-cell">
            <span className="unlock-slot">
              <PixelHull kind={kind} dim />
              <i className="pixel-lock" />
            </span>
            {i < UNLOCK_BOTTOM.length - 1 ? <i className="pixel-arrow is-left" /> : <i className="pixel-arrow is-gap" />}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Banner above Playable ships. Returns to the title menu. */
export function PixelTitle() {
  return (
    <svg className="title-figure pixel-title" viewBox="0 0 160 46" aria-hidden="true">
      <rect width="160" height="46" fill="#07060d" />
      {[
        [12, 6],
        [40, 14],
        [28, 30],
        [70, 8],
        [90, 22],
        [54, 36],
        [150, 10],
        [136, 34],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#f4f7f4" />
      ))}
      <g transform="translate(8 8) scale(2.4)">
        {HULLS.kestrel.rows.flatMap((row, y) =>
          [...row].flatMap((ch, x) =>
            ch === "." ? [] : [<rect key={`k${x}-${y}`} x={x} y={y} width={1} height={1} fill={HULLS.kestrel.paint[ch]} />],
          ),
        )}
      </g>
      {blit("ASHWAKE", 152 - textWidth("ASHWAKE", 1), 19, 1, "#f4f7f4", "banner")}
    </svg>
  );
}

/** 5×7 pixel letters for the title menu. */
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "·": ["0", "0", "0", "1", "0", "0", "0"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00100", "00100"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  "©": ["0111110", "1000001", "1011101", "1010001", "1011101", "1000001", "0111110"],
};

export const TITLE_VIEW = { w: 400, h: 224 };
const MENU_SCALE = 2;
const MENU_TOP = 78;
const MENU_STEP = 18;
const MENU_RIGHT = 16;

function textWidth(text: string, scale: number) {
  let w = 0;
  for (const ch of text) {
    if (ch === " ") {
      w += 3 * scale;
      continue;
    }
    const glyph = FONT[ch];
    w += ((glyph?.[0].length ?? 5) + 1) * scale;
  }
  return Math.max(0, w - scale);
}

const TITLE_LINES = [
  { id: "continue", label: "CONTINUE" },
  { id: "new", label: "NEW GAME" },
  { id: "tutorial", label: "TUTORIAL" },
  { id: "stats", label: "STATS" },
  { id: "options", label: "OPTIONS" },
  { id: "credits", label: "CREDITS" },
  { id: "quit", label: "QUIT" },
];

export const TITLE_MENU_ART = TITLE_LINES.map((item, i) => {
  const y = MENU_TOP + i * MENU_STEP;
  const width = textWidth(item.label, MENU_SCALE);
  return {
    ...item,
    top: `${(y / TITLE_VIEW.h) * 100}%`,
    height: `${((7 * MENU_SCALE) / TITLE_VIEW.h) * 100}%`,
    right: `${(MENU_RIGHT / TITLE_VIEW.w) * 100}%`,
    width: `${(width / TITLE_VIEW.w) * 100}%`,
  };
});

function blit(text: string, x: number, y: number, scale: number, fill: string, key: string) {
  const rects: ReactNode[] = [];
  let cx = x;
  for (const ch of text) {
    if (ch === " ") {
      cx += 3 * scale;
      continue;
    }
    const rows = FONT[ch];
    if (!rows) {
      cx += 5 * scale;
      continue;
    }
    rows.forEach((row, iy) => {
      [...row].forEach((bit, ix) => {
        if (bit === "1") {
          rects.push(
            <rect
              key={`${key}-${cx}-${ix}-${iy}`}
              x={cx + ix * scale}
              y={y + iy * scale}
              width={scale}
              height={scale}
              fill={fill}
            />,
          );
        }
      });
    });
    cx += (rows[0].length + 1) * scale;
  }
  return rects;
}

const PLANET = (() => {
  const cells: { x: number; y: number; fill: string }[] = [];
  const cx = 118;
  const cy = 104;
  const r = 96;
  for (let y = cy - r; y < cy + r; y += 2) {
    for (let x = cx - r; x < cx + r; x += 2) {
      const dx = x + 1 - cx;
      const dy = y + 1 - cy;
      if (dx * dx + dy * dy > r * r) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = Math.floor(x / 10);
      const ny = Math.floor(y / 10);
      const n = ((nx * 17) ^ (ny * 31)) & 15;
      const limb = dist > r - 10 && dx < r * 0.15;
      let fill = "#14110f";
      if (limb) fill = dx < -r * 0.2 ? "#6e5648" : "#2a211c";
      else if (n > 12) fill = "#3a2c26";
      else if (n > 9) fill = "#221814";
      cells.push({ x, y, fill });
    }
  }
  return cells;
})();

const STARS = Array.from({ length: 160 }, (_, i) => {
  const x = (i * 97 + 13) % TITLE_VIEW.w;
  const y = (i * 57 + 29) % TITLE_VIEW.h;
  const dx = x - 118;
  const dy = y - 104;
  if (dx * dx + dy * dy < 96 * 96) return null;
  return { x, y, bright: i % 7 === 0 };
}).filter((star): star is { x: number; y: number; bright: boolean } => star != null);

const FLEET: { x: number; y: number; s: number; flip: boolean }[] = [
  { x: 18, y: 52, s: 2, flip: false },
  { x: 150, y: 40, s: 2, flip: false },
  { x: 86, y: 74, s: 1, flip: true },
  { x: 132, y: 86, s: 1, flip: false },
  { x: 8, y: 112, s: 2, flip: false },
  { x: 108, y: 124, s: 1, flip: true },
  { x: 168, y: 138, s: 2, flip: false },
  { x: 46, y: 150, s: 1, flip: false },
];

const SHIP_ROWS = [
  ".......####.......",
  "...#############..",
  "##################",
  "###cc########cc###",
  "...#############..",
  ".......####.......",
];

function shipPixels(ship: (typeof FLEET)[number]) {
  const rects: ReactNode[] = [];
  SHIP_ROWS.forEach((row, iy) => {
    [...row].forEach((ch, ix) => {
      if (ch === ".") return;
      const localX = ship.flip ? (row.length - 1 - ix) * ship.s : ix * ship.s;
      rects.push(
        <rect
          key={`${ship.x}-${ix}-${iy}`}
          x={ship.x + localX}
          y={ship.y + iy * ship.s}
          width={ship.s}
          height={ship.s}
          fill={ch === "c" ? "#7fd4ea" : "#e39b2b"}
        />,
      );
    });
  });
  return rects;
}

/** Title: planet and fleet on the left, the ASHWAKE mark and the menu on the right. */
export function PixelMenu({ continueReady }: { continueReady: boolean }) {
  const mark = "FAN PROJECT · INSPIRED BY FTL";
  const version = "v. 0.1";
  return (
    <svg className="pixel-menu" viewBox={`0 0 ${TITLE_VIEW.w} ${TITLE_VIEW.h}`} aria-hidden="true">
      <rect width={TITLE_VIEW.w} height={TITLE_VIEW.h} fill="#07060d" />
      {STARS.map((star, i) => (
        <rect key={`s${i}`} x={star.x} y={star.y} width="1" height="1" fill={star.bright ? "#f4f7f4" : "#8a93a8"} />
      ))}
      {PLANET.map((cell) => (
        <rect key={`p${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width="2" height="2" fill={cell.fill} />
      ))}
      {FLEET.map((ship) => shipPixels(ship))}
      {blit("ASHWAKE", TITLE_VIEW.w - MENU_RIGHT - textWidth("ASHWAKE", 4), 24, 4, "#f4f7f4", "logo")}
      {TITLE_LINES.map((item, i) =>
        blit(
          item.label,
          TITLE_VIEW.w - MENU_RIGHT - textWidth(item.label, MENU_SCALE),
          MENU_TOP + i * MENU_STEP,
          MENU_SCALE,
          item.id === "continue" && !continueReady ? "#8a8a8a" : "#f4f7f4",
          item.id,
        ),
      )}
      {blit(mark, (TITLE_VIEW.w - textWidth(mark, 1)) / 2, 210, 1, "#c8c8c8", "copy")}
      {blit(version, TITLE_VIEW.w - 8 - textWidth(version, 1), 210, 1, "#c8c8c8", "ver")}
      <rect x="8" y="206" width="2" height="2" fill="#f4f7f4" />
      <rect x="12" y="204" width="1" height="1" fill="#f4f7f4" />
      <rect x="348" y="196" width="2" height="2" fill="#c45ad0" />
      <rect x="354" y="200" width="3" height="2" fill="#7a3cff" />
      <rect x="360" y="194" width="2" height="3" fill="#e070b0" />
    </svg>
  );
}
