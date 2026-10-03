/**
 * Rebel Flagship phase numbers from wiki page "The Rebel Flagship".
 * One row each for "1st Stage", "2nd stage", and "Final stage".
 * Easy / Normal / Hard splits are not averaged. Hard-only lines are
 * FLAGSHIP_HARD. Room diagrams are pictures, so no grid is stored.
 * Power Surge cooldown is the printed range, 20 to 30 seconds.
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
  source: 'Wiki page "The Rebel Flagship", section "1st Stage"',
  hull: 20,
  weapons: ["Boss Ion", "Boss Laser", "Boss Missile", "Boss Beam"],
  systems: [
    { name: "Piloting", level: 3 },
    { name: "Shields", level: 8 },
    { name: "Door", level: 3 },
    { name: "Cloaking", level: 2 },
    { name: "Medbay", level: 3 },
    { name: "Engines", level: 2 },
    { name: "Oxygen", level: 2 },
    { name: "Hacking", level: 3 },
  ],
  notes: [
    "General: Reactor 42.",
    "General: Crew 11 Humans.",
    "General: Drone parts 10.",
    "Weapons: system levels Boss Ion 3, Boss Laser 3, Boss Missile 3, Boss Beam 3.",
    "Weapon cooldowns and status effects: at system level 3 the charge times are Ion 21 seconds, Laser 15 seconds, Missile 17.25 seconds, Beam 19.5 seconds.",
    "Weapon cooldowns and status effects: lasers 10% fire and 9% breach. Missiles 30% fire and 14% breach. None of the Flagship weapons can stun.",
    "Global behavior: the missile launcher does not consume missiles.",
    "Dodge Rate: base 10%. Fully manned 20% (enemy crew is unskilled regardless of difficulty). Unmanned and the piloting room empty 8%. Controlled by AI 20%.",
    "Hacking: Advanced Edition only. Consumes 1 drone part to deploy.",
    "Flagship variation: Easy mode with Advanced Edition Content disabled has 3 shield layers (shield system level 6) instead of the usual 4 (level 8), on all three stages. Shields on this row stay at the printed 8.",
    "Global behavior: no Power Surge on the first stage.",
    "1st Stage diagram: room positions are a picture. Transparent systems exist only with Advanced Edition. Transparent rooms exist only on Hard mode. No room layout is encoded.",
  ],
};

/**
 * Wiki page "The Rebel Flagship", "2nd stage"
 * (General, Weapons, Systems, Drones, Power Surge, Dodge rate).
 */
const PHASE_2: FlagshipPhase = {
  phase: 2,
  source: 'Wiki page "The Rebel Flagship", section "2nd stage"',
  hull: 22,
  weapons: ["Boss Laser", "Boss Missile", "Boss Beam"],
  systems: [
    { name: "Piloting", level: 3 },
    { name: "Shields", level: 8 },
    { name: "Medbay", level: 3 },
    { name: "Engines", level: 3 },
    { name: "Oxygen", level: 2 },
    { name: "Drone", level: 8 },
  ],
  surge:
    "Power Surge: deploys extra drones, randomly split between Beam and Combat (both mark 1). Extra drones are 4 on Easy, 6 on Normal, and 7 on Hard. The split stays fixed for every surge unless you jump away and come back. Cooldown varies randomly each time, between 20 and 30 seconds. A warning sounds exactly 5 seconds before the surge begins. The extra drones take two shots each and then disappear; the length varies, but is about 7 seconds. If you are cloaked, positioning for a shot counts as one of the two shots. Hacking or destroying the drone system does not affect them; they are an independent hazard.",
  notes: [
    "General: Reactor 44.",
    "General: crew is the remaining crew from the previous stage, minus the one in the Ion room if left alive.",
    "General: Drone parts 10.",
    "Drones: Combat Drone Mark I (2), Anti-Ship Beam Drone I (2), Defense Drone Mark I (2), Boarding Drone (Boss) (2). Uses 4 drones at once.",
    "Power Surge: those extra drones do not consume drone parts.",
    "Weapons: system levels Boss Laser 3, Boss Missile 3, Boss Beam 3. The Boss Ion was lost during the previous battle.",
    "Weapon cooldowns and status effects: at system level 3 the charge times are Laser 15 seconds, Missile 17.25 seconds, Beam 19.5 seconds.",
    "Weapon cooldowns and status effects: lasers 10% fire and 9% breach. Missiles 30% fire and 14% breach. None of the Flagship weapons can stun.",
    "Global behavior: the missile launcher does not consume missiles.",
    "Systems: Hacking, Door, and Cloaking were lost in the previous battle.",
    "Dodge rate: base 15%. Fully manned 25% (enemy crew is unskilled regardless of difficulty). Unmanned and the piloting room empty 12%. Controlled by AI 25%.",
    "Flagship variation: Easy mode with Advanced Edition Content disabled has 3 shield layers (shield system level 6) instead of the usual 4 (level 8), on all three stages. Shields on this row stay at the printed 8.",
    "2nd stage diagram: room positions are a picture. Transparent rooms exist only on Hard mode. No room layout is encoded.",
  ],
};

/**
 * Wiki page "The Rebel Flagship", "Final stage"
 * (General, Weapons, Systems, Power Surge, Dodge rate).
 */
const PHASE_3: FlagshipPhase = {
  phase: 3,
  source: 'Wiki page "The Rebel Flagship", section "Final stage"',
  hull: 20,
  weapons: ["Boss Laser", "Boss Missile"],
  systems: [
    { name: "Piloting", level: 3 },
    { name: "Shields", level: 8 },
    { name: "Teleporter", level: 2 },
    { name: "Medbay", level: 3 },
    { name: "Engines", level: 6 },
    { name: "Oxygen", level: 2 },
    { name: "Mind Control", level: 3 },
  ],
  surge:
    "Power Surge: shoots 7 laser shots simultaneously, or brings its Zoltan shield back online. After every 3 laser Power Surges, the 4th fully restores the Zoltan Shield. Cooldown varies each time, randomly between 20 and 30 seconds. There is a warning exactly 5 seconds beforehand. Crew on board when the Zoltan shield comes back are stuck until the shield is broken, unless you have Zoltan Shield Bypass. The surge lasers use the Heavy Laser Mark I blueprint but do 1 damage instead of 2, with 30% fire, 21% breach, and 20% stun.",
  notes: [
    "General: Reactor 32.",
    "General: crew is the remaining crew from the previous stage, minus the one in the Beam room if left alive.",
    "General: the Zoltan Shield has 12 health points.",
    "Weapons: system levels Boss Laser 4, Boss Missile 4. The Boss Beam was lost during the previous battle.",
    "Weapon cooldowns and status effects: at system level 4 the charge times are Laser 10 seconds, Missile 11.5 seconds.",
    "Weapon cooldowns and status effects: lasers 10% fire and 9% breach. Missiles 30% fire and 14% breach. None of the Flagship weapons can stun.",
    "Global behavior: the missile launcher does not consume missiles.",
    "Systems: the Drone system was lost in the previous battle.",
    "Systems: Mind Control is present only with Advanced Edition enabled.",
    "Dodge rate: base 28%. Fully manned 38% (enemy crew is unskilled regardless of difficulty). Unmanned and the piloting room empty 22%. Controlled by AI 38%.",
    "Flagship variation: Easy mode with Advanced Edition Content disabled has 3 shield layers (shield system level 6) instead of the usual 4 (level 8), on all three stages. Shields on this row stay at the printed 8.",
    "Final stage diagram: room positions are a picture. Transparent systems exist only with Advanced Edition. Transparent rooms exist only on Hard mode. No room layout is encoded.",
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
    'Wiki page "The Rebel Flagship", sections "Flagship variation" and "Boarding strategy" / "Hard mode"',
  notes: [
    "Flagship variation: on Hard mode, two additional rooms link the Laser and Missile ones to the main section of the ship. That makes it harder to stop the enemy repairing them.",
    "Flagship variation: those extra rooms are only drawn on the stage pictures (transparent rooms exist only on Hard mode). Positions are a picture. No room layout is encoded.",
    "2nd stage / Power Surge: 7 extra drones on Hard. Easy is 4 and Normal is 6. Those counts are not averaged.",
    "Boarding strategy / Hard mode: the laser and missile weapons are connected to the main body, so crew can contest a boarding party and repair those weapons. The main body has two extra crew.",
    "Boarding strategy / Hard mode: without boarding, leaving one crew alive in the main body stops the AI and means 5% lower evasion.",
  ],
};
