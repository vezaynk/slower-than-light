import { tx } from "../../i18n/index.ts";
/**
 * Rebel Flagship phase numbers from wiki page "The Rebel Flagship".
 * One row each for "1st Stage", "2nd stage", and "Final stage".
 * Easy / Normal / Hard splits are not averaged. Hard-only lines are
 * FLAGSHIP_HARD. Room diagrams are pictures, so no grid is stored.
 * Power Surge cooldown is the printed range, 20 to 30 seconds.
 * @agent:flagship. The fight now uses the traced cutaways (wiki/flagship-layout.ts) and runs each stage's
 * systems and Power Surge through wiki/flagship-systems.ts. The "No room layout is encoded" notes below
 * describe these rows only.
 */

export type FlagshipPhase = {
  phase: 1 | 2 | 3;
  source: string;
  hull?: number;
  weapons: string[];
  systems: { name: string; level?: number }[];
  surge?: string;
  notes: string[];
};

/**
 * Wiki page "The Rebel Flagship", "1st Stage" (General, Weapons, Systems, Dodge Rate).
 * "Global behavior": Power Surge is not on this stage.
 */
const PHASE_1: FlagshipPhase = {
  phase: 1,
  source: tx("wiki.flagship.wiki-page-the-rebel-flagship-section"),
  hull: 20,
  weapons: [tx("wiki.flagship.boss-ion"), tx("wiki.flagship.boss-laser"), tx("wiki.flagship.boss-missile"), tx("wiki.flagship.boss-beam")],
  systems: [
    { name: tx("wiki.flagship.piloting"), level: 3 },
    { name: tx("wiki.flagship.shields"), level: 8 },
    { name: tx("wiki.flagship.door"), level: 3 },
    { name: tx("wiki.flagship.cloaking"), level: 2 },
    { name: tx("wiki.flagship.medbay"), level: 3 },
    { name: tx("wiki.flagship.engines"), level: 2 },
    { name: tx("wiki.flagship.oxygen"), level: 2 },
    { name: tx("wiki.flagship.hacking"), level: 3 },
  ],
  notes: [
    tx("wiki.flagship.general-reactor-42"),
    tx("wiki.flagship.general-crew-11-humans"),
    tx("wiki.flagship.general-drone-parts-10"),
    tx("wiki.flagship.weapons-system-levels-boss-ion-3"),
    tx("wiki.flagship.weapon-cooldowns-and-status-effects-at"),
    tx("wiki.flagship.weapon-cooldowns-and-status-effects-lasers"),
    tx("wiki.flagship.global-behavior-the-missile-launcher-does"),
    tx("wiki.flagship.dodge-rate-base-10-fully-manned"),
    tx("wiki.flagship.hacking-advanced-edition-only-consumes-1"),
    tx("wiki.flagship.flagship-variation-easy-mode-with-advanced"),
    tx("wiki.flagship.global-behavior-no-power-surge-on"),
    tx("wiki.flagship.1st-stage-diagram-room-positions-are"),
  ],
};

/**
 * Wiki page "The Rebel Flagship", "2nd stage"
 * (General, Weapons, Systems, Drones, Power Surge, Dodge rate).
 */
const PHASE_2: FlagshipPhase = {
  phase: 2,
  source: tx("wiki.flagship.wiki-page-the-rebel-flagship-section-2"),
  hull: 22,
  weapons: [tx("wiki.flagship.boss-laser"), tx("wiki.flagship.boss-missile"), tx("wiki.flagship.boss-beam")],
  systems: [
    { name: tx("wiki.flagship.piloting"), level: 3 },
    { name: tx("wiki.flagship.shields"), level: 8 },
    { name: tx("wiki.flagship.medbay"), level: 3 },
    { name: tx("wiki.flagship.engines"), level: 3 },
    { name: tx("wiki.flagship.oxygen"), level: 2 },
    { name: tx("wiki.flagship.drone"), level: 8 },
  ],
  surge:
    tx("wiki.flagship.power-surge-deploys-extra-drones-randomly"),
  notes: [
    tx("wiki.flagship.general-reactor-44"),
    tx("wiki.flagship.general-crew-is-the-remaining-crew"),
    tx("wiki.flagship.general-drone-parts-10"),
    tx("wiki.flagship.drones-combat-drone-mark-i-2"),
    tx("wiki.flagship.power-surge-those-extra-drones-do"),
    tx("wiki.flagship.weapons-system-levels-boss-laser-3"),
    tx("wiki.flagship.weapon-cooldowns-and-status-effects-at-2"),
    tx("wiki.flagship.weapon-cooldowns-and-status-effects-lasers"),
    tx("wiki.flagship.global-behavior-the-missile-launcher-does"),
    tx("wiki.flagship.systems-hacking-door-and-cloaking-were"),
    tx("wiki.flagship.dodge-rate-base-15-fully-manned"),
    tx("wiki.flagship.flagship-variation-easy-mode-with-advanced"),
    tx("wiki.flagship.2nd-stage-diagram-room-positions-are"),
  ],
};

/**
 * Wiki page "The Rebel Flagship", "Final stage"
 * (General, Weapons, Systems, Power Surge, Dodge rate).
 */
const PHASE_3: FlagshipPhase = {
  phase: 3,
  source: tx("wiki.flagship.wiki-page-the-rebel-flagship-section-3"),
  hull: 20,
  weapons: [tx("wiki.flagship.boss-laser"), tx("wiki.flagship.boss-missile")],
  systems: [
    { name: tx("wiki.flagship.piloting"), level: 3 },
    { name: tx("wiki.flagship.shields"), level: 8 },
    { name: tx("wiki.flagship.teleporter"), level: 2 },
    { name: tx("wiki.flagship.medbay"), level: 3 },
    { name: tx("wiki.flagship.engines"), level: 6 },
    { name: tx("wiki.flagship.oxygen"), level: 2 },
    { name: tx("wiki.flagship.mind-control"), level: 3 },
  ],
  surge:
    tx("wiki.flagship.power-surge-shoots-7-laser-shots"),
  notes: [
    tx("wiki.flagship.general-reactor-32"),
    tx("wiki.flagship.general-crew-is-the-remaining-crew-2"),
    tx("wiki.flagship.general-the-zoltan-shield-has-12"),
    tx("wiki.flagship.weapons-system-levels-boss-laser-4"),
    tx("wiki.flagship.weapon-cooldowns-and-status-effects-at-3"),
    tx("wiki.flagship.weapon-cooldowns-and-status-effects-lasers"),
    tx("wiki.flagship.global-behavior-the-missile-launcher-does"),
    tx("wiki.flagship.systems-the-drone-system-was-lost"),
    tx("wiki.flagship.systems-mind-control-is-present-only"),
    tx("wiki.flagship.dodge-rate-base-28-fully-manned"),
    tx("wiki.flagship.flagship-variation-easy-mode-with-advanced"),
    tx("wiki.flagship.final-stage-diagram-room-positions-are"),
  ],
};

export const FLAGSHIP_PHASES: FlagshipPhase[] = [PHASE_1, PHASE_2, PHASE_3];

/**
 * Wiki page "The Rebel Flagship", "Flagship variation" and
 * "Boarding strategy" / "Hard mode".
 * Kept off the phase rows so Easy, Normal, and Hard are not averaged.
 * The linking rooms are only drawn on the stage pictures.
 */
export const FLAGSHIP_HARD: { source: string; notes: string[] } = {
  source:
    tx("wiki.flagship.wiki-page-the-rebel-flagship-sections"),
  notes: [
    tx("wiki.flagship.flagship-variation-on-hard-mode-two"),
    tx("wiki.flagship.flagship-variation-those-extra-rooms-are"),
    tx("wiki.flagship.2nd-stage-power-surge-7-extra"),
    tx("wiki.flagship.boarding-strategy-hard-mode-the-laser"),
    tx("wiki.flagship.boarding-strategy-hard-mode-without-boarding"),
  ],
};
