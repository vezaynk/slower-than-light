/**
 * Fuel a button pays when its handler grants the gift.
 * A fixed amount has the same ends and does not roll.
 * A price already stored as a positive resource effect stays that effect.
 * Standard reward bands and amounts parsed from the choice id stay in code.
 */
import { allEvents } from "@stl/pack";
import type { ChoiceGift, EventDef } from "@stl/pack";

function fuel(lo: number, hi: number): ChoiceGift {
  return { k: "fuel", lo, hi };
}

export const FUEL_GIFTS: Record<string, ChoiceGift> = {
  "c:no-fuel-slug-fuel-trader:pay": fuel(5, 5),
  "c:no-fuel-slug-fuel-trader:slug": fuel(5, 5),
  "c:no-fuel-refugee-trading:trade": fuel(3, 3),
  "c:no-fuel-refugee-trading:better": fuel(6, 6),
  "c:no-fuel-refugee-trading:again": fuel(6, 6),
  "c:slug-store-ship:ok": fuel(5, 5),
  "c:no-fuel-refugee-trading:missiles": fuel(5, 7),
  "c:no-fuel-engi-ship-repair:2": fuel(4, 6),
  "c:no-fuel-fuel-trader-distress-off:pity": fuel(1, 6),
  "c:no-fuel-fuel-trader-distress-on:pity": fuel(1, 6),
  "c:no-fuel-prepare-to-dock:pity": fuel(1, 6),
  "c:no-fuel-prepare-to-dock:accept": fuel(2, 6),
  "c:no-fuel-prepare-to-dock:distance": fuel(1, 4),
  "c:no-fuel-prepare-to-dock:scan": fuel(3, 7),
  "s:garbled-dock:signal": fuel(3, 5),
  "s:garbled-dock:doors": fuel(5, 5),
  "s:garbled-dock:sensors2": fuel(1, 3),
  "s:garbled-dock:sensors3": fuel(2, 3),
  "s:refuel-dock:accept": fuel(5, 5),
  "s:refuel-dock:steal": fuel(3, 5),
  "s:refuel-dock:quick": fuel(5, 5),
  "s:refuel-dock:doors": fuel(5, 5),
  "c:zoltan-security-checkpoint:2": fuel(2, 4),
  "c:zoltan-security-checkpoint:3": fuel(2, 4),
  "q:pirate-smuggler:bribe": fuel(2, 4),
  "q:refuel-outpost:contact": fuel(2, 4),
  "q:loyalists:medbot": fuel(3, 6),
  "q:merchant:weapons": fuel(2, 5),
  "q:engi-station:contact": fuel(2, 4),
  "last-stand-repair": fuel(5, 5),
};

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

/**
 * The fuel this button pays.
 * A fixed gift does not call `roll`, so a button that used to add a constant still spends no random number.
 * A missing gift pays nothing.
 */
export function rollFuel(id: string, roll: (lo: number, hi: number) => number): number {
  const band = fuelBand(id);
  if (!band) return 0;
  if (band[0] === band[1]) return band[0];
  return roll(band[0], band[1]);
}
