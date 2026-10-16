/**
 * Crystal event pages whose opening choice is one stated outcome.
 * A follow-up menu, a blue option, crew, and a random list of results are omitted.
 * "Scrap with resources" would be a tier with resources:true. None of these openings say that.
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
  // Crystal fight has no choice. Arrival calls c:crystal-fight:0.
  // One of the seven printed intros. "Fight a Crystal ship (default rewards)." unique=false.
  {
    dest: "Crystal fight",
    slug: "crystal-fight",
    // Wiki citations:
    // > "This random event occurs in Hidden Crystal Worlds." — [[Crystal fight]]
    flag: "cited:crystal-fight",
    aliases: ["Crystal fight"],
    sectors: ["Hidden Crystal Worlds"],
    body: "",
    choices: [
      {
        id: "c:crystal-fight:0",
        // Wiki citations:
        // > "Fight a Crystal ship (default rewards)." — [[Crystal fight]]
        label: "Fight a Crystal ship (default rewards)",
        fx: [
          // Fight a [[Crystal Ships|Crystal ship]]
          { k: "fight", tier: "Crystal ship" },
        ],
      },
    ],
  },
  {
    dest: "Crystal fight choice",
    slug: "crystal-fight-choice",
    // Wiki citations:
    // > "This random event occurs in Hidden Crystal Worlds." — [[Crystal fight choice]]
    // > "It is unique." — [[Crystal fight choice]]
    // > "You're greeted by an unwelcome sight - a Rebel advance ship is laying down fire on a Crystalline vessel in the distance." — [[Crystal fight choice]]
    flag: "cited:crystal-fight-choice",
    aliases: ["Crystal fight choice"],
    sectors: ["Hidden Crystal Worlds"],
    body: "You're greeted by an unwelcome sight - a Rebel advance ship is laying down fire on a Crystalline vessel in the distance.",
    choices: [
      {
        id: "c:crystal-fight-choice:0",
        // Wiki citations:
        // > "Engage the Rebel ship." — [[Crystal fight choice]]
        // > "Fight a Crystal ship (default rewards)." — [[Crystal fight choice]]
        label: "Engage the Rebel ship",
        fx: [
          // Fight a [[Crystal Ships|Crystal ship]]
          { k: "fight", tier: "Crystal ship" },
        ],
      },
      {
        id: "c:crystal-fight-choice:1",
        // Wiki citations:
        // > "Leave them alone." — [[Crystal fight choice]]
        // > "Nothing happens." — [[Crystal fight choice]]
        label: "Leave them alone",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "Pirate ship attacking Crystal",
    slug: "pirate-ship-attacking-crystal",
    // Wiki citations:
    // > "This random event occurs in Hidden Crystal Worlds." — [[Pirate ship attacking Crystal]]
    // > "A pirate ship jumps in right after you arrive at the beacon. It must have followed once the Long-Range Beacon was reactivated. It almost charges a small Crystalline transport ship, weapons armed." — [[Pirate ship attacking Crystal]]
    flag: "cited:pirate-ship-attacking-crystal",
    aliases: ["Pirate ship attacking Crystal"],
    sectors: ["Hidden Crystal Worlds"],
    body: "A pirate ship jumps in right after you arrive at the beacon. It must have followed once the Long-Range Beacon was reactivated. It almost charges a small Crystalline transport ship, weapons armed.",
    choices: [
      {
        id: "c:pirate-ship-attacking-crystal:0",
        // Wiki citations:
        // > "Attack the pirate." — [[Pirate ship attacking Crystal]]
        // > "Fight a Pirate ship." — [[Pirate ship attacking Crystal]]
        label: "Attack the pirate",
        fx: [
          // Fight a [[Enemy Ships|Pirate ship]]
          { k: "fight", tier: "Pirate ship" },
        ],
      },
      {
        id: "c:pirate-ship-attacking-crystal:1",
        // Wiki citations:
        // > "Ignore them." — [[Pirate ship attacking Crystal]]
        // > "Nothing happens." — [[Pirate ship attacking Crystal]]
        label: "Ignore them",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "Rebel fight (Crystal)",
    slug: "rebel-fight-crystal",
    // Wiki citations:
    // > "This random event occurs in Hidden Crystal Worlds." — [[Rebel fight (Crystal)]]
    // > "As soon as you arrive, a Rebel ship jumps in after you; they must be really hot on your tail." — [[Rebel fight (Crystal)]]
    flag: "cited:rebel-fight-crystal",
    aliases: ["Rebel fight (Crystal)"],
    sectors: ["Hidden Crystal Worlds"],
    body: "As soon as you arrive, a Rebel ship jumps in after you; they must be really hot on your tail.",
    choices: [
      {
        id: "c:rebel-fight-crystal:0",
        // Wiki citations:
        // > "Fight a Rebel ship (default rewards)." — [[Rebel fight (Crystal)]]
        label: "Fight a Rebel ship (default rewards)",
        fx: [
          // Fight a [[Rebel Ships|Rebel ship]] ([[Rewards#Default_rewards|default rewards]]).
          { k: "fight", tier: "Rebel ship" },
        ],
      },
    ],
  },
  {
    dest: "Boarders: Crystal",
    slug: "boarders-crystal",
    // Wiki citations:
    // > "This random event occurs in Hidden Crystal Worlds." — [[Boarders: Crystal]]
    flag: "cited:boarders-crystal",
    aliases: ["Boarders: Crystal"],
    sectors: ["Hidden Crystal Worlds"],
    body: "You arrive near a small settlement and a lone guard ship moves to intercept you. You try to contact them but they are refusing all hails. Suddenly you hear lasers ricocheting from within the ship. You've been boarded!",
    choices: [
      {
        id: "c:boarders-crystal:0",
        // Wiki citations:
        // > "2-3 crystal boarders beam aboard your ship." — [[Boarders: Crystal]]
        label: "2-3 crystal boarders beam aboard your ship.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
