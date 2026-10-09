import type { HullSpec } from "../hulls.ts";

/**
 * Wiki page "The Crystal Cruiser". Headings "Layout A" and "Layout B".
 * The parenthetical number on each system is the level.
 * Reactor draw is shields, engines, oxygen, medbay, weapons, and kit power.
 * Piloting, doors, and sensors do not draw power.
 * The page lists crew counts, not chairs. Seating is INFERRED.
 * No tile coordinates are on the page. This file stores none.
 */

const sub = {
  pilot: [1, 1] as [number, number],
  sensors: [1, 1] as [number, number],
  doors: [1, 1] as [number, number],
};

export const CRYSTAL_HULLS: HullSpec[] = [
  {
    id: "crystal-a",
    cruiser: "Crystal Cruiser",
    layout: "A",
    name: "Bravais",
    quote:
      "This powerful vessel is powered by the secret technologies of the lost Crystalline Beings.",
    unlock:
      "See Ancestry (ship achievement) and its linked pages for directions on unlocking the Crystal Cruiser. Alternatively, beat the Flagship with layout A and B of every ship (excluding The Lanius Cruiser).",
    source: "The Crystal Cruiser, Layout A",
    reactor: 8,
    fuel: 16,
    missiles: 0,
    parts: 0,
    // Wiki page "The Crystal Cruiser", heading "Layout A".
    // Shields 2, engines 2, oxygen 1, and weapons 3 already sum to 9 against a reactor of 8.
    // Medbay stays at level 1 with power 0.
    // INFERRED: the page does not say which bar starts empty.
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [1, 0],
      weapons: [3, 3],
      ...sub,
    },
    // Crystal Burst Mark I and Heavy Crystal Mark I. Power costs are not on this page.
    weapons: ["crystalburst", "heavycrystal"],
    // 2 Human, 2 Crystal. Seating INFERRED.
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "plain", room: "p-engines" },
      { kin: "shard", room: "p-weapons" },
      { kin: "shard", room: "p-shields" },
    ],
    kits: {},
    // The Crystal Cruiser, Layout A: Augmentations lists Crystal Vengeance.
    augments: ["vengeance"],
    unfitted: [],
  },
  {
    id: "crystal-b",
    cruiser: "Crystal Cruiser",
    layout: "B",
    name: "Carnelian",
    quote:
      "Their unique racial ability makes the Crystal beings very adept at ship boarding. This ship was designed for such raiding parties.",
    unlock: "Earn at least two out of three achievements for the Crystal Cruiser.",
    source: "The Crystal Cruiser, Layout B",
    reactor: 8,
    fuel: 16,
    missiles: 0,
    parts: 0,
    // Wiki page "The Crystal Cruiser", heading "Layout B". Weapons: none.
    // Teleporter and cloaking each take one bar. Medbay is powered.
    // Shields 2 + engines 2 + oxygen 1 + medbay 1 + those two kits is 8.
    // Weapon Control stays at level 1 with power 0 so the reactor holds.
    // INFERRED: the page does not say which bar starts empty.
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [1, 1],
      weapons: [1, 0],
      ...sub,
    },
    weapons: [],
    // 3 Crystal. Seating INFERRED. The page lists a count, not chairs.
    crew: [
      { kin: "shard", room: "p-pilot" },
      { kin: "shard", room: "p-engines" },
      { kin: "shard", room: "p-weapons" },
    ],
    // Teleporter is sling. Cloaking is veil. Both level 1, and the reactor holds power 1 on each.
    kits: {
      sling: { level: 1, power: 1 },
      veil: { level: 1, power: 1 },
    },
    // The Crystal Cruiser, Layout B: Augmentations lists Crystal Vengeance.
    augments: ["vengeance"],
    unfitted: [],
  },
];
