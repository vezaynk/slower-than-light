import type { EventCard } from "@stl/pack";
import { tx } from "../../i18n/index.ts";

/**
 * Whole openings a beacon page draws when the card opens.
 * The sim still draws one card with between.
 * The trade, the negotiate, the attack, and the missile offer stay in the event module.
 */

/** Three printed openings for No fuel: refugee trading. The page gives no odds. */
const REFUGEE: EventCard[] = [
  {
    body: tx("wiki.cited-missing.refugee-low"),
    choices: [{ id: "c:no-fuel-refugee-trading:low", label: tx("wiki.cited-missing.continue") }],
  },
  {
    body: tx("wiki.cited-missing.refugee-hull"),
    choices: [
      { id: "c:no-fuel-refugee-trading:trade", label: tx("wiki.cited-missing.trade-10-for-3") },
      { id: "c:no-fuel-refugee-trading:engi", label: tx("wiki.cited-missing.engi-negotiate") },
      { id: "c:no-fuel-refugee-trading:refuse", label: tx("wiki.cited-missing.refuse-their-offer") },
      { id: "c:no-fuel-refugee-trading:attack", label: tx("wiki.cited-missing.attack-them") },
    ],
  },
  {
    body: tx("wiki.cited-missing.refugee-arms"),
    choices: [
      { id: "c:no-fuel-refugee-trading:missiles", label: tx("wiki.cited-missing.offer-a-missile") },
      { id: "c:no-fuel-refugee-trading:arm-no", label: tx("wiki.cited-missing.refuse-their-offer") },
    ],
  },
];

export const CARD_LISTS: Record<string, readonly EventCard[]> = {
  "no-fuel-refugee-trading": REFUGEE,
};
