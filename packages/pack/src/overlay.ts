import type { ContentPack, CrewDef, SectorDef } from "./types.ts";

const COMBAT: (keyof CrewDef)[] = [
  "hp",
  "move",
  "repair",
  "fight",
  "suffocate",
  "fireTaken",
  "bonusPower",
  "hasDeathExplosion",
  "drainsOxygen",
  "detectsLifeforms",
  "resistsMindControl",
  "lockdown",
  "lockCooldown",
  "fireRepairMultiplier",
];

/**
 * Lays the gap file over an archive pack.
 * Crew keeps the archive name, blurb, and hire cost. Combat fields come from the gap row.
 * A sector keeps the archive name and quotas. Colour and notes come from the gap row.
 * The store, rewards, faction rows, and empty beacons come from the gap.
 */
export function overlayGap(archive: ContentPack, gap: ContentPack): ContentPack {
  const pack: ContentPack = {
    ...archive,
    crew: mergeCrew(archive.crew, gap.crew),
    sectors: mergeSectors(archive.sectors, gap.sectors),
    stores: gap.stores ?? archive.stores,
    rewards: gap.rewards ?? archive.rewards,
    factions: gap.factions ?? archive.factions,
    empties: gap.empties ?? archive.empties,
  };
  delete pack.facts;
  if (gap.facts) pack.facts = true;
  return pack;
}

function mergeCrew(
  archive: CrewDef[] | undefined,
  gap: CrewDef[] | undefined,
): CrewDef[] | undefined {
  if (!archive?.length && !gap?.length) return undefined;
  const extra = new Map((gap ?? []).map((row) => [row.id, row]));
  const seen = new Set<string>();
  const rows: CrewDef[] = [];
  for (const row of archive ?? []) {
    seen.add(row.id);
    const stats = extra.get(row.id);
    const copy: CrewDef = { ...row };
    if (stats) {
      for (const key of COMBAT) copy[key] = stats[key] as never;
    }
    rows.push(copy);
  }
  for (const row of gap ?? []) {
    if (!seen.has(row.id)) rows.push({ ...row });
  }
  return rows;
}

function mergeSectors(
  archive: SectorDef[] | undefined,
  gap: SectorDef[] | undefined,
): SectorDef[] | undefined {
  if (!archive?.length) return archive;
  const extra = new Map((gap ?? []).map((row) => [row.id, row]));
  return archive.map((row) => {
    const colour = extra.get(row.id);
    const copy: SectorDef = {
      ...row,
      group: colour?.group ?? row.group,
      notes: [...(colour?.notes ?? row.notes)],
    };
    if (row.quotas) copy.quotas = row.quotas.map((quota) => ({ ...quota }));
    if (row.tracks) copy.tracks = [...row.tracks];
    if (row.rarities) copy.rarities = row.rarities.map((rarity) => ({ ...rarity }));
    return copy;
  });
}
