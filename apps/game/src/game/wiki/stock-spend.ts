/**
 * Spend a packed stock count. The check does not subtract, so a bundle can
 * require every resource before any of them is paid.
 */
import type { Game } from "../types.ts";
import { stockCount, type StockKind } from "./choice-locks.ts";

function held(g: Game, kind: StockKind): number {
  if (kind === "scrap") return g.scrap;
  if (kind === "fuel") return g.fuel;
  if (kind === "missiles") return g.missiles;
  return g.player.parts;
}

/** The packed count when the ship can pay it. Null when the row is missing or the ship is short. */
export function affordStock(g: Game, id: string, kind: StockKind): number | null {
  const n = stockCount(id, kind);
  if (n == null || held(g, kind) < n) return null;
  return n;
}

export function takeStock(g: Game, kind: StockKind, n: number): void {
  if (kind === "scrap") g.scrap -= n;
  else if (kind === "fuel") g.fuel -= n;
  else if (kind === "missiles") g.missiles -= n;
  else g.player.parts -= n;
}

export function scrapLine(n: number): string {
  return `Scrap: -${n}.`;
}

export function fuelLine(n: number): string {
  return `Fuel: -${n}.`;
}

export function missileLine(n: number): string {
  return `Missiles: -${n}.`;
}

export function partsLine(n: number): string {
  return `Drone parts: -${n}.`;
}
