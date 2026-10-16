import type { EventCard } from "@stl/pack";

/**
 * Whole openings a beacon page draws when the card opens.
 * The sim still draws one card with between.
 * The trade, the negotiate, the attack, and the missile offer stay in the event module.
 */

/** Three printed openings for No fuel: refugee trading. The page gives no odds. */
const REFUGEE: EventCard[] = [
  {
    body: "A refugee ship fleeing the Rebel advance enters the system, having picked up your distress beacon. While it doesn't have much fuel to spare, it recognizes you are part of the Federation and offers to split its remaining fuel with you.",
    choices: [{ id: "c:no-fuel-refugee-trading:low", label: "Continue" }],
  },
  {
    body: "A refugee ship fleeing the Rebel advance enters the system, having picked up your distress beacon. While it doesn't have much fuel to spare, its hull looks damaged — it is in bad need of scrap and is willing to trade fuel for it.",
    choices: [
      { id: "c:no-fuel-refugee-trading:trade", label: "Trade 10 scrap for 3 fuel." },
      { id: "c:no-fuel-refugee-trading:engi", label: "Negotiate a better trade." },
      { id: "c:no-fuel-refugee-trading:refuse", label: "Refuse their offer." },
      {
        id: "c:no-fuel-refugee-trading:attack",
        label: "The helpless refugees make easy targets. Attack them.",
      },
    ],
  },
  {
    body: "A refugee ship fleeing the Rebel advance enters the system, having picked up your distress beacon. While it doesn't have much fuel to spare, it is in bad need of armaments and is willing to trade for them.",
    choices: [
      { id: "c:no-fuel-refugee-trading:missiles", label: "Offer some missiles for fuel." },
      { id: "c:no-fuel-refugee-trading:arm-no", label: "Refuse their offer." },
    ],
  },
];

export const CARD_LISTS: Record<string, readonly EventCard[]> = {
  "no-fuel-refugee-trading": REFUGEE,
};
