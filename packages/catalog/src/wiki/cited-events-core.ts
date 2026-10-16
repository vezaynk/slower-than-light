type CoreFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  | { k: "item"; item: "weapon" | "augment" | "drone" }
  | { k: "nothing" };

type CoreChoice = { id: string; label: string; fx: CoreFx[] };

export type CoreEvent = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: CoreChoice[];
};

export const CORE_EVENTS: CoreEvent[] = [
  {
    dest: "Auto-ship attacking civilian",
    slug: "auto-ship-attacking-civilian",
    flag: "cited:auto-ship-attacking-civilian",
    aliases: ["Auto-ship attacking civilian", "Rebel Scout Pursuing Civilian Ship"],
    sectors: ["Civilian Sector", "Rebel Controlled Sector", "Rebel Stronghold"],
    body: "You come across a Rebel automated scout ship pursuing a civilian ship, weapons engaged.",
    choices: [
      {
        id: "c:auto-ship-attacking-civilian:0",
        label: "Aid the civilian ship",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
      {
        id: "c:auto-ship-attacking-civilian:1",
        label: "Stay out of it",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Auto-ship attacking outpost",
    slug: "auto-ship-attacking-outpost",
    flag: "cited:auto-ship-attacking-outpost",
    aliases: ["Auto-ship attacking outpost"],
    sectors: ["Civilian Sector", "Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You detect an automated Rebel scout attacking a small refueling outpost.",
    choices: [
      {
        id: "c:auto-ship-attacking-outpost:0",
        label: "Intervene to defend the outpost",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
      {
        id: "c:auto-ship-attacking-outpost:1",
        label: "Avoid the conflict",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Auto-ship carrying shield virus",
    slug: "auto-ship-carrying-shield-virus",
    flag: "cited:auto-ship-carrying-shield-virus",
    aliases: ["Auto-ship carrying shield virus"],
    sectors: ["Civilian Sector"],
    body: "Your arrival is greeted by numerous computer alerts. The nearby automated Rebel scout has deployed a virus and disrupted your shield system. Hopefully it won't cause further problems before you can destroy it.",
    choices: [
      {
        id: "c:auto-ship-carrying-shield-virus:0",
        label: "Continue",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
      {
        id: "c:auto-ship-carrying-shield-virus:1",
        label: "Counter the remote hacking.",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
    ],
  },
  // Auto-ship fight (Crystal) has no choice. Arrival calls c:auto-ship-fight-crystal:0.
  // "Fight an Auto-ship." unique=true.
  {
    dest: "Auto-ship fight (Crystal)",
    slug: "auto-ship-fight-crystal",
    flag: "cited:auto-ship-fight-crystal",
    aliases: ["Auto-ship fight (Crystal)", "Crystal Auto Fight"],
    sectors: ["Hidden Crystal Worlds"],
    body: "The Rebels must have sent their automated scouts to find you. One jumps in and immediately moves to attack.",
    choices: [
      {
        id: "c:auto-ship-fight-crystal:0",
        label: "Fight an Auto-ship",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
    ],
  },
  // Auto-ship fight in asteroid field has no choice. Arrival calls c:auto-ship-fight-in-asteroid-field:0.
  // "Fight an Auto-ship." asteroidfield=true. unique=false.
  {
    dest: "Auto-ship fight in asteroid field",
    slug: "auto-ship-fight-in-asteroid-field",
    flag: "cited:auto-ship-fight-in-asteroid-field",
    aliases: ["Auto-ship fight in asteroid field"],
    sectors: [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
    ],
    body: "You arrive in an asteroid belt to discover that a Rebel automated-scout has been stationed here. Prepare for a fight!",
    choices: [
      {
        id: "c:auto-ship-fight-in-asteroid-field:0",
        label: "Fight an Auto-ship",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
            asteroid: true,
          },
        ],
      },
    ],
  },
  // Auto-ship fight in nebula has no choice. Arrival calls c:auto-ship-fight-in-nebula:0.
  // One of the five printed intros. "Fight an Auto-ship." nebula=true. unique=false.
  {
    dest: "Auto-ship fight in nebula",
    slug: "auto-ship-fight-in-nebula",
    flag: "cited:auto-ship-fight-in-nebula",
    aliases: ["Auto-ship fight in nebula", "Auto-ship in nebula"],
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
        id: "c:auto-ship-fight-in-nebula:0",
        label: "Fight an Auto-ship",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
    ],
  },
  // Auto-ship fight near sun has no choice. Arrival calls c:auto-ship-fight-near-sun:0.
  // "Fight an Auto-ship." redgiant=true. unique=true.
  {
    dest: "Auto-ship fight near sun",
    slug: "auto-ship-fight-near-sun",
    flag: "cited:auto-ship-fight-near-sun",
    aliases: ["Auto-ship close to star", "Auto-ship fight near sun", "Auto-ship near sun"],
    sectors: ["Civilian Sector"],
    body: "You arrive at the beacon to find yourself dangerously close to a star. An automated Rebel ship, impervious to the heat, moves in to engage.",
    choices: [
      {
        id: "c:auto-ship-fight-near-sun:0",
        label: "Fight an Auto-ship",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Auto-ship near radar station",
    slug: "auto-ship-near-radar-station",
    flag: "cited:auto-ship-near-radar-station",
    aliases: ["Auto-ship near radar station"],
    sectors: ["Rebel Controlled Sector", "Rebel Stronghold"],
    body: "A Rebel automated ship sits dormant near a Rebel forward radar station.",
    choices: [
      {
        id: "c:auto-ship-near-radar-station:0",
        label: "Approach the station",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
      {
        id: "c:auto-ship-near-radar-station:1",
        label: "Keep your distance and wait for the FTL to charge",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Auto-ship near sensor station",
    slug: "auto-ship-near-sensor-station",
    flag: "cited:auto-ship-near-sensor-station",
    aliases: [
      "Auto-ship near sensor station",
      "Rebel Auto-ship near sensor station",
      "Rebel Automated Ship Near Sensor Station",
    ],
    sectors: ["Civilian Sector", "Rebel Controlled Sector", "Rebel Stronghold"],
    body: "You detect a Rebel automated ship nearby. It does not engage and seems to be patrolling around a long-range sensor station.",
    choices: [
      {
        id: "c:auto-ship-near-sensor-station:0",
        label: "Attack the automated ship to get to the sensor station",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
      {
        id: "c:auto-ship-near-sensor-station:1",
        label: "Avoid provoking the ship",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Auto-ship near storage station in nebula",
    slug: "auto-ship-near-storage-station-in-nebula",
    flag: "cited:auto-ship-near-storage-station-in-nebula",
    aliases: ["Auto-ship near small space-station", "Auto-ship near storage station in nebula"],
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
    body: "An advance <!-- [sic] -->rebel automated ship remains stationed near a small Rebel space-station. However, without functioning sensors it is impossible to tell what is inside.",
    choices: [
      {
        id: "c:auto-ship-near-storage-station-in-nebula:0",
        label: "Attack the automated ship to get to the station",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
      {
        id: "c:auto-ship-near-storage-station-in-nebula:1",
        label: "Avoid provoking the ship",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Auto-ship warning",
    slug: "auto-ship-warning",
    flag: "cited:auto-ship-warning",
    aliases: ["Auto-ship warning", "Rebel Auto-Ship Warning"],
    sectors: [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
    ],
    body: "",
    choices: [
      {
        id: "c:auto-ship-warning:0",
        label: "Fight an Auto-ship that is running away",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Boarders: Humans in plasma storm",
    slug: "boarders-humans-in-plasma-storm",
    flag: "cited:boarders-humans-in-plasma-storm",
    aliases: [
      "Boarders in Plasma Storm",
      "Boarders: Humans in plasma storm",
      "Human boarders in plasma storm",
    ],
    sectors: ["Civilian Sector", "Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You find two heavily damaged ships floating nearby, the remains of a battle. You begin to harvest some usable debris when you hear the sounds of someone beaming aboard followed by the shouts of a boarding party.",
    choices: [
      {
        id: "c:boarders-humans-in-plasma-storm:0",
        label: "You receive medium scrap with resources",
        fx: [
          {
            k: "tier",
            tier: "medium",
            resources: true,
          },
        ],
      },
    ],
  },
  {
    dest: "Crystal fight with surrender offer (Human crew)",
    slug: "crystal-fight-with-surrender-offer-human-crew",
    flag: "cited:crystal-fight-with-surrender-offer-human-crew",
    aliases: ["Crystal fight with surrender offer (Human crew)"],
    sectors: ["Hidden Crystal Worlds"],
    body: "Crystal shards fly past your ship as soon as you jump. You scan to find the assailant and discover a Crystalline ship carrying a number of humans in it's cargo bay. It must be hunting the intruding ships!",
    choices: [
      {
        id: "c:crystal-fight-with-surrender-offer-human-crew:0",
        label: "Fight a Crystal ship",
        fx: [
          {
            k: "fight",
            tier: "Crystal ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Crystal fight with surrender offer (hull repairs)",
    slug: "crystal-fight-with-surrender-offer-hull-repairs",
    flag: "cited:crystal-fight-with-surrender-offer-hull-repairs",
    aliases: [
      "Crystal fight with surrender offer (hull repairs)",
      "Crystal ship convoy fight",
      "Large Convoy",
    ],
    sectors: ["Hidden Crystal Worlds"],
    body: "A large convoy of lumbering civilian ships appears to be passing through this region. You show no hostile intentions, but they are taking no chances, immediately sending their escort to attack!",
    choices: [
      {
        id: "c:crystal-fight-with-surrender-offer-hull-repairs:0",
        label: "Fight a Crystal ship",
        fx: [
          {
            k: "fight",
            tier: "Crystal ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Crystal ship attacking Federation loyalists",
    slug: "crystal-ship-attacking-federation-loyalists",
    flag: "cited:crystal-ship-attacking-federation-loyalists",
    aliases: [
      "Crystal attacking Federation loyalists",
      "Crystal ship attacking Federation loyalists",
    ],
    sectors: ["Hidden Crystal Worlds"],
    body: "There appears to be a fight going on nearby. A Crystalline border guard is chasing a small Federation ship!",
    choices: [
      {
        id: "c:crystal-ship-attacking-federation-loyalists:0",
        label: "Save the Federation ship",
        fx: [
          {
            k: "fight",
            tier: "Crystal ship",
          },
        ],
      },
      {
        id: "c:crystal-ship-attacking-federation-loyalists:1",
        label: "Prepare to leave",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Crystalline ship messaging about Rebels",
    slug: "crystalline-ship-messaging-about-rebels",
    flag: "cited:crystalline-ship-messaging-about-rebels",
    aliases: ["Crystalline Ship Messaging About Rebels", "Crystalline ship messaging about Rebels"],
    sectors: ["Hidden Crystal Worlds"],
    body: "The moment you arrive you notice a Crystalline ship in the vicinity keeping its distance. They message you, \"The 'Rebels' that are trying to hunt YOU down are creating havoc everywhere they go.\" \"To minimize their impact on our people, we would like you to give them your flight path out of our sector. We would like to remain civil and are willing to pay you in 'scrap' for the increased danger it poses.",
    choices: [
      {
        id: "c:crystalline-ship-messaging-about-rebels:0",
        label: "Give them your flight plans",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:crystalline-ship-messaging-about-rebels:1",
        label: "Accept the scrap but give them false flight plans",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:crystalline-ship-messaging-about-rebels:2",
        label: "Accept the scrap but give them falsified flight plans.",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:crystalline-ship-messaging-about-rebels:3",
        label: "Refuse",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Deactivated Auto-ship",
    slug: "deactivated-auto-ship",
    flag: "cited:deactivated-auto-ship",
    aliases: ["Deactivated Auto-ship", "Deactivated Rebel Automated Scout"],
    sectors: [
      "Abandoned Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "You find a Rebel automated scout floating near this beacon. Despite its pristine condition, it appears to be de-activated.",
    choices: [
      {
        id: "c:deactivated-auto-ship:0",
        label: "Don't risk activating it, and just strip the ship for any useful scrap",
        fx: [
          {
            k: "tier",
            tier: "low",
          },
        ],
      },
    ],
  },
  {
    dest: "Engi distress Rebel fight",
    slug: "engi-distress-rebel-fight",
    flag: "cited:engi-distress-rebel-fight",
    aliases: [
      "Engi distress",
      "Engi distress Rebel fight",
      "Rebel Attacking Engi",
      "Rebel attacking poorly equipped Engi",
    ],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "The distress signal originates at a small Engi ship under attack by a rebel fighter - but when they see Federation markings they turn to attack!",
    choices: [
      {
        id: "c:engi-distress-rebel-fight:0",
        label: "Fight the Rebel Ship",
        fx: [
          {
            k: "fight",
            tier: "Rebel Ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Engi smashed ships",
    slug: "engi-smashed-ships",
    flag: "cited:engi-smashed-ships",
    aliases: ["Engi smashed ships", "Two Smashed Ships"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "What appeared to be a single damaged ship is in fact two ships that have smashed into each other... there is a flurry of comm signals and damage, and it's hard to determine what occurred. The vessels appear to be... Engi? They look locked together by the impact and can't free themselves.",
    choices: [
      {
        id: "c:engi-smashed-ships:0",
        label: "Attempt to help the ships by prying them apart",
        fx: [
          {
            k: "fight",
            tier: "Engi ship",
          },
        ],
      },
      {
        id: "c:engi-smashed-ships:1",
        label: "Ignore the damaged vessels",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:engi-smashed-ships:2",
        label: "Have your Engi crewmember hail the vessel and assess the damage.",
        fx: [
          {
            k: "note",
            text: "Random resources with some scrap.",
          },
        ],
      },
    ],
  },
  {
    dest: "Escort civilians FTL haywire",
    slug: "escort-civilians-ftl-haywire",
    flag: "cited:escort-civilians-ftl-haywire",
    aliases: ["Escort FTL haywire civilian ship", "Escort civilians FTL haywire"],
    sectors: [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
    ],
    body: "",
    choices: [
      {
        id: "c:escort-civilians-ftl-haywire:0",
        label: "Lead them to their destination",
        fx: [
          {
            k: "tier",
            tier: "low",
          },
          // @agent:quests. The page's quest marker is added after this choice (wiki/quests.ts questAfterCited).
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:escort-civilians-ftl-haywire:1",
        label: "Decline",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Federation deserters",
    slug: "federation-deserters",
    flag: "cited:federation-deserters",
    aliases: ["Federation Deserters", "Federation deserters"],
    sectors: ["Hidden Crystal Worlds"],
    body: "For a moment you assume it's a glitch, but no... you've found a Federation military ship! They hail you and, after some probing, reveal that they deserted the Federation fleet before stumbling into this sector while seeking refuge.",
    choices: [
      {
        id: "c:federation-deserters:2",
        label: "Offer supplies.",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 15,
            hi: 25,
          },
          {
            k: "res",
            id: "fuel",
            sign: -1,
            lo: 1,
            hi: 3,
          },
        ],
      },
      {
        id: "c:federation-deserters:0",
        label: "Attack the traitors",
        fx: [
          {
            k: "fight",
            tier: "Federation ship",
          },
        ],
      },
      {
        id: "c:federation-deserters:1",
        label: "Leave them be",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Free drone schematic",
    slug: "free-drone-schematic",
    flag: "cited:free-drone-schematic",
    aliases: ["Free Drone Schematic", "Free drone schematic"],
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
    body: "",
    choices: [
      {
        id: "c:free-drone-schematic:0",
        label: "You receive a drone schematic with low scrap",
        fx: [
          {
            k: "tier",
            tier: "low",
          },
          // Rewards, "Drone": "A random drone schematic & T scrap."
          {
            k: "item",
            item: "drone",
          },
        ],
      },
    ],
  },
  {
    dest: "Free scrap with resources",
    slug: "free-scrap-with-resources",
    flag: "cited:free-scrap-with-resources",
    aliases: ["Free scrap with resources"],
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
        id: "c:free-scrap-with-resources:0",
        label: "You receive medium scrap with resources",
        fx: [
          {
            k: "tier",
            tier: "medium",
            resources: true,
          },
        ],
      },
    ],
  },
  {
    dest: "Free scrap with resources (Lanius)",
    slug: "free-scrap-with-resources-lanius",
    flag: "cited:free-scrap-with-resources-lanius",
    aliases: ["Free scrap with resources (Lanius)", "Lanius free stuff"],
    sectors: ["Abandoned Sector"],
    body: "You stumble across a badly damaged Lanius craft. It jumps away as soon as it sees you. Looking around the area, you discover a number of destroyed Rebel automated ships. It must have been quite the fight. You scrap what remains.",
    choices: [
      {
        id: "c:free-scrap-with-resources-lanius:0",
        label: "You receive high scrap with resources",
        fx: [
          {
            k: "tier",
            tier: "high",
            resources: true,
          },
        ],
      },
    ],
  },
  {
    dest: "Lanius fight with friendly ASB support",
    slug: "lanius-fight-with-friendly-asb-support",
    flag: "cited:lanius-fight-with-friendly-asb-support",
    aliases: ["Anti-Ship Battery Firing on Lanius Ships", "Lanius fight with friendly ASB support"],
    sectors: ["Abandoned Sector"],
    body: "After the fight",
    choices: [
      {
        id: "c:lanius-fight-with-friendly-asb-support:0",
        label: "Fight a Lanius ship with an Anti-Ship Battery on your side",
        fx: [
          {
            k: "fight",
            tier: "Lanius ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Lanius ship absorbing automated scout",
    slug: "lanius-ship-absorbing-automated-scout",
    flag: "cited:lanius-ship-absorbing-automated-scout",
    aliases: ["Lanius absorbing automated scout", "Lanius ship absorbing automated scout"],
    sectors: ["Abandoned Sector"],
    body: "You come across a Lanius ship in the process of absorbing a Rebel automated scout. If you scare off the Lanius you could probably make use of it.",
    choices: [
      {
        id: "c:lanius-ship-absorbing-automated-scout:0",
        label: "Fight the ship",
        fx: [
          {
            k: "fight",
            tier: "Lanius ship",
          },
        ],
      },
      {
        id: "c:lanius-ship-absorbing-automated-scout:1",
        label: "Leave them alone",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Lanius ship attacking Mantis",
    slug: "lanius-ship-attacking-mantis",
    flag: "cited:lanius-ship-attacking-mantis",
    aliases: ["Lanius ship attacking Mantis", "Ship Being Mined by Lanius"],
    sectors: ["Abandoned Sector"],
    body: "The Mantis ship in this system looks like its distress beacon is malfunctioning... likely due to the Lanius ship mining their hull and sub-systems! It doesn't look like the Mantis ship will last much longer.",
    choices: [
      {
        id: "c:lanius-ship-attacking-mantis:0",
        label: "Attack the Lanius ship",
        fx: [
          {
            k: "fight",
            tier: "Lanius ship",
          },
        ],
      },
      {
        id: "c:lanius-ship-attacking-mantis:1",
        label: "Leave the Mantis to their fate",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Lanius ship attacking Rock",
    slug: "lanius-ship-attacking-rock",
    flag: "cited:lanius-ship-attacking-rock",
    aliases: ["Lanius attacking Rock", "Lanius ship attacking Rock"],
    sectors: ["Abandoned Sector"],
    body: "A distress beacon pulses weakly from a Rockman ship in this system... their hull (and their crew) are being mined by the Lanius, lasers and weapons tearing through the ship!",
    choices: [
      {
        id: "c:lanius-ship-attacking-rock:0",
        label: "Attack the Lanius ship",
        fx: [
          {
            k: "fight",
            tier: "Lanius ship",
          },
        ],
      },
      {
        id: "c:lanius-ship-attacking-rock:1",
        label: "Leave the Rockmen to their fate",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Lanius ship attacking civilian",
    slug: "lanius-ship-attacking-civilian",
    flag: "cited:lanius-ship-attacking-civilian",
    aliases: ["Lanius Attacking Civilian", "Lanius ship attacking civilian"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-ship-attacking-civilian:0",
        label: "Attack the Lanius ship",
        fx: [
          {
            k: "fight",
            tier: "Lanius ship",
          },
        ],
      },
      {
        id: "c:lanius-ship-attacking-civilian:1",
        label: "Avoid the conflict",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Lanius ship attacking civilian distress",
    slug: "lanius-ship-attacking-civilian-distress",
    flag: "cited:lanius-ship-attacking-civilian-distress",
    aliases: ["Lanius attacking civilian distress", "Lanius ship attacking civilian distress"],
    sectors: ["Abandoned Sector"],
    body: "You immediately do a short-range scan after arriving at the beacon. It appears to be coming from a small civilian vessel under fire from a Lanius ship. Not all Lanius are content with simply scavenging the wrecks of previous battles.",
    choices: [
      {
        id: "c:lanius-ship-attacking-civilian-distress:0",
        label: "Fight the Lanius ship",
        fx: [
          {
            k: "fight",
            tier: "Lanius ship",
          },
        ],
      },
      {
        id: "c:lanius-ship-attacking-civilian-distress:1",
        label: "Avoid the conflict",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:lanius-ship-attacking-civilian-distress:2",
        label: "Have your crew admonish their captain.",
        fx: [
          {
            k: "note",
            text: "A Lanius crewmember starts a fight or powers the ship down.",
          },
        ],
      },
    ],
  },
  {
    dest: "Lanius ship in rich debris field",
    slug: "lanius-ship-in-rich-debris-field",
    flag: "cited:lanius-ship-in-rich-debris-field",
    aliases: ["Lanius ship in rich debris field"],
    sectors: ["Abandoned Sector"],
    body: "Your scans have picked up a Lanius vessel in this system: it appears to be navigating a rich debris field, harvesting the minerals.",
    choices: [
      {
        id: "c:lanius-ship-in-rich-debris-field:0",
        label: "Attempt to harvest some for yourself",
        fx: [
          {
            k: "fight",
            tier: "Lanius ship",
          },
        ],
      },
      {
        id: "c:lanius-ship-in-rich-debris-field:1",
        label: "Attack the vessel",
        fx: [
          {
            k: "fight",
            tier: "Lanius ship",
          },
        ],
      },
      {
        id: "c:lanius-ship-in-rich-debris-field:2",
        label: "Ignore the vessel",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:lanius-ship-in-rich-debris-field:3",
        label: "Engage the auto-pilot and safely harvest the debris.",
        fx: [
          {
            k: "note",
            text: "Improved Piloting at level 2 pays medium scrap with resources.",
          },
        ],
      },
      {
        id: "c:lanius-ship-in-rich-debris-field:4",
        label: "Engage the auto-pilot and safely harvest the debris.",
        fx: [
          {
            k: "note",
            text: "Advanced Piloting at level 3 pays high scrap with resources.",
          },
        ],
      },
    ],
  },
  {
    dest: "Lanius ship salvager",
    slug: "lanius-ship-salvager",
    flag: "cited:lanius-ship-salvager",
    aliases: ["Lanius Salvaging Small Asteroid Belt", "Lanius ship salvager"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-ship-salvager:0",
        label: "Attack the ship",
        fx: [
          {
            k: "fight",
            tier: "Lanius ship",
          },
        ],
      },
      {
        id: "c:lanius-ship-salvager:1",
        label: "Leave them alone",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:lanius-ship-salvager:2",
        label: "Request some scrap.",
        fx: [
          {
            k: "note",
            text: "A Lanius crewmember may receive medium scrap only, a scoff, or nothing.",
          },
        ],
      },
    ],
  },
  {
    dest: "Lanius trader",
    slug: "lanius-trader",
    flag: "cited:lanius-trader",
    aliases: ["Lanius trader"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-trader:0",
        label: "You lose 3-7 fuel and receive 15-30 scrap",
        fx: [
          {
            k: "res",
            id: "fuel",
            sign: -1,
            lo: 3,
            hi: 7,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 15,
            hi: 30,
          },
        ],
      },
      {
        id: "c:lanius-trader:1",
        label: "You lose 3-7 missiles and receive 20-40 scrap",
        fx: [
          {
            k: "res",
            id: "missiles",
            sign: -1,
            lo: 3,
            hi: 7,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 20,
            hi: 40,
          },
        ],
      },
      {
        id: "c:lanius-trader:2",
        label: "You lose 3-7 drone parts and receive 20-40 scrap",
        fx: [
          {
            k: "res",
            id: "parts",
            sign: -1,
            lo: 3,
            hi: 7,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 20,
            hi: 40,
          },
        ],
      },
      {
        id: "c:lanius-trader:3",
        label: "Decline",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Lanius trader with translator",
    slug: "lanius-trader-with-translator",
    flag: "cited:lanius-trader-with-translator",
    aliases: [
      "Lanius Merchant",
      "Lanius Merchant with Improved Translator",
      "Lanius trader with translator",
    ],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-trader-with-translator:0",
        label: "You lose 3-7 fuel and receive 15-30 scrap",
        fx: [
          {
            k: "res",
            id: "fuel",
            sign: -1,
            lo: 3,
            hi: 7,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 15,
            hi: 30,
          },
        ],
      },
      {
        id: "c:lanius-trader-with-translator:1",
        label: "You lose 3-7 missiles and receive 20-40 scrap",
        fx: [
          {
            k: "res",
            id: "missiles",
            sign: -1,
            lo: 3,
            hi: 7,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 20,
            hi: 40,
          },
        ],
      },
      {
        id: "c:lanius-trader-with-translator:2",
        label: "You lose 3-7 drone parts and receive 20-40 scrap",
        fx: [
          {
            k: "res",
            id: "parts",
            sign: -1,
            lo: 3,
            hi: 7,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 20,
            hi: 40,
          },
        ],
      },
      {
        id: "c:lanius-trader-with-translator:3",
        label: "Decline",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Legendary thief KazaaakplethKilik",
    slug: "legendary-thief-kazaaakplethkilik",
    flag: "cited:legendary-thief-kazaaakplethkilik",
    aliases: [
      "KazaaakplethKilik",
      "Legendary Thief KazaaakplethKilik Random Event",
      "Legendary thief KazaaakplethKilik",
    ],
    sectors: ["Mantis Homeworlds"],
    body: "You cross paths with a Mantis ship that looks to have had dozens of layers of armor-plating added over what must have been a hundred year career. Its captain is legendary thief KazaaakplethKilik. Your crew look frightened.",
    choices: [
      {
        id: "c:legendary-thief-kazaaakplethkilik:0",
        label: "Prepare to fight",
        fx: [
          {
            k: "fight",
            tier: "Mantis ship",
          },
        ],
      },
      {
        id: "c:legendary-thief-kazaaakplethkilik:1",
        label: "Attempt to hail him.",
        fx: [
          {
            k: "fight",
            tier: "Mantis ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Mantis outcasts",
    slug: "mantis-outcasts",
    flag: "cited:mantis-outcasts",
    aliases: ["Mantis outcasts"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "The Mantis outcasts sometimes make the mistake of taking the Zoltan for easy game. A scout moves in to attack while a boarding party beams aboard from a nearby transport!",
    choices: [
      {
        id: "c:mantis-outcasts:0",
        label:
          "2-3 mantis boarders beam aboard your ship and you fight a Mantis Ship (default rewards)",
        fx: [
          {
            k: "fight",
            tier: "Mantis Ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Mantis ship attacking Crystal",
    slug: "mantis-ship-attacking-crystal",
    flag: "cited:mantis-ship-attacking-crystal",
    aliases: ["Mantis ship attacking Crystal"],
    sectors: ["Hidden Crystal Worlds"],
    body: "You discover a number of civilian ships fleeing the area. Shots are fired and you find the assailant; a Mantis ship is attacking one of the smaller ships!",
    choices: [
      {
        id: "c:mantis-ship-attacking-crystal:0",
        label: "Attack the Mantis",
        fx: [
          {
            k: "fight",
            tier: "Mantis Ship",
          },
        ],
      },
      {
        id: "c:mantis-ship-attacking-crystal:1",
        label: "Ignore them",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Mantis war camp",
    slug: "mantis-war-camp",
    flag: "cited:mantis-war-camp",
    aliases: ["Mantis War Camp", "Mantis war camp"],
    sectors: ["Civilian Sector", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: 'You receive a request, "All of our military ships have been destroyed or damaged during the rebellion. However, there have been reports of a Mantis war camp only a few jumps from us. Can you help?"',
    choices: [
      {
        id: "c:mantis-war-camp:0",
        label: "Pledge to do what you can",
        fx: [
          {
            k: "tier",
            tier: "medium",
          },
          // @agent:quests. The page's quest marker is added after this choice (wiki/quests.ts questAfterCited).
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:mantis-war-camp:1",
        label: "Apologize and decline",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "No fuel: Auto-ship warning",
    slug: "no-fuel-auto-ship-warning",
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Auto-ship warning]]
    // > "A ship responding to your distress moves in. Unfortunately it turns out to be an automated Rebel scout. It immediately reverses thrust after scanning your ship." — [[No fuel: Auto-ship warning]]
    flag: "cited:no-fuel-auto-ship-warning",
    aliases: ["No fuel: Auto-ship fight", "No fuel: Auto-ship warning"],
    sectors: [],
    body: "A ship responding to your distress moves in. Unfortunately it turns out to be an automated Rebel scout. It immediately reverses thrust after scanning your ship.",
    choices: [
      {
        id: "c:no-fuel-auto-ship-warning:0",
        // Wiki citations:
        // > "Fight an Auto-ship that is running away." — [[No fuel: Auto-ship warning]]
        label: "Fight an Auto-ship that is running away",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
    ],
  },
  {
    dest: "No fuel: Engi ship repair",
    slug: "no-fuel-engi-ship-repair",
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Engi ship repair]]
    flag: "cited:no-fuel-engi-ship-repair",
    aliases: ["Fuel Engi Ship Repair", "No fuel: Engi ship repair"],
    sectors: [],
    body: "",
    choices: [
      {
        id: "c:no-fuel-engi-ship-repair:0",
        // Wiki citations:
        // > "Make the trade." — [[No fuel: Engi ship repair]]
        // > "You lose Scrap lost: 10-20 and receive Fuel gained: 4-6." — [[No fuel: Engi ship repair]]
        label: "Make the trade",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 10,
            hi: 20,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 4,
            hi: 6,
          },
        ],
      },
      {
        id: "c:no-fuel-engi-ship-repair:1",
        // Wiki citations:
        // > "Ignore them." — [[No fuel: Engi ship repair]]
        // > "Nothing happens." — [[No fuel: Engi ship repair]]
        label: "Ignore them",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:no-fuel-engi-ship-repair:2",
        // Wiki citations:
        // > "(Hull Repair Drone) Offer to help repair their hull. [ Drone parts lost: 1 ]" — [[No fuel: Engi ship repair]]
        // > "They happily accept your offer for help. Once the drone does its work they transfer over some fuel for your trouble." — [[No fuel: Engi ship repair]]
        // > "You receive Fuel gained: 4-6." — [[No fuel: Engi ship repair]]
        label: "Offer to help repair their hull.",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "No fuel: Mantis fight",
    slug: "no-fuel-mantis-fight",
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Mantis fight]]
    flag: "cited:no-fuel-mantis-fight",
    aliases: ["Mantis Fuel Attack", "No fuel: Mantis fight"],
    sectors: [],
    body: "",
    choices: [
      {
        id: "c:no-fuel-mantis-fight:0",
        // Wiki citations:
        // > "Fight a Mantis ship that is running away. (80 seconds escape countdown timer if not interrupted)" — [[No fuel: Mantis fight]]
        label: "Fight a Mantis ship that is running away",
        fx: [
          {
            k: "fight",
            tier: "Mantis ship",
          },
        ],
      },
    ],
  },
  {
    dest: "No fuel: Rebel fight",
    slug: "no-fuel-rebel-fight",
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Rebel fight]]
    flag: "cited:no-fuel-rebel-fight",
    aliases: ["No fuel: Rebel assistant hails", "No fuel: Rebel fight"],
    sectors: [],
    body: "",
    choices: [
      {
        id: "c:no-fuel-rebel-fight:0",
        // Wiki citations:
        // > "Fight a Rebel ship that is running away. (80 seconds escape countdown timer if not interrupted)" — [[No fuel: Rebel fight]]
        label: "Fight a Rebel ship that is running away",
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
    ],
  },
  {
    dest: "No fuel: Slug fuel depot",
    slug: "no-fuel-slug-fuel-depot",
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Slug fuel depot]]
    // > "A mobile Slugman fuel depot enters scanning range. \"My prices are fair, but I ask one thing - do not insult me with negotiation!\" You check out his price list." — [[No fuel: Slug fuel depot]]
    flag: "cited:no-fuel-slug-fuel-depot",
    aliases: ["No fuel: Slug fuel depot", "Slugman Fuel Depot"],
    sectors: [],
    body: 'A mobile Slugman fuel depot enters scanning range. "My prices are fair, but I ask one thing - do not insult me with negotiation!" You check out his price list.',
    choices: [
      {
        id: "c:no-fuel-slug-fuel-depot:0",
        // Wiki citations:
        // > "Buy 5 fuel for 50 scrap." — [[No fuel: Slug fuel depot]]
        // > "You lose Scrap lost: 50 and receive Fuel gained: 5." — [[No fuel: Slug fuel depot]]
        label: "Buy 5 fuel for 50 scrap",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 50,
            hi: 50,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 5,
            hi: 5,
          },
        ],
      },
      {
        id: "c:no-fuel-slug-fuel-depot:1",
        // Wiki citations:
        // > "Buy 10 fuel for 95 scrap. (BEST DEAL!)" — [[No fuel: Slug fuel depot]]
        // > "You lose Scrap lost: 95 and receive Fuel gained: 10." — [[No fuel: Slug fuel depot]]
        label: "Buy 10 fuel for 95 scrap. (BEST DEAL!)",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 95,
            hi: 95,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 10,
            hi: 10,
          },
        ],
      },
      {
        id: "c:no-fuel-slug-fuel-depot:2",
        // Wiki citations:
        // > "Negotiate." — [[No fuel: Slug fuel depot]]
        // > "Fight a Slug ship that is running away. (80 seconds escape countdown timer if not interrupted)(no surrender offers)" — [[No fuel: Slug fuel depot]]
        label: "Negotiate",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
    ],
  },
  {
    dest: "No fuel: automated refueling ship",
    slug: "no-fuel-automated-refueling-ship",
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: automated refueling ship]]
    flag: "cited:no-fuel-automated-refueling-ship",
    aliases: ["Automated Re-Fueling Ship", "No fuel: automated refueling ship"],
    sectors: [],
    body: "",
    choices: [
      {
        id: "c:no-fuel-automated-refueling-ship:0",
        // Wiki citations:
        // > "Request emergency fuel reserves." — [[No fuel: automated refueling ship]]
        // > "You receive low fuel." — [[No fuel: automated refueling ship]]
        label: "Request emergency fuel reserves",
        fx: [
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 1,
            hi: 3,
          },
        ],
      },
      {
        id: "c:no-fuel-automated-refueling-ship:1",
        // Wiki citations:
        // > "Buy 5 fuel for 20 scrap. [ Scrap lost: 20 ]" — [[No fuel: automated refueling ship]]
        // > "You receive Fuel gained: 5." — [[No fuel: automated refueling ship]]
        label: "Buy 5 fuel for 20 scrap",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 20,
            hi: 20,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 5,
            hi: 5,
          },
        ],
      },
      {
        id: "c:no-fuel-automated-refueling-ship:2",
        // Wiki citations:
        // > "Buy 2 fuel for 8 scrap. [ Scrap lost: 8 ]" — [[No fuel: automated refueling ship]]
        // > "You receive Fuel gained: 2." — [[No fuel: automated refueling ship]]
        label: "Buy 2 fuel for 8 scrap",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 8,
            hi: 8,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 2,
            hi: 2,
          },
        ],
      },
      {
        id: "c:no-fuel-automated-refueling-ship:3",
        // Wiki citations:
        // > "Attack the automated ship." — [[No fuel: automated refueling ship]]
        // > "Fight an Auto-ship that is running away. (80 seconds escape countdown timer if not interrupted)" — [[No fuel: automated refueling ship]]
        label: "Attack the automated ship",
        fx: [
          {
            k: "fight",
            tier: "Auto-ship",
          },
        ],
      },
    ],
  },
  {
    dest: "No fuel: explore the system",
    slug: "no-fuel-explore-the-system",
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: explore the system]]
    // > "Although your lack of fuel cells prevents your ship from jumping, you can still use your impulse engines. Will you spend some time exploring the nearby system?" — [[No fuel: explore the system]]
    flag: "cited:no-fuel-explore-the-system",
    aliases: ["Explore the System", "No fuel: explore the system"],
    sectors: [],
    body: "Although your lack of fuel cells prevents your ship from jumping, you can still use your impulse engines. Will you spend some time exploring the nearby system?",
    choices: [
      {
        id: "c:no-fuel-explore-the-system:0",
        // Wiki citations:
        // > "Trade 20 scrap for 5 fuel. [ Scrap lost: 20 ]" — [[No fuel: explore the system]]
        // > "You receive Fuel gained: 5." — [[No fuel: explore the system]]
        label: "Trade 20 scrap for 5 fuel",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 20,
            hi: 20,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 5,
            hi: 5,
          },
        ],
      },
      {
        id: "c:no-fuel-explore-the-system:1",
        // Wiki citations:
        // > "Trade 10 scrap for 2 fuel. [ Scrap lost: 10 ]" — [[No fuel: explore the system]]
        // > "You receive Fuel gained: 2." — [[No fuel: explore the system]]
        label: "Trade 10 scrap for 2 fuel",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 10,
            hi: 10,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 2,
            hi: 2,
          },
        ],
      },
      {
        id: "c:no-fuel-explore-the-system:2",
        // Wiki citations:
        // > "Trade 5 scrap for 1 fuel. [ Scrap lost: 5 ]" — [[No fuel: explore the system]]
        // > "You receive Fuel gained: 1." — [[No fuel: explore the system]]
        label: "Trade 5 scrap for 1 fuel",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 5,
            hi: 5,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 1,
            hi: 1,
          },
        ],
      },
      {
        id: "c:no-fuel-explore-the-system:3",
        // Wiki citations:
        // > "Stay near the beacon." — [[No fuel: explore the system]]
        // > "Nothing happens." — [[No fuel: explore the system]]
        label: "Stay near the beacon",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Pirate briber",
    slug: "pirate-briber",
    flag: "cited:pirate-briber",
    aliases: ["Pirate briber"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:pirate-briber:0",
        label: "Accept their bribe",
        fx: [
          {
            k: "tier",
            tier: "low",
            resources: true,
          },
        ],
      },
      {
        id: "c:pirate-briber:1",
        label: "Try to be a hero. Attack the pirate",
        fx: [
          {
            k: "fight",
            tier: "Pirate ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Pirate ship attacking civilian (Lanius)",
    slug: "pirate-ship-attacking-civilian-lanius",
    flag: "cited:pirate-ship-attacking-civilian-lanius",
    aliases: ["Pirate ship attacking civilian (Lanius)"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:pirate-ship-attacking-civilian-lanius:0",
        label: "Attack the pirate",
        fx: [
          {
            k: "fight",
            tier: "Pirate ship",
          },
        ],
      },
      {
        id: "c:pirate-ship-attacking-civilian-lanius:1",
        label: "Avoid the conflict",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Pirate ship attacking civilian distress",
    slug: "pirate-ship-attacking-civilian-distress",
    flag: "cited:pirate-ship-attacking-civilian-distress",
    aliases: [
      "Civilian ship chased by Pirate (distress)",
      "Pirate ship attacking civilian distress",
    ],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
    ],
    body: "The distress beacon is coming from a civilian ship. It appears it is being chased by a pirate.",
    choices: [
      {
        id: "c:pirate-ship-attacking-civilian-distress:0",
        label: "Aid the civilian ship",
        fx: [
          {
            k: "fight",
            tier: "Pirate ship",
          },
        ],
      },
      {
        id: "c:pirate-ship-attacking-civilian-distress:1",
        label: "Stay out of it",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Pirate ship selling drones",
    slug: "pirate-ship-selling-drones",
    flag: "cited:pirate-ship-selling-drones",
    aliases: ["Drones salesman", "Pirate ship selling drones"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "A ship with conspicuous pirate markings is orbiting a nearby moon, broadcasting a simple message claiming to have equipment available for sale.",
    choices: [
      {
        id: "c:pirate-ship-selling-drones:0",
        label: "Buy some Drone parts",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 25,
            hi: 25,
          },
          {
            k: "res",
            id: "parts",
            sign: 1,
            lo: 5,
            hi: 5,
          },
        ],
      },
      {
        id: "c:pirate-ship-selling-drones:1",
        label: "Attack him before he can attack!",
        fx: [
          {
            k: "fight",
            tier: "Pirate ship",
          },
        ],
      },
      {
        id: "c:pirate-ship-selling-drones:2",
        label: "Quickly prepare to jump away",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Pirate ship selling weapon",
    slug: "pirate-ship-selling-weapon",
    flag: "cited:pirate-ship-selling-weapon",
    aliases: ["Black Market Weapon Trader", "Pirate arms dealer", "Pirate ship selling weapon"],
    sectors: ["Civilian Sector", "Slug Controlled Nebula", "Slug Home Nebula", "Uncharted Nebula"],
    body: "A black market weapons trader spins you a tale of the dangers of the nebula before pushing his wares.",
    choices: [
      {
        id: "c:pirate-ship-selling-weapon:0",
        label: "Attack the ship",
        fx: [
          {
            k: "fight",
            tier: "Pirate ship",
          },
        ],
      },
      {
        id: "c:pirate-ship-selling-weapon:1",
        label: "Ignore the ship",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:pirate-ship-selling-weapon:2",
        label: "Convince him to make it a better deal.",
        fx: [
          {
            k: "note",
            text: "A declined deal, or a Pirate ship.",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel checkpoint",
    slug: "rebel-checkpoint",
    flag: "cited:rebel-checkpoint",
    aliases: ["Rebel Civilian Checkpoint", "Rebel checkpoint"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "",
    choices: [
      {
        id: "c:rebel-checkpoint:0",
        label: "Fend for yourself, attack, and escape",
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
      {
        id: "c:rebel-checkpoint:1",
        label: "Fly behind a moon and stay hidden",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel fight among Federation and Rebel fleets",
    // Arrival calls this fight. One of the six printed intros.
    slug: "rebel-fight-among-federation-and-rebel-fleets",
    flag: "cited:rebel-fight-among-federation-and-rebel-fleets",
    aliases: ["Rebel fight among Federation and Rebel fleets"],
    sectors: ["The Last Stand"],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-among-federation-and-rebel-fleets:0",
        label: "Fight a Rebel ship",
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel fight in plasma storm",
    slug: "rebel-fight-in-plasma-storm",
    flag: "cited:rebel-fight-in-plasma-storm",
    aliases: ["Rebel fight in plasma storm"],
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
    body: "You arrive in the middle of a plasma storm. Despite the harsh conditions, a Rebel scout seems to be waiting for you.",
    choices: [
      {
        id: "c:rebel-fight-in-plasma-storm:0",
        label: "Fight a Rebel ship (default rewards)",
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel ship attacking Crystal ship",
    slug: "rebel-ship-attacking-crystal-ship",
    flag: "cited:rebel-ship-attacking-crystal-ship",
    aliases: ["Crystalline Ship Engaged with Rebel", "Rebel ship attacking Crystal ship"],
    sectors: ["Hidden Crystal Worlds"],
    body: "Crystal shards fly past the screen as soon as you arrive. Checking the scanners, it looks like a crystalline ship is engaged with a Rebel!",
    choices: [
      {
        id: "c:rebel-ship-attacking-crystal-ship:0",
        label: "Attack the Rebel",
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
      {
        id: "c:rebel-ship-attacking-crystal-ship:1",
        label: "Attack the Crystalline ship",
        fx: [
          {
            k: "fleet",
            n: 1,
            faster: true,
          },
          {
            k: "fight",
            tier: "Crystal ship",
          },
        ],
      },
      {
        id: "c:rebel-ship-attacking-crystal-ship:2",
        label: "Ignore them",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel ship attacking Federation loyalists",
    slug: "rebel-ship-attacking-federation-loyalists",
    flag: "cited:rebel-ship-attacking-federation-loyalists",
    aliases: ["Federation Ship in Need of Aid", "Rebel ship attacking Federation loyalists"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
    ],
    body: "",
    choices: [
      {
        id: "c:rebel-ship-attacking-federation-loyalists:0",
        label: "Aid the Federation ship",
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
      {
        id: "c:rebel-ship-attacking-federation-loyalists:1",
        label: "Use this chance to escape",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel ship attacking civilians in Last Stand",
    slug: "rebel-ship-attacking-civilians-in-last-stand",
    flag: "cited:rebel-ship-attacking-civilians-in-last-stand",
    aliases: [
      "Rebel Attacking Civilians in Last Stand",
      "Rebel ship attacking civilians in Last Stand",
    ],
    sectors: ["The Last Stand"],
    body: "",
    choices: [
      {
        id: "c:rebel-ship-attacking-civilians-in-last-stand:0",
        label: "Prepare to fight the Rebel ship!",
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
      {
        id: "c:rebel-ship-attacking-civilians-in-last-stand:1",
        label: "There's no time, get ready to jump",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel ship attacking refueling outpost",
    slug: "rebel-ship-attacking-refueling-outpost",
    flag: "cited:rebel-ship-attacking-refueling-outpost",
    aliases: ["Rebel ship attacking refueling outpost"],
    sectors: ["Civilian Sector", "Rebel Controlled Sector", "Rebel Stronghold", "The Last Stand"],
    body: "You detect a Rebel scout on an attack approach to a small refueling outpost. Their weapons are charged, but they're not firing yet.",
    choices: [
      {
        id: "c:rebel-ship-attacking-refueling-outpost:0",
        label: "Intervene to defend the outpost",
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
      {
        id: "c:rebel-ship-attacking-refueling-outpost:1",
        label: "Avoid the conflict",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel ship supplying civilians",
    slug: "rebel-ship-supplying-civilians",
    flag: "cited:rebel-ship-supplying-civilians",
    aliases: ["Rebel ship supplying civilians", "Rebels Supplying Civilians"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "",
    choices: [
      {
        id: "c:rebel-ship-supplying-civilians:0",
        label: "Attack the Rebels",
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
      {
        id: "c:rebel-ship-supplying-civilians:1",
        label: "Leave them be",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:rebel-ship-supplying-civilians:2",
        label: "Wait and steal the supplies from the civilians",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel shipyard",
    slug: "rebel-shipyard",
    flag: "cited:rebel-shipyard",
    aliases: ["Rebel Flagship Construction", "Rebel shipyard"],
    sectors: ["Rebel Stronghold"],
    body: "You arrive at the beacon to find yourself in a huge Rebel shipyard, scaffolding and construction drones filling the sector! The entire system looks devoted to ship construction, the nearby planets and moons ruthlessly mined to harvest resources for a ship of immense size...",
    choices: [
      {
        id: "c:rebel-shipyard:0",
        label: "Look around",
        fx: [
          {
            k: "fight",
            tier: "second Rebel Flagship",
          },
        ],
      },
      {
        id: "c:rebel-shipyard:1",
        label: "Leave immediately",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel transport ship",
    slug: "rebel-transport-ship",
    flag: "cited:rebel-transport-ship",
    aliases: ["Rebel transport ship"],
    sectors: [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
    ],
    body: "You spot a small rebel ship nearby. It seems to have been re-fitted for transport rather than combat. It does not seem to want to engage you and your ship.",
    choices: [
      {
        id: "c:rebel-transport-ship:0",
        label: "Demand the surrender of their goods",
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
      {
        id: "c:rebel-transport-ship:1",
        label: "Avoid the ship",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Refueling platform",
    slug: "refueling-platform",
    flag: "cited:refueling-platform",
    aliases: ["Orbiting Small Platform", "Refueling platform"],
    sectors: [
      "Abandoned Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
    ],
    body: "A small platform orbits near this beacon - it looks like a fueling station of some sort, and it is cheerily broadcasting reasonable prices in a spectrum of frequencies and languages.",
    choices: [
      {
        id: "c:refueling-platform:0",
        label: "Dock with the refueling platform.",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:refueling-platform:1",
        label: "Ignore the refueling platform.",
        fx: [
          {
            k: "fight",
            tier: "Pirate ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Refueling station",
    slug: "refueling-station",
    flag: "cited:refueling-station",
    aliases: ["Refuel Station", "Refueling station"],
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
    body: "A ship re-fueling station is stationed at this beacon. We can purchase fuel here.",
    choices: [
      {
        id: "c:refueling-station:0",
        label: "Buy 6 Fuel for 12 Scrap",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 12,
            hi: 12,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 6,
            hi: 6,
          },
        ],
      },
      {
        id: "c:refueling-station:1",
        label: "Buy 3 Fuel for 6 Scrap",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 6,
            hi: 6,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 3,
            hi: 3,
          },
        ],
      },
      {
        id: "c:refueling-station:2",
        label: "Buy 1 Fuel for 2 Scrap",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 2,
            hi: 2,
          },
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 1,
            hi: 1,
          },
        ],
      },
      {
        id: "c:refueling-station:3",
        label: "Ignore the station",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Rock atheists",
    slug: "rock-atheists",
    flag: "cited:rock-atheists",
    aliases: ["Rock Deserters", "Rock atheists"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-atheists:0",
        label: "Tell them their god sent them here to join your crew",
        fx: [
          {
            k: "fight",
            tier: "Rock ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Rock ship in plasma storm",
    slug: "rock-ship-in-plasma-storm",
    flag: "cited:rock-ship-in-plasma-storm",
    aliases: ["Rock Armoured Transport", "Rock ship in plasma storm"],
    sectors: ["Uncharted Nebula"],
    body: 'A rock armoured transport nearby looks to have lost its bearings, but when you hail they grow suspicious: "Whatever life-form you are, we find you repugnant. We seek no aid. Leave. Now."',
    choices: [
      {
        id: "c:rock-ship-in-plasma-storm:0",
        label: "Repugnant? Arm the weapons!",
        fx: [
          {
            k: "fight",
            tier: "Rock ship",
          },
        ],
      },
      {
        id: "c:rock-ship-in-plasma-storm:1",
        label: "Leave",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Sell drone parts for scrap",
    slug: "sell-drone-parts-for-scrap",
    flag: "cited:sell-drone-parts-for-scrap",
    aliases: ["Sell drone parts for scrap"],
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
    ],
    body: "You see a civilian space station with heavy damage. You receive a message, \"We've been hit hard by the war. We need more drone parts to speed up our repairs. We'll buy some from you if you have extra.\"",
    choices: [
      {
        id: "c:sell-drone-parts-for-scrap:0",
        label: "Sell 3 drone parts for 12 scrap",
        fx: [
          {
            k: "res",
            id: "parts",
            sign: -1,
            lo: 3,
            hi: 3,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 12,
            hi: 12,
          },
        ],
      },
      {
        id: "c:sell-drone-parts-for-scrap:1",
        label: "Sell 6 drone parts for 24 scrap",
        fx: [
          {
            k: "res",
            id: "parts",
            sign: -1,
            lo: 6,
            hi: 6,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 24,
            hi: 24,
          },
        ],
      },
      {
        id: "c:sell-drone-parts-for-scrap:2",
        label: "Sell 12 drone parts for 48 scrap",
        fx: [
          {
            k: "res",
            id: "parts",
            sign: -1,
            lo: 12,
            hi: 12,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 48,
            hi: 48,
          },
        ],
      },
      {
        id: "c:sell-drone-parts-for-scrap:3",
        label: "Ignore the station",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Sell missiles for scrap",
    slug: "sell-missiles-for-scrap",
    flag: "cited:sell-missiles-for-scrap",
    aliases: ["Sell missiles for scrap", "Trade: sell missiles for scrap"],
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
    ],
    body: 'There is a black market hub here. You receive a message, "These are dangerous times. If you have extra military-grade explosives, we\'ll gladly pay you for them."',
    choices: [
      {
        id: "c:sell-missiles-for-scrap:0",
        label: "Sell 5 missiles for 15 scrap",
        fx: [
          {
            k: "res",
            id: "missiles",
            sign: -1,
            lo: 5,
            hi: 5,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 15,
            hi: 15,
          },
        ],
      },
      {
        id: "c:sell-missiles-for-scrap:1",
        label: "Sell 10 missiles for 30 scrap",
        fx: [
          {
            k: "res",
            id: "missiles",
            sign: -1,
            lo: 10,
            hi: 10,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 30,
            hi: 30,
          },
        ],
      },
      {
        id: "c:sell-missiles-for-scrap:2",
        label: "Sell 15 missiles for 45 scrap",
        fx: [
          {
            k: "res",
            id: "missiles",
            sign: -1,
            lo: 15,
            hi: 15,
          },
          {
            k: "res",
            id: "scrap",
            sign: 1,
            lo: 45,
            hi: 45,
          },
        ],
      },
      {
        id: "c:sell-missiles-for-scrap:3",
        label: "Ignore the station",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Slaver (friendly)",
    slug: "slaver-friendly",
    flag: "cited:slaver-friendly",
    aliases: ["Friendly Slaver", "Slaver (friendly)"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: 'You recognize the ship as a well known slave trader. He hails you and offers you "laborers" for cheap.',
    choices: [
      {
        id: "c:slaver-friendly:0",
        label: "Attack the slaver scum",
        fx: [
          {
            k: "fight",
            tier: "Pirate ship",
          },
        ],
      },
      {
        id: "c:slaver-friendly:1",
        label: "Ignore the slaver and continue on your way",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Slaver (hostile)",
    slug: "slaver-hostile",
    flag: "cited:slaver-hostile",
    aliases: ["Pirate Slaver", "Slaver (hostile)"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector"],
    body: 'An especially well-armed pirate ship approaches you. "Hand over one of your crew and the rest can go unharmed."',
    choices: [
      {
        id: "c:slaver-hostile:2",
        label: "Draw straws and send a crew-member over to the slavers.",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:slaver-hostile:0",
        label: "We will never surrender one of our crew to slavers!",
        fx: [
          {
            k: "fight",
            tier: "Pirate ship",
          },
        ],
      },
      {
        id: "c:slaver-hostile:1",
        label: "Attempt to out-run the slaver ship.",
        fx: [
          {
            k: "fight",
            tier: "Pirate ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Slug drink",
    slug: "slug-drink",
    flag: "cited:slug-drink",
    aliases: ["Slug drink"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    // Slug drink. The printed hail.
    body: 'A Slug captain hails and invites himself aboard your ship to present a flask of something slimy. "Now, most gracioussss captain, you must join me please in a drink to our alliance!"',
    choices: [
      {
        id: "c:slug-drink:0",
        label: "Refuse",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Slug hacker (choice)",
    slug: "slug-hacker-choice",
    flag: "cited:slug-hacker-choice",
    aliases: ["Dangerous Looking Ship", "Dangerous looking slug ship", "Slug hacker (choice)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: 'You are immediately hailed by a dangerous looking ship. "I\'m feeling generouss today. I shall allow you to choose your own death. Which do you like leasst: shields, oxygen, or weaponsss?"',
    choices: [
      {
        id: "c:slug-hacker-choice:0",
        label: "Shields",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
      {
        id: "c:slug-hacker-choice:1",
        label: "Oxygen",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
      {
        id: "c:slug-hacker-choice:2",
        label: "Weapons",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
      {
        id: "c:slug-hacker-choice:3",
        label: "Offer 35 scrap to leave you alone",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 35,
            hi: 35,
          },
        ],
      },
      {
        id: "c:slug-hacker-choice:4",
        label: "Counter any hack attempt.",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Slug hacker (doors)",
    slug: "slug-hacker-doors",
    flag: "cited:slug-hacker-doors",
    aliases: ["Slug doors hacker", "Slug hacker (doors)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "There are few more vicious beasts in the galaxy than a Slug with his back to the wall. The faltering ship armed with fire-weapons uses a remote hacking tool to try and disable your door system - they're going to burn you out!",
    choices: [
      {
        id: "c:slug-hacker-doors:0",
        label: "Continue",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
      {
        id: "c:slug-hacker-doors:1",
        label: "Counter the remote hacking.",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Slug hacker (medical)",
    slug: "slug-hacker-medical",
    flag: "cited:slug-hacker-medical",
    aliases: ["Slug hacker (medical)"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "A Slug ship hails you: \"We've detected some worrying radiation coming from your medical unit, perhaps you should take a look?\" As he signs off, your medical bay shuts off and their crew teleports aboard from a nearby station. They don't look like engineers.",
    choices: [
      {
        id: "c:slug-hacker-medical:0",
        label: "Continue",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
      {
        id: "c:slug-hacker-medical:1",
        label: "Counter the remote hacking.",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
      {
        id: "c:slug-hacker-medical:2",
        label: "Try to squeeze some extra power to the system.",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Slug hacker (oxygen)",
    slug: "slug-hacker-oxygen",
    flag: "cited:slug-hacker-oxygen",
    aliases: ["Slug Sabotage Oxygen System", "Slug hacker (oxygen)", "Slug oxygen hacker"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "The slugs here use a tactic you hoped you'd never see: They sabotage your oxygen production system and then charge fire-weapons - you're going to suffocate!",
    choices: [
      {
        id: "c:slug-hacker-oxygen:0",
        label: "Continue",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
      {
        id: "c:slug-hacker-oxygen:1",
        label: "Try to squeeze some extra power to the system.",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
      {
        id: "c:slug-hacker-oxygen:2",
        label: "Counter the remote hacking.",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Space station under construction",
    slug: "space-station-under-construction",
    flag: "cited:space-station-under-construction",
    aliases: ["Space Station Under Construction", "Space station under construction"],
    sectors: ["Civilian Sector"],
    body: 'You come across a space station under construction. You receive a message from their command tower, "Greetings. We recently lost contact with a cargo ship that was set to deliver more construction materials. Could you help us figure out what happened to them?"',
    choices: [
      {
        id: "c:space-station-under-construction:0",
        label: "Offer your help",
        fx: [
          {
            k: "res",
            id: "fuel",
            sign: 1,
            lo: 2,
            hi: 4,
          },
          {
            k: "res",
            id: "missiles",
            sign: 1,
            lo: 0,
            hi: 4,
          },
          {
            k: "res",
            id: "parts",
            sign: 1,
            lo: 0,
            hi: 2,
          },
          // @agent:quests. The page's quest marker is added after this choice (wiki/quests.ts questAfterCited).
          {
            k: "nothing",
          },
        ],
      },
      {
        id: "c:space-station-under-construction:1",
        label: "Decline",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "The Engi virus",
    slug: "the-engi-virus",
    flag: "cited:the-engi-virus",
    aliases: ["Engi virus", "The Engi Virus", "The Engi virus"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "The Engi are awaiting you at the beacon, with their weapons on-line! They explain a computer virus that is wanted for hostile acts against the Engi (multiple counts of binary scrambling, nano-dissolution, and variable interference) is aboard your vessel. They insist they must destroy your ship to prevent the virus from escaping!",
    choices: [
      {
        id: "c:the-engi-virus:0",
        label: "Hold on! Let us try to purge the system code!",
        fx: [
          {
            k: "fight",
            tier: "Engi ship",
          },
        ],
      },
      {
        id: "c:the-engi-virus:1",
        label: "Attack the Engi vessel!",
        fx: [
          {
            k: "fight",
            tier: "Engi ship",
          },
        ],
      },
    ],
  },
  {
    dest: "The mercenary",
    slug: "the-mercenary",
    flag: "cited:the-mercenary",
    aliases: ["The Mercenary", "The mercenary"],
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
        id: "c:the-mercenary:0",
        label: "Hire the mercenary to delay the Rebels",
        fx: [
          {
            k: "res",
            id: "scrap",
            sign: -1,
            lo: 10,
            hi: 25,
          },
          {
            k: "fleet",
            n: 2,
            lastStand: true,
          },
        ],
      },
      {
        id: "c:the-mercenary:1",
        label: "Fight the ship",
        fx: [
          {
            k: "fight",
            tier: "Pirate ship",
          },
        ],
      },
      {
        id: "c:the-mercenary:2",
        label: "You have no need of his services",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Zoltan retake the ship",
    slug: "zoltan-retake-the-ship",
    flag: "cited:zoltan-retake-the-ship",
    aliases: ["Zoltan Life Raft", "Zoltan retake the ship"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: 'You pick up a Zoltan life raft floating in space. Its inhabitant asks you to retake his ship from the pirates who recently commandeered it. "I\'m certain it is clear," he concludes, "that you must not destroy my vessel in the process."',
    choices: [
      {
        id: "c:zoltan-retake-the-ship:0",
        label: "Engage the pirates",
        fx: [
          {
            k: "fight",
            tier: "Zoltan pirate ship",
          },
        ],
      },
      {
        id: "c:zoltan-retake-the-ship:1",
        label: "Leave",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
  {
    dest: "Zoltan wise man",
    slug: "zoltan-wise-man",
    flag: "cited:zoltan-wise-man",
    aliases: ["Zoltan wise man"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: 'You come to a quiet part of Zoltan space and encounter an ancient Zoltan wise man who has managed to harness the power of a spatial rift, but seems to have been driven completely mad by the power. "Choose your doom," he demands. This is all part of a day\'s work.',
    choices: [
      {
        id: "c:zoltan-wise-man:0",
        label: "Mantis",
        fx: [
          {
            k: "fight",
            tier: "Mantis ship",
          },
        ],
      },
      {
        id: "c:zoltan-wise-man:1",
        label: "Slug",
        fx: [
          {
            k: "fight",
            tier: "Slug ship",
          },
        ],
      },
      {
        id: "c:zoltan-wise-man:2",
        label: "Rockmen",
        fx: [
          {
            k: "fight",
            tier: "Rock ship",
          },
        ],
      },
    ],
  },
  {
    // Boarders: Humans (Abandoned). Locations unique=false. Template:Locations: "This event can occur multiple times per sector."
    // Abandoned Sector, Beacons: "1-2 boarders" — both beacons can be this event (beacon-mix.ts).
    // The page prints no button. The red line is the outcome, applied on arrival. No ship (LRSmap=noship).
    dest: "Boarders: Humans (Abandoned)",
    slug: "boarders-humans-abandoned",
    flag: "cited:boarders-humans-abandoned",
    aliases: ["Weak and hungry human boarders", "Weak and hungry Human intruders"],
    sectors: ["Abandoned Sector"],
    body: 'An image of some weak and hungry humans comes onto your screen. "Those metal bastards think they can just absorb half of our engines and leave us here to die? I hope you understand the need to take your ship by force."',
    choices: [
      {
        id: "c:boarders-humans-abandoned:0",
        label: "3-4 human boarders beam aboard your ship",
        fx: [
          {
            k: "nothing",
          },
        ],
      },
    ],
  },
];
