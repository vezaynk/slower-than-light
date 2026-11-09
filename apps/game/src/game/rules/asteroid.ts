/**
 * Environmental Hazards, ==Asteroid Field==: "The interval between each asteroid is random, but scales according to
 * your ship's shield system level: asteroids will come more frequently if your shields are highly upgraded." "the
 * asteroid frequency will not decrease when your shields are down."
 *
 * Timing from the xftl reverse-engineering notes (gitlab.com/znixian/xftl, doc/asteroids, AsteroidGenerator):
 * "Asteroids are controlled by a state machine. State 0 is the break between waves, there are two wave states that run
 * for different durations and have different spawn periods. ... The timings are determined by the player shield level"
 * (the table below, by shield bubbles). "Asteroids are fired in sequence at your ship and the enemy's ship, so with
 * another ship present the effective times are halved. This is not reset when the enemy is killed, so every second
 * asteroid is effectively wasted at that point."
 * INFERRED: the cycle runs break, wave 1, wave 2, break. The notes do not give the order.
 * INFERRED: bubbles are the Shields system level halved (installed, not powered), as the wiki ties it to the level.
 * The notes print wave 2 at 0-1 bubbles as "1.6/1.4" (min above max); read as 1.4 to 1.6.
 *
 * The numbers are gap `<asteroidField>` (`asteroidTiming`, `asteroidOdds`). No event or hazard blueprint carries them.
 */
import { asteroidOdds, asteroidTiming, type AsteroidTiming } from "@stl/pack";

export type AsteroidPhase = "break" | "wave1" | "wave2";

type Span = [number, number];

function bandFor(shieldLevel: number): 1 | 2 | 3 | 4 {
  const bubbles = Math.floor(Math.max(0, shieldLevel) / 2);
  if (bubbles <= 1) return 1;
  if (bubbles === 2) return 2;
  if (bubbles === 3) return 3;
  return 4;
}

function rowFor(shieldLevel: number): AsteroidTiming {
  return asteroidTiming(bandFor(shieldLevel));
}

function within([lo, hi]: Span, roll: number): number {
  return lo + (hi - lo) * Math.min(1, Math.max(0, roll));
}

/** How long a phase lasts. */
export function asteroidPhaseSeconds(
  shieldLevel: number,
  phase: AsteroidPhase,
  roll: number,
): number {
  return within(rowFor(shieldLevel)[phase], roll);
}

/** Seconds between rocks in a wave. */
export function asteroidSpawnSeconds(
  shieldLevel: number,
  phase: "wave1" | "wave2",
  roll: number,
): number {
  const row = rowFor(shieldLevel);
  return within(phase === "wave1" ? row.spawn1 : row.spawn2, roll);
}

/** The phase after this one. */
export function nextAsteroidPhase(phase: AsteroidPhase): AsteroidPhase {
  return phase === "break" ? "wave1" : phase === "wave1" ? "wave2" : "break";
}

/**
 * Environmental Hazards, ==Asteroid Field==: "They have a small chance to cause a fire or a breach."
 * Fires: "asteroids (which can either cause a breach, or fires, or no additional effect)".
 * INFERRED: each of those two effects is 5 percent. Fire is checked first, so one rock does not start both.
 * The page prints no percent. 5 percent is the breach figure this shot already used.
 * Gap `<asteroidField fire breach>`.
 */
export function asteroidSide(roll: number): "fire" | "breach" | "none" {
  const t = Math.min(0.999999, Math.max(0, roll));
  const fire = asteroidOdds("fire");
  const breach = asteroidOdds("breach");
  if (t < fire) return "fire";
  if (t < fire + breach) return "breach";
  return "none";
}
