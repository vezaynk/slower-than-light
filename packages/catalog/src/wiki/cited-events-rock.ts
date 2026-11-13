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
    dest: "Optional fight: Mantis hunter",
    slug: "mantis-ship-with-rock-body-parts",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Mantis ship with Rock body parts]]
    // > "It is unique." — [[Mantis ship with Rock body parts]]
    // > "A Mantis ship here is adorned with Rock body parts! It would be a gorier display if they had internal organs, but the message is clear enough: this is a hunter of a very specialized kind." — [[Mantis ship with Rock body parts]]
    flag: "cited:mantis-ship-with-rock-body-parts",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "Mantis ship.",
    choices: [
      {
        id: "c:mantis-ship-with-rock-body-parts:0",
        // Wiki citations:
        // > "No species deserves a Mantis hunter on their back - time to make the galaxy a little safer. Engage!" — [[Mantis ship with Rock body parts]]
        // > "Fight the Mantis ship (default rewards)." — [[Mantis ship with Rock body parts]]
        label: "Fight the Mantis ship.",
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
        label: "Nothing happens.",
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
        label: "Fight. Enemy engines offline.",
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
        label: "Fight the Mantis ship.",
        fx: [
          // "Fight the Mantis ship (default rewards), whose engines are disabled."
          { k: "fight", tier: "Mantis ship" },
        ],
      },
    ],
  },
  // "Fight a Rock ship (default rewards)." Rock fight has no choice. Arrival calls this fight. One of the eight printed intros. unique=false.
  {
    dest: "Hostile Rock ship",
    slug: "rock-fight",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight]]
    flag: "cited:rock-fight",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight:0",
        // Wiki citations:
        // > "Fight a Rock ship (default rewards)." — [[Rock fight]]
        label: "Fight the Rock ship.",
        fx: [
          // "Fight a Rock ship (default rewards)."
          { k: "fight", tier: "Rock ship" },
        ],
      },
    ],
  },
  // "Fight a Rock ship (default rewards)." Rock fight in asteroid field has no choice. Arrival calls this fight. One of the three printed intros. asteroidfield=true. unique=true.
  {
    dest: "Hostile Rock ship in asteroid field",
    slug: "rock-fight-in-asteroid-field",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight in asteroid field]]
    // > "It is unique." — [[Rock fight in asteroid field]]
    flag: "cited:rock-fight-in-asteroid-field",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight-in-asteroid-field:0",
        // Wiki citations:
        // > "Fight a Rock ship (default rewards)." — [[Rock fight in asteroid field]]
        label: "Fight the Rock ship.",
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
    dest: "Hostile Rock ship with boarders",
    slug: "rock-fight-with-boarders",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight with boarders]]
    // > "It is unique." — [[Rock fight with boarders]]
    flag: "cited:rock-fight-with-boarders",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight-with-boarders:0",
        // Wiki citations:
        // > "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders]]
        label: "Fight the Rock ship. 1-3 Rock boarders.",
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
    dest: "Hostile Rock ship with boarders in asteroid field",
    slug: "rock-fight-with-boarders-in-asteroid-field",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock fight with boarders in asteroid field]]
    // > "It is unique." — [[Rock fight with boarders in asteroid field]]
    flag: "cited:rock-fight-with-boarders-in-asteroid-field",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight-with-boarders-in-asteroid-field:0",
        // Wiki citations:
        // > "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders in asteroid field]]
        label: "Fight the Rock ship. 1-2 Rock boarders.",
        fx: [
          // "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." Locations: asteroidfield=true.
          { k: "fight", tier: "Rock ship", asteroid: true },
        ],
      },
    ],
  },
  // "Fight a Rock pirate ship (default rewards)." Rock pirates fight has no choice. Arrival calls this fight. One of the three printed intros. unique=false.
  {
    dest: "Hostile Rock pirate ship",
    slug: "rock-pirates-fight",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock pirates fight]]
    flag: "cited:rock-pirates-fight",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-pirates-fight:0",
        // Wiki citations:
        // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight]]
        label: "Fight the Rock pirate ship.",
        fx: [
          // "Fight a Rock pirate ship (default rewards)."
          { k: "fight", tier: "Rock pirate ship" },
        ],
      },
    ],
  },
  // "Fight a Rock pirate ship (default rewards)." Rock pirates fight in asteroid field has no choice. Arrival calls this fight. One of the two printed intros. asteroidfield=true. unique=true.
  {
    dest: "Hostile Rock pirate ship in asteroid field",
    slug: "rock-pirates-fight-in-asteroid-field",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock pirates fight in asteroid field]]
    // > "It is unique." — [[Rock pirates fight in asteroid field]]
    flag: "cited:rock-pirates-fight-in-asteroid-field",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-pirates-fight-in-asteroid-field:0",
        // Wiki citations:
        // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight in asteroid field]]
        label: "Fight the Rock pirate ship.",
        fx: [
          // "Fight a Rock pirate ship (default rewards)." Locations: asteroidfield=true.
          { k: "fight", tier: "Rock pirate ship", asteroid: true },
        ],
      },
    ],
  },
  // "Fight a Rock pirate ship (default rewards)." Rock pirates fight near sun has no choice. Arrival calls this fight. One of the two printed intros. redgiant=true. unique=true.
  {
    dest: "Hostile Rock pirate ship near sun",
    slug: "rock-pirates-fight-near-sun",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock pirates fight near sun]]
    // > "It is unique." — [[Rock pirates fight near sun]]
    flag: "cited:rock-pirates-fight-near-sun",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-pirates-fight-near-sun:0",
        // Wiki citations:
        // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight near sun]]
        label: "Fight the Rock pirate ship.",
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
    dest: "Boarders: Rock near sun",
    slug: "boarders-rockmen-near-sun",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Boarders: Rockmen near sun]]
    // > "It is unique." — [[Boarders: Rockmen near sun]]
    flag: "cited:boarders-rockmen-near-sun",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:boarders-rockmen-near-sun:0",
        // Wiki citations:
        // > "2-3 rock boarders beam aboard your ship." — [[Boarders: Rockmen near sun]]
        label: "2-3 Rock boarders.",
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
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "Disabled Rock ship.",
    choices: [
      {
        id: "c:disabled-rock-ship:0",
        // Wiki citations:
        // > "Strip the ship." — [[Disabled Rock ship]]
        label: "Gain low scrap and resources. 1 in 2: fight a Rock ship.",
        // Random scrap, or that scrap and a Rock ship. No odds. INFERRED: equal.
        fx: [{ k: "note", text: "Gain low scrap and resources. 1 in 2: fight a Rock ship." }],
      },
      {
        id: "c:disabled-rock-ship:1",
        // Wiki citations:
        // > "Leave it alone." — [[Disabled Rock ship]]
        label: "2 in 3: nothing happens. 1 in 3: fight a Rock ship.",
        // Nothing, or a Rock ship. The nothing result is printed twice.
        fx: [{ k: "note", text: "2 in 3: nothing happens. 1 in 3: fight a Rock ship." }],
      },
      {
        id: "c:disabled-rock-ship:2",
        // Wiki citations:
        // > "(Slug Crew) Check for lifeforms and keep a lookout for ships while looting the wreck." — [[Disabled Rock ship]]
        label: "Gain low scrap and resources.",
        // Slug crew. Random scrap. The two sentences are printed as alternatives.
        fx: [{ k: "note", text: "Gain low scrap and resources." }],
      },
    ],
  },
  {
    // Rock and Slug standoff. The debt, the demand, and the Slug captain run in filler-events.ts and quests.ts.
    dest: "Rock and Slug ships: debt",
    slug: "rock-and-slug-standoff",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock and Slug standoff]]
    // > "It is unique." — [[Rock and Slug standoff]]
    // > "You find a Slug Cruiser and Rock ship at a standoff, both with weapons armed and ready to fight. You could intervene before this gets out of hand." — [[Rock and Slug standoff]]
    flag: "cited:rock-and-slug-standoff",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "Rock ship and Slug ship, both armed.",
    choices: [
      {
        id: "c:rock-and-slug-standoff:0",
        // Wiki citations:
        // > "Hail them to see what's wrong." — [[Rock and Slug standoff]]
        label: "More options: pay a debt, demand payment, or leave.",
        // "The Slug captain explains the unpaid reactor work."
        fx: [{ k: "note", text: "More options." }],
      },
      {
        id: "c:rock-and-slug-standoff:1",
        // Wiki citations:
        // > "Leave them be." — [[Rock and Slug standoff]]
        // > "Nothing happens." — [[Rock and Slug standoff]]
        label: "Nothing happens.",
        // "Nothing happens."
        fx: [{ k: "note", text: "Nothing happens." }],
      },
    ],
  },
  {
    // Mantis ships battle for Rock freighter. The fights, the scrap, and the drone parts run in filler-events.ts.
    dest: "Optional fight: two Mantis ships and Rock freighter",
    slug: "mantis-ships-battle-for-rock-freighter",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Mantis ships battle for Rock freighter]]
    // > "It is unique." — [[Mantis ships battle for Rock freighter]]
    // > "A curious sight greets you at this beacon: a disabled Rock freighter drifts in space while two Mantis craft battle it out - presumably over who deserves the spoils." — [[Mantis ships battle for Rock freighter]]
    flag: "cited:mantis-ships-battle-for-rock-freighter",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "Two Mantis ships and a disabled Rock ship.",
    choices: [
      {
        id: "c:mantis-ships-battle-for-rock-freighter:0",
        // Wiki citations:
        // > "Wait, then attack the surviving Mantis." — [[Mantis ships battle for Rock freighter]]
        label: "1 in 2: fight a weakened Mantis ship. 1 in 2: fight a Mantis ship.",
        // Two Mantis fights. One has Weapon Control reduced. No odds. INFERRED: equal.
        fx: [
          { k: "note", text: "1 in 2: fight a weakened Mantis ship. 1 in 2: fight a Mantis ship." },
        ],
      },
      {
        id: "c:mantis-ships-battle-for-rock-freighter:1",
        // Wiki citations:
        // > "Ignore them." — [[Mantis ships battle for Rock freighter]]
        // > "Nothing happens." — [[Mantis ships battle for Rock freighter]]
        label: "Nothing happens.",
        // "Nothing happens."
        fx: [{ k: "note", text: "Nothing happens." }],
      },
      {
        id: "c:mantis-ships-battle-for-rock-freighter:2",
        // Wiki citations:
        // > "(Repair Drone) Repair the Rock ship. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
        label: "Lose 1 drone part. Gain high scrap and resources.",
        // Repair Drone. High scrap. The printed drone-part bug stays in filler-events.ts.
        fx: [{ k: "note", text: "Gain high scrap and resources." }],
      },
      {
        id: "c:mantis-ships-battle-for-rock-freighter:3",
        // Wiki citations:
        // > "(Hull Repair Drone) Repair their hull. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
        label: "Lose 1 drone part. Fight the Mantis ship.",
        // Hull Repair Drone, then a Mantis ship.
        fx: [{ k: "note", text: "Fight the Mantis ship." }],
      },
    ],
  },
  {
    // Rock live mine. The bite, the wires, and the scrap run in filler-events.ts.
    dest: "Live mine",
    slug: "rock-live-mine",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock live mine]]
    // > "It is unique." — [[Rock live mine]]
    // > "The burnt out hull of a Rock mine layer drifts by. Behind the wreck drifts a live mine; an automated drone that drills into ships' hulls before exploding. It locks onto your ship's signature and heads your way!" — [[Rock live mine]]
    flag: "cited:rock-live-mine",
    aliases: [],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "Mine approaching.",
    choices: [
      {
        id: "c:rock-live-mine:0",
        // Wiki citations:
        // > "Attempt evasive maneuvers." — [[Rock live mine]]
        label: "More options.",
        // The mine bites down. Defuse it, detonate a missile, or cut it free.
        fx: [{ k: "note", text: "More options." }],
      },
      {
        id: "c:rock-live-mine:1",
        // Wiki citations:
        // > "(Improved Engines) Reverse thrusters! (Requires level 5+ Engines)" — [[Rock live mine]]
        label: "Nothing happens.",
        // Improved Engines. "Nothing happens."
        fx: [{ k: "note", text: "Nothing happens." }],
      },
    ],
  },
];
