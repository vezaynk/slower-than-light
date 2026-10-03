/**
 * Racial abilities the crew pages state that `Kin` does not store.
 * Stored fields are hp, move, repair, fight, suffocate, and fireTaken.
 * `value` is the figure printed on that page, or "no number" when the
 * page describes the ability without one.
 *
 * Wiki page "Crystal Lockdown" has no section heading. Its text is the
 * body of wiki page "Crystal", section "Crystal Lockdown".
 */

export type KinGap = {
  id: string;
  kin: string;
  ability: string;
  value: string;
  source: string;
};

const humans = `Wiki page "Humans", section "Race characteristics"`;
const zoltans = `Wiki page "Zoltans", section "Race characteristics"`;
const slugs = `Wiki page "Slugs", section "Race characteristics"`;
const rockmen = `Wiki page "Rockmen", section "Race characteristics"`;
const lanius = `Wiki page "Lanius", section "Race characteristics"`;
const crystal = `Wiki page "Crystal", section "Race characteristics"`;
const lockdown = `Wiki page "Crystal", section "Crystal Lockdown"`;

export const KIN_GAPS: KinGap[] = [
  {
    id: "human-xp",
    kin: "Human",
    ability: "Experience requirements",
    value: "-10%",
    source: humans,
  },
  {
    id: "human-xp-piloting",
    kin: "Human",
    ability: "Piloting XP per level",
    value: "13",
    source: humans,
  },
  {
    id: "human-xp-engines",
    kin: "Human",
    ability: "Engines XP per level",
    value: "13",
    source: humans,
  },
  {
    id: "human-xp-shields",
    kin: "Human",
    ability: "Shields XP per level",
    value: "50",
    source: humans,
  },
  {
    id: "human-xp-weapons",
    kin: "Human",
    ability: "Weapons XP per level",
    value: "58",
    source: humans,
  },
  {
    id: "human-xp-repair",
    kin: "Human",
    ability: "Repair XP per level",
    value: "16",
    source: humans,
  },
  {
    id: "human-xp-combat",
    kin: "Human",
    ability: "Combat XP per level",
    value: "7",
    source: humans,
  },
  {
    id: "zoltan-death-burst",
    kin: "Zoltan",
    ability: "Death burst damage to enemy crew in the room",
    value: "15 HP",
    source: zoltans,
  },
  {
    id: "zoltan-death-burst-drones",
    kin: "Zoltan",
    ability: "Death burst damage to drones",
    value: "7.5 HP",
    source: zoltans,
  },
  {
    id: "zoltan-death-burst-allies",
    kin: "Zoltan",
    ability: "Death burst damage to allies while mind-controlled",
    value: "no number",
    source: zoltans,
  },
  {
    id: "zoltan-power",
    kin: "Zoltan",
    ability: "Power bar in an occupied system",
    value: "1",
    source: zoltans,
  },
  {
    id: "slug-mind-control",
    kin: "Slug",
    ability: "Mind-control immunity",
    value: "no number",
    source: slugs,
  },
  {
    id: "slug-vision",
    kin: "Slug",
    ability: "Vision of adjacent rooms",
    value: "no number",
    source: slugs,
  },
  {
    id: "slug-detect",
    kin: "Slug",
    ability: "Reveals live enemy crew",
    value: "no number",
    source: slugs,
  },
  {
    id: "rock-firefighting",
    kin: "Rock",
    ability: "Fire-fighting speed",
    value: "167%",
    source: rockmen,
  },
  {
    id: "lanius-oxygen-drain",
    kin: "Lanius",
    ability: "Oxygen drain in an occupied room",
    value: "no number",
    source: lanius,
  },
  {
    id: "crystal-firefighting",
    kin: "Crystal",
    ability: "Fire-fighting speed",
    value: "83%",
    source: crystal,
  },
  {
    id: "crystal-lockdown-duration",
    kin: "Crystal",
    ability: "Lockdown duration",
    value: "12 seconds",
    source: lockdown,
  },
  {
    id: "crystal-lockdown-recharge",
    kin: "Crystal",
    ability: "Lockdown recharge",
    value: "50 seconds",
    source: lockdown,
  },
  {
    id: "crystal-lockdown-downtime",
    kin: "Crystal",
    ability: "Lockdown downtime",
    value: "38 seconds",
    source: lockdown,
  },
  {
    id: "crystal-lockdown-jump",
    kin: "Crystal",
    ability: "Lockdown recharge after an FTL jump",
    value: "no number",
    source: lockdown,
  },
];
