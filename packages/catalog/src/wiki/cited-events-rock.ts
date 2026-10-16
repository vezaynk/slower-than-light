/**
 * Rock pages whose opening outcome is one stated amount or one named fight.
 * A choice with several results is left out. Blue options, crew, map reveals,
 * and upgrades are not granted. Boarder counts are not granted except
 * Rock fight with boarders, Rock fight with boarders in asteroid field
 * (citedChoose, after the fight), and Boarders: Rockmen near sun (2-3 rocks, no ship).
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
  {
    dest: "Mantis ship with Rock body parts",
    slug: "mantis-ship-with-rock-body-parts",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Mantis ship with Rock body parts]]
    // > "It is unique." — [[Mantis ship with Rock body parts]]
    // > "A Mantis ship here is adorned with Rock body parts! It would be a gorier display if they had internal organs, but the message is clear enough: this is a hunter of a very specialized kind." — [[Mantis ship with Rock body parts]]
    flag: "cited:mantis-ship-with-rock-body-parts",
    aliases: [
      "Mantis ship with Rock body parts",
      "Mantis Ship Rock Body Parts",
      "Mantis Ship Rock body parts",
      "Mantis ship Rock body parts",
    ],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "A Mantis ship here is adorned with Rock body parts! It would be a gorier display if they had internal organs, but the message is clear enough: this is a hunter of a very specialized kind.",
    choices: [
      {
        id: "c:mantis-ship-with-rock-body-parts:0",
        // Wiki citations:
        // > "No species deserves a Mantis hunter on their back - time to make the galaxy a little safer. Engage!" — [[Mantis ship with Rock body parts]]
        // > "Fight the Mantis ship (default rewards)." — [[Mantis ship with Rock body parts]]
        label: "Attack!",
        fx: [
          // "Fight the Mantis ship (default rewards)."
          { k: "fight", tier: "Mantis ship" },
        ],
      },
      {
        id: "c:mantis-ship-with-rock-body-parts:1",
        // Wiki citations:
        // > "Ignore them." — [[Mantis ship with Rock body parts]]
        // > "The Mantis take no interest in your ship - they're lying in wait for the next Rock ship to venture through. You're able to spin up the engines and jump at your leisure." — [[Mantis ship with Rock body parts]]
        // > "Nothing happens." — [[Mantis ship with Rock body parts]]
        label: "Ignore them.",
        fx: [
          // "Nothing happens."
          { k: "nothing" },
        ],
      },
      {
        id: "c:mantis-ship-with-rock-body-parts:2",
        // Wiki citations:
        // > "(Rock Crew) Put your Rock crewmember on the comm." — [[Mantis ship with Rock body parts]]
        // > "The two aliens face one another over the vidscreen. \"Cave-dwelling pebble-man!\" yells the furious Mantis captain. \"See, I paint my ship with your companions! I paint my ship with you!\"" — [[Mantis ship with Rock body parts]]
        // > "Fight the Mantis ship (default rewards)." — [[Mantis ship with Rock body parts]]
        label: "Put your Rock crewmember on the comm.",
        fx: [
          // "Fight the Mantis ship (default rewards)."
          { k: "fight", tier: "Mantis ship" },
        ],
      },
      {
        id: "c:mantis-ship-with-rock-body-parts:3",
        // Wiki citations:
        // > "(Rock Ship) Ram the bastards. (Requires Rock Plating)" — [[Mantis ship with Rock body parts]]
        // > "Before they have a chance, you ram your ship into theirs, causing irreparable damage to their engines. Luckily, your ship's armored hull is hardly dented from the impact. The Mantis ship careens away and you move in to attack." — [[Mantis ship with Rock body parts]]
        // > "Fight the Mantis ship (default rewards), whose engines are disabled." — [[Mantis ship with Rock body parts]]
        label: "Ram the bastards.",
        fx: [
          // "Fight the Mantis ship (default rewards), whose engines are disabled."
          { k: "fight", tier: "Mantis ship" },
        ],
      },
    ],
  },
  // "Fight a Rock ship (default rewards)." Rock fight has no choice. Arrival calls this fight. One of the eight printed intros. unique=false.
  {
    dest: "Rock fight",
    slug: "rock-fight",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight]]
    flag: "cited:rock-fight",
    aliases: ["Rock fight", "Rock Fight"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight:0",
        // Wiki citations:
        // > "Fight a Rock ship (default rewards)." — [[Rock fight]]
        label: "Fight a Rock ship",
        fx: [
          // "Fight a Rock ship (default rewards)."
          { k: "fight", tier: "Rock ship" },
        ],
      },
    ],
  },
  // "Fight a Rock ship (default rewards)." Rock fight in asteroid field has no choice. Arrival calls this fight. One of the three printed intros. asteroidfield=true. unique=true.
  {
    dest: "Rock fight in asteroid field",
    slug: "rock-fight-in-asteroid-field",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight in asteroid field]]
    // > "It is unique." — [[Rock fight in asteroid field]]
    flag: "cited:rock-fight-in-asteroid-field",
    aliases: ["Rock fight in asteroid field", "Rock Fight in Asteroid Field"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight-in-asteroid-field:0",
        // Wiki citations:
        // > "Fight a Rock ship (default rewards)." — [[Rock fight in asteroid field]]
        label: "Fight a Rock ship",
        fx: [
          // "Fight a Rock ship (default rewards)." Locations: asteroidfield=true.
          { k: "fight", tier: "Rock ship", asteroid: true },
        ],
      },
    ],
  },
  {
    // Rock fight with boarders. The page prints no button. The red line is the outcome, applied on arrival.
    // "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." unique=true.
    dest: "Rock fight with boarders",
    slug: "rock-fight-with-boarders",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight with boarders]]
    // > "It is unique." — [[Rock fight with boarders]]
    flag: "cited:rock-fight-with-boarders",
    aliases: ["Rock fight with boarders", "Rock Fight With Boarders", "Rock Fight with Boarders"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight-with-boarders:0",
        // Wiki citations:
        // > "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders]]
        label: "Fight a Rock ship",
        fx: [
          // "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)."
          { k: "fight", tier: "Rock ship" },
        ],
      },
    ],
  },
  {
    // Rock fight with boarders in asteroid field. The page prints no button. The red line is the outcome, applied on arrival.
    // "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." asteroidfield=true. unique=true.
    dest: "Rock fight with boarders in asteroid field",
    slug: "rock-fight-with-boarders-in-asteroid-field",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight with boarders in asteroid field]]
    // > "It is unique." — [[Rock fight with boarders in asteroid field]]
    flag: "cited:rock-fight-with-boarders-in-asteroid-field",
    aliases: [
      "Rock fight with boarders in asteroid field",
      "Rock Fight With Boarders in Asteroid Field",
      "Rock Fight with Boarders in Asteroid Field",
    ],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight-with-boarders-in-asteroid-field:0",
        // Wiki citations:
        // > "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders in asteroid field]]
        label: "Fight a Rock ship",
        fx: [
          // "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." Locations: asteroidfield=true.
          { k: "fight", tier: "Rock ship", asteroid: true },
        ],
      },
    ],
  },
  // "Fight a Rock pirate ship (default rewards)." Rock pirates fight has no choice. Arrival calls this fight. One of the three printed intros. unique=false.
  {
    dest: "Rock pirates fight",
    slug: "rock-pirates-fight",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock pirates fight]]
    flag: "cited:rock-pirates-fight",
    aliases: ["Rock pirates fight", "Rock Pirate Fight", "Rock pirate fight"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-pirates-fight:0",
        // Wiki citations:
        // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight]]
        label: "Fight a Rock pirate ship",
        fx: [
          // "Fight a Rock pirate ship (default rewards)."
          { k: "fight", tier: "Rock pirate ship" },
        ],
      },
    ],
  },
  // "Fight a Rock pirate ship (default rewards)." Rock pirates fight in asteroid field has no choice. Arrival calls this fight. One of the two printed intros. asteroidfield=true. unique=true.
  {
    dest: "Rock pirates fight in asteroid field",
    slug: "rock-pirates-fight-in-asteroid-field",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock pirates fight in asteroid field]]
    // > "It is unique." — [[Rock pirates fight in asteroid field]]
    flag: "cited:rock-pirates-fight-in-asteroid-field",
    aliases: [
      "Rock pirates fight in asteroid field",
      "Rock Pirate in Asteroid Field",
      "Rock pirate fight in asteroid field",
      "Rock pirate in asteroid field",
    ],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-pirates-fight-in-asteroid-field:0",
        // Wiki citations:
        // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight in asteroid field]]
        label: "Fight a Rock pirate ship",
        fx: [
          // "Fight a Rock pirate ship (default rewards)." Locations: asteroidfield=true.
          { k: "fight", tier: "Rock pirate ship", asteroid: true },
        ],
      },
    ],
  },
  // "Fight a Rock pirate ship (default rewards)." Rock pirates fight near sun has no choice. Arrival calls this fight. One of the two printed intros. redgiant=true. unique=true.
  {
    dest: "Rock pirates fight near sun",
    slug: "rock-pirates-fight-near-sun",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock pirates fight near sun]]
    // > "It is unique." — [[Rock pirates fight near sun]]
    flag: "cited:rock-pirates-fight-near-sun",
    aliases: [
      "Rock pirates fight near sun",
      "Rock Pirate Near Sun",
      "Rock pirate fight near sun",
      "Rock pirate near sun",
    ],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-pirates-fight-near-sun:0",
        // Wiki citations:
        // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight near sun]]
        label: "Fight a Rock pirate ship",
        fx: [
          // "Fight a Rock pirate ship (default rewards)."
          { k: "fight", tier: "Rock pirate ship" },
        ],
      },
    ],
  },
  {
    // Boarders: Rockmen near sun. The page prints no button. The red line is the outcome, applied on arrival.
    // redgiant=true, LRSmap=noship+redgiant, unique=true. Not a crew grant.
    dest: "Boarders: Rockmen near sun",
    slug: "boarders-rockmen-near-sun",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Boarders: Rockmen near sun]]
    // > "It is unique." — [[Boarders: Rockmen near sun]]
    flag: "cited:boarders-rockmen-near-sun",
    aliases: ["Boarders: Rockmen near sun"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: 'As soon as you arrive you hear the telltale sounds of a teleporter and shouts reverberating through the ship, "Prepare to burn, fleshy meat-sack aliens!"',
    choices: [
      {
        id: "c:boarders-rockmen-near-sun:0",
        // Wiki citations:
        // > "2-3 rock boarders beam aboard your ship." — [[Boarders: Rockmen near sun]]
        label: "2-3 rock boarders beam aboard your ship.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    // Disabled Rock ship. Strip, leave, and the Slug lookout run in filler-events.ts.
    // Strip and the lookout pay a random amount of scrap. Leave prints DuplicateEvent|2 on nothing.
    dest: "Disabled Rock ship",
    slug: "disabled-rock-ship",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Disabled Rock ship]]
    // > "It is unique." — [[Disabled Rock ship]]
    // > "You find a disabled rock transport floating near the beacon. You consider stripping it of useful parts but are uncertain why it's there in the first place." — [[Disabled Rock ship]]
    flag: "cited:disabled-rock-ship",
    aliases: ["Disabled Rock ship"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "You find a disabled rock transport floating near the beacon. You consider stripping it of useful parts but are uncertain why it's there in the first place.",
    choices: [
      {
        id: "c:disabled-rock-ship:0",
        // Wiki citations:
        // > "Strip the ship." — [[Disabled Rock ship]]
        label: "Strip the ship.",
        // Random scrap, or that scrap and a Rock ship. No odds. INFERRED: equal.
        fx: [{ k: "note", text: "Random scrap, or that scrap and a Rock ship." }],
      },
      {
        id: "c:disabled-rock-ship:1",
        // Wiki citations:
        // > "Leave it alone." — [[Disabled Rock ship]]
        label: "Leave it alone.",
        // Nothing, or a Rock ship. The nothing result is printed twice.
        fx: [{ k: "note", text: "Nothing, or a Rock ship." }],
      },
      {
        id: "c:disabled-rock-ship:2",
        // Wiki citations:
        // > "(Slug Crew) Check for lifeforms and keep a lookout for ships while looting the wreck." — [[Disabled Rock ship]]
        label: "Check for lifeforms and keep a lookout for ships while looting the wreck.",
        // Slug crew. Random scrap. The two sentences are printed as alternatives.
        fx: [{ k: "note", text: "Random scrap." }],
      },
    ],
  },
  {
    // Rock and Slug standoff. The debt, the demand, and the Slug captain run in filler-events.ts and quests.ts.
    dest: "Rock and Slug standoff",
    slug: "rock-and-slug-standoff",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock and Slug standoff]]
    // > "It is unique." — [[Rock and Slug standoff]]
    // > "You find a Slug Cruiser and Rock ship at a standoff, both with weapons armed and ready to fight. You could intervene before this gets out of hand." — [[Rock and Slug standoff]]
    flag: "cited:rock-and-slug-standoff",
    aliases: ["Rock and Slug standoff"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "You find a Slug Cruiser and Rock ship at a standoff, both with weapons armed and ready to fight. You could intervene before this gets out of hand.",
    choices: [
      {
        id: "c:rock-and-slug-standoff:0",
        // Wiki citations:
        // > "Hail them to see what's wrong." — [[Rock and Slug standoff]]
        label: "Hail them to see what's wrong.",
        // "The Slug captain explains the unpaid reactor work."
        fx: [{ k: "note", text: "Pay the debt, demand payment, or leave." }],
      },
      {
        id: "c:rock-and-slug-standoff:1",
        // Wiki citations:
        // > "Leave them be." — [[Rock and Slug standoff]]
        // > "Nothing happens." — [[Rock and Slug standoff]]
        label: "Leave them be.",
        // "Nothing happens."
        fx: [{ k: "note", text: "Nothing happens." }],
      },
    ],
  },
  {
    // Mantis ships battle for Rock freighter. The fights, the scrap, and the drone parts run in filler-events.ts.
    dest: "Mantis ships battle for Rock freighter",
    slug: "mantis-ships-battle-for-rock-freighter",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Mantis ships battle for Rock freighter]]
    // > "It is unique." — [[Mantis ships battle for Rock freighter]]
    // > "A curious sight greets you at this beacon: a disabled Rock freighter drifts in space while two Mantis craft battle it out - presumably over who deserves the spoils." — [[Mantis ships battle for Rock freighter]]
    flag: "cited:mantis-ships-battle-for-rock-freighter",
    aliases: [
      "Mantis ships battle for Rock freighter",
      "Mantis Ships Battle for Rock Freighter",
      "Mantis ships battle for Rock Freighter",
    ],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "A curious sight greets you at this beacon: a disabled Rock freighter drifts in space while two Mantis craft battle it out - presumably over who deserves the spoils.",
    choices: [
      {
        id: "c:mantis-ships-battle-for-rock-freighter:0",
        // Wiki citations:
        // > "Wait, then attack the surviving Mantis." — [[Mantis ships battle for Rock freighter]]
        label: "Wait, then attack the surviving Mantis.",
        // Two Mantis fights. One has Weapon Control reduced. No odds. INFERRED: equal.
        fx: [{ k: "note", text: "A weakened Mantis ship, or a Mantis ship." }],
      },
      {
        id: "c:mantis-ships-battle-for-rock-freighter:1",
        // Wiki citations:
        // > "Ignore them." — [[Mantis ships battle for Rock freighter]]
        // > "Nothing happens." — [[Mantis ships battle for Rock freighter]]
        label: "Ignore them.",
        // "Nothing happens."
        fx: [{ k: "note", text: "Nothing happens." }],
      },
      {
        id: "c:mantis-ships-battle-for-rock-freighter:2",
        // Wiki citations:
        // > "(Repair Drone) Repair the Rock ship. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
        label: "Repair the Rock ship.",
        // Repair Drone. High scrap. The printed drone-part bug stays in filler-events.ts.
        fx: [{ k: "note", text: "High scrap." }],
      },
      {
        id: "c:mantis-ships-battle-for-rock-freighter:3",
        // Wiki citations:
        // > "(Hull Repair Drone) Repair their hull. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
        label: "Repair their hull.",
        // Hull Repair Drone, then a Mantis ship.
        fx: [{ k: "note", text: "A Mantis ship." }],
      },
    ],
  },
  {
    // Rock live mine. The bite, the wires, and the scrap run in filler-events.ts.
    dest: "Rock live mine",
    slug: "rock-live-mine",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock live mine]]
    // > "It is unique." — [[Rock live mine]]
    // > "The burnt out hull of a Rock mine layer drifts by. Behind the wreck drifts a live mine; an automated drone that drills into ships' hulls before exploding. It locks onto your ship's signature and heads your way!" — [[Rock live mine]]
    flag: "cited:rock-live-mine",
    aliases: ["Rock live mine", "Rock Live Mine"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "The burnt out hull of a Rock mine layer drifts by. Behind the wreck drifts a live mine; an automated drone that drills into ships' hulls before exploding. It locks onto your ship's signature and heads your way!",
    choices: [
      {
        id: "c:rock-live-mine:0",
        // Wiki citations:
        // > "Attempt evasive maneuvers." — [[Rock live mine]]
        label: "Attempt evasive maneuvers.",
        // The mine bites down. Defuse it, detonate a missile, or cut it free.
        fx: [{ k: "note", text: "The mine bites down." }],
      },
      {
        id: "c:rock-live-mine:1",
        // Wiki citations:
        // > "(Improved Engines) Reverse thrusters! (Requires level 5+ Engines)" — [[Rock live mine]]
        label: "Reverse thrusters!",
        // Improved Engines. "Nothing happens."
        fx: [{ k: "note", text: "Nothing happens." }],
      },
    ],
  },
];
