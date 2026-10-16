/** A Playwright recording the stage can run and compare. */
export type Scenario = {
  id: string;
  title: string;
  summary: string;
  /** Spec path relative to apps/reels. */
  spec: string;
};

export const scenarios: Scenario[] = [
  {
    id: "combat",
    title: "Combat demonstration",
    summary: "Radial menus, power, cloak, hack, mind control, boarding, and drones against a pirate.",
    spec: "e2e/combat-reel.spec.ts",
  },
  {
    id: "flagship",
    title: "Flagship",
    summary: "A late Kestrel vents the airlocks, then fights the Rebel Flagship through the victory card.",
    spec: "e2e/flagship-reel.spec.ts",
  },
];

export function scenarioById(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}
