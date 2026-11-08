import type { AsteroidField } from "@stl/pack";

/**
 * xftl doc/asteroids (AsteroidGenerator): durations and spawn periods in seconds, min/max, for 0–1, 2, 3, and 4+
 * shield bubbles. Wave 2 at 0–1 bubbles is printed "1.6/1.4" (min above max); read as 1.4 to 1.6.
 * Environmental Hazards, Asteroid Field: "They have a small chance to cause a fire or a breach."
 * Fires: "asteroids (which can either cause a breach, or fires, or no additional effect)".
 * INFERRED: each of those two effects is 5 percent. Fire is checked first, so one rock does not start both.
 * The page prints no percent. 5 percent is the breach figure this shot already used.
 *
 * The gap mod writes these as `<asteroidField fire breach>` › `<timing bubbles>`.
 */
export const ASTEROID_FIELD: AsteroidField = {
  fire: 0.05,
  breach: 0.05,
  timings: [
    {
      bubbles: 1,
      break: [5, 10],
      wave1: [8, 16],
      wave2: [5, 8],
      spawn1: [1.8, 2.2],
      spawn2: [1.4, 1.6],
    },
    {
      bubbles: 2,
      break: [5, 10],
      wave1: [10, 20],
      wave2: [5, 10],
      spawn1: [1, 1.8],
      spawn2: [0.9, 1.3],
    },
    {
      bubbles: 3,
      break: [12, 15],
      wave1: [16, 28],
      wave2: [8, 13],
      spawn1: [0.9, 1.4],
      spawn2: [0.9, 1.3],
    },
    {
      bubbles: 4,
      break: [12, 15],
      wave1: [16, 30],
      wave2: [8, 11],
      spawn1: [0.72, 1.35],
      spawn2: [0.54, 0.95],
    },
  ],
};
