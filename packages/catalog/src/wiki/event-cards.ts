import type { EventCard } from "@stl/pack";

/**
 * Whole openings a beacon page draws when the card opens.
 * The sim still draws one card with between.
 * The trade, the negotiate, the attack, and the missile offer stay in the event module.
 */

/** Three printed openings for No fuel: refugee trading. The page gives no odds. */
const REFUGEE: EventCard[] = [
  {
    body: "Refugee ship. It shares fuel.",
    choices: [{ id: "c:no-fuel-refugee-trading:low", label: "Gain low fuel." }],
  },
  {
    body: "Refugee ship. Trade offer: scrap for fuel.",
    choices: [
      { id: "c:no-fuel-refugee-trading:trade", label: "Lose 10 scrap. Gain 3 fuel." },
      { id: "c:no-fuel-refugee-trading:engi", label: "Ask for a better scrap-for-fuel trade." },
      {
        id: "c:no-fuel-refugee-trading:refuse",
        label: "1 in 2: nothing happens. 1 in 2: a second trade offer.",
      },
      {
        id: "c:no-fuel-refugee-trading:attack",
        label: "Gain medium fuel and scrap.",
      },
    ],
  },
  {
    body: "Refugee ship. Trade offer: missiles for fuel.",
    choices: [
      {
        id: "c:no-fuel-refugee-trading:missiles",
        label: "Lose 1 missile. Gain 5-7 fuel. 1 in 2: fight a pirate ship.",
      },
      {
        id: "c:no-fuel-refugee-trading:arm-no",
        label: "2 in 4: fight a pirate ship. 1 in 4: gain low fuel. 1 in 4: nothing happens.",
      },
    ],
  },
];

export const CARD_LISTS: Record<string, readonly EventCard[]> = {
  "no-fuel-refugee-trading": REFUGEE,
};
