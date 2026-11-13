/**
 * Quest arrivals and the choices that place a marker.
 * An arrival is named `arrive-` plus the quest id and lists no sector, so the stamp leaves it off the chart.
 * `questEvent` loads that id. Fight, win, and escape buttons stay procedures under the same choice ids.
 */
import type { EventChoice, EventEffect } from "@stl/pack";
import { EXTRA_EVENTS as ZOLTAN_PAGES } from "./cited-events-zoltan.ts";

type QuestPage = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: EventChoice[];
};

function button(id: string, label: string, fx: EventEffect[] = [{ k: "nothing" }]): EventChoice {
  return { id, label, fx };
}

function arrival(id: string, dest: string, body: string, choices: EventChoice[]): QuestPage {
  return {
    dest,
    slug: `arrive-${id}`,
    flag: `arrive-${id}`,
    aliases: [],
    sectors: [],
    body,
    choices,
  };
}

function marker(
  id: string,
  label: string,
  text: string,
  quest: string,
  close = false,
): EventChoice {
  // The quest follows the sentence, so it sits inside that result event, where ftl.dat's <quest> is read.
  const fx: EventEffect[] = [
    { k: "note", text },
    { k: "quest", id: quest },
  ];
  if (close) fx.push({ k: "close" });
  return { id, label, fx };
}

const primitives = ZOLTAN_PAGES.find((ev) => ev.slug === "zoltan-quest-primitives");
if (!primitives) throw new Error("zoltan-quest-primitives page is missing");

/** Pages the campaign loads. Opening cards that already exist keep their own slugs and gain a quest effect there. */
export const QUEST_PAGES: QuestPage[] = [
  arrival("mantis-chase", "Quest: hostile Mantis Bomber", "Hostile Mantis Bomber.", [
    button("q:mantis-chase:fight", "Fight the Mantis Bomber."),
  ]),
  arrival(
    "slug-pirate-trap",
    "Quest: pirate ship and cache",
    "Pirate ship guarding a cache. A Slug ship is going for the cache.",
    [
      button("q:slug-trap:engage", "Fight the pirate ship."),
      button("q:slug-trap:cache", "Go for the cache."),
    ],
  ),
  arrival("engi-real", "Quest: Rebel base (first)", "Hostile Rebel ship.", [
    button("q:engi-real:fight", "Fight the Rebel ship."),
  ]),
  arrival("engi-fake", "Quest: Rebel base (second)", "Hostile Rebel ship.", [
    button("q:engi-fake:fight", "Fight the Rebel ship."),
  ]),
  arrival("engi-final", "Quest: Mantis convoy", "Hostile Mantis ship.", [
    button("q:engi-final:fight", "Fight the Mantis ship."),
  ]),
  arrival(
    "slug-platform",
    "Quest: Slug construction platform",
    "Construction platform guarded by a Slug ship, unaware of you.",
    [
      button("q:slug-platform:charge", "Fight the Slug ship."),
      button("q:slug-platform:tail", "Follow the platform."),
    ],
  ),
  arrival("store-rescue", "Quest: space dock", "Rebel ship attacking a space dock.", [
    button("q:store-rescue:engage", "Fight the Rebel ship."),
    button("q:store-rescue:avoid", "Nothing happens."),
  ]),
  arrival("rock-sun", "Quest: Rock ship near sun", "Hostile Rock ship. Sun: fires break out.", [
    button("qa:rock-sun:fight", "Fight the Rock ship."),
  ]),
  arrival("zoltan-peace", "Quest: Zoltan beacon", "Hostile Rebel ship.", [
    button("qa:peace:attack", "Fight the Rebel ship."),
    button("qa:peace:hail", "More options."),
  ]),
  arrival(
    "rock-bride",
    "Quest: Rock passenger delivery",
    "Delivery point. Hand over the passenger, or refuse.",
    [
      button("qa:bride:hand", "Hand over the passenger."),
      button("qa:bride:refuse", "Keep the passenger."),
    ],
  ),
  arrival(
    "zoltan-primitives",
    "Quest: planet defense arrival",
    primitives.body,
    primitives.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      fx: choice.fx.map((fx) => ({ ...fx })),
    })),
  ),
  arrival(
    "capture-ship",
    "Quest: capture the ship",
    "Hostile pirate ship. Kill the crew; do not destroy the ship.",
    [button("q:capture:fight", "Fight the pirate ship.")],
  ),
  {
    dest: "Quest beacon",
    slug: "quest-marker-choices",
    flag: "choice:quest-marker-choices",
    aliases: [],
    sectors: [],
    body: "",
    choices: [
      marker(
        "s:slug-home-nebula-surrender:info",
        "Quest beacon added.",
        "Quest beacon added.",
        "slug-platform",
        true,
      ),
      marker("q:capture:agree", "Quest beacon added.", "Quest beacon added.", "capture-ship"),
      marker(
        "q:merchant:investigate",
        "Quest beacon added.",
        "Quest beacon added.",
        "merchant-investigation",
      ),
      marker("q:nebula:comfort", "Quest beacon added.", "Quest beacon added.", "abadoth"),
      marker(
        "q:mantis-collectors:follow",
        "Quest beacon added.",
        "Quest beacon added.",
        "mantis-chase",
      ),
    ],
  },
];
