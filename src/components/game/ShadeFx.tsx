/**
 * Picture-only bursts. Hull loss, a Zoltan shield breaking, a crew death, and a teleport
 * blink. The sim has already applied the damage; this canvas does not change it.
 */
import { useEffect, useRef } from "react";
import { useGame } from "@/game/store";
import type { Ship } from "@/game/types";

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
};
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
type Blink = { x: number; y: number; w: number; h: number; life: number; max: number };
type CrewSnap = { kin?: string; room: string; aboard: Side; pathEmpty: boolean; move: number };

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
    const blinks: Blink[] = [];
    const cache: Partial<Record<Side, Box>> = {};
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
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = useGame.getState().game;

      const base = host.getBoundingClientRect();
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
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return null;
        return { x: (r.left - base.left) / scale, y: (r.top - base.top) / scale, w: r.width / scale, h: r.height / scale };
      };
      const hullBox = (side: Side): Box | null => {
        const live = measure(host.querySelector(`.hull[data-ship="${side}"]`));
        if (live) cache[side] = live;
        return cache[side] ?? null;
      };
      const roomBox = (side: Side, id: string): Box | null =>
        measure(host.querySelector(`.hull[data-ship="${side}"] [data-room="${CSS.escape(id)}"]`));

      // React can drop the enemy hull on the same tick the sim sets hull to 0. Keep the last box.
      hullBox("player");
      hullBox("enemy");

      const explode = (side: Side) => {
        const b = cache[side];
        if (!b) return;
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        const palette = [...ORANGE, ...WHITE, ...DARK];
        for (let i = 0; i < 60; i++) {
          const ang = (i / 60) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const dark = i % 3 === 2;
          const hot = i % 3 === 1;
          const inset = dark ? 0.12 + Math.random() * 0.35 : 0.2 + Math.random() * 0.7;
          const speed = (dark ? 60 : hot ? 200 : 130) + Math.random() * (dark ? 70 : 140);
          push({
            x: cx + Math.cos(ang) * (b.w * 0.5 * inset),
            y: cy + Math.sin(ang) * (b.h * 0.5 * inset),
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            life: 0.9,
            max: 0.9,
            color: palette[i % palette.length]!,
            w: dark ? 5 + (i % 3) : hot ? 2 : 3 + (i % 2),
            h: dark ? 4 + (i % 2) : hot ? 2 : 3,
          });
        }
      };

      const shieldOval = (side: Side, life: number, spread: number, width: number, color: string) => {
        const b = cache[side];
        if (!b) return;
        ovals.push({
          x: b.x + b.w / 2,
          y: b.y + b.h / 2,
          rx: b.w / 2 + 26,
          ry: b.h / 2 + 26,
          life,
          max: life,
          spread,
          width,
          color,
        });
      };

      const shatter = (side: Side) => {
        const b = cache[side];
        if (!b) return;
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        const rx = b.w / 2 + 26;
        const ry = b.h / 2 + 26;
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
      seenPlayerHull = playerHull;

      const enemy = g.enemy;
      if (enemy) {
        if (enemyRef === enemy && seenEnemyHull != null && seenEnemyHull > 0 && enemy.hull <= 0) explode("enemy");
        else if (enemyRef && enemyRef !== enemy && seenEnemyHull != null && seenEnemyHull > 0 && enemyRef.hull <= 0) explode("enemy");
        seenEnemyHull = enemy.hull;
        if (enemyRef === enemy) noteZ("enemy", seenEnemyZ, enemy.zoltan ?? 0);
        else if (enemyRef && seenEnemyZ > 0 && (enemyRef.zoltan ?? 0) === 0) shatter("enemy");
        seenEnemyZ = enemy.zoltan ?? 0;
        enemyRef = enemy;
      } else {
        if (enemyRef && seenEnemyHull != null && seenEnemyHull > 0 && enemyRef.hull <= 0) explode("enemy");
        if (enemyRef && seenEnemyZ > 0 && (enemyRef.zoltan ?? 0) === 0) shatter("enemy");
        seenEnemyHull = null;
        seenEnemyZ = 0;
        enemyRef = null;
      }

      const pz = g.player.zoltan ?? 0;
      noteZ("player", seenPlayerZ, pz);
      seenPlayerZ = pz;

      const blinkAt = (side: Side, id: string) => {
        const b = roomBox(side, id);
        if (!b) return;
        blinks.push({ x: b.x, y: b.y, w: b.w, h: b.h, life: 0.2, max: 0.2 });
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
              blinkAt(prev.aboard, prev.room);
              if (prev.aboard !== c.aboard || prev.room !== c.room) blinkAt(c.aboard, c.room);
            }
          }
          crew.set(c.id, {
            kin: c.kin,
            room: c.room,
            aboard: c.aboard,
            pathEmpty: c.path.length === 0,
            move: c.move,
          });
        }
        for (const [id, prev] of crew) {
          if (present.has(id)) continue;
          const b = roomBox(prev.aboard, prev.room);
          if (b) {
            const cx = b.x + b.w / 2;
            const cy = b.y + b.h / 2;
            if (prev.kin === "spark") spray(cx, cy, SPARK, 18, 150, 0.48, 2, Math.min(b.w, b.h) * 0.35);
            else spray(cx, cy, ASH, 7, 55, 0.32, 2, Math.min(b.w, b.h) * 0.2);
          }
          crew.delete(id);
        }
      } else {
        crew.clear();
      }

      // A combat pause holds the picture. Leaving combat (hull loss sets paused) still plays the blast.
      const hold = g.paused && g.phase === "combat";
      const step = hold ? 0 : dt;

      for (let i = chunks.length - 1; i >= 0; i--) {
        const p = chunks[i]!;
        if (step > 0) {
          p.life -= step;
          p.x += p.vx * step;
          p.y += p.vy * step;
          const drag = Math.exp(-1.4 * step);
          p.vx *= drag;
          p.vy *= drag;
        }
        if (p.life <= 0) {
          chunks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
      }
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
        ctx.ellipse(Math.round(o.x), Math.round(o.y), Math.max(1, o.rx + o.spread * k), Math.max(1, o.ry + o.spread * k), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (let i = blinks.length - 1; i >= 0; i--) {
        const b = blinks[i]!;
        if (step > 0) b.life -= step;
        if (b.life <= 0) {
          blinks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, b.life / b.max);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        const x = Math.round(b.x);
        const y = Math.round(b.y);
        const bw = Math.round(b.w);
        const bh = Math.round(b.h);
        ctx.strokeRect(x + 1, y + 1, Math.max(2, bw - 2), Math.max(2, bh - 2));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, 2, 2);
        ctx.fillRect(x + bw - 2, y, 2, 2);
        ctx.fillRect(x, y + bh - 2, 2, 2);
        ctx.fillRect(x + bw - 2, y + bh - 2, 2, 2);
        ctx.fillRect(x + Math.round(bw / 2) - 1, y + Math.round(bh / 2) - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="fx-canvas" aria-hidden="true" />;
}
