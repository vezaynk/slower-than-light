import { tx } from "../../i18n/index.ts";
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

const humans = tx("wiki.kin-gaps.wiki-page-humans-section-race-characteristics");
const zoltans = tx("wiki.kin-gaps.wiki-page-zoltans-section-race-characteristics");
const slugs = tx("wiki.kin-gaps.wiki-page-slugs-section-race-characteristics");
const rockmen = tx("wiki.kin-gaps.wiki-page-rockmen-section-race-characteristics");
const lanius = tx("wiki.kin-gaps.wiki-page-lanius-section-race-characteristics");
const crystal = tx("wiki.kin-gaps.wiki-page-crystal-section-race-characteristics");
const lockdown = tx("wiki.kin-gaps.wiki-page-crystal-section-crystal-lockdown");

export const KIN_GAPS: KinGap[] = [
  {
    id: "human-xp",
    kin: tx("wiki.kin-gaps.human"),
    ability: tx("wiki.kin-gaps.experience-requirements"),
    value: "-10%",
    source: humans,
  },
  {
    id: "human-xp-piloting",
    kin: tx("wiki.kin-gaps.human"),
    ability: tx("wiki.kin-gaps.piloting-xp-per-level"),
    value: "13",
    source: humans,
  },
  {
    id: "human-xp-engines",
    kin: tx("wiki.kin-gaps.human"),
    ability: tx("wiki.kin-gaps.engines-xp-per-level"),
    value: "13",
    source: humans,
  },
  {
    id: "human-xp-shields",
    kin: tx("wiki.kin-gaps.human"),
    ability: tx("wiki.kin-gaps.shields-xp-per-level"),
    value: "50",
    source: humans,
  },
  {
    id: "human-xp-weapons",
    kin: tx("wiki.kin-gaps.human"),
    ability: tx("wiki.kin-gaps.weapons-xp-per-level"),
    value: "58",
    source: humans,
  },
  {
    id: "human-xp-repair",
    kin: tx("wiki.kin-gaps.human"),
    ability: tx("wiki.kin-gaps.repair-xp-per-level"),
    value: "16",
    source: humans,
  },
  {
    id: "human-xp-combat",
    kin: tx("wiki.kin-gaps.human"),
    ability: tx("wiki.kin-gaps.combat-xp-per-level"),
    value: "7",
    source: humans,
  },
  {
    id: "zoltan-death-burst",
    kin: tx("wiki.kin-gaps.zoltan"),
    ability: tx("wiki.kin-gaps.death-burst-damage-to-enemy-crew"),
    value: tx("wiki.kin-gaps.15-hp"),
    source: zoltans,
  },
  {
    id: "zoltan-death-burst-drones",
    kin: tx("wiki.kin-gaps.zoltan"),
    ability: tx("wiki.kin-gaps.death-burst-damage-to-drones"),
    value: tx("wiki.kin-gaps.7-5-hp"),
    source: zoltans,
  },
  {
    id: "zoltan-death-burst-allies",
    kin: tx("wiki.kin-gaps.zoltan"),
    ability: tx("wiki.kin-gaps.death-burst-damage-to-allies-while"),
    value: "no number",
    source: zoltans,
  },
  {
    id: "zoltan-power",
    kin: tx("wiki.kin-gaps.zoltan"),
    ability: tx("wiki.kin-gaps.power-bar-in-an-occupied-system"),
    value: "1",
    source: zoltans,
  },
  {
    id: "slug-mind-control",
    kin: tx("wiki.kin-gaps.slug"),
    ability: tx("wiki.kin-gaps.mind-control-immunity"),
    value: "no number",
    source: slugs,
  },
  {
    id: "slug-vision",
    kin: tx("wiki.kin-gaps.slug"),
    ability: tx("wiki.kin-gaps.vision-of-adjacent-rooms"),
    value: "no number",
    source: slugs,
  },
  {
    id: "slug-detect",
    kin: tx("wiki.kin-gaps.slug"),
    ability: tx("wiki.kin-gaps.reveals-live-enemy-crew"),
    value: "no number",
    source: slugs,
  },
  {
    id: "rock-firefighting",
    kin: tx("wiki.kin-gaps.rock"),
    ability: tx("wiki.kin-gaps.fire-fighting-speed"),
    value: "167%",
    source: rockmen,
  },
  {
    id: "lanius-oxygen-drain",
    kin: tx("wiki.kin-gaps.lanius"),
    ability: tx("wiki.kin-gaps.oxygen-drain-in-an-occupied-room"),
    value: "no number",
    source: lanius,
  },
  {
    id: "crystal-firefighting",
    kin: tx("wiki.kin-gaps.crystal"),
    ability: tx("wiki.kin-gaps.fire-fighting-speed"),
    value: "83%",
    source: crystal,
  },
  {
    id: "crystal-lockdown-duration",
    kin: tx("wiki.kin-gaps.crystal"),
    ability: tx("wiki.kin-gaps.lockdown-duration"),
    value: "12 seconds",
    source: lockdown,
  },
  {
    id: "crystal-lockdown-recharge",
    kin: tx("wiki.kin-gaps.crystal"),
    ability: tx("wiki.kin-gaps.lockdown-recharge"),
    value: "50 seconds",
    source: lockdown,
  },
  {
    id: "crystal-lockdown-downtime",
    kin: tx("wiki.kin-gaps.crystal"),
    ability: tx("wiki.kin-gaps.lockdown-downtime"),
    value: "38 seconds",
    source: lockdown,
  },
  {
    id: "crystal-lockdown-jump",
    kin: tx("wiki.kin-gaps.crystal"),
    ability: tx("wiki.kin-gaps.lockdown-recharge-after-an-ftl-jump"),
    value: "no number",
    source: lockdown,
  },
];
