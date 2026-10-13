/**
 * Augmentations, "Adv. FTL Navigation", description
 * "Allows the ship to jump to any previously visited Beacon."
 * Augmentations, "Adv. FTL Navigation", bullet
 * "Allows jumping to previously visited beacons which were later overtaken by the Rebel Fleet."
 *
 * Visited is the whole gate. A column the fleet has already passed
 * (beacon.col < fleet) stays open when visited and stays closed when not.
 * Fuel is not spent here. Whether the augment is installed is not checked here.
 * canJumpTo calls this only when "nav" is fitted, and commitJump still spends one fuel.
 */
export function navAllows(beacon: { visited: boolean; col: number }, fleet: number): boolean {
  const overtaken = beacon.col < fleet;
  if (beacon.visited && overtaken) return true;
  if (beacon.visited && !overtaken) return true;
  if (!beacon.visited && overtaken) return false;
  return false;
}
