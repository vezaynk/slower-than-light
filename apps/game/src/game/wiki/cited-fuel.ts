/**
 * Waiting with no fuel. The pages are loaded events. Which distress side each title belongs to
 * is the selection rule. The wait-fail lines are not pages.
 */
import "../pack/base.ts";
import { allEvents } from "@stl/pack";

type OutOfFuel = "distresson" | "distressoff" | "distressboth";

/** Dest order is the seven written pages, then the extra pages. Not a shuffle. */
const FUEL_PAGES: { dest: string; side: OutOfFuel }[] = [
  { dest: "No fuel: Auto-ship warning", side: "distresson" },
  { dest: "No fuel: Engi ship repair", side: "distressoff" },
  { dest: "No fuel: Mantis fight", side: "distresson" },
  { dest: "No fuel: Rebel fight", side: "distresson" },
  { dest: "No fuel: Slug fuel depot", side: "distresson" },
  { dest: "No fuel: automated refueling ship", side: "distresson" },
  { dest: "No fuel: explore the system", side: "distressboth" },
  { dest: "No fuel: Rebel fleet delay", side: "distressoff" },
  { dest: "No fuel: friendly refugee", side: "distressoff" },
  { dest: "No fuel: Slug fuel trader", side: "distresson" },
  { dest: "No fuel: drifting debris", side: "distressoff" },
  { dest: "No fuel: fuel trader (distress off)", side: "distressoff" },
  { dest: "No fuel: fuel trader (distress on)", side: "distresson" },
  { dest: "No fuel: prepare to dock", side: "distressboth" },
  { dest: "No fuel: refugee trading", side: "distresson" },
];

const WAIT_FAIL: Record<"on" | "off", string[]> = {
  off: [
    "No ship is in scanning range and no one arrives at the beacon.",
    "Your waiting yields nothing while the fleet surely gets closer...",
    "A freighter suddenly arrives nearby. They are so close you can almost wave at them, but your hails are ignored and the ship quickly jumps away.",
    "Small traffic passes within a short distance of you, but no one responds to your hails.",
    "The only ship within hailing range appears to be a civilian vessel. However, it quickly leaves once it picks up your signal.",
    "As you wait, a small asteroid storm pelts softly against your shields and hull.",
    "You begin to wonder if turning on the beacon would be worth the risk of detection. The fleet slowly approaches.",
    "You contemplate the vastness of space.",
    "The prolonged wait in empty space is causing tension among the crew. Still no contact.",
    "Cabin fever begins to spread among your crew.",
    "Long range scanners detect a small settlement, but they refuse all contact.",
  ],
  on: [
    "You contemplate that it is fortunate the ship's life support system does not rely on FTL fuel cells.",
    "Nothing happens. Your calls go unanswered.",
    "The distress beacon's light is the only movement visible outside the ship.",
    "No ships jump into the sector...",
    "A few passing ships seem oblivious to your distress call and ignore all hails.",
    "A few civilian ships are within scanning range, yet none respond to your calls.",
    "No ships pass through the area.",
  ],
};

/** Loaded pages whose distress side matches. `flag` is the id the pack stored. */
export function citedFuelCandidates(distressOn: boolean): { flag: string; dest: string }[] {
  const side: OutOfFuel = distressOn ? "distresson" : "distressoff";
  const out: { flag: string; dest: string }[] = [];
  for (const page of FUEL_PAGES) {
    if (page.side !== side && page.side !== "distressboth") continue;
    const ev = allEvents().find((row) => row.dest === page.dest);
    if (!ev) continue;
    out.push({ flag: ev.id, dest: ev.dest });
  }
  return out;
}

/**
 * Waiting with no fuel plays an out-of-fuel page for the distress beacon's state.
 * The wait fail is 16.7% with the beacon on and 36.4% with it off.
 * Rebel fleet delay is the 9% off page. The other matching pages share the rest.
 */
export function rollFuelWait(
  roll: () => number,
  distressOn: boolean,
): { flag: string; dest: string } | { fail: string } {
  const r = roll();
  const failShare = distressOn ? 0.167 : 0.364;
  if (r < failShare) {
    const lines = WAIT_FAIL[distressOn ? "on" : "off"];
    return { fail: lines[Math.min(lines.length - 1, Math.floor(roll() * lines.length))]! };
  }
  const pages = citedFuelCandidates(distressOn);
  const delay = pages.find((page) => page.dest === "No fuel: Rebel fleet delay");
  if (!distressOn && delay && r < failShare + 0.09) return delay;
  const rest = pages.filter((page) => page !== delay);
  return rest[Math.min(rest.length - 1, Math.floor(roll() * rest.length))]!;
}
