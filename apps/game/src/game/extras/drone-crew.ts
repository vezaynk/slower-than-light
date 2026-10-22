import { crewDef } from "@stl/pack";
import type { Game } from "../types.ts";

/**
 * `battle` and `repair` are crew blueprints for the anti-personnel drone and the system repair drone.
 * They are not races a passenger grant can bring aboard. A loaded row is one whose id survived
 * `crewDef` (a missing id falls back to the plain race).
 */
export function loadedDroneCrew(id: string | undefined): "battle" | "repair" | undefined {
  const key = id?.trim().toLowerCase();
  if (key !== "battle" && key !== "repair") return undefined;
  return crewDef(key).id === key ? key : undefined;
}

/**
 * System Repair pace. The drone reads the repair blueprint when that row is loaded.
 * Otherwise the pace stays an Engi's repair multiplier.
 */
export function repairDronePace(): number {
  const row = crewDef("repair");
  if (row.id === "repair") return row.repair;
  return crewDef("engi").repair;
}

/**
 * Anti-personnel drone fight multiplier. The drone reads the battle blueprint when that row is loaded.
 * Otherwise the hit stays an untrained human's (×1).
 */
export function battleDroneFight(): number {
  const row = crewDef("battle");
  if (row.id === "battle") return row.fight;
  return crewDef("human").fight;
}

/**
 * A crew grant whose id is a loaded drone-crew blueprint.
 * Boards one token per count: health from that blueprint, kin stored as the blueprint id
 * so a later crew step reads `crewDef(kin)` instead of a passenger race.
 * Returns how many boarded. Zero leaves the grant to the passenger-race table.
 */
export function boardDroneCrew(g: Game, id: string, count = 1): number {
  const kin = loadedDroneCrew(id);
  if (!kin || count <= 0) return 0;
  const row = crewDef(kin);
  const room =
    g.player.rooms.find((spot) => spot.id === "p-medbay")?.id ??
    g.player.rooms[0]?.id ??
    "p-medbay";
  const n = Math.floor(count);
  for (let i = 0; i < n; i++) {
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: row.name,
      side: "player",
      aboard: "player",
      hp: row.hp,
      maxHp: row.hp,
      room,
      path: [],
      move: 0,
      think: 0,
      tone: g.crew.length % 3,
      kin,
    });
  }
  return n;
}
