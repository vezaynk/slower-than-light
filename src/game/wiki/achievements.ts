import { tx } from "../../i18n/index.ts";
/**
 * Wiki pages "Achievements" and "Ship Achievements".
 * Requirements are the unlock lines, not the tips.
 * Easy and Normal stay separate rows. Unnamed victory and quest blurbs are not rows.
 */

export type AchievementRow = {
  id: string;
  name: string;
  ship: string | null;
  requirement: string;
  source: string;
};

export const ACHIEVEMENTS: AchievementRow[] = [
  {
    id: "just-getting-started",
    name: tx("wiki.achievements.just-getting-started"),
    ship: null,
    requirement: tx("wiki.achievements.get-to-sector-5"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "federation-base-in-range",
    name: tx("wiki.achievements.federation-base-in-range"),
    ship: null,
    requirement: tx("wiki.achievements.get-to-sector-8"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "federation-victory-easy",
    name: tx("wiki.achievements.federation-victory-easy"),
    ship: null,
    requirement: tx("wiki.achievements.beat-the-boss-on-easy"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "federation-victory-normal",
    name: tx("wiki.achievements.federation-victory-normal"),
    ship: null,
    requirement: tx("wiki.achievements.beat-the-boss-on-normal"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "your-own-fleet",
    name: tx("wiki.achievements.your-own-fleet"),
    ship: null,
    requirement: tx("wiki.achievements.unlock-the-type-a-layout-for"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "rule-ten-greed-is-eternal",
    name: tx("wiki.achievements.rule-ten-greed-is-eternal"),
    ship: null,
    requirement: tx("wiki.achievements.collect-10-000-scrap-across-all"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "warlord",
    name: tx("wiki.achievements.warlord"),
    ship: null,
    requirement: tx("wiki.achievements.defeat-1000-ships-across-all-playthroughs"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "coming-in-for-my-pacifism-run",
    name: tx("wiki.achievements.coming-in-for-my-pacifism-run"),
    ship: null,
    requirement: tx("wiki.achievements.get-to-sector-5-without-firing"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "i-dont-need-no-stinkin-upgrades",
    name: tx("wiki.achievements.i-don-t-need-no-stinkin"),
    ship: null,
    requirement: tx("wiki.achievements.get-to-sector-5-with-no"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "on-a-wing-and-a-prayer",
    name: tx("wiki.achievements.on-a-wing-and-a-prayer"),
    ship: null,
    requirement: tx("wiki.achievements.get-to-sector-5-without-repairing"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "ballistophobia",
    name: tx("wiki.achievements.ballistophobia"),
    ship: null,
    requirement: tx("wiki.achievements.get-to-sector-8-without-using"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "technophobia",
    name: tx("wiki.achievements.technophobia"),
    ship: null,
    requirement: tx("wiki.achievements.get-to-sector-8-without-using-2"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "living-off-the-land",
    name: tx("wiki.achievements.living-off-the-land"),
    ship: null,
    requirement: tx("wiki.achievements.get-to-sector-8-without-buying"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "no-redshirts-here",
    name: tx("wiki.achievements.no-redshirts-here"),
    ship: null,
    requirement: tx("wiki.achievements.get-to-sector-8-without-losing"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "some-people-just-like-to-watch-ships-burn",
    name: tx("wiki.achievements.some-people-just-like-to-watch"),
    ship: null,
    requirement: tx("wiki.achievements.have-every-square-of-an-enemy"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "astronomically-low-odds",
    name: tx("wiki.achievements.astronomically-low-odds"),
    ship: null,
    requirement: tx("wiki.achievements.fail-to-evade-5-shots-in"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "boarding-objective-successful",
    name: tx("wiki.achievements.boarding-objective-successful"),
    ship: null,
    requirement: tx("wiki.achievements.have-a-single-boarding-drone-kill"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "they-never-saw-it-coming",
    name: tx("wiki.achievements.they-never-saw-it-coming"),
    ship: null,
    requirement:
      tx("wiki.achievements.use-the-weapon-pre-igniter-augmentation"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "trustworthy-auto-pilot",
    name: tx("wiki.achievements.trustworthy-auto-pilot"),
    ship: null,
    requirement: tx("wiki.achievements.defeat-an-enemy-ship-with-all"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "slice-and-dice",
    name: tx("wiki.achievements.slice-and-dice"),
    ship: null,
    requirement: tx("wiki.achievements.hit-every-room-of-a-ship"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "victory-through-asphyxiation",
    name: tx("wiki.achievements.victory-through-asphyxiation"),
    ship: null,
    requirement:
      tx("wiki.achievements.empty-the-oxygen-net-level-less"),
    source: tx("wiki.achievements.achievements"),
  },
  {
    id: "the-united-federation",
    name: tx("wiki.achievements.the-united-federation"),
    ship: tx("wiki.achievements.kestrel-cruiser"),
    requirement: tx("wiki.achievements.have-six-unique-aliens-on-the"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "full-arsenal",
    name: tx("wiki.achievements.full-arsenal"),
    ship: tx("wiki.achievements.kestrel-cruiser"),
    requirement: tx("wiki.achievements.have-eleven-systems-installed-on-the"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "tough-little-ship",
    name: tx("wiki.achievements.tough-little-ship"),
    ship: tx("wiki.achievements.kestrel-cruiser"),
    requirement:
      tx("wiki.achievements.as-the-kestrel-cruiser-repair-back"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "bird-of-prey",
    name: tx("wiki.achievements.bird-of-prey"),
    ship: tx("wiki.achievements.stealth-cruiser"),
    requirement: tx("wiki.achievements.destroy-a-ship-at-full-health"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "phase-shift",
    name: tx("wiki.achievements.phase-shift"),
    ship: tx("wiki.achievements.stealth-cruiser"),
    requirement: tx("wiki.achievements.in-the-stealth-cruiser-avoid-9"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "tactical-approach",
    name: tx("wiki.achievements.tactical-approach"),
    ship: tx("wiki.achievements.stealth-cruiser"),
    requirement:
      tx("wiki.achievements.in-the-stealth-cruiser-get-to"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "take-no-prisoners",
    name: tx("wiki.achievements.take-no-prisoners"),
    ship: tx("wiki.achievements.mantis-cruiser"),
    requirement: tx("wiki.achievements.kill-the-crew-of-20-ships"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "avast-ye-scurvy-dogs",
    name: tx("wiki.achievements.avast-ye-scurvy-dogs"),
    ship: tx("wiki.achievements.mantis-cruiser"),
    requirement:
      tx("wiki.achievements.kill-5-enemy-crew-in-a"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "battle-royale",
    name: tx("wiki.achievements.battle-royale"),
    ship: tx("wiki.achievements.mantis-cruiser"),
    requirement:
      tx("wiki.achievements.while-using-the-mantis-cruiser-kill"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "robotic-warfare",
    name: tx("wiki.achievements.robotic-warfare"),
    ship: tx("wiki.achievements.engi-cruiser"),
    requirement: tx("wiki.achievements.with-the-engi-cruiser-have-3"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "i-hardly-lifted-a-finger",
    name: tx("wiki.achievements.i-hardly-lifted-a-finger"),
    ship: tx("wiki.achievements.engi-cruiser"),
    requirement: tx("wiki.achievements.with-the-engi-cruiser-destroy-an"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "the-guns-theyve-stopped",
    name: tx("wiki.achievements.the-guns-they-ve-stopped"),
    ship: tx("wiki.achievements.engi-cruiser"),
    requirement:
      tx("wiki.achievements.have-4-enemy-systems-or-subsystems"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "master-of-patience",
    name: tx("wiki.achievements.master-of-patience"),
    ship: tx("wiki.achievements.federation-cruiser"),
    requirement:
      tx("wiki.achievements.use-only-the-artillery-beam-to"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "diplomatic-immunity",
    name: tx("wiki.achievements.diplomatic-immunity"),
    ship: tx("wiki.achievements.federation-cruiser"),
    requirement:
      tx("wiki.achievements.while-using-the-federation-cruiser-use"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "artillery-mastery",
    name: tx("wiki.achievements.artillery-mastery"),
    ship: tx("wiki.achievements.federation-cruiser"),
    requirement:
      tx("wiki.achievements.get-to-sector-5-with-the"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "were-in-position",
    name: tx("wiki.achievements.we-re-in-position"),
    ship: tx("wiki.achievements.slug-cruiser"),
    requirement:
      tx("wiki.achievements.while-using-the-slug-cruiser-have"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "home-sweet-home",
    name: tx("wiki.achievements.home-sweet-home"),
    ship: tx("wiki.achievements.slug-cruiser"),
    requirement: tx("wiki.achievements.jump-to-30-nebula-locations-before"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "disintegration-ray",
    name: tx("wiki.achievements.disintegration-ray"),
    ship: tx("wiki.achievements.slug-cruiser"),
    requirement:
      tx("wiki.achievements.while-using-the-slug-cruiser-kill"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "is-it-warm-in-here",
    name: tx("wiki.achievements.is-it-warm-in-here"),
    ship: tx("wiki.achievements.rock-cruiser"),
    requirement: tx("wiki.achievements.have-your-crew-kill-a-burning"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "defense-drones-dont-do-danything",
    name: tx("wiki.achievements.defense-drones-don-t-do-d"),
    ship: tx("wiki.achievements.rock-cruiser"),
    requirement:
      tx("wiki.achievements.while-using-the-rock-cruiser-destroy"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "ancestry",
    name: tx("wiki.achievements.ancestry"),
    ship: tx("wiki.achievements.rock-cruiser"),
    requirement: tx("wiki.achievements.find-the-secret-sector-with-the"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "shields-holding",
    name: tx("wiki.achievements.shields-holding"),
    ship: tx("wiki.achievements.zoltan-cruiser"),
    requirement: tx("wiki.achievements.destroy-a-ship-before-it-gets"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "givin-her-all-shes-got-captain",
    name: tx("wiki.achievements.givin-her-all-she-s-got"),
    ship: tx("wiki.achievements.zoltan-cruiser"),
    requirement: tx("wiki.achievements.with-the-zoltan-cruiser-have-29"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "manpower",
    name: tx("wiki.achievements.manpower"),
    ship: tx("wiki.achievements.zoltan-cruiser"),
    requirement:
      tx("wiki.achievements.get-to-sector-5-without-upgrading"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "sweet-revenge",
    name: tx("wiki.achievements.sweet-revenge"),
    ship: tx("wiki.achievements.crystal-cruiser"),
    requirement: tx("wiki.achievements.destroy-an-enemy-ship-with-a"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "no-escape",
    name: tx("wiki.achievements.no-escape"),
    ship: tx("wiki.achievements.crystal-cruiser"),
    requirement:
      tx("wiki.achievements.while-using-the-crystal-cruiser-trap"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "clash-of-the-titans",
    name: tx("wiki.achievements.clash-of-the-titans"),
    ship: tx("wiki.achievements.crystal-cruiser"),
    requirement: tx("wiki.achievements.destroy-10-rock-ships-using-the"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "advanced-mastery",
    name: tx("wiki.achievements.advanced-mastery"),
    ship: tx("wiki.achievements.lanius-cruiser"),
    requirement: tx("wiki.achievements.have-hacking-mind-control-and-the"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "scrap-hoarder",
    name: tx("wiki.achievements.scrap-hoarder"),
    ship: tx("wiki.achievements.lanius-cruiser"),
    requirement: tx("wiki.achievements.have-at-least-600-scrap-in"),
    source: tx("wiki.achievements.ship-achievements"),
  },
  {
    id: "loss-of-cabin-pressure",
    name: tx("wiki.achievements.loss-of-cabin-pressure"),
    ship: tx("wiki.achievements.lanius-cruiser"),
    requirement:
      tx("wiki.achievements.get-to-sector-8-without-your"),
    source: tx("wiki.achievements.ship-achievements"),
  },
];
