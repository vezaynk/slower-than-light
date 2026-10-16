/**
 * Quest arrivals and the choices that place a marker.
 * An arrival has an empty sector list and flag `quest:` plus the quest id, so the stamp leaves it off the chart.
 * `questEvent` loads that flag. Fight, win, and escape buttons stay procedures under the same choice ids.
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
    flag: `quest:${id}`,
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
  const fx: EventEffect[] = [{ k: "note", text }];
  if (close) fx.push({ k: "close" });
  fx.push({ k: "quest", id: quest });
  return { id, label, fx };
}

const primitives = ZOLTAN_PAGES.find((ev) => ev.slug === "zoltan-quest-primitives");
if (!primitives) throw new Error("zoltan-quest-primitives page is missing");

/** Pages the campaign loads. Opening cards that already exist keep their own slugs and gain a quest effect there. */
export const QUEST_PAGES: QuestPage[] = [
  arrival(
    "mantis-chase",
    "Mantis trail",
    `You catch up with the Mantis ship that escaped before, only to see them transferring their crew into an even bigger ship!

"Not YOU again! Do you know how much these repairs are going to cost me? Time to take out the big guns."`,
    [button("q:mantis-chase:fight", "Fight the Mantis Bomber.")],
  ),
  arrival(
    "slug-pirate-trap",
    "Slug raid",
    `You catch up with the two Slug ships and they're already carrying out their raid! One is in close combat with the pirate, the other seems to be heading for a small space cache the pirate was protecting.

Suddenly the first ship bursts into flames, and an urgent call arrives from the remaining Slugs. "We sssugest you distract the pirate vesssel while we retrieve the valuables. Fifty fifty sssplit."`,
    [
      button("q:slug-trap:engage", "Engage the pirate."),
      button("q:slug-trap:cache", "Head for the cache."),
    ],
  ),
  arrival(
    "engi-real",
    "Rebel base",
    "You arrive at one of the Rebel bases that the Engi told you about. It appears abandoned except for one scout ship. Perhaps you could extract information from them.",
    [button("q:engi-real:fight", "Fight the Rebel ship.")],
  ),
  arrival(
    "engi-fake",
    "Rebel base",
    "You arrive at one of the Rebel bases that the Engi told you about. It appears abandoned except for one scout ship. Perhaps you could extract information from them.",
    [button("q:engi-fake:fight", "Fight the Rebel ship.")],
  ),
  arrival(
    "engi-final",
    "Mantis convoy",
    "You have finally caught up with the ships you've been hunting. A hangar-sized cargo ship is being escorted by a number of Mantis ships. As you reconsider the assault, a squadron of Engi ships with pirate emblems jump in and assist you. You prepare to fight the Mantis but scans indicate they are manned by Rebels!",
    [button("q:engi-final:fight", "Fight the Mantis ship.")],
  ),
  arrival(
    "slug-platform",
    "Construction platform",
    "You arrive to discover an impressive cruiser being worked on by a few smaller ships and guarded by an assault ship. The mobile construction platform is slowly slipping into the clouds. You have not yet been noticed.",
    [
      button("q:slug-platform:charge", "Charge them before they escape."),
      button("q:slug-platform:tail", "Try to tail them without being noticed."),
    ],
  ),
  arrival(
    "store-rescue",
    "Space dock",
    "Once you arrive at the beacon you detect a Rebel scout assaulting a compound on a nearby desolate moon.",
    [
      button("q:store-rescue:engage", "Engage the Rebel and rescue the space dock."),
      button("q:store-rescue:avoid", "Avoid a fight."),
    ],
  ),
  arrival(
    "rock-sun",
    "Red giant",
    'You arrive at the coordinates given and find yourself dangerously close to an M-class star! The other ship messages you, "Let\'s see how long your puny ship can handle this heat! Prepare for a challenge!"',
    [button("qa:rock-sun:fight", "Fight the Rock ship.")],
  ),
  arrival(
    "zoltan-peace",
    "Zoltan brethren",
    "You arrive at the location specified by the peace-loving Zoltan, but the only thing nearby is a Rebel ship, closing in fast! \"We've found you! You're not getting away this time!\"",
    [button("qa:peace:attack", "Attack."), button("qa:peace:hail", "Attempt to hail them.")],
  ),
  arrival(
    "rock-bride",
    "Numa V",
    `A vast tunnel network near the surface of Numa V indicates an advanced Rock civilization. This must be where you were asked to deliver the passenger.

Realizing arrival is imminent, your passenger - silent so far - pleads with you not to hand her over. She's interrupted by the Grand Basilisk's Chief Aide: "To the alien vessel holding the Basilisk's wife. Deliver her to us. You will be rewarded... well."`,
    [button("qa:bride:hand", "Hand her over."), button("qa:bride:refuse", "Refuse to comply.")],
  ),
  arrival(
    "zoltan-primitives",
    "Primitive planet",
    primitives.body,
    primitives.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      fx: choice.fx.map((fx) => ({ ...fx })),
    })),
  ),
  arrival(
    "capture-ship",
    "Bandit ship",
    "You find the ship that you were asked to capture intact. You're not sure why, but they stressed that it's of great importance that you kill the crew WITHOUT destroying the ship.",
    [button("q:capture:fight", "Fight a Pirate ship.")],
  ),
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
        "Let them live. We don't want the weapon, we want information.",
        'You ask where they were delivering the weapon. "By telling you we will probably die jussst as like as not... Oh well." They give you the coordinates of the a prototype cruiser\'s mobile construction platform.',
        "slug-platform",
        true,
      ),
      marker(
        "q:capture:agree",
        "Agree to capture the ship.",
        "\"Great, we'll relay their coordinates. Remember, do NOT destroy that ship! Remember, we'll be right behind you.\"",
        "capture-ship",
      ),
      marker(
        "q:merchant:investigate",
        "Accept.",
        "\"At least you're confident, for what little that's worth. Here is their last known location.\"",
        "merchant-investigation",
      ),
      marker(
        "q:nebula:comfort",
        "Make them comfortable for their final moments.",
        'On their death bed, they croak out a series of coordinates and beg you to go there - when you attempt to ask them why, the survivor simply says, "ABADOTH" and perishes.',
        "abadoth",
      ),
      marker(
        "q:mantis-collectors:follow",
        "After them!",
        "You input their coordinates into your map and prepare to follow.",
        "mantis-chase",
      ),
    ],
  },
];
