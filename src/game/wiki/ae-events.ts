/**
 * Pages tagged [[Category:Advanced Edition Content Events]] in the wiki dump.
 * Membership is that tag on the page, not a list printed on the category page.
 * A run with ae === false skips these titles. An absent flag leaves them in.
 */
const AE_EVENT_TITLES = new Set<string>([
  "Abandoned station",
  "Empty beacon (Lanius)",
  "Free scrap with resources (Lanius)",
  "Lanius craftsmen",
  "Lanius fight",
  "Lanius fight distress",
  "Lanius fight in asteroid field",
  "Lanius fight near pulsar",
  "Lanius fight with friendly ASB support",
  "Lanius lone ship",
  "Lanius powered-down ship",
  "Lanius ship absorbing automated scout",
  "Lanius ship absorbing jump beacon",
  "Lanius ship absorbing rebel base",
  "Lanius ship attacking Mantis",
  "Lanius ship attacking civilian",
  "Lanius ship attacking civilian distress",
  "Lanius ship in rich debris field",
  "Lanius ship salvager",
  "Lanius trader",
  "Lanius trader with translator",
  "Lanius with Federation science craft",
  "Large trade station",
  "Pirate fight (Lanius)",
  "Pirate fight near pulsar",
  "Pirate ship attacking civilian (Lanius)",
  "Rebel fight (Lanius)",
  "Rebel fight near pulsar",
  "Refueling platform garbled broadcast",
  "Space station under construction",
  "Store (Lanius)",
]);

/** True when this page title is Advanced Edition content. */
export function aeEventTitle(title: string): boolean {
  return AE_EVENT_TITLES.has(title);
}
