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
  row("Crystal chat", [CRYSTAL], "Civilian ship. It asks for a conversation.", [
    choice(
      "crystal-chat",
      "yes",
      "Talk. Next: answer (1 in 3 each: Rebel fight, a reward, repair 6 hull) or end it.",
    ),
    choice("crystal-chat", "no", "Nothing happens."),
    choice("crystal-chat", "crystal", "Gain fuel and scrap: low, medium, or high, 1 in 3 each."),
  ]),
  row("Crystalline cache", [CRYSTAL], "Sealed cache on an asteroid.", [
    choice("crystalline-cache", "weapons", "1 in 2: nothing happens. 1 in 2: open the cache."),
    choice("crystalline-cache", "breach", "Spend missiles. Open the cache."),
    choice("crystalline-cache", "crystal", "Open the cache."),
  ]),
  row("Crystalline men buried", [CRYSTAL], "Crystal ship. It asks for one crewmember to dig.", [
    choice("crystalline-men-buried", "send", "Send 1 crewmember. More choices follow."),
    choice("crystalline-men-buried", "refuse", "Nothing happens."),
  ]),
  row(
    "Crystalline research facility",
    [CRYSTAL],
    "Crystal research station. It asks to test a crewmember.",
    [
      choice(
        "crystalline-research-facility",
        "allow",
        "1 in 3 each: lose 1 crew, gain low scrap and a weapon; gain a medium reward; gain low scrap and a drone.",
      ),
      choice(
        "crystalline-research-facility",
        "refuse",
        "2 in 3: nothing happens. 1 in 3: fight a Crystal ship.",
      ),
      choice("crystalline-research-facility", "rock", "Gain medium scrap and resources."),
      choice("crystalline-research-facility", "BACKUP_DNA", "Gain medium scrap and a weapon."),
    ],
  ),
  row("Engi research station", ENGI, "Damaged Engi station.", [
    choice(
      "engi-research-station",
      "board",
      "1 in 2: nothing happens. 1 in 2: rescue choices follow.",
    ),
    choice("engi-research-station", "ignore", "Nothing happens."),
    choice(
      "engi-research-station",
      "sensors",
      "Choose: an Engi crewmember or a drone, each with low scrap.",
    ),
    choice(
      "engi-research-station",
      "scanners",
      "Choose: an Engi crewmember or a drone, each with low scrap.",
    ),
  ]),
  row("Free scrap with resources (Engi)", ENGI, "", [
    choice("free-scrap-with-resources-engi", "take", "Gain scrap and resources, random tier."),
  ]),
  row("Free scrap with resources (Zoltan)", ZOLTAN, "Empty freighter.", [
    choice("free-scrap-with-resources-zoltan", "take", "Gain scrap and resources, random tier."),
  ]),
  row("Zoltan free map", ZOLTAN, "The sector map is revealed.", [
    choice("zoltan-free-map", "0", "Continue"),
  ]),
  row("Lanius empty distress beacon 1", ABANDONED, "Empty distress beacon.", [
    choice("lanius-empty-distress-beacon-1", "0", "Nothing happens."),
  ]),
  row("Lanius empty distress beacon 2", ABANDONED, "Empty distress beacon.", [
    choice("lanius-empty-distress-beacon-2", "0", "Nothing happens."),
  ]),
  row(
    "Lanius with Federation science craft",
    ABANDONED,
    "Federation science ship docked with Lanius ships.",
    [
      choice(
        "lanius-with-federation-science-craft",
        "ask",
        "1 in 4 each: gain a weapon; gain medium scrap and 1 drone part; gain medium scrap; nothing.",
      ),
      choice(
        "lanius-with-federation-science-craft",
        "lanius",
        "Gain a weapon, drone, or augment, 1 in 3 each.",
      ),
      choice("lanius-with-federation-science-craft", "leave", "Nothing happens."),
    ],
  ),
  row("Fight in Last Stand", ["The Last Stand"], "", [
    choice("fight-in-last-stand", "0", "Fight the scout.", "Rebel ship"),
  ]),
  row("Slug oxygen malfunction", SLUG, "Slug ship. It asks for repair help.", [
    choice(
      "slug-oxygen-malfunction",
      "send",
      "1 in 3 each: gain high scrap; fight a Slug ship with 1-3 boarders; lose 1 crew and fight a Slug ship.",
    ),
    choice("slug-oxygen-malfunction", "ignore", "Nothing happens."),
    choice("slug-oxygen-malfunction", "mantis", "Gain high scrap."),
  ]),
  row("Slug repair station", SLUG, "Slug repair station.", [
    choice("slug-repair-station", "no", "Nothing happens."),
    choice(
      "slug-repair-station",
      "sure",
      "1 in 3 each: repair 10 hull, then a payment demand; repair 1 hull, then a payment demand; fight.",
    ),
    choice("slug-repair-station", "pay", "1 in 2: fight a Slug ship. 1 in 2: a paid repair offer."),
  ]),
  row("Slug store ship", SLUG, "Slug store ship with an escort.", [
    choice("slug-store-ship", "decline", "Nothing happens."),
    choice("slug-store-ship", "ask", "More choices follow."),
  ]),
  row("Slug and Rock standoff in nebula", SLUG, "Two ships nearby in the nebula.", [
    choice("slug-and-rock-standoff-in-nebula", "0", "Approach. A Rock and Slug standoff follows."),
    choice("slug-and-rock-standoff-in-nebula", "1", "Nothing happens."),
  ]),
];
