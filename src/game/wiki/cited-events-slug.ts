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
    flag: "cited:mantis-fight-slug",
    aliases: ["Mantis fight (Slug)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You intercept comm chatter from an incoming Mantis ship. \"Look. This ship appears not to be owned by the squishy ones. Maybe they won't smell so bad when we cut them open.\" They move in on your position.",
    choices: [
      {
        id: "c:mantis-fight-slug:0",
        label: "Fight a Mantis ship",
        // "Fight a Mantis ship (default rewards)."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  {
    dest: "Mantis fight choice in nebula",
    slug: "mantis-fight-choice-in-nebula",
    flag: "cited:mantis-fight-choice-in-nebula",
    aliases: ["Mantis fight choice in nebula"],
    sectors: ["Uncharted Nebula"],
    body: "Navigating the fog blind, you practically bump hulls with a Mantis ship. They hail you: \"Pah! This transgression will be overlooked. Nebula, very dangerous. Next time, humans all die.\"",
    choices: [
      {
        id: "c:mantis-fight-choice-in-nebula:0",
        label: "There won't be a next time. Open fire!",
        // "Fight a Mantis ship (default rewards)."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
      {
        id: "c:mantis-fight-choice-in-nebula:1",
        label: "This place is dangerous enough. Move on.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Fight a Mantis ship (default rewards)." Mantis fight in nebula (Slug) has no choice. Arrival calls this fight. The printed sentence is the card body. nebula=true. unique=true. No nebula environment is added.
  {
    dest: "Mantis fight in nebula (Slug)",
    slug: "mantis-fight-in-nebula-slug",
    flag: "cited:mantis-fight-in-nebula-slug",
    aliases: ["Mantis fight in nebula (Slug)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "The Mantis attack ship here looks to have been hunting Slugs on their home turf - a rare test of honor for the mightiest Mantis crews. Weapons up!",
    choices: [
      {
        id: "c:mantis-fight-in-nebula-slug:0",
        label: "Fight a Mantis ship",
        // "Fight a Mantis ship (default rewards)."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  {
    dest: "Mantis ship attacking Slug ship",
    slug: "mantis-ship-attacking-slug-ship",
    flag: "cited:mantis-ship-attacking-slug-ship",
    aliases: ["Mantis ship attacking Slug ship"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "The distress call appears to be emanating from a Slug ship caught in open space by a Mantis raider. They contact you on emergency frequencies: \"Please, we'll give you all we have if you sssave ussss!\"",
    choices: [
      {
        id: "c:mantis-ship-attacking-slug-ship:0",
        label: "Attack the Mantis ship.",
        // "Fight a Mantis Ship."
        fx: [{ k: "fight", tier: "Mantis Ship" }],
      },
      {
        id: "c:mantis-ship-attacking-slug-ship:1",
        label: "Attack the Slug ship.",
        // "Fight a Slug ship."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
      {
        id: "c:mantis-ship-attacking-slug-ship:2",
        label:
          "Of all the species in the galaxy, these two deserve one another. You power up the jump drive.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Fight a Pirate ship (default rewards)." Pirate fight (Slug) has no choice. Arrival calls this fight. One of the three printed intros. unique=false.
  {
    dest: "Pirate fight (Slug)",
    slug: "pirate-fight-slug",
    flag: "cited:pirate-fight-slug",
    aliases: ["Pirate fight (Slug)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "There appears to be a pirate ship nearby.",
    choices: [
      {
        id: "c:pirate-fight-slug:0",
        label: "Fight a Pirate ship",
        // "Fight a Pirate ship (default rewards)."
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  {
    dest: "Pirate fight choice in nebula",
    slug: "pirate-fight-choice-in-nebula",
    flag: "cited:pirate-fight-choice-in-nebula",
    aliases: ["Pirate fight choice in nebula"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You're surprised to find a ship without Slug markings stranded all the way out here, and move in to provide assistance. When you see the pirate insignia on the hull you quickly reconsider.",
    choices: [
      {
        id: "c:pirate-fight-choice-in-nebula:0",
        label: "Attack!",
        // "Fight a Pirate ship (default rewards)."
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:pirate-fight-choice-in-nebula:1",
        label: "Keep your distance and hope they haven't seen you yet.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Fight a Rebel ship (default rewards)." Rebel fight (Slug) has no choice. Arrival calls this fight. One of the three printed intros. unique=false.
  {
    dest: "Rebel fight (Slug)",
    slug: "rebel-fight-slug",
    flag: "cited:rebel-fight-slug",
    aliases: ["Rebel fight (Slug)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "As you arrive at the beacon, a hostile ship immediately registers on your scanners.",
    choices: [
      {
        id: "c:rebel-fight-slug:0",
        label: "Fight a Rebel ship",
        // "Fight a Rebel ship (default rewards)."
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  {
    dest: "Slug Home Nebula surrender",
    slug: "slug-home-nebula-surrender",
    flag: "cited:slug-home-nebula-surrender",
    aliases: ["Slug Home Nebula surrender"],
    sectors: ["Slug Home Nebula"],
    body: "This is the Slug Cruiser ship unlocking event.",
    choices: [
      {
        id: "c:slug-home-nebula-surrender:0",
        label: "Fight a Slug ship",
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
    flag: "cited:slug-fight",
    aliases: ["Slug fight"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "It's rare for the Slugs to stay exposed in open space for long periods - the ship here may be lost, or just passing through, but either way he moves in to attack!",
    choices: [
      {
        id: "c:slug-fight:0",
        label: "Fight a Slug ship",
        // "Fight a Slug ship (default rewards)."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
    ],
  },
  {
    dest: "Slug fight in nebula",
    // Arrival calls this fight. One of the five printed intros. No nebula environment is added.
    slug: "slug-fight-in-nebula",
    flag: "cited:slug-fight-in-nebula",
    aliases: ["Slug fight in nebula"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "Your sensors are no match for the Slug's telepathic abilities - a ship you never even saw opens fire from astern!",
    choices: [
      {
        id: "c:slug-fight-in-nebula:0",
        label: "Fight a Slug ship",
        // "Fight a Slug ship (default rewards)."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
    ],
  },
  {
    dest: "Slug fight in plasma storm",
    slug: "slug-fight-in-plasma-storm",
    flag: "cited:slug-fight-in-plasma-storm",
    aliases: ["Slug fight in plasma storm"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "The ion storm here threatens to deactivate your core systems, a fact made all the worse for the largely unaffected Slug ships circling like space-vultures.",
    choices: [
      {
        id: "c:slug-fight-in-plasma-storm:0",
        label: "Fight a Slug ship",
        // "Fight a Slug ship (default rewards)."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
    ],
  },
  {
    // Rebel fight chance in nebula. The chase, the doubled pursuit, and the scanner fights run in filler-events.ts.
    dest: "Rebel fight chance in nebula",
    slug: "rebel-fight-chance-in-nebula",
    flag: "cited:rebel-fight-chance-in-nebula",
    aliases: ["Rebel fight chance in nebula"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula", "Uncharted Nebula"],
    body: "You spot a rebel ship in the nebula ahead and stay off their radar. Try to engage?",
    choices: [
      {
        id: "c:rebel-fight-chance-in-nebula:0",
        label: "Stay hidden.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:rebel-fight-chance-in-nebula:1",
        label: "Prepare to chase them!",
        // Chase. A Rebel ship, doubled pursuit, or nothing. No odds. INFERRED: equal.
        fx: [{ k: "note", text: "A Rebel ship, doubled pursuit, or nothing." }],
      },
      {
        id: "c:rebel-fight-chance-in-nebula:2",
        label: "Try to track them as you move to engage.",
        // "Fight a Rebel ship (default rewards)."
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
      {
        id: "c:rebel-fight-chance-in-nebula:3",
        label: "Try to track them as you move to engage.",
        // "Fight a Rebel ship (default rewards)."
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
      {
        id: "c:rebel-fight-chance-in-nebula:4",
        label: "Use their life signatures to follow.",
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
    flag: "cited:slocknog",
    aliases: ["Slocknog"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You detect life signs on a nearby moon - a lone Slug marooned on its surface. \"Ah, a sssentient ssspecies, after all this time. I am Slocknog, a wandering hero ssseeking adventure. You may hire me for a ssmall sssum.\"",
    choices: [
      {
        id: "c:slocknog:0",
        label: "Hire Slocknog.",
        // "Hire Slocknog."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:slocknog:1",
        label: "Ignore Slocknog.",
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
    flag: "cited:slug-ship-boarding-rock-ship",
    aliases: ["Slug ship boarding Rock ship"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You arrive to find a Slug ship in the middle of boarding a disabled Rock freighter.",
    choices: [
      {
        id: "c:slug-ship-boarding-rock-ship:0",
        label: "Engage the Slug ship.",
        // "Fight a Slug ship."
        fx: [{ k: "fight", tier: "Slug ship" }],
      },
      {
        id: "c:slug-ship-boarding-rock-ship:1",
        label: "Ignore them.",
        // "Fight a Rock ship."
        fx: [{ k: "note", text: "Nothing, or a Rock ship." }],
      },
    ],
  },
];
