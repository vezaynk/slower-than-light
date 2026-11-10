/**
 * Fuel a loaded button pays when its handler grants the gift.
 * A fixed amount has the same ends and does not roll.
 */
import { allEvents } from "@stl/pack";
import type { ChoiceGift, EventDef } from "@stl/pack";

function giftOn(ev: EventDef, id: string): ChoiceGift | undefined {
  for (const choice of ev.choices) {
    if (choice.id === id && choice.gift?.k === "fuel") return choice.gift;
  }
  for (const card of ev.cards ?? []) {
    for (const choice of card.choices) {
      if (choice.id === id && choice.gift?.k === "fuel") return choice.gift;
    }
  }
  return undefined;
}

/** The packed fuel band for this button, or null when the button pays none. */
export function fuelBand(id: string): [number, number] | null {
  for (const ev of allEvents()) {
    const gift = giftOn(ev, id);
    if (gift) return [gift.lo, gift.hi];
  }
  return null;
}

/** The fuel this button pays. A fixed gift does not call `roll`. A missing gift pays nothing. */
export function rollFuel(id: string, roll: (lo: number, hi: number) => number): number {
  const band = fuelBand(id);
  if (!band) return 0;
  if (band[0] === band[1]) return band[0];
  return roll(band[0], band[1]);
}
