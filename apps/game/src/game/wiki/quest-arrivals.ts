/**
 * Quest arrivals and the choices that place a marker.
 * An arrival has an empty sector list and flag `quest:` plus the quest id, so the stamp leaves it off the chart.
 * `questEvent` loads that flag. Fight, win, and escape buttons stay procedures under the same choice ids.
 */
import { tx } from "../../i18n/index.ts";
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
    flag: `quest:${id}`,
    aliases: [],
    sectors: [],
    body,
    choices,
  };
}

function marker(id: string, label: string, text: string, quest: string, close = false): EventChoice {
  const fx: EventEffect[] = [{ k: "note", text }];
  if (close) fx.push({ k: "close" });
  fx.push({ k: "quest", id: quest });
  return { id, label, fx };
}

const primitives = ZOLTAN_PAGES.find((ev) => ev.slug === "zoltan-quest-primitives");
if (!primitives) throw new Error("zoltan-quest-primitives page is missing");

/** Pages the campaign loads. Opening cards that already exist keep their own slugs and gain a quest effect there. */
export const QUEST_PAGES: QuestPage[] = [
  arrival("mantis-chase", tx("wiki.quests.mantis-trail"), tx("wiki.quests.you-catch-up-with-the-mantis"), [
    button("q:mantis-chase:fight", tx("wiki.quests.fight-the-mantis-bomber")),
  ]),
  arrival("slug-pirate-trap", tx("wiki.quests.slug-raid"), tx("wiki.quests.you-catch-up-with-the-two"), [
    button("q:slug-trap:engage", tx("wiki.quests.engage-the-pirate")),
    button("q:slug-trap:cache", tx("wiki.quests.head-for-the-cache")),
  ]),
  arrival("engi-real", tx("wiki.quests.rebel-base"), tx("wiki.quests.you-arrive-at-one-of-the"), [
    button("q:engi-real:fight", tx("wiki.quests.fight-the-rebel-ship")),
  ]),
  arrival("engi-fake", tx("wiki.quests.rebel-base"), tx("wiki.quests.you-arrive-at-one-of-the"), [
    button("q:engi-fake:fight", tx("wiki.quests.fight-the-rebel-ship")),
  ]),
  arrival("engi-final", tx("wiki.quests.mantis-convoy"), tx("wiki.quests.you-have-finally-caught-up-with"), [
    button("q:engi-final:fight", tx("wiki.quests.fight-the-mantis-ship")),
  ]),
  arrival("slug-platform", tx("wiki.quests.construction-platform"), tx("wiki.quests.you-arrive-to-discover-an-impressive"), [
    button("q:slug-platform:charge", tx("wiki.quests.charge-them-before-they-escape")),
    button("q:slug-platform:tail", tx("wiki.quests.try-to-tail-them-without-being")),
  ]),
  arrival("store-rescue", tx("wiki.quests.space-dock"), tx("wiki.quests.once-you-arrive-at-the-beacon"), [
    button("q:store-rescue:engage", tx("wiki.quests.engage-the-rebel-and-rescue-the")),
    button("q:store-rescue:avoid", tx("wiki.quests.avoid-a-fight")),
  ]),
  arrival("rock-sun", tx("wiki.quests-a.red-giant"), tx("wiki.quests-a.you-arrive-at-the-coordinates-given"), [
    button("qa:rock-sun:fight", tx("wiki.quests-a.fight-the-rock-ship")),
  ]),
  arrival("zoltan-peace", tx("wiki.quests-a.zoltan-brethren"), tx("wiki.quests-a.you-arrive-at-the-location-specified"), [
    button("qa:peace:attack", tx("wiki.quests-a.attack")),
    button("qa:peace:hail", tx("wiki.quests-a.attempt-to-hail-them")),
  ]),
  arrival("rock-bride", tx("wiki.quests-a.numa-v"), tx("wiki.quests-a.a-vast-tunnel-network-near-the"), [
    button("qa:bride:hand", tx("wiki.quests-a.hand-her-over")),
    button("qa:bride:refuse", tx("wiki.quests-a.refuse-to-comply")),
  ]),
  arrival("zoltan-primitives", tx("wiki.quests-a.primitive-planet"), primitives.body, primitives.choices.map((choice) => ({
    id: choice.id,
    label: choice.label,
    fx: choice.fx.map((fx) => ({ ...fx })),
  }))),
  arrival("capture-ship", tx("wiki.quests-b.bandit-ship"), tx("wiki.quests-b.you-find-the-ship-that-you"), [
    button("q:capture:fight", tx("wiki.quests-b.fight-a-pirate-ship")),
  ]),
  {
    dest: "Quest marker choices",
    slug: "quest-marker-choices",
    flag: "choice:quest-marker-choices",
    aliases: [],
    sectors: [],
    body: "",
    choices: [
      marker(
        "s:slug-home-nebula-surrender:info",
        tx("wiki.surrender.let-them-live-we-don-t"),
        tx("wiki.quests.you-ask-where-they-were-delivering"),
        "slug-platform",
        true,
      ),
      marker(
        "q:capture:agree",
        tx("wiki.quests-b.agree-to-capture-the-ship"),
        tx("wiki.quests-b.great-we-ll-relay-their-coordinates"),
        "capture-ship",
      ),
      marker(
        "q:merchant:investigate",
        tx("wiki.quests-b.accept"),
        tx("wiki.quests-b.at-least-you-re-confident-for"),
        "merchant-investigation",
      ),
      marker(
        "q:nebula:comfort",
        tx("wiki.quests-b.make-them-comfortable-for-their-final"),
        tx("wiki.quests-b.on-their-death-bed-they-croak"),
        "abadoth",
      ),
      marker(
        "q:mantis-collectors:follow",
        tx("wiki.quests.after-them"),
        tx("wiki.quests.you-input-their-coordinates-into-your"),
        "mantis-chase",
      ),
    ],
  },
];
