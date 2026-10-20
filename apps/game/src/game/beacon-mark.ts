/** Map label for one beacon. QUEST is drawn from any distance. REPAIR is the archive repair tag. */
export function beaconMark(b: {
  quest?: string;
  resolved: boolean;
  kind: string;
  name: string;
  flag: string;
  repair?: boolean;
}): string {
  if (b.quest && !b.resolved) return "QUEST";
  if (b.kind === "store") return "STORE";
  if (b.kind === "exit") return "EXIT";
  if (b.kind === "distress" || /distress/i.test(`${b.name} ${b.flag}`)) return "DISTRESS";
  if (b.repair) return "REPAIR";
  return "";
}
