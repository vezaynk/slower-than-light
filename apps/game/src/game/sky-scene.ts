import type { Beacon, Game } from "./types.ts";

/**
 * Which backdrop layers the ship stage should play.
 * Environmental Hazards: red giant, asteroid field, pulsar, nebula, plasma storm, anti-ship battery.
 * A nebula the fleet has not cleared is the purple field. A cleared nebula is open space again.
 * The red giant and the pulsar replace the blue planet. The battery keeps the planet so its guns have a world.
 */
export type SkyInput = {
  beacons: Pick<Beacon, "id" | "kind" | "cleared">[];
  here: string;
  asteroid: boolean;
  asteroidPhase?: Game["asteroidPhase"];
  asb: boolean;
  asbPhase: Game["asbPhase"];
  pulsar?: boolean;
  pulsarWarned?: boolean;
  flare?: boolean;
  flareWarned?: boolean;
  player: { storm?: boolean };
};

export type SkyScene = {
  sun: boolean;
  pulsar: boolean;
  rocks: boolean;
  /** Quiet gap between asteroid waves. */
  rocksQuiet: boolean;
  battery: boolean;
  /** The 5–10s window while the battery is aiming, before the shell is in flight. */
  batteryAiming: boolean;
  storm: boolean;
  nebula: boolean;
  planet: boolean;
  sunWarn: boolean;
  pulsarWarn: boolean;
};

export function skyScene(g: SkyInput): SkyScene {
  const here = g.beacons.find((b) => b.id === g.here);
  const nebula = !!here && here.kind === "nebula" && !here.cleared;
  const sun = !!g.flare;
  const pulsar = !!g.pulsar;
  const battery = !!g.asb;
  return {
    sun,
    pulsar,
    rocks: !!g.asteroid,
    rocksQuiet: !!g.asteroid && g.asteroidPhase === "break",
    battery,
    batteryAiming: battery && g.asbPhase === "shot",
    storm: !!g.player.storm,
    nebula,
    planet: !sun && !pulsar && (!nebula || battery),
    sunWarn: sun && !!g.flareWarned,
    pulsarWarn: pulsar && !!g.pulsarWarned,
  };
}
