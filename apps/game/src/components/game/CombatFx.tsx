/**
 * INVENTED combat effects. Two canvases draw every shot in flight, beams, deployed drones,
 * impacts, and the MISS / SHIELD / damage floaters. The target panel is a second camera.
 * A player shot leaves its view going straight ahead. An enemy shot leaves the preview
 * going up. The arrival at the other ship uses the fight clock's bearing. Enemy bolts
 * start outside the screen; player bolts enter the preview frame. A beam does not travel:
 * per the user it fires for the whole swipe, from the weapon tip to the one point it hits, on the
 * same two legs, and that point walks the aimed line. One canvas sits under that panel; the other
 * sits over both ships.
 * The effect runs its own animation frame and reads the game store directly, so projectiles
 * move at display rate while the React UI keeps its slower refresh. Positions come from the
 * rooms and mounts on screen (data-ship, data-room, data-mount), so layout changes need no edits here.
 * A miss keeps the bolt's inbound speed and flies it through the aim point until it leaves
 * that camera. Beams never miss. Bombs teleport, so a miss stays a puff on the room.
 */
import { useEffect, useRef } from "react";
import { halted, shieldChargeFraction } from "@/game/sim";
import { bubbleCrossing, bubbleRoom, readShipScale, struckPad, zoltanPad } from "./shield-bubble";
import { animSpeed } from "./speed";
import {
  DRONE_LOOKS,
  droneKeyOf,
  dronePixels,
  weaponPalette,
  type DroneKey,
} from "@/game/gear-look";
import { DRONE_LABEL, enemyDroneSpot, playerDroneCruising } from "@/game/extras/swarm";
import { stepDrift, type DroneDrift } from "@/game/drone-drift";
import { roomInterior } from "@/game/extras/slug-sight";
// @agent:combat-ui. Enemy hacking drone flight / latch / pulse (read-only view).
import { enemyHackView, playerHackView } from "@/game/extras/spike";
// @agent:flagship. Stage-2 Power Surge drones (read-only view).
import { surgeDroneView } from "@/game/wiki/flagship-systems";
import { useGame } from "@/game/store";
import type { DroneBlast, DroneUnit, Shot } from "@/game/types";
import {
  flightSpeed,
  leftCamera,
  MISS_EXIT_MARGIN,
  MISS_MAX_AGE,
  missVelocity,
  shotFliesPast,
} from "./miss-flight";
import "@/game/pack/base";
import { pageRect } from "./turn";

type Box = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };
type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  /** Per-frame velocity scale. Default 0.92. Flak shards stay near 1 so they keep moving. */
  drag?: number;
  /** Extra px/s on y, not scaled by drag. Negative rises. */
  lift?: number;
  /** Departing player shots paint under the target panel. Absent paints on the overlay. */
  layer?: "world";
};
/** Filled or outlined pixel rect, or a tiny laser ring of rects. Grows from the centre. */
type Mark = {
  x: number;
  y: number;
  w: number;
  h: number;
  life: number;
  max: number;
  color: string;
  fill: boolean;
  grow?: number;
  width?: number;
  ring?: boolean;
};
/** Beam trail: the stretch the hit point crossed in one frame, fading out. */
type Trail = { a: Pt; b: Pt; life: number; max: number; color: string; scale: number };
/** Short white-hot laser streak along the shot angle. */
type Streak = {
  x: number;
  y: number;
  ang: number;
  len: number;
  life: number;
  max: number;
  color: string;
};
/** `side` / `slot`: @agent:flagship floater stagger (simultaneous numbers over one hull take separate slots). */
type Text = {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
  side?: "player" | "enemy";
  slot?: number;
};
type FxLayer = "world" | "panel" | "over";
type Seen = {
  at: Pt;
  color: string;
  kind: Shot["kind"];
  ang: number;
  /** Hull the shot is aimed at. Floaters use the same split (x > 50 is the player). */
  side: "player" | "enemy";
  roomId: string;
  /** Environmental Hazards, Asteroid Field: an env laser is a rock, not a bolt. */
  rock?: boolean;
  /** Room point the inbound leg was flying toward. */
  aim: Pt;
  /** Direction of that leg as it reaches the room. */
  approachAng: number;
  /** Pixels per second on the inbound leg. */
  speed: number;
  /** This frame is on the leg that reaches the target, not the outbound camera. */
  onArrival: boolean;
  /** Camera a miss keeps flying in. */
  carryLayer: FxLayer;
  spin: number;
  /** A beam that shields stopped. It ends on the bubble, so it leaves no hull spark. */
  cut?: boolean;
};
/** A shot that already missed and is still crossing the camera. */
type Flyby = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  kind: Shot["kind"];
  color: string;
  layer: FxLayer;
  rock: boolean;
  spin: number;
  age: number;
  /** Draw once at the handoff point before integrating. */
  fresh: boolean;
};
type Ring = { box: Box; life: number; color?: string; pad: number; scale?: number };
type Claim = { text: "SHIELD" | "MISS" | "HIT"; side: "player" | "enemy" };

/** Same hull rule as applyImpact: `at` wins, an own bomb stays on the shooter, everything else crosses. */
function targetSide(shot: Shot): "player" | "enemy" {
  if (shot.at === "player" || shot.at === "enemy") return shot.at;
  if (shot.kind === "bomb" && shot.own === true) return shot.from === "player" ? "player" : "enemy";
  return shot.from === "player" ? "enemy" : "player";
}

/**
 * A mount shot that leaves one camera and arrives in the other.
 * Drone fire stays beside the drone (swarm.ts "swarm-ready" / "drones", or DRONE_LABEL).
 * Bombs still appear on the room they hit. Rocks and artillery keep a single approach.
 */
function crossesCameras(shot: Shot): boolean {
  if (shot.from !== "player" && shot.from !== "enemy") return false;
  if (shot.kind === "bomb") return false;
  if (targetSide(shot) === shot.from) return false;
  const label = shot.label ?? "";
  if (label === "swarm-ready" || label === "drones" || label.startsWith(DRONE_LABEL)) return false;
  return true;
}

/**
 * Seconds for the arrival bearing to walk once around the target frame.
 * A Burst Laser II volley is staggered by 0.28s, so the three bolts span about 25° and stay one cluster.
 */
const APPROACH_TURN_S = 8;

/**
 * Where a crossing shot enters the other camera.
 * The hand is the fight clock at the tick `shot.t` was 0, so one volley shares a side
 * and the bolt holds that line instead of chasing the hand.
 */
function approachAngle(time: number, shot: Shot): number {
  const born = time - shot.t * shot.duration;
  const turns = born / APPROACH_TURN_S;
  return (turns - Math.floor(turns)) * Math.PI * 2;
}

/** Enemy arrivals are born this far outside the screen, on the bearing circle. */
const OFFSCREEN_PX = 72;

/** A point just inside `rect`, where a ray from `origin` at `ang` meets the border. */
function entryPoint(origin: Pt, ang: number, rect: Box): Pt {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let best = Infinity;
  const consider = (dist: number) => {
    if (dist > 1 && dist < best) best = dist;
  };
  if (Math.abs(dx) > 1e-4) {
    consider((rect.x - origin.x) / dx);
    consider((rect.x + rect.w - origin.x) / dx);
  }
  if (Math.abs(dy) > 1e-4) {
    consider((rect.y - origin.y) / dy);
    consider((rect.y + rect.h - origin.y) / dy);
  }
  const dist = Number.isFinite(best) ? Math.max(16, best - 6) : Math.hypot(rect.w, rect.h) * 0.45;
  return { x: origin.x + dx * dist, y: origin.y + dy * dist };
}

/** Drones that fly at the enemy. The rest hold station around the player hull. */
const OUTBOUND = new Set<DroneKey>([
  "COMBAT_1",
  "striker2",
  "COMBAT_BEAM",
  "COMBAT_BEAM_2",
  "fire",
  "BOARDER",
  "intruder",
  "personnel",
]);

/** Enemy schematic ids (Kit.target strings) to drone art keys. */
const ENEMY_DRONE_KEY: Record<string, DroneKey> = {
  COMBAT_2: "striker2",
  BOARDER_ION: "intruder",
  DRONE_SHIELD: "overcharge",
};

function enemyDroneKey(unit: DroneUnit): DroneKey | null {
  return ENEMY_DRONE_KEY[unit.kind] ?? droneKeyOf(unit.kind);
}

/** A @theme colour token from styles.css, read once. The canvas cannot use var() directly. */
const tokens = new Map<string, string>();
function token(name: string, fallback: string) {
  let v = tokens.get(name);
  if (v == null) {
    v = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    tokens.set(name, v);
  }
  return v;
}

/**
 * INVENTED pixel art for the enemy hacking drone: a 7x7 pod with four clamp legs. h = hack teal, d = dark, w = light.
 * Drawn at 3 px per cell.
 */
const HACK_POD = [".h...h.", "..ddd..", ".dhwhd.", "hdwwwdh", ".dhwhd.", "..ddd..", ".h...h."];

function drawHackPod(
  ctx: CanvasRenderingContext2D,
  at: Pt,
  cell: number,
  teal: string,
  light: string,
) {
  const half = (HACK_POD.length * cell) / 2;
  HACK_POD.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      ctx.fillStyle = ch === "h" ? teal : ch === "w" ? light : "#0b2a22";
      ctx.fillRect(
        Math.round(at.x - half + x * cell),
        Math.round(at.y - half + y * cell),
        cell,
        cell,
      );
    });
  });
}

function hash(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/** Laser, ion, missile, flak, or a tumbling rock. The caller has already translated to the bolt. */
function paintBolt(
  c: CanvasRenderingContext2D,
  kind: Shot["kind"],
  color: string,
  ang: number,
  tumble: number,
  rock: boolean,
  spin: number,
  /** 1 in the main view. A rock on the enemy hull uses that hull's scale. */
  scale = 1,
) {
  c.save();
  if (rock) {
    c.rotate(tumble);
    c.scale(2 * scale, 2 * scale);
    drawAsteroid(c, spin);
    c.restore();
    return;
  }
  c.rotate(ang);
  c.scale(1.4, 1.4);
  if (kind === "laser") {
    c.fillStyle = color;
    c.globalAlpha = 0.35;
    c.fillRect(-22, -2, 18, 4);
    c.globalAlpha = 1;
    c.fillRect(-10, -3, 16, 6);
    c.fillStyle = "#ffffff";
    c.fillRect(-6, -1, 10, 2);
  } else if (kind === "ion") {
    c.fillStyle = color;
    c.globalAlpha = 0.3;
    c.fillRect(-9, -9, 18, 18);
    c.globalAlpha = 1;
    c.fillRect(-5, -5, 10, 10);
    c.fillStyle = "#e8f6ff";
    c.fillRect(-2, -2, 4, 4);
  } else if (kind === "missile") {
    c.fillStyle = "#d8dde2";
    c.fillRect(-9, -2, 14, 5);
    c.fillStyle = "#6f7b86";
    c.fillRect(-9, -4, 3, 9);
    c.fillStyle = color;
    c.fillRect(5, -2, 3, 5);
  } else {
    // Flak: a tumbling chunk.
    c.rotate(tumble);
    c.fillStyle = color;
    c.fillRect(-3, -3, 6, 6);
    c.fillStyle = "#ffe9b0";
    c.fillRect(-1, -1, 2, 2);
  }
  c.restore();
}

/** Environmental Hazards, Asteroid Field: a tumbling stone. `h` picks one of three silhouettes. */
function drawAsteroid(ctx: CanvasRenderingContext2D, h: number) {
  const body = h > 0.66 ? "#8d8476" : h > 0.33 ? "#6e675c" : "#7a7268";
  ctx.fillStyle = "#3c3832";
  ctx.fillRect(-8, -4, 16, 9);
  ctx.fillStyle = body;
  ctx.fillRect(-6, -7, 11, 8);
  ctx.fillRect(-3, 2, 8, 4);
  ctx.fillStyle = "#c4b8a4";
  ctx.fillRect(-4, -5, 3, 2);
  ctx.fillStyle = "#2e2a26";
  ctx.fillRect(3, -1, 4, 3);
  if (h > 0.66) ctx.fillRect(6, -6, 4, 4);
  else if (h < 0.33) ctx.fillRect(-11, 0, 4, 4);
}

const droneSprites = new Map<string, HTMLCanvasElement>();

function droneSprite(key: DroneKey) {
  const cached = droneSprites.get(key);
  if (cached) return cached;
  const art = dronePixels(key);
  const c = document.createElement("canvas");
  c.width = art.w;
  c.height = art.h;
  const ctx = c.getContext("2d")!;
  art.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      ctx.fillStyle =
        ch === "b"
          ? art.palette.body
          : ch === "t"
            ? art.palette.trim
            : ch === "g"
              ? art.palette.glow
              : "#14181d";
      ctx.fillRect(x, y, 1, 1);
    });
  });
  droneSprites.set(key, c);
  return c;
}

export function CombatFx() {
  const overRef = useRef<HTMLCanvasElement>(null);
  const underRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const over = overRef.current;
    const under = underRef.current;
    const host = over?.parentElement;
    if (!over || !under || !host) return;
    const ctx = over.getContext("2d");
    const underCtx = under.getContext("2d");
    if (!ctx || !underCtx) return;

    let raf = 0;
    let last = performance.now();
    const sparks: Spark[] = [];
    const flybys: Flyby[] = [];
    const texts: Text[] = [];
    const rings: Ring[] = [];
    const marks: Mark[] = [];
    const trails: Trail[] = [];
    /** Last hit point per firing beam, so each frame's trail joins the one before. */
    const beamHit = new Map<string, Pt>();
    /** Beams whose shield block already flashed the bubble. */
    const beamCutSeen = new Set<string>();
    const streaks: Streak[] = [];
    const seen = new Map<string, Seen>();
    const seenFloaters = new Set<string>();
    /** Drone blasts have no id. Keyed until that entry leaves `g.droneBlasts`. */
    const seenBlast = new Set<string>();
    /** Last canvas point per drone, so a kill this tick still bursts on the orbit. */
    const droneMem = new Map<string, Pt>();
    /** Orbit angle and speed. Pause holds both. A power loss eases the speed to a stop. */
    const drift = new Map<string, DroneDrift>();
    const driftSeen = new Set<string>();
    /** Shot progress as of the last sim tick, to smooth between 30 Hz ticks. */
    const tickT = new Map<string, { t: number; at: number }>();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Per the user: fast forward speeds the effects up too (speed.ts).
      const dt = Math.min(0.05, (now - last) / 1000) * animSpeed();
      last = now;
      const g = useGame.getState().game;

      // Logical screen size and the scale the Screen wrapper applies.
      const base = pageRect(host);
      const w = host.offsetWidth;
      const h = host.offsetHeight;
      if (!w || !h) return;
      const scale = base.width / w;
      const dpr = window.devicePixelRatio || 1;
      const backW = Math.round(w * scale * dpr);
      const backH = Math.round(h * scale * dpr);
      const prep = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
        if (canvas.width !== backW || canvas.height !== backH) {
          canvas.width = backW;
          canvas.height = backH;
        }
        context.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
        context.clearRect(0, 0, w, h);
        context.imageSmoothingEnabled = false;
      };
      prep(over, ctx);
      prep(under, underCtx);

      const box = (el: Element | null): Box | null => {
        if (!el) return null;
        const r = pageRect(el);
        return {
          x: (r.left - base.left) / scale,
          y: (r.top - base.top) / scale,
          w: r.width / scale,
          h: r.height / scale,
        };
      };
      const hull = (side: "player" | "enemy") =>
        box(host.querySelector(`.hull[data-ship="${side}"]`));
      const room = (side: "player" | "enemy", id: string) =>
        box(host.querySelector(`.hull[data-ship="${side}"] [data-room="${CSS.escape(id)}"]`));
      // Player beam: the flight follows the two clicks, in the same tile space as the hull grid.
      const tileOnHull = (side: "player" | "enemy", p: { x: number; y: number }): Pt | null => {
        const el = host.querySelector(`.hull[data-ship="${side}"]`);
        const origin = box(el);
        if (!el || !origin) return null;
        const cs = getComputedStyle(el);
        const tile = parseFloat(cs.getPropertyValue("--tile")) || 0;
        const gap = parseFloat(cs.columnGap) || 0;
        const padX = parseFloat(cs.paddingLeft) || 0;
        const padY = parseFloat(cs.paddingTop) || 0;
        if (!(tile > 0)) return null;
        const cx = Math.floor(p.x);
        const cy = Math.floor(p.y);
        return {
          x: origin.x + padX + cx * (tile + gap) + (p.x - cx) * tile,
          y: origin.y + padY + cy * (tile + gap) + (p.y - cy) * tile,
        };
      };

      // Effects play out whenever the game runs, not only in a fight: when a fight ends, the last MISS / SHIELD /
      // damage numbers, rings and sparks still fade instead of freezing on screen. A pause still holds them.
      const live = !halted(g);
      const time = now / 1000;
      // Per the user: pause holds each drone where it is. Losing power eases the orbit to a stop;
      // power coming back eases it up to cruise. The angle is kept here, not on the clock.
      driftSeen.clear();
      const follow = (id: string, omega: number, cruising: boolean, seed: number) => {
        driftSeen.add(id);
        let body = drift.get(id);
        if (!body) {
          body = { angle: seed, rate: cruising ? 1 : 0 };
          drift.set(id, body);
        }
        return stepDrift(body, dt, cruising, omega, !live);
      };

      // Drones on station. Positions feed the drone shots below.
      // A drone on the enemy hull uses that hull's scale, so it matches the shrunk rooms.
      const foeScale = readShipScale(host.querySelector('.hull[data-ship="enemy"]'));
      const droneAt = new Map<DroneKey, Pt>();
      const kit = g.player.kits.drones;
      const key = kit?.on ? droneKeyOf(kit.target) : null;
      if (kit && key) {
        const outbound = OUTBOUND.has(key);
        const cruising = playerDroneCruising(kit);
        const a = follow(`p:${key}`, outbound ? 0.9 : 0.6, cruising, outbound ? Math.PI : 0);
        const around = hull(outbound ? "enemy" : "player");
        if (around) {
          const s = outbound ? foeScale : 1;
          const cx = around.x + around.w / 2;
          const cy = around.y + around.h / 2;
          const p = {
            x: cx + Math.cos(a) * (around.w / 2 + 22 * s),
            y: cy + Math.sin(a) * (around.h / 2 + 18 * s),
          };
          droneAt.set(key, p);
          const sprite = droneSprite(key);
          const size = 27 * s;
          ctx.globalAlpha = cruising ? 1 : 0.4;
          ctx.drawImage(sprite, Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
          ctx.globalAlpha = 1;
          // Defense drones hold a faint guard ring; the outbound ones trail a thruster pixel.
          ctx.fillStyle = DRONE_LOOKS[key].glow;
          ctx.globalAlpha = (cruising ? 0.5 : 0.2) + (cruising ? 0.5 : 0.15) * Math.sin(time * 6);
          ctx.fillRect(
            Math.round(p.x - Math.cos(a + Math.PI / 2) * 14 * s) - 1,
            Math.round(p.y - Math.sin(a + Math.PI / 2) * 12 * s) - 1,
            Math.max(1, 3 * s),
            Math.max(1, 3 * s),
          );
          ctx.globalAlpha = 1;
        }
      }

      // Enemy drones: offensive ones orbit the player hull, defensive ones their own hull, boarders fly over
      // and then sit in a player room, crew drones sit in an enemy room. Positions feed enemy drone shots below.
      const enemyDroneAt = new Map<string, Pt>();
      // Landed boarding drones stay on the player after that hull is destroyed (Game.boarded), drawn dim while unpowered.
      for (const unit of [...(g.enemy?.kits.drones?.drones ?? []), ...(g.boarded ?? [])]) {
        const spot = enemyDroneSpot(unit);
        const ekey = enemyDroneKey(unit);
        if (!spot || !ekey) continue;
        const phase = hash(unit.id) * Math.PI * 2;
        let p: Pt | null = null;
        let size = 27;
        let s = 1;
        if (spot.at === "player-orbit" || spot.at === "enemy-orbit") {
          // Opposite spin to the player's own drone, so the two read apart.
          const omega = spot.at === "player-orbit" ? -0.8 : -0.55;
          const a = follow(`e:${unit.id}`, omega, unit.powered, phase);
          const around = hull(spot.at === "player-orbit" ? "player" : "enemy");
          if (around) {
            s = spot.at === "enemy-orbit" ? foeScale : 1;
            size = 27 * s;
            p = {
              x: around.x + around.w / 2 + Math.cos(a) * (around.w / 2 + 22 * s),
              y: around.y + around.h / 2 + Math.sin(a) * (around.h / 2 + 18 * s),
            };
          }
        } else if (spot.at === "flying") {
          const a = hull("enemy");
          const b = hull("player");
          if (a && b) {
            const k = Math.min(1, Math.max(0, spot.progress));
            s = foeScale + (1 - foeScale) * k;
            size = 27 * s;
            p = {
              x: a.x + a.w / 2 + (b.x + b.w / 2 - (a.x + a.w / 2)) * k,
              y:
                a.y +
                a.h / 2 +
                (b.y + b.h / 2 - (a.y + a.h / 2)) * k +
                Math.sin(k * Math.PI) * -30 * s,
            };
          }
        } else {
          // Slugs: a crew drone in a closed room has no life sign, so it is not drawn.
          const side = spot.at === "player-room" ? "player" : "enemy";
          if (!roomInterior(g, side, spot.room)) continue;
          const bob = follow(`bob:${unit.id}`, 2, unit.powered, phase);
          const r = room(side, spot.room);
          if (r) {
            s = side === "enemy" ? foeScale : 1;
            size = 21 * s;
            p = { x: r.x + r.w / 2 + Math.sin(bob) * 3 * s, y: r.y + r.h / 2 };
          }
        }
        if (!p) continue;
        enemyDroneAt.set(unit.id, p);
        const stunned = (unit.stun ?? 0) > 0;
        ctx.globalAlpha = !unit.powered ? 0.4 : stunned ? 0.55 + 0.45 * Math.sin(time * 30) : 1;
        ctx.drawImage(
          droneSprite(ekey),
          Math.round(p.x - size / 2),
          Math.round(p.y - size / 2),
          size,
          size,
        );
        ctx.globalAlpha = 1;
        // Enemy drones carry a red tag pixel pair so they never read as yours.
        ctx.fillStyle = "#ff5a4a";
        ctx.fillRect(
          Math.round(p.x - s),
          Math.round(p.y - size / 2) - 4 * s,
          Math.max(1, 3 * s),
          Math.max(1, 2 * s),
        );
        if (stunned) {
          ctx.strokeStyle = "#b48cff";
          ctx.lineWidth = 1.5 * s;
          const pad = 2 * s;
          ctx.strokeRect(
            Math.round(p.x - size / 2) - pad,
            Math.round(p.y - size / 2) - pad,
            size + pad * 2,
            size + pad * 2,
          );
        }
        // The fire drone's swipe makes no shot; draw it here for its first 0.4 s.
        if (unit.kind === "fire" && unit.room && (unit.fired ?? 99) < 0.4) {
          const r = room("player", unit.room);
          if (r) {
            ctx.strokeStyle = "#ff8a3a";
            ctx.lineWidth = 3;
            line(ctx, p, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
          }
        }
      }

      // @agent:flagship. Stage-2 Power Surge drones ("The Rebel Flagship", "2nd stage" / "Power Surge": "The Flagship
      // deploys extra drones, randomly split between Beam and Combat"; "The extra drones will take two shots each and
      // then disappear"). They orbit the Lark like the Drone Control attackers, with a pulsing amber surge ring so they
      // read apart from the regular four. Shots labelled DRONE_LABEL + id leave from them (muzzle below).
      // The page names no way to shoot them down (a defense drone hits projectiles), so they are drawn, not targetable.
      const surge = surgeDroneView(g.enemy);
      surge.forEach((d, i) => {
        const seed = hash(d.id) * Math.PI * 2 + (i / Math.max(1, surge.length)) * Math.PI * 2;
        const a = follow(`surge:${d.id}`, -1.1, true, seed);
        const around = hull("player");
        if (!around) return;
        const p = {
          x: around.x + around.w / 2 + Math.cos(a) * (around.w / 2 + 34),
          y: around.y + around.h / 2 + Math.sin(a) * (around.h / 2 + 28),
        };
        enemyDroneAt.set(d.id, p);
        const size = 24;
        // Fade out on the second (last) shot's cooldown, so the exit reads as "disappear".
        ctx.globalAlpha = d.shots >= 1 ? 0.75 : 1;
        ctx.drawImage(
          droneSprite(d.kind),
          Math.round(p.x - size / 2),
          Math.round(p.y - size / 2),
          size,
          size,
        );
        ctx.globalAlpha = 0.45 + 0.35 * Math.sin(time * 8 + i);
        ctx.strokeStyle = "#ffb43a";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          Math.round(p.x - size / 2) - 2,
          Math.round(p.y - size / 2) - 2,
          size + 4,
          size + 4,
        );
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ff5a4a";
        ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - size / 2) - 4, 3, 2);
      });
      for (const id of drift.keys()) if (!driftSeen.has(id)) drift.delete(id);

      // Enemy hacking drone. Hacking wiki: "Launches a hacking drone that attaches to the enemy ship"; it "takes
      // about 2--3 seconds to reach" (spike.ts hackFly). It flies from the enemy hull to the hacked player room (or the
      // hull centre for a kit with no room), sits latched on it, and pulses for the 4/7/10 s hacking pulse.
      const hack = enemyHackView(g);
      if (hack) {
        const teal = token("--color-ok", "#3ee56a");
        const light = token("--color-primary", "#c8fff0");
        const target = (hack.room ? room("player", hack.room) : null) ?? hull("player");
        const from = hull("enemy");
        if (target) {
          // Room centre (a little low, clear of the room title) so the pod and its pulse stay inside the room.
          const end = {
            x: target.x + target.w / 2,
            y: target.y + target.h / 2 + (hack.room ? 6 : 0),
          };
          if (hack.phase === "flying" && from) {
            const k = hack.progress;
            const start = { x: from.x, y: from.y + from.h / 2 };
            const p = {
              x: start.x + (end.x - start.x) * k,
              y: start.y + (end.y - start.y) * k + Math.sin(k * Math.PI) * -40,
            };
            // Thruster trail behind the pod.
            if (live && Math.random() < 0.8) {
              sparks.push({
                x: p.x + 6,
                y: p.y,
                vx: 30,
                vy: (Math.random() - 0.5) * 16,
                life: 0.4,
                max: 0.4,
                color: teal,
                size: 2,
              });
            }
            drawHackPod(ctx, p, 3, teal, light);
          } else {
            const pulse = hack.phase === "pulse";
            // Latched: the pod clamps onto the room; ShipView already hatches the room itself (.is-hacked).
            drawHackPod(ctx, end, 2, teal, light);
            if (pulse && hack.room) {
              // Pulse: square rings expand out of the pod across the room, pixel-stepped.
              ctx.strokeStyle = teal;
              ctx.lineWidth = 2;
              for (let i = 0; i < 2; i++) {
                const ph = ((live ? time : 0) * 1.6 + i / 2) % 1;
                const rw = 6 + ph * (target.w - 10);
                const rh = 6 + ph * (target.h - 10);
                ctx.globalAlpha = 0.8 * (1 - ph);
                ctx.strokeRect(
                  Math.round(end.x - rw / 2),
                  Math.round(end.y - rh / 2),
                  Math.round(rw),
                  Math.round(rh),
                );
              }
              ctx.globalAlpha = 1;
            } else if (pulse) {
              // A kit with no room: pulse rings around the hull, like the shield ring but teal.
              const ph = ((live ? time : 0) * 1.2) % 1;
              ctx.strokeStyle = teal;
              ctx.lineWidth = 2;
              ctx.globalAlpha = 0.7 * (1 - ph);
              ctx.beginPath();
              ctx.ellipse(
                end.x,
                end.y,
                12 + ph * (target.w / 2),
                12 + ph * (target.h / 2),
                0,
                0,
                Math.PI * 2,
              );
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
            // Label tag under the pod, VT323 like the floaters.
            ctx.font = "18px VT323, monospace";
            ctx.textAlign = "center";
            const tag = pulse ? `HACK ${Math.ceil(hack.left)}s` : "HACK";
            ctx.fillStyle = "#020308";
            ctx.fillText(tag, Math.round(end.x) + 1, Math.round(end.y) + 22);
            ctx.fillStyle = teal;
            ctx.fillText(tag, Math.round(end.x), Math.round(end.y) + 21);
          }
        }
      }

      // @agent:hack-rules. The player's hacking drone in flight, the mirror of the enemy pod above in ion blue (the
      // player's hacking colour; ShipView's .hack-reticle takes over once it latches). Hacking wiki, "Choosing your
      // hacking target": it "takes about 2--3 seconds to reach the enemy ship" (spike.ts tickOwnFlight). De-powering
      // "freezes the hacking drone in place" and an Anti-Combat Drone stuns it: the pod then holds and flickers.
      const mine = playerHackView(g);
      if (mine && mine.state === "flying") {
        const ion = token("--color-ion", "#8ecbff");
        const light = token("--color-primary", "#c8fff0");
        const target = (mine.room ? room("enemy", mine.room) : null) ?? hull("enemy");
        const from = hull("player");
        if (target && from) {
          const k = mine.progress;
          const start = { x: from.x + from.w, y: from.y + from.h / 2 };
          const end = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
          const p = {
            x: start.x + (end.x - start.x) * k,
            y: start.y + (end.y - start.y) * k + Math.sin(k * Math.PI) * -40,
          };
          const held = mine.stunned || mine.power < 1;
          const dir = end.x >= start.x ? -1 : 1;
          if (live && !held && Math.random() < 0.8) {
            sparks.push({
              x: p.x + 6 * dir,
              y: p.y,
              vx: 30 * dir,
              vy: (Math.random() - 0.5) * 16,
              life: 0.4,
              max: 0.4,
              color: ion,
              size: 2,
            });
          }
          ctx.globalAlpha = held ? 0.55 + 0.45 * Math.sin(time * 30) : 1;
          drawHackPod(ctx, p, 3, ion, light);
          ctx.globalAlpha = 1;
          if (mine.stunned) {
            ctx.strokeStyle = "#b48cff";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(Math.round(p.x - 13), Math.round(p.y - 13), 26, 26);
          }
        }
      }

      const panelBox = box(host.querySelector(".target-panel"));
      const stageBox = box(host.querySelector(".stage-slot"));

      const muzzle = (shot: Shot): Pt | null => {
        if (shot.from === "env") {
          const side = targetSide(shot);
          const target = hull(side);
          if (!target) return null;
          if (shot.label === "Artillery")
            return { x: target.x + target.w * (0.2 + 0.6 * hash(shot.id)), y: target.y - 24 };
          const right = side === "enemy" && panelBox ? panelBox.x + panelBox.w + 20 : w + 20;
          return { x: right, y: target.y + target.h * hash(shot.id) };
        }
        const side = shot.from;
        // Drone shots leave from that drone, whatever their defId.
        if (shot.label?.startsWith(DRONE_LABEL)) {
          const drone = enemyDroneAt.get(shot.label.slice(DRONE_LABEL.length));
          if (drone) return drone;
        } else if (side === "player" && (shot.label === "swarm-ready" || shot.label === "drones")) {
          const drone = [...droneAt.entries()].find(([k]) => OUTBOUND.has(k))?.[1];
          if (drone) return drone;
        } else if (shot.defId) {
          const mounts = host.querySelectorAll(
            `.hull[data-ship="${side}"] [data-def="${CSS.escape(shot.defId)}"]`,
          );
          if (mounts.length) {
            const el = mounts[Math.floor(hash(shot.id) * mounts.length) % mounts.length];
            const mark = el?.querySelector("[data-muzzle]");
            const m = box(mark ?? el ?? null);
            // A hardpoint marks its muzzle. Edge guns point right on the player and up on the target.
            if (m)
              return mark
                ? { x: m.x, y: m.y }
                : side === "player"
                  ? { x: m.x + m.w, y: m.y + m.h / 2 }
                  : { x: m.x + m.w / 2, y: m.y };
          }
        }
        const own = hull(side);
        if (!own) return null;
        return side === "player"
          ? { x: own.x + own.w, y: own.y + own.h / 2 }
          : { x: own.x + own.w / 2, y: own.y };
      };

      const aimAt = (shot: Shot, roomId: string): Pt | null => {
        const side = targetSide(shot);
        const r = room(side, roomId) ?? hull(side);
        if (!r) return null;
        const j = hash(shot.id);
        return { x: r.x + r.w * (0.3 + 0.4 * j), y: r.y + r.h * (0.3 + 0.4 * ((j * 7) % 1)) };
      };

      const burst = (at: Pt, color: string, count: number, speed: number, layer?: "world") => {
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = speed * (0.3 + Math.random() * 0.7);
          sparks.push({
            x: at.x,
            y: at.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0.5,
            max: 0.5,
            color,
            size: Math.random() < 0.3 ? 3 : 2,
            layer,
          });
        }
      };

      type Layer = "world" | "panel" | "over";
      const drawOn = (layer: Layer, fn: (c: CanvasRenderingContext2D) => void) => {
        const context = layer === "world" ? underCtx : ctx;
        if (layer === "panel" && panelBox) {
          context.save();
          context.beginPath();
          context.rect(panelBox.x, panelBox.y, panelBox.w, panelBox.h);
          context.clip();
          fn(context);
          context.restore();
          return;
        }
        fn(context);
      };
      const paintBeam = (layer: Layer, a: Pt, b: Pt, color: string, scale = 1) => {
        drawOn(layer, (c) => {
          c.save();
          // A beam in the main view stays out of the target panel, so it never crosses the enemy hull.
          if (layer === "world" && panelBox) {
            c.beginPath();
            c.rect(0, 0, w, h);
            c.rect(panelBox.x, panelBox.y, panelBox.w, panelBox.h);
            c.clip("evenodd");
          }
          c.lineCap = "square";
          c.strokeStyle = color;
          c.globalAlpha = 0.35;
          c.lineWidth = 9 * scale;
          line(c, a, b);
          c.globalAlpha = 1;
          c.lineWidth = 4 * scale;
          line(c, a, b);
          c.strokeStyle = "#ffffff";
          c.lineWidth = 1.5 * scale;
          line(c, a, b);
          c.restore();
        });
      };

      const alive = new Set<string>();
      for (const shot of g.shots) {
        if (shot.wait > 0) continue;
        alive.add(shot.id);
        const prior = tickT.get(shot.id);
        if (!prior || prior.t !== shot.t) tickT.set(shot.id, { t: shot.t, at: now });
        const since = (now - (tickT.get(shot.id)?.at ?? now)) / 1000;
        const t = Math.min(1, shot.t + (live ? Math.min(since, 1 / 30) / shot.duration : 0));
        const color = shot.from === "env" ? "#c8b49a" : weaponPalette(shot.defId).glow;
        if (shot.kind === "beam") {
          // Per the user: the beam fires for the whole swipe, from the weapon tip to the one point it hits.
          // That point walks the aimed line and leaves a short fading trail. A shield block ends the beam on
          // the bubble and the point stops there.
          const side = targetSide(shot);
          const lineEnds = shot.beamLine;
          let a = lineEnds ? tileOnHull(side, lineEnds.a) : null;
          let b = lineEnds ? tileOnHull(side, lineEnds.b) : null;
          if (!a || !b) {
            const ids = shot.beamRooms ?? [shot.targetRoom];
            const pts = ids
              .map((id) => {
                const r = room(side, id);
                return r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : null;
              })
              .filter((p): p is Pt => !!p);
            a = pts[0] ?? null;
            b = pts[pts.length - 1] ?? a;
          }
          const from = muzzle(shot);
          const target = hull(side);
          if (!a || !b || !from || !target) continue;
          const hullEl = host.querySelector(`.hull[data-ship="${side}"]`);
          const scale = readShipScale(hullEl);
          const cut = shot.beamCut;
          const k = cut ?? t;
          const hit = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
          // A crossing beam leaves its own camera the way a bolt does, and reaches the target from the
          // fight-clock bearing, starting off that camera. Drone and own-hull beams are one leg.
          let source = from;
          let inLayer: Layer = side === "enemy" && panelBox ? "panel" : "over";
          let outLayer: Layer = inLayer;
          let outScale = scale;
          if (crossesCameras(shot) && panelBox && stageBox) {
            const out: Layer = shot.from === "player" ? "world" : "panel";
            outLayer = out;
            outScale = shot.from === "player" ? 1 : foeScale;
            const exit =
              shot.from === "player" ? { x: w + 48, y: from.y } : { x: from.x, y: -OFFSCREEN_PX };
            paintBeam(out, from, exit, color, shot.from === "player" ? 1 : foeScale);
            const bounds =
              shot.from === "player"
                ? panelBox
                : {
                    x: -OFFSCREEN_PX,
                    y: -OFFSCREEN_PX,
                    w: w + OFFSCREEN_PX * 2,
                    h: h + OFFSCREEN_PX * 2,
                  };
            const entry = entryPoint(a, approachAngle(g.time, shot), bounds);
            const ux = entry.x - a.x;
            const uy = entry.y - a.y;
            const len = Math.hypot(ux, uy) || 1;
            source = { x: entry.x + (ux / len) * 48, y: entry.y + (uy / len) * 48 };
            inLayer = shot.from === "player" ? "panel" : "world";
          }
          let end = hit;
          if (cut != null) {
            const ship = side === "player" ? g.player : g.enemy;
            const frame = bubbleRoom(hullEl, target, box);
            const zoltan = shot.beamCutBy === "zoltan";
            // A Zoltan Shield takes the slot outside the live layers. A regular block ends on the outer live layer.
            const pad = zoltan
              ? zoltanPad(
                  frame,
                  ship?.shieldNow ?? 0,
                  !!ship && shieldChargeFraction(g, ship, side) != null,
                  scale,
                )
              : struckPad(frame, Math.max(0, (ship?.shieldNow ?? 1) - 1), false, scale);
            const spark = zoltan ? token("--color-ok", "#3ee56a") : "#6cc4ff";
            const center = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
            end =
              bubbleCrossing(source, hit, center, target.w / 2 + pad, target.h / 2 + pad) ?? hit;
            if (!beamCutSeen.has(shot.id)) {
              beamCutSeen.add(shot.id);
              rings.push({
                box: target,
                life: 0.45,
                pad,
                scale,
                color: zoltan ? spark : undefined,
              });
            }
            if (live && Math.random() < 0.5) burst(end, spark, 1, 50);
          }
          paintBeam(inLayer, source, end, color, inLayer === "world" ? 1 : scale);
          drawOn(outLayer, (c) => {
            // Muzzle flare at the weapon tip.
            const s = outScale * 3;
            c.globalAlpha = 0.5;
            c.fillStyle = color;
            c.fillRect(
              Math.round(from.x - s * 1.5),
              Math.round(from.y - s * 1.5),
              Math.round(s * 3),
              Math.round(s * 3),
            );
            c.globalAlpha = 1;
            c.fillStyle = "#ffffff";
            c.fillRect(
              Math.round(from.x - s / 2),
              Math.round(from.y - s / 2),
              Math.round(s),
              Math.round(s),
            );
          });
          if (cut == null) {
            const prev = beamHit.get(shot.id);
            if (live && prev && (prev.x !== hit.x || prev.y !== hit.y))
              trails.push({ a: prev, b: hit, life: 0.3, max: 0.3, color, scale });
            beamHit.set(shot.id, hit);
            drawOn(inLayer, (c) => {
              const r = 4 * scale;
              c.globalAlpha = 0.45;
              c.fillStyle = color;
              c.fillRect(
                Math.round(hit.x - r * 1.5),
                Math.round(hit.y - r * 1.5),
                Math.round(r * 3),
                Math.round(r * 3),
              );
              c.globalAlpha = 1;
              c.fillRect(
                Math.round(hit.x - r),
                Math.round(hit.y - r),
                Math.round(r * 2),
                Math.round(r * 2),
              );
              c.fillStyle = "#ffffff";
              c.fillRect(
                Math.round(hit.x - r / 2),
                Math.round(hit.y - r / 2),
                Math.round(r),
                Math.round(r),
              );
            });
            if (live && Math.random() < 0.6) burst(hit, color, 1, 60);
          } else beamHit.delete(shot.id);
          const ang = Math.atan2(end.y - source.y, end.x - source.x);
          seen.set(shot.id, {
            at: end,
            color,
            kind: "beam",
            ang,
            side,
            roomId: shot.targetRoom,
            aim: end,
            approachAng: ang,
            speed: 0,
            onArrival: true,
            carryLayer: inLayer,
            spin: hash(shot.id),
            cut: cut != null,
          });
          continue;
        }
        const from = muzzle(shot);
        const to = aimAt(shot, shot.targetRoom);
        if (!from || !to) continue;
        const crossing = crossesCameras(shot) && !!panelBox && !!stageBox;
        // First half leaves the firing camera: ahead for the player, up for the enemy preview.
        // Second half arrives in the other camera.
        const outbound = crossing && t < 0.5;
        const leg = crossing ? (outbound ? t / 0.5 : (t - 0.5) / 0.5) : t;
        let x = from.x + (to.x - from.x) * t;
        let y = from.y + (to.y - from.y) * t;
        let ang = Math.atan2(to.y - from.y, to.x - from.x);
        let layer: Layer = "over";
        if (!crossing && shot.kind === "missile") {
          y += Math.sin(t * Math.PI) * -24;
          ang = Math.atan2(to.y - from.y + Math.cos(t * Math.PI) * -24 * Math.PI, to.x - from.x);
        }
        if (outbound && panelBox) {
          if (shot.from === "enemy") {
            // The preview guns point up, so the bolt leaves upward and exits that camera.
            x = from.x;
            y = from.y + (-OFFSCREEN_PX - from.y) * leg;
            ang = -Math.PI / 2;
            layer = "panel";
          } else {
            const endX = w + 48;
            x = from.x + (endX - from.x) * leg;
            y = from.y;
            ang = 0;
            layer = "world";
          }
        } else if (crossing && panelBox && stageBox) {
          const approach = approachAngle(g.time, shot);
          // Player bolts enter the preview frame. Enemy bolts are born outside the screen.
          const bounds =
            shot.from === "player"
              ? panelBox
              : {
                  x: -OFFSCREEN_PX,
                  y: -OFFSCREEN_PX,
                  w: w + OFFSCREEN_PX * 2,
                  h: h + OFFSCREEN_PX * 2,
                };
          const entry = entryPoint(to, approach, bounds);
          x = entry.x + (to.x - entry.x) * leg;
          y = entry.y + (to.y - entry.y) * leg;
          ang = Math.atan2(to.y - entry.y, to.x - entry.x);
          layer = shot.from === "player" ? "panel" : "world";
        } else if (shot.from === "env" && targetSide(shot) === "enemy") {
          layer = "panel";
        }
        const rock = shot.from === "env" && shot.kind === "laser";
        const spin = hash(shot.id);
        // Inbound leg a miss continues along. Crossing shots spend the second half of the flight on it.
        let aimFrom = from;
        let approachAng = Math.atan2(to.y - from.y, to.x - from.x);
        let aimSeconds = shot.duration;
        if (crossing && panelBox && stageBox) {
          const approach = approachAngle(g.time, shot);
          const bounds =
            shot.from === "player"
              ? panelBox
              : {
                  x: -OFFSCREEN_PX,
                  y: -OFFSCREEN_PX,
                  w: w + OFFSCREEN_PX * 2,
                  h: h + OFFSCREEN_PX * 2,
                };
          aimFrom = entryPoint(to, approach, bounds);
          approachAng = Math.atan2(to.y - aimFrom.y, to.x - aimFrom.x);
          aimSeconds = shot.duration / 2;
        }
        const carryLayer: FxLayer = crossing ? (shot.from === "player" ? "panel" : "world") : layer;
        const rec: Seen = {
          at: { x, y },
          color,
          kind: shot.kind,
          ang,
          side: targetSide(shot),
          roomId: shot.targetRoom,
          rock,
          aim: to,
          approachAng,
          speed: flightSpeed(aimFrom, to, aimSeconds),
          onArrival: !outbound,
          carryLayer,
          spin,
        };
        seen.set(shot.id, rec);

        if (rock) {
          const rockScale = layer === "panel" ? foeScale : 1;
          drawOn(layer, (c) => {
            c.save();
            c.translate(Math.round(x), Math.round(y));
            paintBolt(c, shot.kind, color, ang, t * 9 + spin * Math.PI * 2, true, spin, rockScale);
            c.restore();
          });
          if (live && Math.random() < 0.65) {
            sparks.push({
              x: x - Math.cos(ang) * 8,
              y: y - Math.sin(ang) * 8,
              vx: -Math.cos(ang) * 24,
              vy: -Math.sin(ang) * 24 + (Math.random() - 0.5) * 12,
              life: 0.3,
              max: 0.3,
              color: "#a39888",
              size: 2,
              layer: layer === "world" ? "world" : undefined,
            });
          }
          continue;
        }

        if (shot.kind === "bomb") {
          // Bombs teleport in: a closing ring at the target room, then the impact.
          rec.at = to;
          const bombSide = targetSide(shot);
          const bombScale = readShipScale(host.querySelector(`.hull[data-ship="${bombSide}"]`));
          const bombLayer: Layer = bombSide === "enemy" ? "panel" : "over";
          drawOn(bombLayer, (c) => {
            const r = (22 * (1 - t) + 4) * bombScale;
            c.strokeStyle = color;
            c.lineWidth = 2 * bombScale;
            c.globalAlpha = 0.4 + 0.6 * t;
            c.strokeRect(
              Math.round(to.x - r),
              Math.round(to.y - r),
              Math.round(r * 2),
              Math.round(r * 2),
            );
            c.globalAlpha = 1;
            c.fillStyle = color;
            c.fillRect(
              Math.round(to.x) - 2 * bombScale,
              Math.round(to.y) - 2 * bombScale,
              4 * bombScale,
              4 * bombScale,
            );
          });
          continue;
        }

        drawOn(layer, (c) => {
          c.save();
          c.translate(Math.round(x), Math.round(y));
          paintBolt(c, shot.kind, color, ang, t * 12, false, spin);
          c.restore();
        });
        if (shot.kind === "missile" && live && Math.random() < 0.7) {
          sparks.push({
            x,
            y,
            vx: -Math.cos(ang) * 20,
            vy: -Math.sin(ang) * 20 + (Math.random() - 0.5) * 10,
            life: 0.6,
            max: 0.6,
            color: "#8a9096",
            size: 3,
            layer: layer === "world" ? "world" : undefined,
          });
        }
      }

      // Shots that left the list this frame landed, were dodged, or were shot down.
      // Floaters that just appeared (not yet drawn) say which of those was a shield, a miss, or a hit.
      // They carry no room id: x > 50 is the player hull, matching targetSide. One claim per shot, in order.
      const gone: Seen[] = [];
      for (const [id, s] of seen) {
        if (alive.has(id)) continue;
        seen.delete(id);
        tickT.delete(id);
        beamHit.delete(id);
        beamCutSeen.delete(id);
        if (g.phase !== "combat") continue;
        // A beam already printed its numbers while it fired. It takes no landing claim.
        if (s.kind === "beam") {
          if (!s.cut) {
            burst(s.at, s.color, 4, 60);
            burst(s.at, "#ffffff", 2, 36);
          }
          continue;
        }
        gone.push(s);
      }
      const fresh: Claim[] = [];
      for (const f of g.floaters) {
        if (seenFloaters.has(f.id) || f.beam) continue;
        fresh.push({
          text: f.text === "SHIELD" ? "SHIELD" : f.text === "MISS" ? "MISS" : "HIT",
          side: f.x > 50 ? "player" : "enemy",
        });
      }
      const queues: Record<"player" | "enemy", Claim[]> = { player: [], enemy: [] };
      for (const side of ["player", "enemy"] as const) {
        queues[side] = fresh.filter((c) => c.side === side);
      }
      const missPuff = (at: Pt) => {
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 24 * (0.45 + Math.random());
          sparks.push({
            x: at.x,
            y: at.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0.18,
            max: 0.18,
            color: "#ffffff",
            size: 2,
          });
        }
      };
      const shieldSpark = (at: Pt) => {
        sparks.push({
          x: at.x,
          y: at.y,
          vx: 0,
          vy: 0,
          life: 0.16,
          max: 0.16,
          color: "#ffffff",
          size: 2,
        });
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 34 * (0.4 + Math.random());
          sparks.push({
            x: at.x,
            y: at.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0.22,
            max: 0.22,
            color: "#6cc4ff",
            size: 2,
          });
        }
      };
      const kindImpact = (s: Seen) => {
        if (s.rock) {
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = 46 + Math.random() * 74;
            sparks.push({
              x: s.at.x,
              y: s.at.y,
              vx: Math.cos(a) * v,
              vy: Math.sin(a) * v,
              life: 0.42,
              max: 0.42,
              color: i % 2 ? "#8a8174" : "#d9cbb6",
              size: i % 3 === 0 ? 3 : 2,
              drag: 0.9,
            });
          }
          marks.push({
            x: s.at.x,
            y: s.at.y,
            w: 6,
            h: 6,
            life: 0.2,
            max: 0.2,
            color: "#c4b8a4",
            fill: true,
          });
          return;
        }
        if (s.kind === "laser") {
          streaks.push({
            x: s.at.x,
            y: s.at.y,
            ang: s.ang,
            len: 16,
            life: 0.16,
            max: 0.16,
            color: s.color,
          });
          for (let i = 0; i < 6; i++) {
            const a = s.ang + (Math.random() - 0.5) * 0.85;
            const v = 78 * (0.35 + Math.random() * 0.9);
            sparks.push({
              x: s.at.x,
              y: s.at.y,
              vx: Math.cos(a) * v,
              vy: Math.sin(a) * v,
              life: 0.3,
              max: 0.3,
              color: i < 2 ? "#ffffff" : s.color,
              size: 2,
            });
          }
          marks.push({
            x: s.at.x,
            y: s.at.y,
            w: 8,
            h: 8,
            life: 0.22,
            max: 0.22,
            color: "#ffffff",
            fill: false,
            grow: 22,
            ring: true,
          });
          return;
        }
        if (s.kind === "ion") {
          const blue = token("--color-ion", "#8ecbff");
          marks.push({
            x: s.at.x,
            y: s.at.y,
            w: 14,
            h: 14,
            life: 0.14,
            max: 0.14,
            color: blue,
            fill: true,
          });
          marks.push({
            x: s.at.x,
            y: s.at.y,
            w: 4,
            h: 4,
            life: 0.14,
            max: 0.14,
            color: "#ffffff",
            fill: true,
          });
          marks.push({
            x: s.at.x,
            y: s.at.y,
            w: 12,
            h: 12,
            life: 0.4,
            max: 0.4,
            color: blue,
            fill: false,
            grow: 78,
            width: 2,
          });
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const v = 110 * (0.45 + Math.random() * 0.7);
            sparks.push({
              x: s.at.x,
              y: s.at.y,
              vx: Math.cos(a) * v,
              vy: Math.sin(a) * v,
              life: 0.2,
              max: 0.2,
              color: i % 2 ? "#ffffff" : blue,
              size: 2,
              drag: 0.84,
            });
          }
          return;
        }
        if (s.kind === "missile") {
          marks.push({
            x: s.at.x,
            y: s.at.y,
            w: 18,
            h: 18,
            life: 0.7,
            max: 0.7,
            color: "#ff6a1a",
            fill: true,
            grow: 16,
          });
          marks.push({
            x: s.at.x,
            y: s.at.y,
            w: 10,
            h: 10,
            life: 0.7,
            max: 0.7,
            color: "#ffc14a",
            fill: true,
            grow: 6,
          });
          marks.push({
            x: s.at.x,
            y: s.at.y,
            w: 4,
            h: 4,
            life: 0.35,
            max: 0.35,
            color: "#fff6e0",
            fill: true,
          });
          for (let i = 0; i < 7; i++) {
            sparks.push({
              x: s.at.x + (Math.random() - 0.5) * 8,
              y: s.at.y + (Math.random() - 0.5) * 6,
              vx: (Math.random() - 0.5) * 14,
              vy: -8 - Math.random() * 18,
              life: 0.75,
              max: 0.75,
              color: i % 2 ? "#8e969c" : "#c5ccd1",
              size: 3 + (i % 2),
              drag: 0.97,
              lift: -26,
            });
          }
          return;
        }
        if (s.kind === "bomb") {
          const box = room(s.side, s.roomId);
          const rect =
            box && box.w > 2 && box.h > 2 ? box : { x: s.at.x - 18, y: s.at.y - 18, w: 36, h: 36 };
          const at = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
          marks.push({
            x: at.x,
            y: at.y,
            w: rect.w,
            h: rect.h,
            life: 0.26,
            max: 0.26,
            color: "#fff1c9",
            fill: true,
          });
          burst(at, s.color, 18, 120);
          burst(at, "#ffffff", 4, 50);
          return;
        }
        // Flak (the tumbling chunk): square shards that keep their velocity.
        for (let i = 0; i < 7; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 60 + Math.random() * 70;
          sparks.push({
            x: s.at.x,
            y: s.at.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0.55,
            max: 0.55,
            color: i % 2 ? s.color : "#d9c7a2",
            size: i % 3 === 0 ? 4 : 3,
            drag: 0.99,
          });
        }
      };
      for (let i = 0; i < gone.length; i++) {
        const s = gone[i];
        const q = queues[s.side];
        const claim = q.shift();
        if (claim?.text === "MISS") {
          // The dodge is already resolved. The bolt keeps flying through the room and out of the camera.
          const start = s.onArrival ? s.at : s.aim;
          const vel = shotFliesPast(s.kind)
            ? missVelocity(start, s.aim, s.approachAng, s.speed)
            : null;
          if (vel) {
            flybys.push({
              x: start.x,
              y: start.y,
              vx: vel.vx,
              vy: vel.vy,
              ang: vel.ang,
              kind: s.kind,
              color: s.color,
              layer: s.carryLayer,
              rock: !!s.rock,
              spin: s.spin,
              age: 0,
              fresh: true,
            });
          } else missPuff(s.at);
          continue;
        }
        // Shield ring is pushed with the floater below. A pure shield hit skips the hull burst.
        // A damage number still queued for this shot (no later shot on that hull) keeps the kind impact.
        if (claim?.text === "SHIELD") {
          shieldSpark(s.at);
          const later = gone.slice(i + 1).some((o) => o.side === s.side);
          if (later || !q.some((c) => c.text === "HIT")) continue;
        }
        kindImpact(s);
      }
      for (const side of ["player", "enemy"] as const) {
        const target = hull(side);
        if (!target) continue;
        const at = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
        for (const c of queues[side]) if (c.text === "MISS") missPuff(at);
      }

      for (let i = flybys.length - 1; i >= 0; i--) {
        const f = flybys[i];
        if (live && !f.fresh) {
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.age += dt;
        }
        const bounds = f.layer === "panel" && panelBox ? panelBox : { x: 0, y: 0, w, h };
        if (
          !f.fresh &&
          (f.age > MISS_MAX_AGE || leftCamera({ x: f.x, y: f.y }, bounds, MISS_EXIT_MARGIN))
        ) {
          flybys.splice(i, 1);
          continue;
        }
        const tumble = f.rock ? f.age * 9 + f.spin * Math.PI * 2 : f.age * 12;
        drawOn(f.layer, (c) => {
          c.save();
          c.translate(Math.round(f.x), Math.round(f.y));
          paintBolt(
            c,
            f.kind,
            f.color,
            f.ang,
            tumble,
            f.rock,
            f.spin,
            f.rock && f.layer === "panel" ? foeScale : 1,
          );
          c.restore();
        });
        if (live && f.rock && Math.random() < 0.65) {
          sparks.push({
            x: f.x - Math.cos(f.ang) * 8,
            y: f.y - Math.sin(f.ang) * 8,
            vx: -Math.cos(f.ang) * 24,
            vy: -Math.sin(f.ang) * 24 + (Math.random() - 0.5) * 12,
            life: 0.3,
            max: 0.3,
            color: "#a39888",
            size: 2,
            layer: f.layer === "world" ? "world" : undefined,
          });
        } else if (live && f.kind === "missile" && Math.random() < 0.7) {
          sparks.push({
            x: f.x,
            y: f.y,
            vx: -Math.cos(f.ang) * 20,
            vy: -Math.sin(f.ang) * 20 + (Math.random() - 0.5) * 10,
            life: 0.6,
            max: 0.6,
            color: "#8a9096",
            size: 3,
            layer: f.layer === "world" ? "world" : undefined,
          });
        }
        if (live) f.fresh = false;
      }

      for (const f of g.floaters) {
        if (seenFloaters.has(f.id)) continue;
        seenFloaters.add(f.id);
        // floatAt puts the player ship's floaters right of centre (x > 50) and the enemy's left of it.
        const side = f.x > 50 ? "player" : "enemy";
        const target = hull(side);
        if (!target) continue;
        const color = f.text === "MISS" ? "#c8fff0" : f.text === "SHIELD" ? "#6cc4ff" : "#ff6a5a";
        if (f.text === "SHIELD") {
          const ship = side === "player" ? g.player : g.enemy;
          const hullNode = host.querySelector(`.hull[data-ship="${side}"]`);
          const scale = readShipScale(hullNode);
          const pad = ship
            ? struckPad(
                bubbleRoom(hullNode, target, box),
                ship.shieldNow,
                (ship.zoltan ?? 0) > 0,
                scale,
              )
            : 16 * scale;
          rings.push({ box: target, life: 0.45, pad, scale });
        }
        // @agent:flagship. Stagger: a volley lands several numbers at once (the 7-laser surge printed "MMISS -11 -1").
        // Each new number takes the lowest slot not held by a still-fresh number over the same hull: three columns
        // 58 px apart, then rows 24 px higher.
        const busy = new Set(
          texts.filter((x) => x.side === side && x.life > 0.35).map((x) => x.slot),
        );
        let slot = 0;
        while (busy.has(slot)) slot += 1;
        const col = [0, -1, 1][slot % 3];
        const row = Math.floor(slot / 3) % 4;
        texts.push({
          text: f.text,
          x: target.x + target.w * 0.5 + col * 58,
          y: target.y - 6 - row * 24,
          life: 0.9,
          color,
          side,
          slot,
        });
      }
      if (seenFloaters.size > 64)
        for (const id of [...seenFloaters].slice(0, 32)) seenFloaters.delete(id);

      // Drone hits. g.droneBlasts has no id; one burst the first time a key shows up.
      // Age already past 0.15 means a reload, not a hit this moment, so it does not replay.
      if (g.phase !== "combat") droneMem.clear();
      else {
        for (const [id, p] of enemyDroneAt) droneMem.set(`e:${id}`, p);
        for (const [k, p] of droneAt) droneMem.set(`p:${k}`, p);
      }
      const liveBlasts = new Set<string>();
      const blasts: DroneBlast[] = g.droneBlasts ?? [];
      for (const b of blasts) {
        const key = `${b.side}:${b.unitId ?? b.kind}:${b.result}`;
        if (liveBlasts.has(key)) continue;
        liveBlasts.add(key);
        if (seenBlast.has(key)) continue;
        seenBlast.add(key);
        if (b.age > 0.15 || g.phase !== "combat") continue;
        let at: Pt | null = null;
        if (b.unitId) at = enemyDroneAt.get(b.unitId) ?? droneMem.get(`e:${b.unitId}`) ?? null;
        if (!at && b.side === "player") {
          const k = droneKeyOf(b.kind);
          if (k) at = droneAt.get(k) ?? droneMem.get(`p:${k}`) ?? null;
        }
        if (!at) {
          const around = hull(b.at === "player-orbit" ? "player" : "enemy");
          if (around) at = { x: around.x + around.w / 2, y: around.y + around.h / 2 };
        }
        if (!at) continue;
        if (b.result === "ion") {
          marks.push({
            x: at.x,
            y: at.y,
            w: 10,
            h: 10,
            life: 0.18,
            max: 0.18,
            color: token("--color-ion", "#8ecbff"),
            fill: true,
          });
          continue;
        }
        burst(at, "#ff7a22", 18, 120);
        burst(at, "#ffffff", 4, 50);
        marks.push({
          x: at.x,
          y: at.y,
          w: 16,
          h: 16,
          life: 0.35,
          max: 0.35,
          color: "#ff7a22",
          fill: true,
          grow: 28,
        });
      }
      for (const key of seenBlast) if (!liveBlasts.has(key)) seenBlast.delete(key);

      for (let i = trails.length - 1; i >= 0; i--) {
        const s = trails[i];
        if (live) s.life -= dt;
        if (s.life <= 0) {
          trails.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, s.life / s.max);
        ctx.lineCap = "square";
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 4 * s.scale;
        line(ctx, s.a, s.b);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5 * s.scale;
        line(ctx, s.a, s.b);
      }
      ctx.globalAlpha = 1;

      for (let i = marks.length - 1; i >= 0; i--) {
        const m = marks[i];
        if (live) m.life -= dt;
        if (m.life <= 0) {
          marks.splice(i, 1);
          continue;
        }
        const grown = (m.grow ?? 0) * (m.max - m.life);
        const alpha = Math.max(0, m.life / m.max);
        ctx.globalAlpha = m.fill ? alpha * (m.w > 24 ? 0.72 : 0.92) : alpha;
        if (m.ring) {
          const r = (m.w + grown) / 2;
          ctx.fillStyle = m.color;
          for (let n = 0; n < 8; n++) {
            const a = (n / 8) * Math.PI * 2;
            ctx.fillRect(
              Math.round(m.x + Math.cos(a) * r) - 1,
              Math.round(m.y + Math.sin(a) * r) - 1,
              2,
              2,
            );
          }
          continue;
        }
        const w = m.w + grown;
        const h = m.h + grown;
        const x0 = Math.round(m.x - w / 2);
        const y0 = Math.round(m.y - h / 2);
        const rw = Math.max(1, Math.round(w));
        const rh = Math.max(1, Math.round(h));
        ctx.fillStyle = m.color;
        if (m.fill) {
          ctx.fillRect(x0, y0, rw, rh);
          continue;
        }
        const t = m.width ?? 2;
        ctx.fillRect(x0, y0, rw, t);
        ctx.fillRect(x0, y0 + rh - t, rw, t);
        ctx.fillRect(x0, y0, t, rh);
        ctx.fillRect(x0 + rw - t, y0, t, rh);
      }
      ctx.globalAlpha = 1;

      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        if (live) s.life -= dt;
        if (s.life <= 0) {
          streaks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, s.life / s.max);
        for (let n = 0; n < 6; n++) {
          const k = -s.len * (n / 5);
          const x = Math.round(s.x + Math.cos(s.ang) * k);
          const y = Math.round(s.y + Math.sin(s.ang) * k);
          const hot = n < 4;
          ctx.fillStyle = hot ? "#ffffff" : s.color;
          ctx.fillRect(x - 1, y - 1, n === 0 ? 3 : 2, n === 0 ? 3 : 2);
        }
      }
      ctx.globalAlpha = 1;

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        if (live) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.lift) p.y += p.lift * dt;
          const drag = p.drag ?? 0.92;
          p.vx *= drag;
          p.vy *= drag;
        }
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const sparkCtx = p.layer === "world" ? underCtx : ctx;
        sparkCtx.globalAlpha = Math.max(0, p.life / p.max);
        sparkCtx.fillStyle = p.color;
        sparkCtx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
      underCtx.globalAlpha = 1;

      // Shield hits: the bubble around the struck hull flashes.
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        if (live) r.life -= dt;
        if (r.life <= 0) {
          rings.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = r.life / 0.45;
        ctx.strokeStyle = r.color ?? "#6cc4ff";
        ctx.lineWidth = 4 * (r.scale ?? 1);
        ctx.beginPath();
        ctx.ellipse(
          r.box.x + r.box.w / 2,
          r.box.y + r.box.h / 2,
          r.box.w / 2 + r.pad,
          r.box.h / 2 + r.pad,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.font = "26px VT323, monospace";
      ctx.textAlign = "center";
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        if (live) {
          t.life -= dt;
          t.y -= 18 * dt;
        }
        if (t.life <= 0) {
          texts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.min(1, t.life / 0.3);
        ctx.fillStyle = "#020308";
        ctx.fillText(t.text, Math.round(t.x) + 2, Math.round(t.y) + 2);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, Math.round(t.x), Math.round(t.y));
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <canvas ref={underRef} className="fx-canvas fx-under" aria-hidden="true" />
      <canvas ref={overRef} className="fx-canvas" aria-hidden="true" />
    </>
  );
}

function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt) {
  ctx.beginPath();
  ctx.moveTo(Math.round(a.x), Math.round(a.y));
  ctx.lineTo(Math.round(b.x), Math.round(b.y));
  ctx.stroke();
}
