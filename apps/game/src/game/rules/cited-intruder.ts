/**
 * Wiki page "Drone Control", section "Ion Intruder Drone".
 * The caller in swarm.ts samples each wait inside pulseMin and pulseMax.
 * The blast is not fired. SwarmKind is not extended. The schematic is not stocked.
 * Pulse time stays two ends. No single pulse time is exported.
 * Purchase price 65 is already on the droneBlueprint. Drone Control's system price is both 75 and 85.
 *
 * Power is the droneBlueprint `<power>` (`droneDef`). Ion, stun, and the pulse window are gap
 * `<ionIntruder ion stun pulseMin pulseMax>`. Space speed 18 is the blueprint `<speed>` and is not read here.
 */
import { droneDef, ionIntruderStat, warnPack } from "@stl/pack";

/** Bars the schematic needs. The blueprint's `<power>` wins. A missing blueprint warns and uses FTL's 3. */
export function intruderPower(): number {
  const packed = droneDef("BOARDER_ION")?.power;
  if (packed != null && packed > 0) return packed;
  warnPack("No droneBlueprint BOARDER_ION <power> is loaded; FTL's 3 is used.");
  return 3;
}

/** "deals 3 ion damage to the system". Gap `<ionIntruder ion>`. */
export function intruderIon(): number {
  return ionIntruderStat("ion");
}

/** "Stun lasts for 6 seconds". Gap `<ionIntruder stun>`. */
export function intruderStun(): number {
  return ionIntruderStat("stun");
}

/** "Pulse time varies between 8.2 and 10 seconds." Gap `<ionIntruder pulseMin>`. */
export function intruderPulseMin(): number {
  return ionIntruderStat("pulseMin");
}

/** "Pulse time varies between 8.2 and 10 seconds." Gap `<ionIntruder pulseMax>`. */
export function intruderPulseMax(): number {
  return ionIntruderStat("pulseMax");
}
