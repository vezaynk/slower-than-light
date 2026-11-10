import type { Game, Shot } from "./types.ts";

/**
 * A module that lands its own beam swipes (drone beams). sim.ts stepShots runs it each tick while the beam fires,
 * after `t` moves. Return false when the beam stopped firing; the shot then leaves the list.
 * This file imports nothing at runtime, so extras can register while sim.ts is still loading.
 */
export type BeamTicker = (g: Game, shot: Shot) => boolean;

const beamTickers = new Map<string, BeamTicker>();

/** Shots with `beamOwner` set to `owner` are landed by `tick` instead of sim.ts stepBeam. */
export function registerBeamTicker(owner: string, tick: BeamTicker): void {
  beamTickers.set(owner, tick);
}

export function beamTicker(owner: string | undefined): BeamTicker | undefined {
  return owner ? beamTickers.get(owner) : undefined;
}
