import { tx } from "../../i18n/index.ts";
/**
 * Slug-list pages whose opening choice states one fight.
 * A choice with several results is left out. A nested price, a crew
 * reward, a blue option, and a store with no amount are not copied.
 */

export type CitedFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  | { k: "nothing" };

export type CitedEventDef = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: { id: string; label: string; fx: CitedFx[] }[];
};

export const EXTRA_EVENTS: CitedEventDef[] = [
  // "Fight a Mantis ship (default rewards)." Mantis fight (Slug) has no choice. Arrival calls this fight. The printed sentence is the card body. unique=true.
  {
    dest: "Mantis fight (Slug)",
    slug: "mantis-fight-slug",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Mantis fight (Slug)]]
    // > "It is unique." — [[Mantis fight (Slug)]]
    // > "You intercept comm chatter from an incoming Mantis ship. \"Look. This ship appears not to be owned by the squishy ones. Maybe they won't smell so bad when we cut them open.\" They move in on your position." — [[Mantis fight (Slug)]]
    flag: "cited:mantis-fight-slug",
    aliases: ["Mantis fight (Slug)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.you-intercept-comm-chatter-from-an"),
    choices: [
      {
        id: "c:mantis-fight-slug:0",
        // Wiki citations:
        // > "Fight a Mantis ship (default rewards)." — [[Mantis fight (Slug)]]
        label: tx("wiki.cited-events-slug.fight-a-mantis-ship"),
        // "Fight a Mantis ship (default rewards)."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  {
    dest: "Mantis fight choice in nebula",
    slug: "mantis-fight-choice-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Uncharted Nebula." — [[Mantis fight choice in nebula]]
    // > "It is unique." — [[Mantis fight choice in nebula]]
    // > "Navigating the fog blind, you practically bump hulls with a Mantis ship. They hail you: \"Pah! This transgression will be overlooked. Nebula, very dangerous. Next time, humans all die.\"" — [[Mantis fight choice in nebula]]
    flag: "cited:mantis-fight-choice-in-nebula",
    aliases: ["Mantis fight choice in nebula"],
    sectors: ["Uncharted Nebula"],
    body: tx("wiki.cited-events-slug.navigating-the-fog-blind-you-practically"),
    choices: [
      {
        id: "c:mantis-fight-choice-in-nebula:0",
        // Wiki citations:
        // > "There won't be a next time. Open fire!" — [[Mantis fight choice in nebula]]
        // > "Fight a Mantis ship (default rewards)." — [[Mantis fight choice in nebula]]
        label: tx("wiki.cited-events-slug.there-won-t-be-a-next"),
        // "Fight a Mantis ship (default rewards)."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
      {
        id: "c:mantis-fight-choice-in-nebula:1",
        // Wiki citations:
        // > "This place is dangerous enough. Move on." — [[Mantis fight choice in nebula]]
        // > "Nothing happens." — [[Mantis fight choice in nebula]]
        label: tx("wiki.cited-events-slug.this-place-is-dangerous-enough-move"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Fight a Mantis ship (default rewards)." Mantis fight in nebula (Slug) has no choice. Arrival calls this fight. The printed sentence is the card body. nebula=true. unique=true. No nebula environment is added.
  {
    dest: "Mantis fight in nebula (Slug)",
    slug: "mantis-fight-in-nebula-slug",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Mantis fight in nebula (Slug)]]
    // > "It is unique." — [[Mantis fight in nebula (Slug)]]
    // > "The Mantis attack ship here looks to have been hunting Slugs on their home turf - a rare test of honor for the mightiest Mantis crews. Weapons up!" — [[Mantis fight in nebula (Slug)]]
    flag: "cited:mantis-fight-in-nebula-slug",
    aliases: ["Mantis fight in nebula (Slug)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.the-mantis-attack-ship-here-looks"),
    choices: [
      {
        id: "c:mantis-fight-in-nebula-slug:0",
        // Wiki citations:
        // > "Fight a Mantis ship (default rewards)." — [[Mantis fight in nebula (Slug)]]
        label: tx("wiki.cited-events-slug.fight-a-mantis-ship"),
        // "Fight a Mantis ship (default rewards)."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  {
    dest: "Mantis ship attacking Slug ship",
    slug: "mantis-ship-attacking-slug-ship",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Mantis ship attacking Slug ship]]
    // > "It is unique." — [[Mantis ship attacking Slug ship]]
    // > "The distress call appears to be emanating from a Slug ship caught in open space by a Mantis raider. They contact you on emergency frequencies: \"Please, we'll give you all we have if you sssave ussss!\"" — [[Mantis ship attacking Slug ship]]
    flag: "cited:mantis-ship-attacking-slug-ship",
    aliases: ["Mantis ship attacking Slug ship"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.the-distress-call-appears-to-be"),
    choices: [
      {
        id: "c:mantis-ship-attacking-slug-ship:0",
        // Wiki citations:
        // > "Attack the Mantis ship." — [[Mantis ship attacking Slug ship]]
        // > "Fight a Mantis Ship." — [[Mantis ship attacking Slug ship]]
        label: tx("wiki.cited-events-slug.attack-the-mantis-ship"),
        // "Fight a Mantis Ship."
        fx: [{ k: "fight", tier: "Mantis Ship" }],
      },
      {
        id: "c:mantis-ship-attacking-slug-ship:1",
        // Wiki citations:
        // > "Attack the Slug ship." — [[Mantis ship attacking Slug ship]]
        // > "Fight a Slug ship." — [[Mantis ship attacking Slug ship]]
        label: tx("wiki.cited-events-slug.attack-the-slug-ship"),
        // "Fight a Slug ship."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
      {
        id: "c:mantis-ship-attacking-slug-ship:2",
        // Wiki citations:
        // > "Of all the species in the galaxy, these two deserve one another. You power up the jump drive." — [[Mantis ship attacking Slug ship]]
        // > "Nothing happens." — [[Mantis ship attacking Slug ship]]
        label:
          tx("wiki.cited-events-slug.of-all-the-species-in-the"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Fight a Pirate ship (default rewards)." Pirate fight (Slug) has no choice. Arrival calls this fight. One of the three printed intros. unique=false.
  {
    dest: "Pirate fight (Slug)",
    slug: "pirate-fight-slug",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Pirate fight (Slug)]]
    // > "There appears to be a pirate ship nearby. Be on your guard; anyone trying to hunt in Slug territory is either formidable or deeply stupid, and in space, either can be dangerous." — [[Pirate fight (Slug)]]
    flag: "cited:pirate-fight-slug",
    aliases: ["Pirate fight (Slug)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.there-appears-to-be-a-pirate"),
    choices: [
      {
        id: "c:pirate-fight-slug:0",
        // Wiki citations:
        // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Slug)]]
        label: tx("wiki.cited-events-slug.fight-a-pirate-ship"),
        // "Fight a Pirate ship (default rewards)."
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  {
    dest: "Pirate fight choice in nebula",
    slug: "pirate-fight-choice-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Pirate fight choice in nebula]]
    // > "It is unique." — [[Pirate fight choice in nebula]]
    // > "You're surprised to find a ship without Slug markings stranded all the way out here, and move in to provide assistance. When you see the pirate insignia on the hull you quickly reconsider." — [[Pirate fight choice in nebula]]
    flag: "cited:pirate-fight-choice-in-nebula",
    aliases: ["Pirate fight choice in nebula"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.you-re-surprised-to-find-a"),
    choices: [
      {
        id: "c:pirate-fight-choice-in-nebula:0",
        // Wiki citations:
        // > "Fight a Pirate ship (default rewards)." — [[Pirate fight choice in nebula]]
        label: tx("wiki.cited-events-slug.attack"),
        // "Fight a Pirate ship (default rewards)."
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:pirate-fight-choice-in-nebula:1",
        // Wiki citations:
        // > "Keep your distance and hope they haven't seen you yet." — [[Pirate fight choice in nebula]]
        // > "Nothing happens." — [[Pirate fight choice in nebula]]
        label: tx("wiki.cited-events-slug.keep-your-distance-and-hope-they"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Fight a Rebel ship (default rewards)." Rebel fight (Slug) has no choice. Arrival calls this fight. One of the three printed intros. unique=false.
  {
    dest: "Rebel fight (Slug)",
    slug: "rebel-fight-slug",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Rebel fight (Slug)]]
    // > "As you arrive at the beacon, a hostile ship immediately registers on your scanners. You didn't expect to see Rebels extending their reach into Slug territory. Charge the weapons!" — [[Rebel fight (Slug)]]
    flag: "cited:rebel-fight-slug",
    aliases: ["Rebel fight (Slug)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.as-you-arrive-at-the-beacon"),
    choices: [
      {
        id: "c:rebel-fight-slug:0",
        // Wiki citations:
        // > "Fight a Rebel ship (default rewards)." — [[Rebel fight (Slug)]]
        label: tx("wiki.cited-events-slug.fight-a-rebel-ship"),
        // "Fight a Rebel ship (default rewards)."
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  {
    dest: "Slug Home Nebula surrender",
    slug: "slug-home-nebula-surrender",
    // Wiki citations:
    // > "This random event occurs in Slug Home Nebula." — [[Slug Home Nebula surrender]]
    // > "It is unique." — [[Slug Home Nebula surrender]]
    // > "This is the Slug Cruiser ship unlocking event." — [[Slug Home Nebula surrender]]
    flag: "cited:slug-home-nebula-surrender",
    aliases: ["Slug Home Nebula surrender"],
    sectors: ["Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.this-is-the-slug-cruiser-ship"),
    choices: [
      {
        id: "c:slug-home-nebula-surrender:0",
        // Wiki citations:
        // > "Fight a Slug ship (default rewards)." — [[Slug Home Nebula surrender]]
        label: tx("wiki.cited-events-slug.fight-a-slug-ship"),
        // "Fight a Slug ship (default rewards)."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
    ],
  },
  // Slug fight has no choice. Arrival calls this fight.
  // "Fight a Slug ship (default rewards)." unique=true.
  {
    dest: "Slug fight",
    slug: "slug-fight",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug fight]]
    // > "It is unique." — [[Slug fight]]
    // > "It's rare for the Slugs to stay exposed in open space for long periods - the ship here may be lost, or just passing through, but either way he moves in to attack!" — [[Slug fight]]
    flag: "cited:slug-fight",
    aliases: ["Slug fight"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.it-s-rare-for-the-slugs"),
    choices: [
      {
        id: "c:slug-fight:0",
        // Wiki citations:
        // > "Fight a Slug ship (default rewards)." — [[Slug fight]]
        label: tx("wiki.cited-events-slug.fight-a-slug-ship"),
        // "Fight a Slug ship (default rewards)."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
    ],
  },
  {
    dest: "Slug fight in nebula",
    // Arrival calls this fight. One of the five printed intros. No nebula environment is added.
    slug: "slug-fight-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug fight in nebula]]
    // > "Your sensors are no match for the Slug's telepathic abilities - a ship you never even saw opens fire from astern!" — [[Slug fight in nebula]]
    flag: "cited:slug-fight-in-nebula",
    aliases: ["Slug fight in nebula"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.your-sensors-are-no-match-for"),
    choices: [
      {
        id: "c:slug-fight-in-nebula:0",
        // Wiki citations:
        // > "Fight a Slug ship (default rewards)." — [[Slug fight in nebula]]
        label: tx("wiki.cited-events-slug.fight-a-slug-ship"),
        // "Fight a Slug ship (default rewards)."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
    ],
  },
  {
    dest: "Slug fight in plasma storm",
    // Arrival calls this fight. One of the four printed intros. The beacon stays outside a nebula.
    slug: "slug-fight-in-plasma-storm",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug fight in plasma storm]]
    // > "The ion storm here threatens to deactivate your core systems, a fact made all the worse for the largely unaffected Slug ships circling like space-vultures." — [[Slug fight in plasma storm]]
    flag: "cited:slug-fight-in-plasma-storm",
    aliases: ["Slug fight in plasma storm"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.the-ion-storm-here-threatens-to"),
    choices: [
      {
        id: "c:slug-fight-in-plasma-storm:0",
        // Wiki citations:
        // > "Fight a Slug ship (default rewards)." — [[Slug fight in plasma storm]]
        label: tx("wiki.cited-events-slug.fight-a-slug-ship"),
        // "Fight a Slug ship (default rewards)."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
    ],
  },
  {
    // Rebel fight chance in nebula. The chase, the doubled pursuit, and the scanner fights run in filler-events.ts.
    dest: "Rebel fight chance in nebula",
    slug: "rebel-fight-chance-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula." — [[Rebel fight chance in nebula]]
    // > "It is unique." — [[Rebel fight chance in nebula]]
    // > "You spot a rebel ship in the nebula ahead and stay off their radar. Try to engage?" — [[Rebel fight chance in nebula]]
    flag: "cited:rebel-fight-chance-in-nebula",
    aliases: ["Rebel fight chance in nebula"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula", "Uncharted Nebula"],
    body: tx("wiki.cited-events-slug.you-spot-a-rebel-ship-in"),
    choices: [
      {
        id: "c:rebel-fight-chance-in-nebula:0",
        // Wiki citations:
        // > "Stay hidden." — [[Rebel fight chance in nebula]]
        // > "Nothing happens." — [[Rebel fight chance in nebula]]
        label: tx("wiki.cited-events-slug.stay-hidden"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:rebel-fight-chance-in-nebula:1",
        // Wiki citations:
        // > "Prepare to chase them!" — [[Rebel fight chance in nebula]]
        label: tx("wiki.cited-events-slug.prepare-to-chase-them"),
        // Chase. A Rebel ship, doubled pursuit, or nothing. No odds. INFERRED: equal.
        fx: [{ k: "note", text: tx("wiki.cited-events-slug.a-rebel-ship-doubled-pursuit-or") }],
      },
      {
        id: "c:rebel-fight-chance-in-nebula:2",
        // Wiki citations:
        // > "Fight the Rebel ship (default rewards)." — [[Rebel fight chance in nebula]]
        label: tx("wiki.cited-events-slug.try-to-track-them-as-you"),
        // "Fight a Rebel ship (default rewards)."
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
      {
        id: "c:rebel-fight-chance-in-nebula:3",
        // Wiki citations:
        // > "(Long-ranged Scanner) Try to track them as you move to engage." — [[Rebel fight chance in nebula]]
        // > "Fight the Rebel ship (default rewards)." — [[Rebel fight chance in nebula]]
        label: tx("wiki.cited-events-slug.try-to-track-them-as-you"),
        // "Fight a Rebel ship (default rewards)."
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
      {
        id: "c:rebel-fight-chance-in-nebula:4",
        // Wiki citations:
        // > "(Lifeform Scanner) Use their life signatures to follow." — [[Rebel fight chance in nebula]]
        // > "Fight the Rebel ship (default rewards)." — [[Rebel fight chance in nebula]]
        label: tx("wiki.cited-events-slug.use-their-life-signatures-to-follow"),
        // "Fight a Rebel ship (default rewards)."
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  {
    // Slocknog. The hire, the free rescue, and the leave run in filler-events.ts.
    // The page says the skills are shown and prints none, so none are stored.
    dest: "Slocknog",
    slug: "slocknog",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slocknog]]
    // > "It is unique." — [[Slocknog]]
    // > "You detect life signs on a nearby moon - a lone Slug marooned on its surface. \"Ah, a sssentient ssspecies, after all this time. I am Slocknog, a wandering hero ssseeking adventure. You may hire me for a ssmall sssum.\"" — [[Slocknog]]
    flag: "cited:slocknog",
    aliases: ["Slocknog"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.you-detect-life-signs-on-a"),
    choices: [
      {
        id: "c:slocknog:0",
        // Wiki citations:
        // > "Hire Slocknog." — [[Slocknog]]
        label: tx("wiki.cited-events-slug.hire-slocknog"),
        // "Hire Slocknog."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:slocknog:1",
        // Wiki citations:
        // > "Ignore Slocknog." — [[Slocknog]]
        label: tx("wiki.cited-events-slug.ignore-slocknog"),
        // "Ignore Slocknog."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    // Slug ship boarding Rock ship. Engage, the back-down, and the ignore run in filler-events.ts.
    // The win scrap and the Rock freighter run in quests.ts. The arrival nebula stays unwired.
    dest: "Slug ship boarding Rock ship",
    slug: "slug-ship-boarding-rock-ship",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug ship boarding Rock ship]]
    // > "It is unique." — [[Slug ship boarding Rock ship]]
    // > "You arrive to find a Slug ship in the middle of boarding a disabled Rock freighter." — [[Slug ship boarding Rock ship]]
    flag: "cited:slug-ship-boarding-rock-ship",
    aliases: ["Slug ship boarding Rock ship"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.you-arrive-to-find-a-slug"),
    choices: [
      {
        id: "c:slug-ship-boarding-rock-ship:0",
        // Wiki citations:
        // > "Engage the Slug ship." — [[Slug ship boarding Rock ship]]
        // > "Fight a Slug ship." — [[Slug ship boarding Rock ship]]
        label: tx("wiki.cited-events-slug.engage-the-slug-ship"),
        // "Fight a Slug ship."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
      {
        id: "c:slug-ship-boarding-rock-ship:1",
        // Wiki citations:
        // > "Ignore them." — [[Slug ship boarding Rock ship]]
        label: tx("wiki.cited-events-slug.ignore-them"),
        // "Fight a Rock ship."
        fx: [{ k: "note", text: tx("wiki.cited-events-slug.nothing-or-a-rock-ship") }],
      },
    ],
  },
  // Refugee (Slug). Template:Drifting Refugee Ship, introtext=nodistress, type=slug.
  // Slug Controlled Nebula and Slug Home Nebula. nebula=true. unique=false. LRSmap=noship+nebula.
  // type=slug is the pirate bait, not the Slug hunt. That hail runs in filler-events.ts.
  {
    dest: "Refugee (Slug)",
    slug: "refugee-slug",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Refugee (Slug)]]
    flag: "cited:refugee-slug",
    aliases: ["Refugee (Slug)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.your-sensors-have-picked-up-a"),
    choices: [
      { id: "c:refugee-slug:0", label: tx("wiki.cited-events-slug.hail-them"), fx: [{ k: "note", text: tx("wiki.cited-events-slug.a-trade-or-a-pirate-ship") }] },
      { id: "c:refugee-slug:1", label: tx("wiki.cited-events-slug.ignore-the-refugees"), fx: [{ k: "nothing" }] },
    ],
  },
  // Refugee distress (Slug). Template:Drifting Refugee Ship, introtext=distress, type=slug.
  // Slug Controlled Nebula and Slug Home Nebula. distress=true. unique=false. LRSmap=noship.
  // type=slug is the pirate bait, not the Slug hunt. Not on the EventList distress beacon list.
  {
    dest: "Refugee distress (Slug)",
    slug: "refugee-distress-slug",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Refugee distress (Slug)]]
    flag: "cited:refugee-distress-slug",
    aliases: ["Refugee distress (Slug)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-slug.you-have-encountered-a-refugee-ship"),
    choices: [
      { id: "c:refugee-distress-slug:0", label: tx("wiki.cited-events-slug.hail-them"), fx: [{ k: "note", text: tx("wiki.cited-events-slug.a-trade-or-a-pirate-ship") }] },
      { id: "c:refugee-distress-slug:1", label: tx("wiki.cited-events-slug.ignore-the-refugees"), fx: [{ k: "nothing" }] },
    ],
  },
];
