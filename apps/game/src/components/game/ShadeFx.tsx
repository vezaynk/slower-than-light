/**
 * Picture-only bursts. A destroyed ship breaks into its own tiles, a Zoltan shield
 * shatters, a crew death puffs, and a teleport beams out and in. The sim has already applied
 * the damage; this canvas does not change it.
 */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useGame } from "@/game/store";
import { halted, shieldChargeFraction } from "@/game/sim";
import { bubbleRoom, readShipScale, shieldRing, zoltanPad } from "./shield-bubble";
import { combatPlateId } from "@/game/wiki/flagship-layout";
import { animSpeed } from "./speed";
import type { Ship } from "@/game/types";
import { pageRect } from "./turn";

/** True while the enemy ship's break-up tiles are still in the air. */
let enemyWreck = false;
const wreckListeners = new Set<() => void>();

function setEnemyWreck(next: boolean) {
  if (enemyWreck === next) return;
  enemyWreck = next;
  for (const listener of wreckListeners) listener();
}

export function useEnemyWreck() {
  return useSyncExternalStore(
    (listener) => {
      wreckListeners.add(listener);
      return () => wreckListeners.delete(listener);
    },
    () => enemyWreck,
    () => false,
  );
}

type Side = "player" | "enemy";
type Box = { x: number; y: number; w: number; h: number };
type Chunk = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  w: number;
  h: number;
  /** Piece of the enemy hull break-up. The target panel stays until these are gone. */
  wreck?: boolean;
};
type Piece = { x: number; y: number; w: number; h: number; color: string };
type Oval = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  life: number;
  max: number;
  spread: number;
  width: number;
  color: string;
};
type CrewSnap = {
  kin?: string;
  room: string;
  aboard: Side;
  pathEmpty: boolean;
  move: number;
  box?: Box | null;
};
/** Per the user: a teleport is a column of light. `inward` closes onto an arriving crew member, otherwise it lifts away. */
type Beam = {
  x: number;
  y: number;
  w: number;
  h: number;
  life: number;
  max: number;
  inward: boolean;
};
type Arrival = { id: string; side: Side; room: string; tries: number };

const ORANGE = ["#ff7a18", "#ffb15a", "#e23a22"];
const WHITE = ["#fff6ea", "#ffffff"];
const DARK = ["#140e0c", "#2a211c", "#5a4036"];
const GREEN = ["#3ee56a", "#e9ffe8", "#1c7a38"];
const SPARK = ["#f2e34a", "#fff6ea", "#ffffff", "#ffe98a"];
const ASH = ["#8b939a", "#c5ccd1", "#3e464c"];

export function ShadeFx() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    const chunks: Chunk[] = [];
    const ovals: Oval[] = [];
    const beams: Beam[] = [];
    const arrivals: Arrival[] = [];
    const cache: Partial<Record<Side, Box>> = {};
    const plates: Partial<Record<Side, Piece[]>> = {};
    /** The target panel's ship view when the enemy broke up: its pieces are drawn inside it. */
    let wreckClip: Box | null = null;
    const crew = new Map<string, CrewSnap>();
    let seenPlayerHull = 0;
    let seenEnemyHull: number | null = null;
    let enemyRef: Ship | null = null;
    let seenPlayerZ = 0;
    let seenEnemyZ = 0;

    const push = (p: Chunk) => chunks.push(p);

    const spray = (
      x: number,
      y: number,
      colors: readonly string[],
      count: number,
      speed: number,
      life: number,
      size: number,
      spread: number,
    ) => {
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const v = speed * (0.45 + Math.random() * 0.55);
        const dw = size + (i % 3);
        const dh = size + ((i + 1) % 3);
        push({
          x: x + (Math.random() - 0.5) * spread,
          y: y + (Math.random() - 0.5) * spread,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v,
          life,
          max: life,
          color: colors[i % colors.length]!,
          w: dw,
          h: dh,
        });
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Per the user: fast forward speeds the effects up too (speed.ts).
      const dt = Math.min(0.05, (now - last) / 1000) * animSpeed();
      last = now;
      const g = useGame.getState().game;

      const base = pageRect(host);
      const w = host.offsetWidth;
      const h = host.offsetHeight;
      if (!w || !h) return;
      const scale = base.width / w;
      const dpr = window.devicePixelRatio || 1;
      if (!(scale > 0)) return;
      const backW = Math.round(w * scale * dpr);
      const backH = Math.round(h * scale * dpr);
      if (canvas.width !== backW || canvas.height !== backH) {
        canvas.width = backW;
        canvas.height = backH;
      }
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;

      const measure = (el: Element | null): Box | null => {
        if (!el) return null;
        const r = pageRect(el);
        if (r.width < 1 || r.height < 1) return null;
        return {
          x: (r.left - base.left) / scale,
          y: (r.top - base.top) / scale,
          w: r.width / scale,
          h: r.height / scale,
        };
      };
      const hullEl = (side: Side) => host.querySelector(`.hull[data-ship="${side}"]`);
      const paintOf = (el: Element): string | null => {
        const color = getComputedStyle(el).backgroundColor;
        if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return null;
        return color;
      };
      const remember = (side: Side) => {
        const hull = hullEl(side);
        const live = measure(hull);
        if (!live || !hull) return;
        cache[side] = live;
        const bits: Piece[] = [];
        const add = (
          r: { left: number; top: number; width: number; height: number },
          color: string,
        ) => {
          if (r.width < 1 || r.height < 1) return;
          bits.push({
            x: (r.left - base.left) / scale,
            y: (r.top - base.top) / scale,
            w: r.width / scale,
            h: r.height / scale,
            color,
          });
        };
        for (const rect of hull.querySelectorAll(".hull-plate rect")) {
          add(pageRect(rect), rect.getAttribute("fill") || "#6a7078");
        }
        for (const room of hull.querySelectorAll(".room, .pixel-fill")) {
          const color = paintOf(room);
          if (color) add(pageRect(room), color);
        }
        if (bits.length) plates[side] = bits;
      };
      const roomBox = (side: Side, id: string): Box | null =>
        measure(host.querySelector(`.hull[data-ship="${side}"] [data-room="${CSS.escape(id)}"]`));

      // React can drop the enemy hull on the same tick the sim sets hull to 0. Keep the last tiles.
      remember("player");
      remember("enemy");

      const explode = (side: Side) => {
        const b = cache[side];
        if (!b) return;
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        const wreck = side === "enemy";
        const bits = plates[side] ?? [];
        for (const bit of bits) {
          const px = bit.x + bit.w / 2;
          const py = bit.y + bit.h / 2;
          const dist = Math.hypot(px - cx, py - cy);
          const ang =
            dist < 8
              ? Math.random() * Math.PI * 2
              : Math.atan2(py - cy, px - cx) + (Math.random() - 0.5) * 0.35;
          const speed = 80 + Math.random() * 150 + dist * 0.4;
          const life = 0.85 + Math.random() * 0.35;
          push({
            x: bit.x,
            y: bit.y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            life,
            max: life,
            color: bit.color,
            w: Math.max(2, bit.w),
            h: Math.max(2, bit.h),
            wreck,
          });
        }
        const palette = [...ORANGE, ...WHITE, ...DARK];
        for (let i = 0; i < 28; i++) {
          const ang = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const hot = i % 3 === 1;
          const speed = (hot ? 220 : 120) + Math.random() * 140;
          push({
            x: cx + (Math.random() - 0.5) * b.w * 0.35,
            y: cy + (Math.random() - 0.5) * b.h * 0.35,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            life: 0.7,
            max: 0.7,
            color: palette[i % palette.length]!,
            w: hot ? 3 : 4 + (i % 3),
            h: hot ? 3 : 4 + ((i + 1) % 3),
            wreck,
          });
        }
        if (wreck) {
          setEnemyWreck(true);
          // Per the user: the break-up stays inside the target panel's ship view.
          wreckClip = measure(host.querySelector(".target-body"));
        }
        hullEl(side)?.classList.add("is-gone");
      };

      const zPad = (side: Side, b: Box) => {
        const ship = side === "player" ? g.player : g.enemy;
        const layers = ship?.shieldNow ?? 0;
        const charging = ship ? shieldChargeFraction(g, ship, side) != null : false;
        const el = hullEl(side);
        return zoltanPad(bubbleRoom(el, b, measure), layers, charging, readShipScale(el));
      };

      const shieldOval = (
        side: Side,
        life: number,
        spread: number,
        width: number,
        color: string,
      ) => {
        const b = cache[side];
        if (!b) return;
        const ring = shieldRing(combatPlateId(g, side), b, zPad(side, b));
        ovals.push({
          x: b.x + b.w / 2 + ring.dx,
          y: b.y + b.h / 2 + ring.dy,
          rx: ring.rx,
          ry: ring.ry,
          life,
          max: life,
          spread,
          width: width * readShipScale(hullEl(side)),
          color,
        });
      };

      const shatter = (side: Side) => {
        const b = cache[side];
        if (!b) return;
        const ring = shieldRing(combatPlateId(g, side), b, zPad(side, b));
        const cx = b.x + b.w / 2 + ring.dx;
        const cy = b.y + b.h / 2 + ring.dy;
        const rx = ring.rx;
        const ry = ring.ry;
        shieldOval(side, 0.6, 40, 3, "#3ee56a");
        shieldOval(side, 0.6, 18, 2, "#e9ffe8");
        for (let i = 0; i < 28; i++) {
          const ang = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
          const v = 130 + Math.random() * 190;
          push({
            x: cx + Math.cos(ang) * rx,
            y: cy + Math.sin(ang) * ry,
            vx: Math.cos(ang) * v,
            vy: Math.sin(ang) * v,
            life: 0.6,
            max: 0.6,
            color: GREEN[i % GREEN.length]!,
            w: 2 + (i % 3),
            h: 2 + ((i + 1) % 3),
          });
        }
      };

      // A layer lost while the bubble remains is a flash, not the break.
      const flash = (side: Side) => {
        shieldOval(side, 0.18, 0, 3, "#b6ffc4");
      };

      const noteZ = (side: Side, prev: number, next: number) => {
        if (prev > 0 && next === 0) shatter(side);
        else if (prev > next && next > 0) flash(side);
      };

      const playerHull = g.player.hull;
      if (seenPlayerHull > 0 && playerHull <= 0) explode("player");
      else if (playerHull > 0) hullEl("player")?.classList.remove("is-gone");
      seenPlayerHull = playerHull;

      const enemy = g.enemy;
      if (enemy) {
        if (enemyRef === enemy && seenEnemyHull != null && seenEnemyHull > 0 && enemy.hull <= 0)
          explode("enemy");
        else if (
          enemyRef &&
          enemyRef !== enemy &&
          seenEnemyHull != null &&
          seenEnemyHull > 0 &&
          enemyRef.hull <= 0
        )
          explode("enemy");
        seenEnemyHull = enemy.hull;
        if (enemy.hull > 0) hullEl("enemy")?.classList.remove("is-gone");
        if (enemyRef === enemy) noteZ("enemy", seenEnemyZ, enemy.zoltan ?? 0);
        else if (enemyRef && seenEnemyZ > 0 && (enemyRef.zoltan ?? 0) === 0) shatter("enemy");
        seenEnemyZ = enemy.zoltan ?? 0;
        enemyRef = enemy;
      } else {
        if (enemyRef && seenEnemyHull != null && seenEnemyHull > 0 && enemyRef.hull <= 0)
          explode("enemy");
        if (enemyRef && seenEnemyZ > 0 && (enemyRef.zoltan ?? 0) === 0) shatter("enemy");
        seenEnemyHull = null;
        seenEnemyZ = 0;
        enemyRef = null;
      }

      const pz = g.player.zoltan ?? 0;
      noteZ("player", seenPlayerZ, pz);
      seenPlayerZ = pz;

      const crewBox = (side: Side, id: string): Box | null =>
        measure(host.querySelector(`.hull[data-ship="${side}"] [data-crew="${CSS.escape(id)}"]`));
      // INVENTED art: a teleport leaves as a rising column of orange and white pixels (the Teleporter colour) and
      // arrives as a column closing onto the crew member, who flickers in.
      const beamAt = (b: Box, inward: boolean) => {
        const life = inward ? 0.55 : 0.5;
        beams.push({ x: b.x, y: b.y, w: b.w, h: b.h, life, max: life, inward });
        const cx = b.x + b.w / 2;
        for (let i = 0; i < 12; i++) {
          const off = (Math.random() - 0.5) * b.w;
          push({
            x: cx + off,
            y: inward
              ? b.y - b.h * (0.4 + Math.random() * 0.6)
              : b.y + b.h * (0.3 + Math.random() * 0.7),
            vx: inward ? -off * 1.2 : off * 0.4,
            vy: inward ? 70 + Math.random() * 40 : -(60 + Math.random() * 50),
            life: 0.45,
            max: 0.45,
            color: (i % 3 === 0 ? WHITE : ORANGE)[i % 2]!,
            w: 2,
            h: 2 + (i % 2),
          });
        }
      };
      const leave = (prev: CrewSnap) => {
        const b = prev.box ?? roomBox(prev.aboard, prev.room);
        if (b) beamAt(b, false);
      };

      if (g.phase === "combat") {
        const present = new Set<string>();
        for (const c of g.crew) {
          present.add(c.id);
          const prev = crew.get(c.id);
          if (prev) {
            const aboardChanged = prev.aboard !== c.aboard;
            const snapped = prev.room !== c.room && prev.pathEmpty && prev.move === 0;
            if (aboardChanged || snapped) {
              leave(prev);
              if (prev.aboard !== c.aboard || prev.room !== c.room)
                arrivals.push({ id: c.id, side: c.aboard, room: c.room, tries: 0 });
            }
          }
          crew.set(c.id, {
            kin: c.kin,
            room: c.room,
            aboard: c.aboard,
            pathEmpty: c.path.length === 0,
            move: c.move,
            box: crewBox(c.aboard, c.id),
          });
        }
        for (const [id, prev] of crew) {
          if (present.has(id)) continue;
          const b = roomBox(prev.aboard, prev.room);
          if (b) {
            const cx = b.x + b.w / 2;
            const cy = b.y + b.h / 2;
            if (prev.kin === "energy")
              spray(cx, cy, SPARK, 18, 150, 0.48, 2, Math.min(b.w, b.h) * 0.35);
            else spray(cx, cy, ASH, 7, 55, 0.32, 2, Math.min(b.w, b.h) * 0.2);
          }
          crew.delete(id);
        }
        // The arriving token renders a frame or two after the sim moves the crew member. Wait for it, up to ~10 frames,
        // then fall back to the room.
        for (let i = arrivals.length - 1; i >= 0; i--) {
          const a = arrivals[i]!;
          const el = host.querySelector(
            `.hull[data-ship="${a.side}"] [data-crew="${CSS.escape(a.id)}"]`,
          );
          const box = measure(el);
          if (!box && a.tries++ < 10) continue;
          arrivals.splice(i, 1);
          const at = box ?? roomBox(a.side, a.room);
          if (at) beamAt(at, true);
          // Web Animations, so a React re-render of the token does not cut it short.
          el?.animate(
            [
              { opacity: 0, filter: "brightness(2.4) sepia(1) hue-rotate(-20deg)" },
              { opacity: 0.4, filter: "brightness(2) sepia(1) hue-rotate(-20deg)" },
              { opacity: 0.2, filter: "brightness(1.6)" },
              { opacity: 1, filter: "none" },
            ],
            { duration: 550 / Math.max(0.1, animSpeed()), easing: "steps(5, jump-none)" },
          );
        }
      } else {
        crew.clear();
        arrivals.length = 0;
      }

      // A combat pause holds the picture. Leaving combat (hull loss sets paused) still plays the blast: the enemy's
      // break-up pieces always run, so the explosion plays out before the reward or victory card (per the user; the
      // card waits on useEnemyWreck).
      const hold = halted(g);
      const step = hold ? 0 : dt;

      for (let i = chunks.length - 1; i >= 0; i--) {
        const p = chunks[i]!;
        const pStep = p.wreck ? dt : step;
        const clip = p.wreck ? wreckClip : null;
        if (pStep > 0) {
          p.life -= pStep;
          p.x += p.vx * pStep;
          p.y += p.vy * pStep;
          const drag = Math.exp(-1.4 * pStep);
          p.vx *= drag;
          p.vy *= drag;
        }
        if (p.life <= 0) {
          chunks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        if (clip) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(clip.x, clip.y, clip.w, clip.h);
          ctx.clip();
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
          ctx.restore();
        } else ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
      }
      if (!chunks.some((c) => c.wreck)) setEnemyWreck(false);
      ctx.globalAlpha = 1;

      for (let i = ovals.length - 1; i >= 0; i--) {
        const o = ovals[i]!;
        if (step > 0) o.life -= step;
        if (o.life <= 0) {
          ovals.splice(i, 1);
          continue;
        }
        const k = 1 - o.life / o.max;
        ctx.globalAlpha = o.spread === 0 ? (k < 0.35 ? 1 : (1 - k) / 0.65) : 1 - k;
        ctx.strokeStyle = o.color;
        ctx.lineWidth = o.width;
        ctx.beginPath();
        ctx.ellipse(
          Math.round(o.x),
          Math.round(o.y),
          Math.max(1, o.rx + o.spread * k),
          Math.max(1, o.ry + o.spread * k),
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (let i = beams.length - 1; i >= 0; i--) {
        const b = beams[i]!;
        if (step > 0) b.life -= step;
        if (b.life <= 0) {
          beams.splice(i, 1);
          continue;
        }
        const k = 1 - b.life / b.max;
        // Inward: wide and faint, closing to a bright core. Outward: a bright core that widens and fades.
        const span = b.inward ? 1.6 - 1.4 * k : 0.4 + 1.2 * k;
        const alpha = b.inward ? 0.35 + 0.65 * k : 1 - k;
        const cw = Math.max(2, Math.round(b.w * span));
        const cx = Math.round(b.x + b.w / 2 - cw / 2);
        const top = Math.round(b.y - b.h * 0.9);
        const tall = Math.round(b.h * 1.9);
        ctx.globalAlpha = Math.max(0, alpha) * 0.55;
        ctx.fillStyle = "#ff7a4a";
        // Scanlines, two pixels apart, marching with the beam's direction.
        const shift = Math.floor(k * 12) % 4;
        for (let y = 0; y < tall; y += 4)
          ctx.fillRect(cx, top + ((y + (b.inward ? shift : 4 - shift)) % tall), cw, 2);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = "#fff6ea";
        const core = Math.max(2, Math.round(cw / 4));
        ctx.fillRect(Math.round(b.x + b.w / 2 - core / 2), top, core, tall);
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      setEnemyWreck(false);
    };
  }, []);

  return <canvas ref={ref} className="fx-canvas" aria-hidden="true" />;
}
