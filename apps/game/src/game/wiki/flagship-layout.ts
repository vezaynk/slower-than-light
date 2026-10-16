import type { Layout } from "../layouts.ts";

/**
 * Rebel Flagship cutaways. Square counts are the traced cells.
 * Pitch is 35. Stage 1 and stage 3 start at pixel (54, 122).
 * Stage 2 is the same grid shifted to pixel (37, 122).
 * Advanced Edition is on, so cloaking, hacking, and mind control are rooms.
 * The two peach links are Hard-only and stay in flagshipHardLinks.
 * Stage 1 door bars are gray (161, 161, 159). The hull is orange, so the
 * orange door test was not used on that picture. Stage 2 and 3 bars are
 * orange (255, 90, 29). This file does not wire the fight.
 */

export const flagshipStage1: Layout = {
  cols: 12,
  rows: 10,
  rooms: [
    { id: "f1-pilot", title: "Piloting", system: "pilot", x: 5, y: 0, w: 2, h: 1 },
    { id: "f1-laser", title: "Boss Laser", system: null, x: 3, y: 1, w: 1, h: 2 },
    { id: "f1-shields", title: "Shields", system: "shields", x: 5, y: 1, w: 2, h: 2 },
    { id: "f1-missile", title: "Boss Missile", system: null, x: 8, y: 1, w: 1, h: 2 },
    { id: "f1-ion", title: "Boss Ion", system: null, x: 0, y: 2, w: 2, h: 1 },
    { id: "f1-beam", title: "Boss Beam", system: null, x: 10, y: 2, w: 2, h: 1 },
    { id: "f1-doors", title: "Door", system: "doors", x: 4, y: 3, w: 1, h: 2 },
    { id: "f1-hall-a", title: "Hall", system: null, x: 5, y: 3, w: 2, h: 1 },
    { id: "f1-hall-b", title: "Hall", system: null, x: 7, y: 3, w: 1, h: 2 },
    { id: "f1-cloak", title: "Cloaking", system: null, x: 0, y: 4, w: 2, h: 2 },
    { id: "f1-hall-c", title: "Hall", system: null, x: 2, y: 4, w: 2, h: 1 },
    { id: "f1-medbay", title: "Medbay", system: "medbay", x: 5, y: 4, w: 2, h: 1 },
    { id: "f1-hall-d", title: "Hall", system: null, x: 8, y: 4, w: 2, h: 1 },
    { id: "f1-hall-e", title: "Hall", system: null, x: 10, y: 4, w: 2, h: 2 },
    { id: "f1-hack", title: "Hacking", system: null, x: 2, y: 5, w: 1, h: 2 },
    { id: "f1-hall-f", title: "Hall", system: null, x: 4, y: 5, w: 2, h: 2 },
    { id: "f1-hall-g", title: "Hall", system: null, x: 6, y: 5, w: 2, h: 2 },
    { id: "f1-hall-h", title: "Hall", system: null, x: 9, y: 5, w: 1, h: 2 },
    { id: "f1-oxygen", title: "Oxygen", system: "oxygen", x: 5, y: 7, w: 2, h: 1 },
    { id: "f1-engines", title: "Engines", system: "engines", x: 5, y: 8, w: 2, h: 2 },
  ],
  marks: [
    { x: 1, y: 4, side: "e" },
    { x: 1, y: 5, side: "e" },
    { x: 3, y: 4, side: "e" },
    { x: 4, y: 3, side: "e" },
    { x: 4, y: 4, side: "s" },
    { x: 5, y: 0, side: "s" },
    { x: 5, y: 6, side: "s" },
    { x: 5, y: 7, side: "s" },
    { x: 6, y: 2, side: "s" },
    { x: 6, y: 3, side: "e" },
    { x: 6, y: 6, side: "s" },
    { x: 7, y: 4, side: "e" },
    { x: 7, y: 4, side: "s" },
    { x: 9, y: 4, side: "e" },
    { x: 9, y: 5, side: "e" },
  ],
};

export const flagshipStage2: Layout = {
  cols: 12,
  rows: 10,
  rooms: [
    { id: "f2-pilot", title: "Piloting", system: "pilot", x: 5, y: 0, w: 2, h: 1 },
    { id: "f2-laser", title: "Boss Laser", system: null, x: 3, y: 1, w: 1, h: 2 },
    { id: "f2-shields", title: "Shields", system: "shields", x: 5, y: 1, w: 2, h: 2 },
    { id: "f2-missile", title: "Boss Missile", system: null, x: 8, y: 1, w: 1, h: 2 },
    { id: "f2-beam", title: "Boss Beam", system: null, x: 10, y: 2, w: 2, h: 1 },
    { id: "f2-hall-a", title: "Hall", system: null, x: 4, y: 3, w: 1, h: 2 },
    { id: "f2-hall-b", title: "Hall", system: null, x: 5, y: 3, w: 2, h: 1 },
    { id: "f2-hall-c", title: "Hall", system: null, x: 7, y: 3, w: 1, h: 2 },
    { id: "f2-medbay", title: "Medbay", system: "medbay", x: 5, y: 4, w: 2, h: 1 },
    { id: "f2-hall-d", title: "Hall", system: null, x: 8, y: 4, w: 2, h: 1 },
    { id: "f2-drone", title: "Drone", system: null, x: 10, y: 4, w: 2, h: 2 },
    { id: "f2-hall-e", title: "Hall", system: null, x: 4, y: 5, w: 2, h: 2 },
    { id: "f2-hall-f", title: "Hall", system: null, x: 6, y: 5, w: 2, h: 2 },
    { id: "f2-hall-g", title: "Hall", system: null, x: 9, y: 5, w: 1, h: 2 },
    { id: "f2-oxygen", title: "Oxygen", system: "oxygen", x: 5, y: 7, w: 2, h: 1 },
    { id: "f2-engines", title: "Engines", system: "engines", x: 5, y: 8, w: 2, h: 2 },
  ],
  marks: [
    { x: 4, y: 3, side: "e" },
    { x: 4, y: 4, side: "w" },
    { x: 4, y: 4, side: "s" },
    { x: 5, y: 0, side: "s" },
    { x: 5, y: 6, side: "s" },
    { x: 5, y: 7, side: "s" },
    { x: 6, y: 2, side: "s" },
    { x: 6, y: 3, side: "e" },
    { x: 6, y: 6, side: "s" },
    { x: 7, y: 4, side: "e" },
    { x: 7, y: 4, side: "s" },
    { x: 9, y: 4, side: "e" },
    { x: 9, y: 5, side: "e" },
  ],
};

export const flagshipStage3: Layout = {
  cols: 9,
  rows: 10,
  rooms: [
    { id: "f3-pilot", title: "Piloting", system: "pilot", x: 5, y: 0, w: 2, h: 1 },
    { id: "f3-laser", title: "Boss Laser", system: null, x: 3, y: 1, w: 1, h: 2 },
    { id: "f3-shields", title: "Shields", system: "shields", x: 5, y: 1, w: 2, h: 2 },
    { id: "f3-missile", title: "Boss Missile", system: null, x: 8, y: 1, w: 1, h: 2 },
    { id: "f3-hall-a", title: "Hall", system: null, x: 4, y: 3, w: 1, h: 2 },
    { id: "f3-teleporter", title: "Teleporter", system: null, x: 5, y: 3, w: 2, h: 1 },
    { id: "f3-mind", title: "Mind Control", system: null, x: 7, y: 3, w: 1, h: 2 },
    { id: "f3-medbay", title: "Medbay", system: "medbay", x: 5, y: 4, w: 2, h: 1 },
    { id: "f3-hall-b", title: "Hall", system: null, x: 4, y: 5, w: 2, h: 2 },
    { id: "f3-hall-c", title: "Hall", system: null, x: 6, y: 5, w: 2, h: 2 },
    { id: "f3-oxygen", title: "Oxygen", system: "oxygen", x: 5, y: 7, w: 2, h: 1 },
    { id: "f3-engines", title: "Engines", system: "engines", x: 5, y: 8, w: 2, h: 2 },
  ],
  marks: [
    { x: 4, y: 3, side: "e" },
    { x: 4, y: 4, side: "w" },
    { x: 4, y: 4, side: "s" },
    { x: 5, y: 0, side: "s" },
    { x: 5, y: 6, side: "s" },
    { x: 5, y: 7, side: "s" },
    { x: 6, y: 2, side: "s" },
    { x: 6, y: 3, side: "e" },
    { x: 6, y: 6, side: "s" },
    { x: 7, y: 4, side: "e" },
    { x: 7, y: 4, side: "s" },
  ],
};

/** Two Hard link rooms counted on Flagship1stStage.png. The hard screenshot is a full ship and was not the cell count. */
export const flagshipHardLinks: Layout = {
  cols: 8,
  rows: 3,
  rooms: [
    { id: "fh-laser-link", title: "Hall", system: null, x: 4, y: 1, w: 1, h: 2 },
    { id: "fh-missile-link", title: "Hall", system: null, x: 7, y: 1, w: 1, h: 2 },
  ],
  marks: [
    { x: 4, y: 1, side: "e" },
    { x: 4, y: 2, side: "w" },
    { x: 7, y: 1, side: "w" },
    { x: 7, y: 2, side: "e" },
  ],
};
