/**
 * INVENTED combat effects. One canvas over the play screen draws every shot in flight,
 * beams, deployed drones, impacts, and the MISS / SHIELD / damage floaters. It runs its
 * own animation frame and reads the game store directly, so projectiles move at display
 * rate while the React UI keeps its slower refresh. Positions come from the rooms and
 * mounts on screen (data-ship, data-room, data-mount), so layout changes need no edits here.
 */
import { useEffect, useRef } from "react";
import { DRONE_LOOKS, droneKeyOf, dronePixels, weaponPalette, type DroneKey } from "@/game/gear-look";
import { DRONE_LABEL, enemyDroneSpot } from "@/game/extras/swarm";
import { useGame } from "@/game/store";
import type { DroneUnit, Shot } from "@/game/types";

type Box = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Text = { text: string; x: number; y: number; life: number; color: string };
type Seen = { at: Pt; color: string; kind: Shot["kind"] };
type Ring = { box: Box; life: number };

/** Drones that fly at the enemy. The rest hold station around the player hull. */
const OUTBOUND = new Set<DroneKey>(["striker", "striker2", "beam", "beam2", "fire", "board", "intruder", "personnel"]);

/** Enemy schematic ids (Kit.target strings) to drone art keys. */
const ENEMY_DRONE_KEY: Record<string, DroneKey> = {
  combat2: "striker2",
  ionintruder: "intruder",
  overcharger: "overcharge",
};

function enemyDroneKey(unit: DroneUnit): DroneKey | null {
  return ENEMY_DRONE_KEY[unit.kind] ?? droneKeyOf(unit.kind);
}

function hash(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
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
      ctx.fillStyle = ch === "b" ? art.palette.body : ch === "t" ? art.palette.trim : ch === "g" ? art.palette.glow : "#14181d";
      ctx.fillRect(x, y, 1, 1);
    });
  });
  droneSprites.set(key, c);
  return c;
}

export function CombatFx() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    const sparks: Spark[] = [];
    const texts: Text[] = [];
    const rings: Ring[] = [];
    const seen = new Map<string, Seen>();
    const seenFloaters = new Set<string>();
    /** Shot progress as of the last sim tick, to smooth between 30 Hz ticks. */
    const tickT = new Map<string, { t: number; at: number }>();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = useGame.getState().game;

      // Logical screen size and the scale the Screen wrapper applies.
      const base = host.getBoundingClientRect();
      const w = host.offsetWidth;
      const h = host.offsetHeight;
      if (!w || !h) return;
      const scale = base.width / w;
      const dpr = window.devicePixelRatio || 1;
      const backW = Math.round(w * scale * dpr);
      const backH = Math.round(h * scale * dpr);
      if (canvas.width !== backW || canvas.height !== backH) {
        canvas.width = backW;
        canvas.height = backH;
      }
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;

      const box = (el: Element | null): Box | null => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: (r.left - base.left) / scale, y: (r.top - base.top) / scale, w: r.width / scale, h: r.height / scale };
      };
      const hull = (side: "player" | "enemy") => box(host.querySelector(`.hull[data-ship="${side}"]`));
      const room = (side: "player" | "enemy", id: string) =>
        box(host.querySelector(`.hull[data-ship="${side}"] [data-room="${CSS.escape(id)}"]`));

      const live = g.phase === "combat" && !g.paused;
      const time = now / 1000;

      // Drones on station. Positions feed the drone shots below.
      const droneAt = new Map<DroneKey, Pt>();
      const kit = g.player.kits.swarm;
      const key = kit?.on ? droneKeyOf(kit.target) : null;
      if (key) {
        const outbound = OUTBOUND.has(key);
        const around = hull(outbound ? "enemy" : "player");
        if (around) {
          const a = (live ? time : 0) * (outbound ? 0.9 : 0.6) + (outbound ? Math.PI : 0);
          const cx = around.x + around.w / 2;
          const cy = around.y + around.h / 2;
          const p = { x: cx + Math.cos(a) * (around.w / 2 + 22), y: cy + Math.sin(a) * (around.h / 2 + 18) };
          droneAt.set(key, p);
          const sprite = droneSprite(key);
          const size = 27;
          ctx.drawImage(sprite, Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
          // Defense drones hold a faint guard ring; the outbound ones trail a thruster pixel.
          ctx.fillStyle = DRONE_LOOKS[key].glow;
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 6);
          ctx.fillRect(Math.round(p.x - Math.cos(a + Math.PI / 2) * 14) - 1, Math.round(p.y - Math.sin(a + Math.PI / 2) * 12) - 1, 3, 3);
          ctx.globalAlpha = 1;
        }
      }

      // Enemy drones: offensive ones orbit the player hull, defensive ones their own hull, boarders fly over
      // and then sit in a player room, crew drones sit in an enemy room. Positions feed enemy drone shots below.
      const enemyDroneAt = new Map<string, Pt>();
      for (const unit of g.enemy?.kits.swarm?.drones ?? []) {
        const spot = enemyDroneSpot(unit);
        const ekey = enemyDroneKey(unit);
        if (!spot || !ekey) continue;
        const phase = hash(unit.id) * Math.PI * 2;
        const t = live ? time : 0;
        let p: Pt | null = null;
        let size = 27;
        if (spot.at === "player-orbit" || spot.at === "enemy-orbit") {
          const around = hull(spot.at === "player-orbit" ? "player" : "enemy");
          if (around) {
            // Opposite spin to the player's own drone, so the two read apart.
            const a = -t * (spot.at === "player-orbit" ? 0.8 : 0.55) + phase;
            p = {
              x: around.x + around.w / 2 + Math.cos(a) * (around.w / 2 + 22),
              y: around.y + around.h / 2 + Math.sin(a) * (around.h / 2 + 18),
            };
          }
        } else if (spot.at === "flying") {
          const a = hull("enemy");
          const b = hull("player");
          if (a && b) {
            const k = Math.min(1, Math.max(0, spot.progress));
            p = {
              x: a.x + a.w / 2 + (b.x + b.w / 2 - (a.x + a.w / 2)) * k,
              y: a.y + a.h / 2 + (b.y + b.h / 2 - (a.y + a.h / 2)) * k + Math.sin(k * Math.PI) * -30,
            };
          }
        } else {
          const r = room(spot.at === "player-room" ? "player" : "enemy", spot.room);
          if (r) {
            size = 21;
            p = { x: r.x + r.w / 2 + Math.sin(t * 2 + phase) * 3, y: r.y + r.h / 2 };
          }
        }
        if (!p) continue;
        enemyDroneAt.set(unit.id, p);
        const stunned = (unit.stun ?? 0) > 0;
        ctx.globalAlpha = !unit.powered ? 0.4 : stunned ? 0.55 + 0.45 * Math.sin(time * 30) : 1;
        ctx.drawImage(droneSprite(ekey), Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
        ctx.globalAlpha = 1;
        // Enemy drones carry a red tag pixel pair so they never read as yours.
        ctx.fillStyle = "#ff5a4a";
        ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - size / 2) - 4, 3, 2);
        if (stunned) {
          ctx.strokeStyle = "#b48cff";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(Math.round(p.x - size / 2) - 2, Math.round(p.y - size / 2) - 2, size + 4, size + 4);
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

      const muzzle = (shot: Shot): Pt | null => {
        if (shot.from === "env") {
          const target = hull("player");
          if (!target) return null;
          return shot.label === "Artillery"
            ? { x: target.x + target.w * (0.2 + 0.6 * hash(shot.id)), y: -20 }
            : { x: w + 20, y: target.y + target.h * hash(shot.id) };
        }
        const side = shot.from;
        if (shot.defId) {
          const mounts = host.querySelectorAll(`.hull[data-ship="${side}"] [data-def="${CSS.escape(shot.defId)}"]`);
          if (mounts.length) {
            const m = box(mounts[Math.floor(hash(shot.id) * mounts.length) % mounts.length]);
            if (m) return side === "player" ? { x: m.x + m.w, y: m.y + m.h / 2 } : { x: m.x, y: m.y + m.h / 2 };
          }
        } else if (side === "player") {
          const drone = [...droneAt.entries()].find(([k]) => OUTBOUND.has(k))?.[1];
          if (drone) return drone;
        } else if (shot.label?.startsWith(DRONE_LABEL)) {
          // Enemy drone shots leave from that drone.
          const drone = enemyDroneAt.get(shot.label.slice(DRONE_LABEL.length));
          if (drone) return drone;
        }
        const own = hull(side);
        if (!own) return null;
        return side === "player" ? { x: own.x + own.w, y: own.y + own.h / 2 } : { x: own.x, y: own.y + own.h / 2 };
      };

      const aimAt = (shot: Shot, roomId: string): Pt | null => {
        const side = shot.from === "player" ? "enemy" : "player";
        const r = room(side, roomId) ?? hull(side);
        if (!r) return null;
        const j = hash(shot.id);
        return { x: r.x + r.w * (0.3 + 0.4 * j), y: r.y + r.h * (0.3 + 0.4 * ((j * 7) % 1)) };
      };

      const burst = (at: Pt, color: string, count: number, speed: number) => {
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = speed * (0.3 + Math.random() * 0.7);
          sparks.push({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, max: 0.5, color, size: Math.random() < 0.3 ? 3 : 2 });
        }
      };

      const alive = new Set<string>();
      for (const shot of g.shots) {
        if (shot.wait > 0) continue;
        alive.add(shot.id);
        const from = muzzle(shot);
        const to = aimAt(shot, shot.targetRoom);
        if (!from || !to) continue;
        const prior = tickT.get(shot.id);
        if (!prior || prior.t !== shot.t) tickT.set(shot.id, { t: shot.t, at: now });
        const since = (now - (tickT.get(shot.id)?.at ?? now)) / 1000;
        const t = Math.min(1, shot.t + (live ? Math.min(since, 1 / 30) / shot.duration : 0));
        const color = shot.from === "env" ? "#c8b49a" : weaponPalette(shot.defId).glow;
        const x = from.x + (to.x - from.x) * t;
        const arc = shot.kind === "missile" ? Math.sin(t * Math.PI) * -24 : 0;
        const y = from.y + (to.y - from.y) * t + arc;
        seen.set(shot.id, { at: to, color, kind: shot.kind });
        const ang = Math.atan2(to.y - from.y + (shot.kind === "missile" ? Math.cos(t * Math.PI) * -24 * Math.PI : 0), to.x - from.x);

        if (shot.kind === "beam") {
          const rooms = (shot.beamRooms ?? [shot.targetRoom]).map((id) => aimAt(shot, id)).filter((p): p is Pt => !!p);
          const a = rooms[0] ?? to;
          const b = rooms[rooms.length - 1] ?? to;
          const sweep = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          ctx.lineCap = "square";
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = 9;
          line(ctx, from, sweep);
          ctx.globalAlpha = 1;
          ctx.lineWidth = 4;
          line(ctx, from, sweep);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          line(ctx, from, sweep);
          if (Math.random() < 0.6) burst(sweep, color, 1, 60);
          continue;
        }

        if (shot.kind === "bomb") {
          // Bombs teleport in: a closing ring at the target room, then the impact.
          const r = 22 * (1 - t) + 4;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.4 + 0.6 * t;
          ctx.strokeRect(Math.round(to.x - r), Math.round(to.y - r), Math.round(r * 2), Math.round(r * 2));
          ctx.globalAlpha = 1;
          ctx.fillStyle = color;
          ctx.fillRect(Math.round(to.x) - 2, Math.round(to.y) - 2, 4, 4);
          continue;
        }

        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(ang);
        ctx.scale(1.4, 1.4);
        if (shot.kind === "laser") {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(-22, -2, 18, 4);
          ctx.globalAlpha = 1;
          ctx.fillRect(-10, -3, 16, 6);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-6, -1, 10, 2);
        } else if (shot.kind === "ion") {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(-9, -9, 18, 18);
          ctx.globalAlpha = 1;
          ctx.fillRect(-5, -5, 10, 10);
          ctx.fillStyle = "#e8f6ff";
          ctx.fillRect(-2, -2, 4, 4);
        } else if (shot.kind === "missile") {
          ctx.fillStyle = "#d8dde2";
          ctx.fillRect(-9, -2, 14, 5);
          ctx.fillStyle = "#6f7b86";
          ctx.fillRect(-9, -4, 3, 9);
          ctx.fillStyle = color;
          ctx.fillRect(5, -2, 3, 5);
          if (live && Math.random() < 0.7) {
            sparks.push({ x, y, vx: -Math.cos(ang) * 20, vy: -Math.sin(ang) * 20 + (Math.random() - 0.5) * 10, life: 0.6, max: 0.6, color: "#8a9096", size: 3 });
          }
        } else {
          // Flak: a tumbling chunk.
          ctx.rotate(t * 12);
          ctx.fillStyle = color;
          ctx.fillRect(-3, -3, 6, 6);
          ctx.fillStyle = "#ffe9b0";
          ctx.fillRect(-1, -1, 2, 2);
        }
        ctx.restore();
      }

      // Shots that left the list this frame landed, were dodged, or were shot down.
      for (const [id, s] of seen) {
        if (alive.has(id)) continue;
        seen.delete(id);
        tickT.delete(id);
        if (g.phase !== "combat") continue;
        const strong = s.kind === "missile" || s.kind === "bomb";
        burst(s.at, s.color, strong ? 18 : 10, strong ? 120 : 80);
        burst(s.at, "#ffffff", 4, 50);
      }

      for (const f of g.floaters) {
        if (seenFloaters.has(f.id)) continue;
        seenFloaters.add(f.id);
        // floatAt puts the player ship's floaters right of centre (x > 50) and the enemy's left of it.
        const side = f.x > 50 ? "player" : "enemy";
        const target = hull(side);
        if (!target) continue;
        const color = f.text === "MISS" ? "#c8fff0" : f.text === "SHIELD" ? "#6cc4ff" : "#ff6a5a";
        if (f.text === "SHIELD") rings.push({ box: target, life: 0.45 });
        texts.push({ text: f.text, x: target.x + target.w * (0.35 + Math.random() * 0.3), y: target.y - 6, life: 0.9, color });
      }
      if (seenFloaters.size > 64) for (const id of [...seenFloaters].slice(0, 32)) seenFloaters.delete(id);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        if (live) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.92;
          p.vy *= 0.92;
        }
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // Shield hits: the bubble around the struck hull flashes.
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        if (live) r.life -= dt;
        if (r.life <= 0) {
          rings.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = r.life / 0.45;
        ctx.strokeStyle = "#6cc4ff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(r.box.x + r.box.w / 2, r.box.y + r.box.h / 2, r.box.w / 2 + 26, r.box.h / 2 + 26, 0, 0, Math.PI * 2);
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

  return <canvas ref={ref} className="fx-canvas" aria-hidden="true" />;
}

function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt) {
  ctx.beginPath();
  ctx.moveTo(Math.round(a.x), Math.round(a.y));
  ctx.lineTo(Math.round(b.x), Math.round(b.y));
  ctx.stroke();
}

