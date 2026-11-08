/**
 * The escape lines the cited event pages print, keyed by the page's slug (the fight's `event`).
 * Wiki page "Enemy Ships", section "Surrenders and escape attempts", unless a line says otherwise.
 *
 * This is content, not a rule: in ftl.dat each of these is the ship event's own `<escape timer chance min max>` and its
 * `<gotaway>` `<modifyPursuit>`. It goes with the cited event pages (wiki/README.md section 2), but deleting it is not
 * free: these fights start as "Rebel ship" / "Auto-ship", not a ship-event id, so `startCombat` never meets an archive
 * `<escape>`, and sim.ts `archiveEscapePlan` only builds a hull-threshold plan (`running: false`, `pursuit: false`).
 * Before this file goes, the archive path must run a ship from the start and turn a `<gotaway>` `<modifyPursuit>` into
 * `pursuit` (the next fleet advance counts twice, not payPageFx's immediate `g.fleet *= 2`).
 */

export type CitedEscape =
  | { kind: "start"; seconds: number; pursuit: boolean }
  | { kind: "hull"; chance: number; low: number; high: number; seconds?: number }
  | { kind: "never" };

/**
 * Enemy Ships, "Always run away from the start", seconds per event page.
 * Pursuit: Category "Rebel Fleet advancement hazard" lists Auto-ship warning, Auto-ship warning in nebula,
 * No fuel: Auto-ship warning, and Rebel ship warning. "Rebel transport ship": "Fleet pursuit is not doubled."
 */
const RUN_FROM_START: Record<string, { seconds: number; pursuit: boolean }> = {
  "auto-ship-warning": { seconds: 40, pursuit: true },
  "auto-ship-warning-in-nebula": { seconds: 40, pursuit: true },
  // Enemy Ships: "exception: No fuel: Auto-ship warning has 40 seconds escape timer".
  // Wiki citations:
  // > "Rebel Fleet pursuit is doubled." — [[No fuel: Auto-ship warning]]
  // > "Unlike the usual 80 seconds escape countdown timer in all other Out-of-fuel events or the 90 seconds escape countdown timer for any hostile ship encountered in other events after depleting your last fuel, the enemy auto-ship has 40 seconds escape countdown timer from the start, similarly to Auto-ship warning and Auto-ship warning in nebula (and Rebel ship warning) events." — [[No fuel: Auto-ship warning#Notes]]
  "no-fuel-auto-ship-warning": { seconds: 40, pursuit: true },
  "rebel-ship-warning": { seconds: 40, pursuit: true },
  "rebel-transport-ship": { seconds: 40, pursuit: false },
  "engi-fleet-discussion": { seconds: 40, pursuit: false },
  "rock-war-vessel-encounter": { seconds: 32, pursuit: false },
  // Slug Home Nebula surrender is the Slug hull row (50% at 30-40%). The 35 second timer is the interceptor only.
  // No fuel: prepare to dock, the hostile accept: {{SurrenderEscape|timer|90}}.
  // Wiki citations:
  // > "Fight a Pirate ship (default rewards). (90 seconds escape countdown timer if not interrupted)" — [[No fuel: prepare to dock]]
  "no-fuel-prepare-dock-90": { seconds: 90, pursuit: false },
  // No fuel: refugee trading, every pirate fight: {{SurrenderEscape|timer|90}}.
  // Wiki citations:
  // > "You lose Missiles lost: 1, receive Fuel gained: 5-7, and you fight a Pirate ship (default rewards). (90 seconds escape countdown timer if not interrupted)" — [[No fuel: refugee trading]]
  // > "Fight a Pirate ship (default rewards). (90 seconds escape countdown timer if not interrupted)" — [[No fuel: refugee trading]]
  "no-fuel-refugee-trading": { seconds: 90, pursuit: false },
};

/** Event pages that print their own hull-triggered escape row, keyed by the cited event slug. */
const EVENT_HULL_ROWS: Record<
  string,
  { chance: number; low: number; high: number; seconds?: number }
> = {
  // Pirate briber: "has 60% chance to try to escape at 30-40% hull".
  "pirate-briber": { chance: 60, low: 30, high: 40 },
  // "Pirate smuggler", Fight the Pirate ship: "(enemy ship starts to escape at 30-40% hull with 35 seconds countdown timer)".
  // INFERRED: no percent is printed, so the run always begins once hull is in that range.
  "pirate-smuggler": { chance: 100, low: 30, high: 40, seconds: 35 },
  // Rebel ship attacking civilians in Last Stand. {{SurrenderEscape|escape|BOSS_SCOUT_RESCUE|events_boss.xml|50|40-80|4-8}}
  // prints 50% at 40-80% hull. The 4-8 is the template's actual-hull warning, not a timer, so the typical 15 seconds stays.
  "rebel-ship-attacking-civilians-in-last-stand": { chance: 50, low: 40, high: 80 },
};

/** Event pages that print that their ship never runs. */
const NEVER_RUN_EVENTS = new Set([
  // Rebel fight among Rebel fleet. The page prints surrenderno+escapeno. Surrender is already listed elsewhere.
  // Wiki citations:
  // > "no surrender offers, no escape attempts" — [[Rebel fight among Rebel fleet]]
  "rebel-fight-among-rebel-fleet",
  // Rebel fight among Federation and Rebel fleets. The page prints surrenderno+escapeno.
  "rebel-fight-among-federation-and-rebel-fleets",
  // Rebel ship attacking Federation loyalists. The page prints never surrenders, never escapes. Surrender is already listed elsewhere.
  "rebel-ship-attacking-federation-loyalists",
  // Pirate ship attacking civilian distress. The page prints surrenderno+escapeno. Surrender is already listed elsewhere.
  "pirate-ship-attacking-civilian-distress",
  // Pirate ship attacking civilian. The page prints surrenderno+escapeno. Surrender is already listed elsewhere.
  "pirate-ship-attacking-civilian",
  // Lanius ship attacking civilian distress. {{SurrenderEscape(alt)|no|LANIUS_CIVILIAN}} prints never runs away. Surrender is already listed elsewhere.
  "lanius-ship-attacking-civilian-distress",
  // Lanius ship attacking civilian. {{SurrenderEscape(alt)|no|LANIUS_CIVILIAN}} prints never runs away. Surrender is already listed elsewhere.
  "lanius-ship-attacking-civilian",
  // Lanius ship attacking Rock. {{SurrenderEscape(alt)|no|LANIUS_ROCK_DISTRESS_SHIP}} prints never runs away. Surrender is already listed elsewhere.
  "lanius-ship-attacking-rock",
  // Lanius ship attacking Mantis. {{SurrenderEscape(alt)|no|LANIUS_MANTIS_DISTRESS_SHIP}} prints never runs away. Surrender is already listed elsewhere.
  "lanius-ship-attacking-mantis",
  // Lanius ship attacking Slug. {{SurrenderEscape(alt)|no|LANIUS_SLUG_DISTRESS_SHIP}} prints never runs away. Surrender is already listed elsewhere.
  "lanius-ship-attacking-slug",
  // Lanius ship in rich debris field. {{SurrenderEscape(alt)|no|LANIUS_HARVESTER_SHIP}} prints never runs away. Surrender is already listed elsewhere.
  "lanius-ship-in-rich-debris-field",
  // Lanius fight with friendly ASB support. {{SurrenderEscape(alt)|no|LANIUS_BOARDERS_PDS}} prints never runs away. Surrender is already listed elsewhere.
  "lanius-fight-with-friendly-asb-support",
  // Rebel ship attacking refueling outpost. The page prints the ship doesn't try to escape. Surrender is already listed elsewhere.
  "rebel-ship-attacking-refueling-outpost",
  // Rebel ship supplying civilians. The page prints the ship doesn't try to escape. Surrender is already listed elsewhere.
  "rebel-ship-supplying-civilians",
  // Pirate engine hacker. The page prints the ship doesn't try to escape. Surrender is not this line.
  "pirate-engine-hacker",
  // Slug hacker (oxygen). The page prints the ship doesn't try to escape. Surrender is not this line.
  "slug-hacker-oxygen",
  // Crystalline men buried and Crystalline research facility: {{SurrenderEscape(alt)|no|CRYSTAL_SHIP_NO_SURRENDER}}.
  "crystalline-men-buried",
  "crystalline-research-facility",
  // Fight in Last Stand: {{SurrenderEscape(alt)|no|REBEL_AND_AUTO}}. No surrender and no escape.
  "fight-in-last-stand",
]);

/**
 * Enemy Ships: "When you are out of fuel and WAIT ... all ships start running with an escape timer of 80 seconds".
 * ftl.dat prints it on each out-of-fuel ship event (`<escape timer="80">`), so it is that page's content here too.
 */
export const OUT_OF_FUEL_WAIT_SECONDS = 80;

/** The escape line a cited event page prints, or undefined when the page prints none. */
export function citedEscape(event: string | undefined): CitedEscape | undefined {
  if (!event) return undefined;
  const scripted = RUN_FROM_START[event];
  if (scripted) return { kind: "start", ...scripted };
  const own = EVENT_HULL_ROWS[event];
  if (own) return { kind: "hull", ...own };
  if (NEVER_RUN_EVENTS.has(event)) return { kind: "never" };
  // Enemy Ships: out of fuel and WAIT, "all ships start running" at 80 seconds. The "No fuel: …" event
  // pages are the ones reached by waiting with no fuel, so their slug marks the rule.
  // Wiki citations:
  // > "Fight a Mantis ship that is running away. (80 seconds escape countdown timer if not interrupted)" — [[No fuel: Mantis fight]]
  // > "Fight a Rebel ship that is running away. (80 seconds escape countdown timer if not interrupted)" — [[No fuel: Rebel fight]]
  // > "Fight a Slug ship that is running away. (80 seconds escape countdown timer if not interrupted)(no surrender offers)" — [[No fuel: Slug fuel depot]]
  // > "Fight an Auto-ship that is running away. (80 seconds escape countdown timer if not interrupted)" — [[No fuel: automated refueling ship]]
  // > "2-3 human boarders beam aboard your ship and you fight a Pirate ship (default rewards). (80 seconds escape countdown timer if not interrupted)" — [[No fuel: prepare to dock]]
  // > "Fight a Pirate ship (default rewards). (80 seconds escape countdown timer if not interrupted)" — [[No fuel: prepare to dock]]
  if (event.startsWith("no-fuel-"))
    return { kind: "start", seconds: OUT_OF_FUEL_WAIT_SECONDS, pursuit: false };
  return undefined;
}
