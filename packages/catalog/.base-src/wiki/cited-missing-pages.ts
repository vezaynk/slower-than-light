type FxBit = { k: "nothing" } | { k: "fight"; tier: string };

type Choice = { id: string; label: string; fx: FxBit[] };

type MissingEvent = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: Choice[];
};

const nothing = (): FxBit[] => [{ k: "nothing" }];

function row(dest: string, sectors: string[], body: string, choices: Choice[]): MissingEvent {
  const slug = dest
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return { dest, slug, flag: `cited:${slug}`, aliases: [dest], sectors, body, choices };
}

function choice(slug: string, name: string, label: string, fight?: string): Choice {
  return {
    id: `c:${slug}:${name}`,
    label,
    fx: fight ? [{ k: "fight", tier: fight }] : nothing(),
  };
}

const CRYSTAL = "Hidden Crystal Worlds";
const ENGI = ["Engi Controlled Sector", "Engi Homeworlds"];
const ZOLTAN = ["Zoltan Controlled Sector", "Zoltan Homeworlds"];
const SLUG = ["Slug Controlled Nebula", "Slug Home Nebula"];
const ABANDONED = ["Abandoned Sector"];

export const EXTRA_EVENTS: MissingEvent[] = [
  row(
    "Crystal chat",
    [CRYSTAL],
    "A small civilian vessel messages you, \"Wow! You're that alien that opened up the portal, aren't you! Are you busy? Can I ask you a question?\"",
    [
      choice("crystal-chat", "yes", "Yes."),
      choice("crystal-chat", "no", "No."),
      choice("crystal-chat", "crystal", "Have your crew speak to them."),
    ],
  ),
  row(
    "Crystalline cache",
    [CRYSTAL],
    "Odd radar pings from a huge, orbiting asteroid here reveal a Crystalline cache of some kind. A deep crater has been sealed over with a thick layer of crystal to keep whatever's inside safe — it'd take some serious firepower to break through.",
    [
      choice("crystalline-cache", "weapons", "Attempt to break through with the weapons you have."),
      choice("crystalline-cache", "breach", "Use a breach missile."),
      choice(
        "crystalline-cache",
        "crystal",
        "Have your Crystalline Being recalibrate your weapons.",
      ),
    ],
  ),
  row(
    "Crystalline men buried",
    [CRYSTAL],
    'A large Crystalline ship is floating in space here. They hail: "Aliens?! How curious. We request your aid. We have men buried on a nearby planet and we must dig them out."',
    [
      choice("crystalline-men-buried", "send", "Send a crewmember to help."),
      choice("crystalline-men-buried", "refuse", "Refuse."),
    ],
  ),
  row(
    "Crystalline research facility",
    [CRYSTAL],
    "You arrive near what appears to be a Crystalline research facility. A scientist quickly messages you, \"Ah! You're those aliens! Please, I've heard so much about you and I'm curious about your physiology! Would you let us run a few simple tests?\"",
    [
      choice("crystalline-research-facility", "allow", "Allow them to run tests on a crew member."),
      choice("crystalline-research-facility", "refuse", "Refuse."),
      choice("crystalline-research-facility", "rock", "Send your Rockman crew."),
      choice("crystalline-research-facility", "BACKUP_DNA", "Send your crew's data."),
    ],
  ),
  row(
    "Engi research station",
    ENGI,
    "You arrive at a smoldering Engi research station, its distress call unanswered — attacked by pirates or Mantis most likely. There may be someone left alive, or else something of value left on board.",
    [
      choice("engi-research-station", "board", "Board the station."),
      choice("engi-research-station", "ignore", "Ignore it."),
      choice("engi-research-station", "sensors", "Run another scan."),
      choice("engi-research-station", "scanners", "Run another scan."),
    ],
  ),
  row("Free scrap with resources (Engi)", ENGI, "", [
    choice(
      "free-scrap-with-resources-engi",
      "take",
      "You receive a random amount of scrap with resources.",
    ),
  ]),
  row(
    "Free scrap with resources (Zoltan)",
    ZOLTAN,
    "You arrive to find a lumbering Zoltan freighter with no one at the helm. It's a mystery what happened to the crew, but it'd be a shame to let the opportunity go to waste.",
    [
      choice(
        "free-scrap-with-resources-zoltan",
        "take",
        "You receive a random amount of scrap with resources.",
      ),
    ],
  ),
  row(
    "Zoltan free map",
    ZOLTAN,
    `${"The Zoltan stationed near this beacon are happy to receive you. As they give you the formal tour of their ship you spy some local star charts and mentally log the details."}\n\n${"The current sector map is revealed."}`,
    [choice("zoltan-free-map", "0", "Continue")],
  ),
  row(
    "Lanius empty distress beacon 1",
    ABANDONED,
    "You arrive at the location of the distress signal prepared for a fight, but on first glance it's entirely empty. The signal is coming from a small plastic satellite orbiting a moon. A looping message describes how settlers have recently abandoned the area due to the Lanius threat. You fail to find any other signs of a settlement nearby.",
    [choice("lanius-empty-distress-beacon-1", "0", "Nothing happens.")],
  ),
  row(
    "Lanius empty distress beacon 2",
    ABANDONED,
    "When you get to the beacon you quickly try to locate the source of the distress call. As you are looking, the signal blinks out. It is then that you notice the small fleet of scavenger ships absorbing debris from a large battle nearby. You can't help but wonder where the distress signal came from, but you decide not to risk pressuring the fleet.",
    [choice("lanius-empty-distress-beacon-2", "0", "Nothing happens.")],
  ),
  row(
    "Lanius with Federation science craft",
    ABANDONED,
    'A Federation science craft is docked with a few Lanius ships. You hail them and ask what is going on. "Greetings! We have been attempting to understand our region\'s newest visitors, the Lanius, although we have been making little headway in deciphering their language."',
    [
      choice(
        "lanius-with-federation-science-craft",
        "ask",
        "Ask if they have anything that could help your mission.",
      ),
      choice(
        "lanius-with-federation-science-craft",
        "lanius",
        "Offer to copy your translator's data suite.",
      ),
      choice("lanius-with-federation-science-craft", "leave", "Leave."),
    ],
  ),
  row("Fight in Last Stand", ["The Last Stand"], "", [
    choice("fight-in-last-stand", "0", "Fight the scout.", "Rebel ship"),
  ]),
  row(
    "Slug oxygen malfunction",
    SLUG,
    'You find a Slug vessel broadcasting a distress signal and contact them. "Ah, yesss, we are having problems with our oxygen generation unit. Perhaps your crew can assist in repairsss?"',
    [
      choice("slug-oxygen-malfunction", "send", "Send some crew to help."),
      choice("slug-oxygen-malfunction", "ignore", "Ignore them."),
      choice("slug-oxygen-malfunction", "mantis", "Have your Mantis oversee the repairs."),
    ],
  ),
  row(
    "Slug repair station",
    SLUG,
    'You arrive to find a small Slug repair station. "Greetingsss traveller! Care for a fix up? We could eassily patch up ssome of that damage."',
    [
      choice("slug-repair-station", "no", "No thanks."),
      choice("slug-repair-station", "sure", "Sure."),
      choice("slug-repair-station", "pay", "Ask if they would like payment."),
    ],
  ),
  row(
    "Slug store ship",
    SLUG,
    'A Slug transport ship is stationed near the beacon with a military escort ship. They message you, "We have been waiting for a customer for agesss. Care to see our waresss?"',
    [
      choice("slug-store-ship", "decline", "Decline."),
      choice("slug-store-ship", "ask", "Ask to see the goods."),
    ],
  ),
  row(
    "Slug and Rock standoff in nebula",
    SLUG,
    "You detect multiple ships running at maximum power nearby, but you can't see anything through this thick nebula.",
    [
      choice("slug-and-rock-standoff-in-nebula", "0", "Get closer."),
      choice("slug-and-rock-standoff-in-nebula", "1", "Ignore them."),
    ],
  ),
];
