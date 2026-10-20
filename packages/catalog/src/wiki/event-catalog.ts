import type { EventChoice, EventDef, EventEffect } from "@stl/pack";
import { offerFromScripted, SCRIPTED_SURRENDERS } from "./surrender-offers.ts";
import { CORE_EVENTS } from "./cited-events-core.ts";
import { EXTRA_EVENTS as AUTO_EVENTS } from "./cited-events-auto.ts";
import { EXTRA_EVENTS as CIVILIAN_AL } from "./cited-events-civilian-al.ts";
import { EXTRA_EVENTS as CIVILIAN_MZ } from "./cited-events-civilian-mz.ts";
import { EXTRA_EVENTS as CIVILIAN_NEXT } from "./cited-events-civilian-next.ts";
import { EXTRA_EVENTS as CRYSTAL_EVENTS } from "./cited-events-crystal.ts";
import { EXTRA_EVENTS as CRYSTAL_NEXT } from "./cited-events-crystal-next.ts";
import { EXTRA_EVENTS as ENGI_EVENTS } from "./cited-events-engi.ts";
import { EXTRA_EVENTS as ENGI_NEXT } from "./cited-events-engi-next.ts";
import { EXTRA_EVENTS as FUEL_EVENTS } from "./cited-fuel.ts";
import { EXTRA_EVENTS as LANIUS_EVENTS } from "./cited-events-lanius.ts";
import { EXTRA_EVENTS as MANTIS_EVENTS } from "./cited-events-mantis.ts";
import { EXTRA_EVENTS as MANTIS_ROCK } from "./cited-events-mantis-rock.ts";
import { EXTRA_EVENTS as PIRATE_EVENTS } from "./cited-events-pirate.ts";
import { EXTRA_EVENTS as PIRATE_NEXT } from "./cited-events-pirate-next.ts";
import { EXTRA_EVENTS as REBEL_EVENTS } from "./cited-events-rebel.ts";
import { EXTRA_EVENTS as REBEL_NEXT } from "./cited-events-rebel-next.ts";
import { EXTRA_EVENTS as ROCK_EVENTS } from "./cited-events-rock.ts";
import { EXTRA_EVENTS as SLUG_EVENTS } from "./cited-events-slug.ts";
import { EXTRA_EVENTS as SLUG_NEXT } from "./cited-events-slug-next.ts";
import { EXTRA_EVENTS as ZOLTAN_EVENTS } from "./cited-events-zoltan.ts";
import { EXTRA_EVENTS as ZOLTAN_NEXT } from "./cited-events-zoltan-next.ts";
import { EXTRA_EVENTS as SURRENDER_PAGES } from "./cited-events-surrender.ts";
import { EXTRA_EVENTS as QUEST_A_PAGES } from "./quests-a-pages.ts";
import { EXTRA_EVENTS as QUEST_B_PAGES } from "./cited-events-quests-b.ts";
import { EXTRA_EVENTS as MISSING_EVENTS } from "./cited-missing-pages.ts";
import { QUEST_PAGES } from "./quest-arrivals.ts";

/**
 * A cited page before it is a pack record. `slug` is the pack id.
 * A quest marker, its arrival page, a fight page's surrender offer, and a filler opening card are records.
 * Choice handlers and rolled intros stay procedures.
 */
export type CitedEventRow = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: EventChoice[];
};

function copyEffect(fx: EventEffect): EventEffect {
  if (fx.k === "res") return { k: "res", id: fx.id, sign: fx.sign, lo: fx.lo, hi: fx.hi };
  if (fx.k === "tier") {
    const copy: EventEffect = { k: "tier", tier: fx.tier };
    if (fx.resources !== undefined) copy.resources = fx.resources;
    return copy;
  }
  if (fx.k === "hull") return { k: "hull", n: fx.n };
  if (fx.k === "fleet") {
    const copy: EventEffect = { k: "fleet", n: fx.n };
    if (fx.double !== undefined) copy.double = fx.double;
    if (fx.faster !== undefined) copy.faster = fx.faster;
    if (fx.lastStand !== undefined) copy.lastStand = fx.lastStand;
    return copy;
  }
  if (fx.k === "fight") {
    const copy: EventEffect = { k: "fight", tier: fx.tier };
    if (fx.asteroid !== undefined) copy.asteroid = fx.asteroid;
    if (fx.autoBlueprint !== undefined) copy.autoBlueprint = fx.autoBlueprint;
    return copy;
  }
  if (fx.k === "note") return { k: "note", text: fx.text };
  if (fx.k === "item") return { k: "item", item: fx.item };
  if (fx.k === "quest") return { k: "quest", id: fx.id };
  if (fx.k === "goto") return { k: "goto", id: fx.id };
  if (fx.k === "close") return { k: "close" };
  return { k: "nothing" };
}

function copyRow(ev: CitedEventRow): CitedEventRow {
  return {
    dest: ev.dest,
    slug: ev.slug,
    flag: ev.flag,
    aliases: [...ev.aliases],
    sectors: [...ev.sectors],
    body: ev.body,
    choices: ev.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      fx: choice.fx.map(copyEffect),
    })),
  };
}

/** Page order. The pack loads this list, and an append sits after it. */
export const CITED_EVENT_ROWS: CitedEventRow[] = [
  ...CORE_EVENTS,
  ...CIVILIAN_AL,
  ...CIVILIAN_MZ,
  ...CRYSTAL_EVENTS,
  ...ENGI_EVENTS,
  ...MANTIS_EVENTS,
  ...PIRATE_EVENTS,
  ...REBEL_EVENTS,
  ...ROCK_EVENTS,
  ...SLUG_EVENTS,
  ...ZOLTAN_EVENTS,
  ...FUEL_EVENTS,
  ...CIVILIAN_NEXT,
  ...REBEL_NEXT,
  ...LANIUS_EVENTS,
  ...ENGI_NEXT,
  ...SLUG_NEXT,
  ...AUTO_EVENTS,
  ...CRYSTAL_NEXT,
  ...PIRATE_NEXT,
  ...ZOLTAN_NEXT,
  ...MANTIS_ROCK,
  ...SURRENDER_PAGES,
  ...QUEST_A_PAGES,
  ...QUEST_B_PAGES,
  ...MISSING_EVENTS,
  ...QUEST_PAGES,
].map(copyRow);

/** Pack records for the cited pages. The id is the page slug. Each scripted offer is copied onto that slug. */
export function citedEventRecords(): EventDef[] {
  const records: EventDef[] = CITED_EVENT_ROWS.map((ev) => ({
    id: ev.slug,
    dest: ev.dest,
    flag: ev.flag,
    aliases: [...ev.aliases],
    sectors: [...ev.sectors],
    body: ev.body,
    choices: ev.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      fx: choice.fx.map(copyEffect),
    })),
  }));
  const byId = new Map(records.map((row) => [row.id, row]));
  const holders: EventDef[] = [];
  for (const [id, row] of Object.entries(SCRIPTED_SURRENDERS)) {
    const surrender = offerFromScripted(row);
    const existing = byId.get(id);
    if (existing) {
      existing.surrender = surrender;
      continue;
    }
    holders.push({
      id,
      dest: row.page,
      flag: `surrender:${id}`,
      aliases: [],
      sectors: [],
      body: "",
      choices: [],
      surrender,
    });
  }
  return holders.length ? [...records, ...holders] : records;
}
