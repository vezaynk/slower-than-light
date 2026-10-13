import { tx } from "../../i18n/index.ts";
/**
 * Lanius candidate pages. Redirects have no opening choice.
 * Lanius ship absorbing rebel base runs its branches in filler-events.ts.
 * An unnamed augmentation stays unwired.
 */

export type CitedFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  | { k: "nothing" };

export type CitedEventDef = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: { id: string; label: string; fx: CitedFx[] }[];
};

export const EXTRA_EVENTS: CitedEventDef[] = [
  {
    // Lanius ship absorbing jump beacon. Abandoned Sector. unique=true. LRSmap=ship.
    // Ask, leave, the Lanius decline, and the Hull Repair Drone run in filler-events.ts.
    // Sending 30 scrap, and giving 30 scrap, 6 missiles, or 6 drone parts, each grant an unnamed augmentation and stay unwired.
    dest: "Lanius ship absorbing jump beacon",
    slug: "lanius-ship-absorbing-jump-beacon",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius ship absorbing jump beacon]]
    // > "It is unique." — [[Lanius ship absorbing jump beacon]]
    // > "You detect a damaged vessel docked with the jump beacon. It appears the Lanius are absorbing metal from the beacon, risking destroying it and becoming stranded." — [[Lanius ship absorbing jump beacon]]
    flag: "cited:lanius-ship-absorbing-jump-beacon",
    aliases: ["Lanius ship absorbing jump beacon"],
    sectors: ["Abandoned Sector"],
    body: tx("wiki.cited-events-lanius.you-detect-a-damaged-vessel-docked"),
    choices: [
      {
        id: "c:lanius-ship-absorbing-jump-beacon:0",
        // Wiki citations:
        // > "After a long message the translator only able to spurt out \"critical... must... metal...\" You can only surmise they must be desperate for scrap." — [[Lanius ship absorbing jump beacon]]
        // > "You begin to message the ship but it quickly powers on its weapons defensively. It appears to be fully functional and looking for a fight!" — [[Lanius ship absorbing jump beacon]]
        label: tx("wiki.cited-events-lanius.ask-if-they-require-assistance"),
        // A Lanius ship, or the translator. No odds.
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.a-lanius-ship-or-the-translator") }],
      },
      {
        id: "c:lanius-ship-absorbing-jump-beacon:1",
        // Wiki citations:
        // > "You prepare to jump as soon as possible. You don't want to be around if they disable this beacon." — [[Lanius ship absorbing jump beacon]]
        // > "Nothing happens." — [[Lanius ship absorbing jump beacon]]
        // > "You make preparations to jump but are surprised when the Lanius ship pulls away from the beacon towards you. It appears to be fully operational!" — [[Lanius ship absorbing jump beacon]]
        label: tx("wiki.cited-events-lanius.leave"),
        // Nothing, or a Lanius ship.
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.nothing-or-a-lanius-ship") }],
      },
      {
        id: "c:lanius-ship-absorbing-jump-beacon:2",
        // Wiki citations:
        // > "(Lanius Crew) Ask if they require assistance." — [[Lanius ship absorbing jump beacon]]
        // > "After a time you are told they were damaged and unable to repair their ship due to a lack of metal. They offer to exchange a piece of their ship's equipment for some scrap or other useful materials." — [[Lanius ship absorbing jump beacon]]
        // > "Decline." — [[Lanius ship absorbing jump beacon]]
        // > "Nothing happens." — [[Lanius ship absorbing jump beacon]]
        label: tx("wiki.cited-events-lanius.lanius-crew-ask-if-they-require"),
        // Decline. Nothing happens. The material trades stay unwired.
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.nothing-happens") }],
      },
      {
        id: "c:lanius-ship-absorbing-jump-beacon:3",
        // Wiki citations:
        // > "(Hull Repair Drone) Send a drone to help." — [[Lanius ship absorbing jump beacon]]
        // > "As soon as the drone gets close, a Lanius in a type of spacewalk maneuvering unit grabs it and immediately starts breaking it down for metal. You prepare for a fight but they appear quite grateful for the act. They start to use the metal to repair key portions of their ship. From what you can understand from the translator it appears one of their crew wishes to join you." — [[Lanius ship absorbing jump beacon]]
        // > "You receive a Lanius crewmember." — [[Lanius ship absorbing jump beacon]]
        label: tx("wiki.cited-events-lanius.hull-repair-drone-send-a-drone"),
        // A Lanius crewmember. No drone part is printed.
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.a-lanius-crewmember") }],
      },
    ],
  },
  {
    // Lanius ship absorbing rebel base. The delay, the fight, and the Lanius crew run in filler-events.ts.
    dest: "Lanius ship absorbing rebel base",
    slug: "lanius-ship-absorbing-rebel-base",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius ship absorbing rebel base]]
    // > "It is unique." — [[Lanius ship absorbing rebel base]]
    // > "You notice a number of Lanius ships absorbing a forward Rebel base and its automated scouts. They don't seem to be aggressive. Perhaps their desire for metal could prove to be useful?" — [[Lanius ship absorbing rebel base]]
    flag: "cited:lanius-ship-absorbing-rebel-base",
    aliases: ["Lanius ship absorbing rebel base"],
    sectors: ["Abandoned Sector"],
    body: tx("wiki.cited-events-lanius.you-notice-a-number-of-lanius"),
    choices: [
      {
        id: "c:lanius-ship-absorbing-rebel-base:0",
        // Wiki citations:
        // > "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. They thank you for the tip and prepare to jump in the direction you came. That will hopefully delay the fleet. You scrap what remains of the Rebel station." — [[Lanius ship absorbing rebel base]]
        // > "You receive medium scrap with resources and Rebel Fleet is delayed for 1 turn." — [[Lanius ship absorbing rebel base]]
        // > "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. You're not certain if you were misunderstood but they appear to scoff at your suggestion. Most ships continue what they were doing but a single ship moves to fight you." — [[Lanius ship absorbing rebel base]]
        // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius ship absorbing rebel base]]
        // > "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. However, either the translation device has failed or they're simply not interested. They cut the channel and continue to absorb the ships." — [[Lanius ship absorbing rebel base]]
        // > "Nothing happens." — [[Lanius ship absorbing rebel base]]
        label: tx("wiki.cited-events-lanius.try-to-use-them-to-delay"),
        // "Medium scrap, a Lanius ship, or nothing."
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.medium-scrap-and-a-fleet-delay") }],
      },
      {
        id: "c:lanius-ship-absorbing-rebel-base:1",
        // Wiki citations:
        // > "Leave them alone." — [[Lanius ship absorbing rebel base]]
        // > "You decide it would be better to leave them be." — [[Lanius ship absorbing rebel base]]
        // > "Nothing happens." — [[Lanius ship absorbing rebel base]]
        label: tx("wiki.cited-events-lanius.leave-them-alone"),
        // "Nothing happens."
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.nothing-happens") }],
      },
      {
        id: "c:lanius-ship-absorbing-rebel-base:2",
        // Wiki citations:
        // > "(Lanius Crew) Try to use them to delay the Rebels." — [[Lanius ship absorbing rebel base]]
        // > "Your crewmember tells them of the approaching fleet and the number of automated ships they use to scout ahead. They thank you for the tip and prepare to jump in the direction you came. That will hopefully will delay the fleet. You scrap what remains of the Rebel station." — [[Lanius ship absorbing rebel base]]
        // > "You receive medium scrap with resources and Rebel Fleet is delayed for 1 turn." — [[Lanius ship absorbing rebel base]]
        label: tx("wiki.cited-events-lanius.try-to-use-them-to-delay"),
        // "Lanius crew. Medium scrap and a fleet delay."
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.medium-scrap-and-a-fleet-delay-2") }],
      },
    ],
  },
  {
    // Lanius craftsmen. Abandoned Sector. unique=true. LRSmap=noship.
    // The inquiry, the 45/50/40 scrap crafts, and the Lanius 10-scrap discount run in filler-events.ts.
    dest: "Lanius craftsmen",
    slug: "lanius-craftsmen",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius craftsmen]]
    // > "It is unique." — [[Lanius craftsmen]]
    // > "A merchant ship is docked with a Lanius transport. You message them to see if they need any help. It turns out they have been studying the Lanius's ability to reshape metal." — [[Lanius craftsmen]]
    flag: "cited:lanius-craftsmen",
    aliases: ["Lanius craftsmen"],
    sectors: ["Abandoned Sector"],
    body: tx("wiki.cited-events-lanius.a-merchant-ship-is-docked-with"),
    choices: [
      {
        id: "c:lanius-craftsmen:0",
        // Wiki citations:
        // > "Inquire about the process." — [[Lanius craftsmen]]
        // > "They respond, \"We haven't the foggiest idea how it works. They appear to meld part of their bodies into the metal and reshape it. They have been willing to demonstrate their ability if you have some extra metal that you would like converted into something.\"" — [[Lanius craftsmen]]
        label: tx("wiki.cited-events-lanius.inquire-about-the-process"),
        // The inquiry's crafts and the Lanius discount run in filler-events.ts.
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.nothing-happens") }],
      },
      {
        id: "c:lanius-craftsmen:1",
        // Wiki citations:
        // > "Leave them to their research." — [[Lanius craftsmen]]
        // > "While replicating their innate ability would have immeasurable consequences on commercial manufacturing, your mission has a much higher priority at the moment." — [[Lanius craftsmen]]
        // > "Nothing happens." — [[Lanius craftsmen]]
        label: tx("wiki.cited-events-lanius.leave-them-to-their-research"),
        // "Nothing happens."
        fx: [{ k: "note", text: tx("wiki.cited-events-lanius.nothing-happens") }],
      },
    ],
  },
];
