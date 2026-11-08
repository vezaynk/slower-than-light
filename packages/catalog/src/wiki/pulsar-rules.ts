import type { PulsarRules } from "@stl/pack";

/**
 * Environmental Hazards, Pulsar: an ion pulse every 11–18 seconds, and a warning 5 seconds beforehand.
 * INFERRED: the cycle is uniform, the printed top is not its own bucket, and the 5 second warning is the last part
 * of that cycle.
 * Zoltan Shield, lead: the bubble takes "3 or 4 ion damage". INFERRED: an even split, the page does not say which.
 * Environmental Hazards, Pulsar: ion damage = 1 + 0.5(system power), rounded down. Unpowered shields are the
 * 0-power case, which is 1.
 *
 * The gap mod writes these as `<pulsar cycleMin cycleMax warn shieldLow shieldHigh ionBase ionPerPower>`.
 */
export const PULSAR_RULES: Required<PulsarRules> = {
  cycleMin: 11,
  cycleMax: 18,
  warn: 5,
  shieldLow: 3,
  shieldHigh: 4,
  ionBase: 1,
  ionPerPower: 0.5,
};
