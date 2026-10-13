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
 */
export type AsteroidPhase = "break" | "wave1" | "wave2";

type Span = [number, number];
type Row = { break: Span; wave1: Span; wave2: Span; spawn1: Span; spawn2: Span };

/** doc/asteroids table: durations and spawn periods (seconds, min/max) for 0-1, 2, 3, and 4+ bubbles. */
export const ASTEROID_TABLE: Row[] = [
  { break: [5, 10], wave1: [8, 16], wave2: [5, 8], spawn1: [1.8, 2.2], spawn2: [1.4, 1.6] },
  { break: [5, 10], wave1: [10, 20], wave2: [5, 10], spawn1: [1.0, 1.8], spawn2: [0.9, 1.3] },
  { break: [12, 15], wave1: [16, 28], wave2: [8, 13], spawn1: [0.9, 1.4], spawn2: [0.9, 1.3] },
  { break: [12, 15], wave1: [16, 30], wave2: [8, 11], spawn1: [0.72, 1.35], spawn2: [0.54, 0.95] },
];

function rowFor(shieldLevel: number): Row {
  const bubbles = Math.floor(Math.max(0, shieldLevel) / 2);
  return ASTEROID_TABLE[bubbles <= 1 ? 0 : Math.min(3, bubbles - 1)];
}

function within([lo, hi]: Span, roll: number): number {
  return lo + (hi - lo) * Math.min(1, Math.max(0, roll));
}

/** How long a phase lasts. */
export function asteroidPhaseSeconds(shieldLevel: number, phase: AsteroidPhase, roll: number): number {
  return within(rowFor(shieldLevel)[phase], roll);
}

/** Seconds between rocks in a wave. */
export function asteroidSpawnSeconds(shieldLevel: number, phase: "wave1" | "wave2", roll: number): number {
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
 */
export function asteroidSide(roll: number): "fire" | "breach" | "none" {
  const t = Math.min(0.999999, Math.max(0, roll));
  if (t < 0.05) return "fire";
  if (t < 0.1) return "breach";
  return "none";
}
