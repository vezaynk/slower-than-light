import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { SKY_FILES, skyPath } from "@stl/pack";
import type { Game } from "@/game/types";
import { archiveGeneration, archiveImage, subscribeArchive } from "@/game/pack/media";
import { skyScene } from "@/game/sky-scene";
import { animSpeed } from "./speed";
import "./hazard-sky.css";

/**
 * Environmental Hazards, pictures on that page: the stage behind the hull.
 * Red giant, pulsar, asteroid field, nebula, ion storm, and the anti-ship battery each move on their own.
 * The 5s flare and pulsar warnings are the strobe. The flash is the moment that warning ends and the pulse lands.
 */

const ROCKS: {
  y: string;
  rest: string;
  s: number;
  d: string;
  delay: string;
  spin: string;
  dy: string;
  tone: number;
}[] = [
  { y: "6%", rest: "12%", s: 0.55, d: "17s", delay: "-2s", spin: "2.4s", dy: "3cqh", tone: 0 },
  { y: "16%", rest: "70%", s: 1.2, d: "11s", delay: "-6s", spin: "1.5s", dy: "8cqh", tone: 1 },
  { y: "27%", rest: "38%", s: 0.72, d: "22s", delay: "-14s", spin: "3.2s", dy: "-4cqh", tone: 2 },
  { y: "38%", rest: "84%", s: 1.5, d: "9s", delay: "-3.5s", spin: "1.15s", dy: "5cqh", tone: 1 },
  { y: "48%", rest: "22%", s: 0.48, d: "27s", delay: "-9s", spin: "4s", dy: "2cqh", tone: 0 },
  { y: "58%", rest: "56%", s: 1.05, d: "13s", delay: "-11s", spin: "1.8s", dy: "-6cqh", tone: 2 },
  { y: "68%", rest: "8%", s: 0.82, d: "15s", delay: "-1s", spin: "2.2s", dy: "4cqh", tone: 1 },
  { y: "78%", rest: "64%", s: 1.35, d: "12s", delay: "-7s", spin: "1.35s", dy: "-3cqh", tone: 0 },
  { y: "88%", rest: "44%", s: 0.62, d: "19s", delay: "-15s", spin: "2.8s", dy: "6cqh", tone: 2 },
  { y: "22%", rest: "90%", s: 0.4, d: "31s", delay: "-20s", spin: "4.4s", dy: "10cqh", tone: 0 },
  { y: "44%", rest: "30%", s: 0.9, d: "16s", delay: "-5s", spin: "2s", dy: "-2cqh", tone: 1 },
  { y: "72%", rest: "76%", s: 1.1, d: "14s", delay: "-8.5s", spin: "1.6s", dy: "7cqh", tone: 2 },
];

/** True for a short beat after `on` drops. That edge is the flare, the ion pulse, or the battery firing. */
function useFallingEdge(on: boolean, ms = 640): boolean {
  const prev = useRef(on);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const fell = prev.current && !on;
    prev.current = on;
    if (!fell) {
      if (on) setFlash(false);
      return;
    }
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), ms / Math.max(0.1, animSpeed()));
    return () => window.clearTimeout(t);
  }, [on, ms]);
  return flash;
}

function Sun({ warn }: { warn: boolean }) {
  return (
    <div className={`sky-sun${warn ? " is-warn" : ""}`}>
      <i className="prom p1" />
      <i className="prom p2" />
      <i className="prom p3" />
      {warn ? <i className="warn-ring" /> : null}
    </div>
  );
}

function Pulsar({ warn }: { warn: boolean }) {
  return (
    <div className="sky-pulsar">
      <i className="sweep" />
      <i className="sweep sweep-b" />
      <i className="core" />
      {warn ? <i className="warn-ring" /> : null}
    </div>
  );
}

function Planet({ armed, aiming }: { armed: boolean; aiming: boolean }) {
  return (
    <div className={`planet${aiming ? " is-aiming" : ""}`}>
      {armed ? (
        <>
          <i className="battery" style={{ left: "46%", top: "16%" }} />
          <i className="battery" style={{ left: "22%", top: "40%" }} />
          <i className="battery" style={{ left: "70%", top: "38%" }} />
          {aiming ? <i className="sight-beam" /> : null}
        </>
      ) : null}
    </div>
  );
}

const BOLTS: { x: string; y: string; h: number; delay: string; hue: string }[] = [
  { x: "6%", y: "4%", h: 92, delay: "0s", hue: "#e8f7ff" },
  { x: "84%", y: "8%", h: 110, delay: "-0.9s", hue: "#c6ffb0" },
  { x: "14%", y: "58%", h: 74, delay: "-1.8s", hue: "#8ecbff" },
  { x: "76%", y: "52%", h: 86, delay: "-2.7s", hue: "#f4fff8" },
  { x: "46%", y: "0%", h: 64, delay: "-3.6s", hue: "#d7f4ff" },
];

function Bolts() {
  return (
    <>
      {BOLTS.map((b) => (
        <svg
          key={b.delay}
          className="bolt-svg"
          style={{ left: b.x, top: b.y, height: b.h, animationDelay: b.delay }}
          viewBox="0 0 24 80"
        >
          <polyline points="14,0 20,16 8,24 18,42 6,50 16,80" stroke={b.hue} />
        </svg>
      ))}
    </>
  );
}

export function HazardSky({ game }: { game: Game }) {
  const art = useSyncExternalStore(subscribeArchive, archiveGeneration, () => 0);
  const scene = skyScene(game);
  const plate = art >= 0 ? archiveImage(skyPath(scene)) : undefined;
  const world = scene.planet && art >= 0 ? archiveImage(SKY_FILES.planet) : undefined;
  const sunFlash = useFallingEdge(scene.sunWarn);
  const ionFlash = useFallingEdge(scene.pulsarWarn);
  const shellFlash = useFallingEdge(scene.batteryAiming, 420);
  const layers = [
    scene.sun ? "sun" : "",
    scene.pulsar ? "pulsar" : "",
    scene.rocks ? "rocks" : "",
    scene.nebula ? "nebula" : "",
    scene.storm ? "storm" : "",
    scene.battery ? "battery" : "",
    scene.planet ? "planet" : "",
  ].filter(Boolean);
  return (
    <div
      className={`sky-field${plate ? " has-plate" : ""}${scene.sunWarn ? " is-sun-warn" : ""}${scene.pulsarWarn ? " is-pulsar-warn" : ""}${scene.rocksQuiet ? " is-quiet" : ""}${scene.batteryAiming ? " is-aiming" : ""}`}
      data-sky={layers.join(" ")}
      aria-hidden="true"
    >
      {/* The archive's star plate is only the backdrop. Hazards stay drawn on top: the sun and pulsar warnings,
          the storm, and the rocks tell the player what is about to happen. */}
      {plate ? <img className="sky-plate" src={plate} alt="" /> : null}
      {scene.nebula ? <div className="sky-nebula" /> : null}
      {scene.storm ? <div className="sky-storm" /> : null}
      {world ? <img className="sky-world" src={world} alt="" /> : null}
      {!world && scene.planet ? (
        <Planet armed={scene.battery} aiming={scene.batteryAiming} />
      ) : null}
      {scene.sun ? <Sun warn={scene.sunWarn} /> : null}
      {scene.pulsar ? <Pulsar warn={scene.pulsarWarn} /> : null}
      {scene.storm ? <Bolts /> : null}
      {scene.batteryAiming ? <i className="sky-aim" /> : null}
      {scene.rocks
        ? ROCKS.map((rock, i) => (
            <i
              key={`${rock.y}-${rock.delay}`}
              className={`sky-rock tone-${rock.tone}${i % 2 ? " is-far" : ""}`}
              style={
                {
                  "--y": rock.y,
                  "--rest": rock.rest,
                  "--s": String(rock.s),
                  "--d": rock.d,
                  "--delay": rock.delay,
                  "--spin": rock.spin,
                  "--dy": rock.dy,
                } as CSSProperties
              }
            >
              <i className="chunk" />
            </i>
          ))
        : null}
      {sunFlash ? <div className="sky-burst is-sun" /> : null}
      {ionFlash ? <div className="sky-burst is-ion" /> : null}
      {shellFlash ? <div className="sky-burst is-shell" /> : null}
    </div>
  );
}
