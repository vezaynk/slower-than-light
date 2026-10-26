/**
 * A loaded page compares the picked count with the count the card rolled.
 */
import { eventDef } from "@stl/pack";
import type { EventGrade, GradePay } from "@stl/pack";

export type GradeBill = { hire: string; scrap: number; fuel: number; parts: number };

function payOk(pay: GradePay): boolean {
  return (pay.k === "scrap" || pay.k === "fuel" || pay.k === "parts") && pay.lo <= pay.hi;
}

/** The packed grade for this page, or null when the page has none. */
export function eventGrade(id: string): EventGrade | null {
  const grade = eventDef(id)?.grade;
  const hire = grade?.hire.trim();
  const pays = grade?.pays.filter(payOk) ?? [];
  if (!hire || pays.length === 0) return null;
  return { hire, pays };
}

/** The miss payments for this page, rolled in list order. A fixed band does not call `roll`. */
export function rollGrade(id: string, roll: (lo: number, hi: number) => number): GradeBill | null {
  const grade = eventGrade(id);
  if (!grade) return null;
  const bill: GradeBill = { hire: grade.hire, scrap: 0, fuel: 0, parts: 0 };
  for (const pay of grade.pays) {
    const n = pay.lo === pay.hi ? pay.lo : roll(pay.lo, pay.hi);
    bill[pay.k] += n;
  }
  return bill;
}
