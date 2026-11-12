/**
 * Opening choices that state one amount, one hull number, or one named fight.
 * A choice with several possible results is omitted. Blue options, crew, map
 * reveals, and upgrades are not granted. An unnamed weapon, augmentation or drone
 * schematic is a random one (Rewards).
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
  /** "Fight a Mantis Ship (default rewards)." Mantis fight has no choice. Arrival calls this fight. unique=false. */
  {
    dest: "Hostile Mantis ship",
    slug: "mantis-fight",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Mantis Controlled Sector, Mantis Homeworlds." — [[Mantis fight]]
    flag: "cited:mantis-fight",
    aliases: [],
    sectors: ["Civilian Sector", "Mantis Controlled Sector", "Mantis Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:mantis-fight:0",
        // Wiki citations:
        // > "Fight a Mantis Ship (default rewards)." — [[Mantis fight]]
        label: "Fight the Mantis ship.",
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  /** "Fight a Mantis ship (default rewards)." Mantis fight in nebula has no choice. Arrival calls this fight. nebula=true. unique=false. */
  {
    dest: "Hostile Mantis ship in nebula",
    slug: "mantis-fight-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Uncharted Nebula." — [[Mantis fight in nebula]]
    flag: "cited:mantis-fight-in-nebula",
    aliases: [],
    sectors: ["Civilian Sector", "Uncharted Nebula"],
    body: "",
    choices: [
      {
        id: "c:mantis-fight-in-nebula:0",
        // Wiki citations:
        // > "Fight a Mantis ship (default rewards)." — [[Mantis fight in nebula]]
        label: "Fight the Mantis ship.",
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  /** "Fight the Pirate ship with your Engines limited to level 1." */
  {
    dest: "Hostile pirate ship: engine hack",
    slug: "pirate-engine-hacker",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate engine hacker]]
    // > "It is unique." — [[Pirate engine hacker]]
    // > "Once you arrive, your screen lights up with warnings. A nearby pirate seems to have advanced hacking tools and they have tried to shut down our engines. Your crew manages to keep them operational and you move in to attack." — [[Pirate engine hacker]]
    flag: "cited:pirate-engine-hacker",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "Hostile pirate ship. Engines hacked.",
    choices: [
      {
        id: "c:pirate-engine-hacker:0",
        // Wiki citations:
        // > "Continue..." — [[Pirate engine hacker]]
        // > "Fight the Pirate ship with your Engines limited to level 1." — [[Pirate engine hacker]]
        label: "Fight. Engines limited to 1 power.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:pirate-engine-hacker:1",
        // Wiki citations:
        // > "(Hacking System) Counter the remote hacking." — [[Pirate engine hacker]]
        // > "Your Hacking System automatically counters the digital assault and you move in to fight the ship." — [[Pirate engine hacker]]
        // > "Fight the Pirate ship with your Hacking offline." — [[Pirate engine hacker]]
        label: "Fight. Hacking offline; engines keep power.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "Fight a Pirate ship (default rewards)." Pirate fight has no choice. Arrival calls this fight. unique=false. */
  {
    dest: "Hostile pirate ship",
    slug: "pirate-fight",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate fight]]
    flag: "cited:pirate-fight",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "",
    choices: [
      {
        id: "c:pirate-fight:0",
        // Wiki citations:
        // > "Fight a Pirate ship (default rewards)." — [[Pirate fight]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "Fight a Pirate ship (default rewards)." Pirate fight (Lanius) has no choice. Arrival calls this fight. unique=false. */
  {
    dest: "Hostile pirate ship (Lanius sector)",
    slug: "pirate-fight-lanius",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Pirate fight (Lanius)]]
    flag: "cited:pirate-fight-lanius",
    aliases: [],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:pirate-fight-lanius:0",
        // Wiki citations:
        // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Lanius)]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /**
   * "Fight a Pirate ship (default rewards)." Pirate fight in asteroid field has no choice.
   * Arrival calls this fight. The wait sentence is the card body. asteroidfield=true. unique=false.
   */
  {
    dest: "Hostile pirate ship in asteroid field",
    slug: "pirate-fight-in-asteroid-field",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate fight in asteroid field]]
    // > "A pirate ship was lying in wait inside this asteroid field. It immediately moves in to attack." — [[Pirate fight in asteroid field]]
    flag: "cited:pirate-fight-in-asteroid-field",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "Hostile pirate ship. Asteroid field.",
    choices: [
      {
        id: "c:pirate-fight-in-asteroid-field:0",
        // Wiki citations:
        // > "Turn and fight." — [[Pirate fight in asteroid field]]
        // > "Fight a Pirate ship (default rewards)." — [[Pirate fight in asteroid field]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship", asteroid: true }],
      },
    ],
  },
  /** "Fight a Pirate ship (default rewards)." Pirate fight near pulsar has no choice. Arrival calls this fight. pulsar=true. unique=true. */
  {
    dest: "Hostile pirate ship near pulsar",
    slug: "pirate-fight-near-pulsar",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate fight near pulsar]]
    // > "It is unique." — [[Pirate fight near pulsar]]
    flag: "cited:pirate-fight-near-pulsar",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "",
    choices: [
      {
        id: "c:pirate-fight-near-pulsar:0",
        // Wiki citations:
        // > "Fight a Pirate ship (default rewards)." — [[Pirate fight near pulsar]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "Fight a Pirate ship (default rewards)." Pirate fight near sun has no choice. Arrival calls this fight. The star warning is the card body. redgiant=true. unique=true. */
  {
    dest: "Hostile pirate ship near sun",
    slug: "pirate-fight-near-sun",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate fight near sun]]
    // > "It is unique." — [[Pirate fight near sun]]
    // > "This beacon has been placed too close to a super-giant class M star! The ship will gradually overheat until you get out of here... or die. A pirate, apparently oblivious to the danger of the sun, moves in to engage." — [[Pirate fight near sun]]
    flag: "cited:pirate-fight-near-sun",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "Hostile pirate ship. Sun: fires break out.",
    choices: [
      {
        id: "c:pirate-fight-near-sun:0",
        // Wiki citations:
        // > "Fight a Pirate ship (default rewards)." — [[Pirate fight near sun]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "You power up your weapons and engage the pirate ship." */
  {
    dest: "Optional fight: pirate ship and civilian",
    slug: "pirate-ship-attacking-civilian",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula." — [[Pirate ship attacking civilian]]
    flag: "cited:pirate-ship-attacking-civilian",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
    ],
    body: "",
    choices: [
      {
        id: "c:pirate-ship-attacking-civilian:0",
        // Wiki citations:
        // > "Aid the civilian ship." — [[Pirate ship attacking civilian]]
        // > "You power up your weapons and engage the pirate ship." — [[Pirate ship attacking civilian]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:pirate-ship-attacking-civilian:1",
        // Wiki citations:
        // > "Stay out of it." — [[Pirate ship attacking civilian]]
        // > "The fight brings them out of your immediate scanning range. After a time the distress calls stop." — [[Pirate ship attacking civilian]]
        // > "Nothing happens." — [[Pirate ship attacking civilian]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /** "Fight a Pirate ship (default rewards)." */
  {
    dest: "Hostile pirate ship (distress)",
    // Arrival calls this fight. One of the four printed intros.
    slug: "pirate-ship-distress-trap",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector, Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Pirate ship distress trap]]
    // > "It is unique." — [[Pirate ship distress trap]]
    flag: "cited:pirate-ship-distress-trap",
    aliases: [],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:pirate-ship-distress-trap:0",
        // Wiki citations:
        // > "Fight a Pirate ship (default rewards)." — [[Pirate ship distress trap]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "Fight the pirate ship." */
  {
    dest: "Optional fight: pirate smuggler",
    slug: "pirate-smuggler",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Uncharted Nebula." — [[Pirate smuggler]]
    flag: "cited:pirate-smuggler",
    aliases: [],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"],
    body: "",
    choices: [
      {
        id: "c:pirate-smuggler:0",
        // Wiki citations:
        // > "Attack the pirate." — [[Pirate smuggler]]
        // > "You power up your weapons and move in to engage." — [[Pirate smuggler]]
        // > "Fight the pirate ship." — [[Pirate smuggler]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:pirate-smuggler:1",
        // Wiki citations:
        // > "Ignore the ship." — [[Pirate smuggler]]
        // > "It jumps away after a time." — [[Pirate smuggler]]
        // > "Nothing happens." — [[Pirate smuggler]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /**
   * "Pay their toll." [15-25 scrap]. "You avoid the fight."
   * "Reject their 'offer'." "Fight a Pirate ship (default rewards)."
   */
  {
    dest: "Toll: pirate ship",
    slug: "pirate-toll",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector." — [[Pirate toll]]
    // > "Upon completing your jump, you receive a message from a nearby ship. \"Greetings and welcome to our beacon! For a small fee, we'll let you continue on your way.\"" — [[Pirate toll]]
    flag: "cited:pirate-toll",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "Pirate ship. Toll: 15-25 scrap.",
    choices: [
      {
        id: "c:pirate-toll:0",
        // Wiki citations:
        // > "Pay their toll. [ Scrap lost: 15-25 ]" — [[Pirate toll]]
        // > "\"You made the right decision, friend.\"" — [[Pirate toll]]
        // > "You avoid the fight." — [[Pirate toll]]
        label: "Lose 15-25 scrap.",
        fx: [{ k: "res", id: "scrap", sign: -1, lo: 15, hi: 25 }],
      },
      {
        id: "c:pirate-toll:1",
        // Wiki citations:
        // > "Reject their 'offer'." — [[Pirate toll]]
        // > "\"Too bad... You will regret this decision!\"" — [[Pirate toll]]
        // > "Fight a Pirate ship (default rewards)." — [[Pirate toll]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "Fight a Rebel ship (default rewards)." Rebel fight has no choice. Arrival calls this fight. unique=false. */
  {
    dest: "Hostile Rebel ship",
    slug: "rebel-fight",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector, Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds, Rebel Controlled Sector, Rebel Stronghold, The Last Stand, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Rebel fight]]
    flag: "cited:rebel-fight",
    aliases: [],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "The Last Stand",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:rebel-fight:0",
        // Wiki citations:
        // > "Fight a Rebel ship (default rewards)." — [[Rebel fight]]
        label: "Fight the Rebel ship.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  /** "Fight a Rebel ship (default rewards)." Rebel fight (Lanius) has no choice. Arrival calls this fight. unique=false. */
  {
    dest: "Hostile Rebel ship (Lanius sector)",
    slug: "rebel-fight-lanius",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Rebel fight (Lanius)]]
    flag: "cited:rebel-fight-lanius",
    aliases: [],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-lanius:0",
        // Wiki citations:
        // > "Fight a Rebel ship (default rewards)." — [[Rebel fight (Lanius)]]
        label: "Fight the Rebel ship.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  /** "Attack the ship." "Fight a Rebel ship (default rewards)." */
  {
    dest: "Optional fight: Rebel ship in nebula",
    slug: "rebel-fight-choice-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Rebel fight choice in nebula]]
    // > "It is unique." — [[Rebel fight choice in nebula]]
    // > "Your ship emerges quite far away from the beacon. You see a rebel ship waiting nearby, undoubtedly stationed to look for you." — [[Rebel fight choice in nebula]]
    flag: "cited:rebel-fight-choice-in-nebula",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "Rebel ship. It has not seen you. Nebula.",
    choices: [
      {
        id: "c:rebel-fight-choice-in-nebula:0",
        // Wiki citations:
        // > "Attack the ship." — [[Rebel fight choice in nebula]]
        // > "Fight a Rebel ship (default rewards)." — [[Rebel fight choice in nebula]]
        label: "Fight the Rebel ship.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
      {
        id: "c:rebel-fight-choice-in-nebula:1",
        // Wiki citations:
        // > "Attempt to remain concealed." — [[Rebel fight choice in nebula]]
        label: "1 in 3: more options. 1 in 3: nothing happens. 1 in 3: fleet advances 1.",
        // Three results, no odds. INFERRED: equal. The caught branch opens the follow-up. quests.ts.
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:rebel-fight-choice-in-nebula:2",
        // Wiki citations:
        // > "(Cloaking) Cloak to stay hidden." — [[Rebel fight choice in nebula]]
        // > "You use your cloaking system to slip further into the nebula undetected." — [[Rebel fight choice in nebula]]
        // > "Nothing happens." — [[Rebel fight choice in nebula]]
        label: "Nothing happens.",
        // Cloaking. "Nothing happens." quests.ts.
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /** "Fight a Rebel ship (default rewards)." Rebel fight in nebula has no choice. Arrival calls this fight. nebula=true. unique=false. */
  {
    dest: "Hostile Rebel ship in nebula",
    slug: "rebel-fight-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Rebel fight in nebula]]
    flag: "cited:rebel-fight-in-nebula",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-in-nebula:0",
        // Wiki citations:
        // > "Fight a Rebel ship (default rewards)." — [[Rebel fight in nebula]]
        label: "Fight the Rebel ship.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  /** "Fight a Rebel ship (default rewards)." Rebel fight near pulsar has no choice. Arrival calls this fight. pulsar=true. unique=true. */
  {
    dest: "Hostile Rebel ship near pulsar",
    slug: "rebel-fight-near-pulsar",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Mantis Controlled Sector, Mantis Homeworlds, Rebel Controlled Sector, Rebel Stronghold, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Rebel fight near pulsar]]
    // > "It is unique." — [[Rebel fight near pulsar]]
    flag: "cited:rebel-fight-near-pulsar",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-near-pulsar:0",
        // Wiki citations:
        // > "Fight a Rebel ship (default rewards)." — [[Rebel fight near pulsar]]
        label: "Fight the Rebel ship.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  /** Rebel ship warning has no choice. Arrival applies this fight. "Fight a Rebel ship that is running away." unique=true. */
  {
    dest: "Fleeing Rebel ship",
    slug: "rebel-ship-warning",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Rebel Controlled Sector, Rebel Stronghold." — [[Rebel ship warning]]
    // > "It is unique." — [[Rebel ship warning]]
    // > "You stumble across a forward scout of the Rebel fleet." — [[Rebel ship warning]]
    flag: "cited:rebel-ship-warning",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
    ],
    body: "Fleeing Rebel ship.",
    choices: [
      {
        id: "c:rebel-ship-warning:0",
        // Wiki citations:
        // > "Fight a Rebel ship that is running away. (40 seconds escape countdown timer if not interrupted)" — [[Rebel ship warning]]
        // > "They are powering up their FTL! If they get away, they will no doubt warn the fleet of your position!" — [[Rebel ship warning]]
        label: "Fight the Rebel ship. It tries to escape.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  /** "Fight a Lanius ship." */
  {
    dest: "Refueling platform (Lanius)",
    slug: "refueling-platform-garbled-broadcast",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Refueling platform garbled broadcast]]
    // > "It is unique." — [[Refueling platform garbled broadcast]]
    // > "You detect a refueling platform near the beacon, although its broadcast signal is garbled, and you can't make out the message." — [[Refueling platform garbled broadcast]]
    flag: "cited:refueling-platform-garbled-broadcast",
    aliases: [],
    sectors: ["Abandoned Sector"],
    body: "Fuel platform.",
    choices: [
      {
        id: "c:refueling-platform-garbled-broadcast:0",
        // Wiki citations:
        // > "Hail the platform and attempt to communicate." — [[Refueling platform garbled broadcast]]
        // > "There is a screech from your comm system, and the broadcast suddenly cuts off. The platform suddenly begins to move, revealing itself to be a Lanius ship!" — [[Refueling platform garbled broadcast]]
        // > "Fight a Lanius ship." — [[Refueling platform garbled broadcast]]
        label: "Fight the Lanius ship.",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:refueling-platform-garbled-broadcast:1",
        // Wiki citations:
        // > "Ignore the platform." — [[Refueling platform garbled broadcast]]
        // > "You leave the platform alone, and prepare to jump." — [[Refueling platform garbled broadcast]]
        // > "Nothing happens." — [[Refueling platform garbled broadcast]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:refueling-platform-garbled-broadcast:2",
        // Wiki citations:
        // > "Dock with the platform." — [[Refueling platform garbled broadcast]]
        label: "More options.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /**
   * "Fight the pirate ship."
   * {{Blue Option|Fire Beam|Show the pirate how to intimidate settlers: burn their crops!}}
   * "You receive a drone schematic with high scrap." Rewards, "Drone": "A random drone schematic & T scrap."
   * The schematic is granted in cited-events.ts, after the scrap.
   * {{Blue Option|Fire Bomb|Show the pirate how to intimidate settlers: start fires in their crude dwellings.}}
   * [ {{Transaction|1|subtract_missiles}} ]
   * Same random drone schematic with high scrap.
   */
  {
    dest: "Optional fight: pirate ship and settlement",
    slug: "remote-settlement",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector." — [[Remote settlement]]
    // > "It is unique." — [[Remote settlement]]
    // > "Scans show a remote settlement being blockaded by a pirate ship. The ship hastily messages you, \"Stay out of this, or you'll be next!...Concentrate fire on...\"" — [[Remote settlement]]
    flag: "cited:remote-settlement",
    aliases: [],
    sectors: ["Civilian Sector"],
    body: "Pirate ship blockading a settlement.",
    choices: [
      {
        id: "c:remote-settlement:0",
        // Wiki citations:
        // > "Attack the pirate." — [[Remote settlement]]
        // > "\"You asked for it!\" They pull away from the planet and move in to engage." — [[Remote settlement]]
        // > "Fight the pirate ship." — [[Remote settlement]]
        label: "Fight the pirate ship.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:remote-settlement:1",
        // Wiki citations:
        // > "Ignore them." — [[Remote settlement]]
        // > "It's just not possible to save every civilian affected by this war. You prepare to jump." — [[Remote settlement]]
        // > "Nothing happens." — [[Remote settlement]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:remote-settlement:2",
        // Wiki citations:
        // > "(Fire Beam) Show the pirate how to intimidate settlers: burn their crops!" — [[Remote settlement]]
        // > "The pirate watches as you start to light the meager crops on fire. In a few moments the settlement surrenders, offering tribute to leave them alone. The pirate seems impressed." — [[Remote settlement]]
        // > "You receive a drone schematic with high scrap." — [[Remote settlement]]
        label: "Gain a drone schematic and high scrap.",
        fx: [{ k: "tier", tier: "high" }],
      },
      {
        id: "c:remote-settlement:3",
        // Wiki citations:
        // > "(Fire Bomb) Show the pirate how to intimidate settlers: start fires in their crude dwellings. [ Missiles lost: 1 ]" — [[Remote settlement]]
        // > "The pirate watches as you teleport an incendiary explosive into their settlement. As the settlers scramble to put out the fires, their rudimentary planetary defenses power down. Forcing their surrender was almost laughably easy, but the pirate seems impressed with your tactics and agrees to share the settlement's 'tribute'." — [[Remote settlement]]
        // > "You receive a drone schematic with high scrap." — [[Remote settlement]]
        label: "Lose 1 missile. Gain a drone schematic and high scrap.",
        fx: [
          { k: "res", id: "missiles", sign: -1, lo: 1, hi: 1 },
          { k: "tier", tier: "high" },
        ],
      },
    ],
  },
  /**
   * "Repair 20 damage." [40 scrap]. "Your ship receives 20 repairs."
   * "Repair 10 damage." [20 scrap]. "Your ship receives 10 repairs."
   * "Repair 5 damage." [10 scrap]. "Your ship receives 5 repairs."
   */
  {
    dest: "Repair station",
    slug: "repair-station",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Hidden Crystal Worlds, Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Repair station]]
    // > "It is unique." — [[Repair station]]
    // > "You see a small station fitted with hundreds of Repair drones. You receive an automated message, \"We don't know who you are and we don't care, but this is the right place for some ship repair!\"" — [[Repair station]]
    flag: "cited:repair-station",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Hidden Crystal Worlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "Hull repair for scrap.",
    choices: [
      {
        id: "c:repair-station:0",
        // Wiki citations:
        // > "Repair 20 damage. [ Scrap lost: 40 ]" — [[Repair station]]
        // > "\"Thank you for your business, no refunds!\"" — [[Repair station]]
        // > "Your ship receives 20 repairs." — [[Repair station]]
        label: "Lose 40 scrap. Repair 20 hull.",
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 40, hi: 40 },
          { k: "hull", n: 20 },
          { k: "note", text: "Repaired." },
        ],
      },
      {
        id: "c:repair-station:1",
        // Wiki citations:
        // > "Repair 10 damage. [ Scrap lost: 20 ]" — [[Repair station]]
        // > "\"Thank you for your business, no refunds!\"" — [[Repair station]]
        // > "Your ship receives 10 repairs." — [[Repair station]]
        label: "Lose 20 scrap. Repair 10 hull.",
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 20, hi: 20 },
          { k: "hull", n: 10 },
          { k: "note", text: "Repaired." },
        ],
      },
      {
        id: "c:repair-station:2",
        // Wiki citations:
        // > "Repair 5 damage. [ Scrap lost: 10 ]" — [[Repair station]]
        // > "\"Thank you for your business, no refunds!\"" — [[Repair station]]
        // > "Your ship receives 5 repairs." — [[Repair station]]
        label: "Lose 10 scrap. Repair 5 hull.",
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 10, hi: 10 },
          { k: "hull", n: 5 },
          { k: "note", text: "Repaired." },
        ],
      },
      {
        id: "c:repair-station:3",
        // Wiki citations:
        // > "Ignore the station." — [[Repair station]]
        // > "Nothing happens." — [[Repair station]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /** "You lose 2-4 fuel and receive 1-3 drones." */
  {
    dest: "Trade: fuel for drone parts",
    slug: "trade-fuel-for-drone-parts",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Trade fuel for drone parts]]
    flag: "cited:trade-fuel-for-drone-parts",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:trade-fuel-for-drone-parts:0",
        // Wiki citations:
        // > "Accept the offer." — [[Trade fuel for drone parts]]
        // > "You lose Fuel lost: 2-4 and receive Drone parts gained: 1-3." — [[Trade fuel for drone parts]]
        label: "Lose 2-4 fuel. Gain 1-3 drone parts.",
        fx: [
          { k: "res", id: "fuel", sign: -1, lo: 2, hi: 4 },
          { k: "res", id: "parts", sign: 1, lo: 1, hi: 3 },
        ],
      },
      {
        id: "c:trade-fuel-for-drone-parts:1",
        // Wiki citations:
        // > "Reject their offer." — [[Trade fuel for drone parts]]
        // > "Nothing happens." — [[Trade fuel for drone parts]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /**
   * "You lose 1-2 drones and receive 5-10 fuel."
   * "You lose 1-2 fuel and receive 4-5 missiles."
   * "You lose 2-3 missiles and receive 2-3 drones."
   * "You lose 2-4 missiles and receive 4-10 fuel."
   */
  {
    dest: "Trade: resources",
    slug: "trade-resources",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Trade resources]]
    flag: "cited:trade-resources",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:trade-resources:0",
        // Wiki citations:
        // > "You lose Drone parts lost: 1-2 and receive 5-10." — [[Trade resources]]
        label: "Lose 1-2 drone parts. Gain 5-10 fuel.",
        fx: [
          { k: "res", id: "parts", sign: -1, lo: 1, hi: 2 },
          { k: "res", id: "fuel", sign: 1, lo: 5, hi: 10 },
        ],
      },
      {
        id: "c:trade-resources:1",
        // Wiki citations:
        // > "You lose Fuel lost: 1-2 and receive 4-5." — [[Trade resources]]
        label: "Lose 1-2 fuel. Gain 4-5 missiles.",
        fx: [
          { k: "res", id: "fuel", sign: -1, lo: 1, hi: 2 },
          { k: "res", id: "missiles", sign: 1, lo: 4, hi: 5 },
        ],
      },
      {
        id: "c:trade-resources:2",
        // Wiki citations:
        // > "You lose Missiles lost: 2-3 and receive 2-3." — [[Trade resources]]
        label: "Lose 2-3 missiles. Gain 2-3 drone parts.",
        fx: [
          { k: "res", id: "missiles", sign: -1, lo: 2, hi: 3 },
          { k: "res", id: "parts", sign: 1, lo: 2, hi: 3 },
        ],
      },
      {
        id: "c:trade-resources:3",
        // Wiki citations:
        // > "You lose Missiles lost: 2-4 and receive 4-10." — [[Trade resources]]
        label: "Lose 2-4 missiles. Gain 4-10 fuel.",
        fx: [
          { k: "res", id: "missiles", sign: -1, lo: 2, hi: 4 },
          { k: "res", id: "fuel", sign: 1, lo: 4, hi: 10 },
        ],
      },
      {
        id: "c:trade-resources:4",
        // Wiki citations:
        // > "Ignore." — [[Trade resources]]
        // > "Nothing happens." — [[Trade resources]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /**
   * "You lose 1-2 drones and receive 5-10 fuel."
   * "You lose 1-2 fuel and receive 4-5 missiles."
   * "You lose 2-3 missiles and receive 2-3 drones."
   * "You lose 2-4 missiles and receive 4-10 fuel."
   */
  {
    dest: "Trade: resources in nebula",
    slug: "trade-resources-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Trade resources in nebula]]
    // > "It is unique." — [[Trade resources in nebula]]
    flag: "cited:trade-resources-in-nebula",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:trade-resources-in-nebula:0",
        // Wiki citations:
        // > "You lose Drone parts lost: 1-2 and receive Fuel gained: 5-10." — [[Trade resources in nebula]]
        label: "Lose 1-2 drone parts. Gain 5-10 fuel.",
        fx: [
          { k: "res", id: "parts", sign: -1, lo: 1, hi: 2 },
          { k: "res", id: "fuel", sign: 1, lo: 5, hi: 10 },
        ],
      },
      {
        id: "c:trade-resources-in-nebula:1",
        // Wiki citations:
        // > "You lose Fuel lost: 1-2 and receive Missiles gained: 4-5." — [[Trade resources in nebula]]
        label: "Lose 1-2 fuel. Gain 4-5 missiles.",
        fx: [
          { k: "res", id: "fuel", sign: -1, lo: 1, hi: 2 },
          { k: "res", id: "missiles", sign: 1, lo: 4, hi: 5 },
        ],
      },
      {
        id: "c:trade-resources-in-nebula:2",
        // Wiki citations:
        // > "You lose Missiles lost: 2-3 and receive Drone parts gained: 2-3." — [[Trade resources in nebula]]
        label: "Lose 2-3 missiles. Gain 2-3 drone parts.",
        fx: [
          { k: "res", id: "missiles", sign: -1, lo: 2, hi: 3 },
          { k: "res", id: "parts", sign: 1, lo: 2, hi: 3 },
        ],
      },
      {
        id: "c:trade-resources-in-nebula:3",
        // Wiki citations:
        // > "You lose Missiles lost: 2-4 and receive Fuel gained: 4-10." — [[Trade resources in nebula]]
        label: "Lose 2-4 missiles. Gain 4-10 fuel.",
        fx: [
          { k: "res", id: "missiles", sign: -1, lo: 2, hi: 4 },
          { k: "res", id: "fuel", sign: 1, lo: 4, hi: 10 },
        ],
      },
      {
        id: "c:trade-resources-in-nebula:4",
        // Wiki citations:
        // > "Ignore." — [[Trade resources in nebula]]
        // > "Nothing happens." — [[Trade resources in nebula]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
