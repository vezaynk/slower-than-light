/**
 * Wiki page "Drone Control", section "Ion Intruder Drone".
 * The caller in swarm.ts samples each wait inside pulseMin and pulseMax.
 * The blast is not fired. SwarmKind is not extended. The schematic is not stocked.
 * Pulse time stays two ends. No single pulse time is exported.
 * Purchase price 65 is already on CITED_DRONES. Drone Control's system price is both 75 and 85.
 */

export const INTRUDER = {
  // "Power requirement: 3 power"
  power: 3,
  // "Periodically emits an ion blast that deals 3 ion damage to the system and stuns enemy crew, then moves to a different system"
  ion: 3,
  // "Pulse time varies between 8.2 and 10 seconds. Stun lasts for 6 seconds"
  stunSeconds: 6,
  // "Pulse time varies between 8.2 and 10 seconds. Stun lasts for 6 seconds"
  pulseMin: 8.2,
  pulseMax: 10,
} as const;
