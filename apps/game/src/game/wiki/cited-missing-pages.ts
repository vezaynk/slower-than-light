import { tx } from "../../i18n/index.ts";

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
  const slug = dest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
    tx("wiki.cited-missing.crystal-chat-intro"),
    [
      choice("crystal-chat", "yes", tx("wiki.cited-missing.yes")),
      choice("crystal-chat", "no", tx("wiki.cited-missing.no")),
      choice("crystal-chat", "crystal", tx("wiki.cited-missing.have-your-crew-speak")),
    ],
  ),
  row(
    "Crystalline cache",
    [CRYSTAL],
    tx("wiki.cited-missing.cache-intro"),
    [
      choice("crystalline-cache", "weapons", tx("wiki.cited-missing.attempt-to-break-through")),
      choice("crystalline-cache", "breach", tx("wiki.cited-missing.use-a-breach-missile")),
      choice("crystalline-cache", "crystal", tx("wiki.cited-missing.recalibrate-your-weapons")),
    ],
  ),
  row(
    "Crystalline men buried",
    [CRYSTAL],
    tx("wiki.cited-missing.buried-intro"),
    [
      choice("crystalline-men-buried", "send", tx("wiki.cited-missing.send-a-crewmember")),
      choice("crystalline-men-buried", "refuse", tx("wiki.cited-missing.refuse")),
    ],
  ),
  row(
    "Crystalline research facility",
    [CRYSTAL],
    tx("wiki.cited-missing.research-intro"),
    [
      choice("crystalline-research-facility", "allow", tx("wiki.cited-missing.allow-tests")),
      choice("crystalline-research-facility", "refuse", tx("wiki.cited-missing.refuse")),
      choice("crystalline-research-facility", "rock", tx("wiki.cited-missing.send-your-rockman")),
      choice("crystalline-research-facility", "dna", tx("wiki.cited-missing.send-your-crews-data")),
    ],
  ),
  row(
    "Engi research station",
    ENGI,
    tx("wiki.cited-missing.engi-station-intro"),
    [
      choice("engi-research-station", "board", tx("wiki.cited-missing.board-the-station")),
      choice("engi-research-station", "ignore", tx("wiki.cited-missing.ignore-it")),
      choice("engi-research-station", "sensors", tx("wiki.cited-missing.run-another-scan")),
      choice("engi-research-station", "scanners", tx("wiki.cited-missing.run-another-scan-lrs")),
    ],
  ),
  row(
    "Free scrap with resources (Engi)",
    ENGI,
    "",
    [choice("free-scrap-with-resources-engi", "take", tx("wiki.cited-missing.standard-gift"))],
  ),
  row(
    "Free scrap with resources (Zoltan)",
    ZOLTAN,
    tx("wiki.cited-missing.zoltan-scrap-intro"),
    [choice("free-scrap-with-resources-zoltan", "take", tx("wiki.cited-missing.standard-gift"))],
  ),
  row(
    "Zoltan free map",
    ZOLTAN,
    `${tx("wiki.cited-missing.zoltan-map-body")}\n\n${tx("wiki.cited-events.the-current-sector-map-is-revealed")}`,
    [choice("zoltan-free-map", "0", tx("wiki.cited-missing.continue"))],
  ),
  row(
    "Lanius empty distress beacon 1",
    ABANDONED,
    tx("wiki.cited-missing.lanius-empty-1"),
    [choice("lanius-empty-distress-beacon-1", "0", tx("wiki.cited-events.nothing-happens"))],
  ),
  row(
    "Lanius empty distress beacon 2",
    ABANDONED,
    tx("wiki.cited-missing.lanius-empty-2"),
    [choice("lanius-empty-distress-beacon-2", "0", tx("wiki.cited-events.nothing-happens"))],
  ),
  row(
    "Lanius with Federation science craft",
    ABANDONED,
    tx("wiki.cited-missing.lanius-science-intro"),
    [
      choice("lanius-with-federation-science-craft", "ask", tx("wiki.cited-missing.ask-for-help")),
      choice("lanius-with-federation-science-craft", "lanius", tx("wiki.cited-missing.offer-translator")),
      choice("lanius-with-federation-science-craft", "leave", tx("wiki.cited-missing.leave")),
    ],
  ),
  row(
    "Fight in Last Stand",
    ["The Last Stand"],
    "",
    [choice("fight-in-last-stand", "0", tx("wiki.cited-missing.fight-the-scout"), "Rebel ship")],
  ),
  row(
    "Slug oxygen malfunction",
    SLUG,
    tx("wiki.cited-missing.oxygen-intro"),
    [
      choice("slug-oxygen-malfunction", "send", tx("wiki.cited-missing.send-some-crew")),
      choice("slug-oxygen-malfunction", "ignore", tx("wiki.cited-missing.ignore-them")),
      choice("slug-oxygen-malfunction", "mantis", tx("wiki.cited-missing.mantis-oversee")),
    ],
  ),
  row(
    "Slug repair station",
    SLUG,
    tx("wiki.cited-missing.repair-intro"),
    [
      choice("slug-repair-station", "no", tx("wiki.cited-missing.no-thanks")),
      choice("slug-repair-station", "sure", tx("wiki.cited-missing.sure")),
      choice("slug-repair-station", "pay", tx("wiki.cited-missing.ask-about-payment")),
    ],
  ),
  row(
    "Slug store ship",
    SLUG,
    tx("wiki.cited-missing.store-intro"),
    [
      choice("slug-store-ship", "decline", tx("wiki.cited-missing.decline")),
      choice("slug-store-ship", "ask", tx("wiki.cited-missing.ask-to-see-the-goods")),
    ],
  ),
  row(
    "Slug and Rock standoff in nebula",
    SLUG,
    tx("wiki.cited-missing.standoff-nebula-intro"),
    [
      choice("slug-and-rock-standoff-in-nebula", "0", tx("wiki.cited-missing.get-closer")),
      choice("slug-and-rock-standoff-in-nebula", "1", tx("wiki.cited-missing.ignore-them")),
    ],
  ),
];
