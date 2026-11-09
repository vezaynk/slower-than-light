import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";
import {
  LAUNCHED_KEY,
  LAUNCH_NOW_KEY,
  initialStage,
  relaunchReloads,
  type LaunchStage,
} from "./launch-stage.ts";

// launch.ts is a browser module: extensionless imports and Vite `?url` assets. A fresh copy per
// case is what makes `useLaunch`'s first read observable. `clientStageOnce` would otherwise
// keep the first case's stage, and take `stl-launch-now` only on that copy.
const hooks = `
function stripQuery(url) {
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
}
export async function resolve(specifier, context, nextResolve) {
  if (specifier.includes("?url") || specifier.includes("?worker")) {
    return { url: "data:text/javascript,export%20default%20%22stub-url%22", shortCircuit: true };
  }
  const parentURL = context.parentURL ? stripQuery(context.parentURL) : undefined;
  const parent = parentURL && parentURL !== context.parentURL ? { ...context, parentURL } : context;
  let spec = specifier;
  let caseId = null;
  const q = spec.indexOf("?");
  if (q !== -1) {
    const params = new URLSearchParams(spec.slice(q + 1));
    if (params.has("case")) caseId = params.get("case");
    spec = spec.slice(0, q);
  }
  if ((spec.startsWith("./") || spec.startsWith("../")) && !/\\.(tsx?|jsx?|mjs|cjs|json|css|node)$/.test(spec)) {
    spec += ".ts";
  }
  const resolved = await nextResolve(spec, parent);
  if (caseId && resolved.url.includes("/launch.ts")) {
    return { url: resolved.url + "?case=" + encodeURIComponent(caseId), shortCircuit: true };
  }
  return resolved;
}
export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.includes("?")) return nextLoad(stripQuery(url), context);
  return nextLoad(url, context);
}
`;
register(`data:text/javascript,${encodeURIComponent(hooks)}`, import.meta.url);

type Store = {
  get length(): number;
  clear(): void;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

type LaunchModule = {
  clientStage: () => LaunchStage;
  useLaunch: { getState: () => { stage: LaunchStage } };
};

function memoryStorage(seed: Record<string, string> = {}): Store {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
}

let caseN = 0;

/** A new module, so the store is created against this storage and `?dat=`. */
async function openLaunch(input: { launched?: boolean; launchNow?: boolean; dat?: string }) {
  const local = memoryStorage(input.launched ? { [LAUNCHED_KEY]: "1" } : {});
  const session = memoryStorage(input.launchNow ? { [LAUNCH_NOW_KEY]: "1" } : {});
  const browser = globalThis as { window?: unknown };
  browser.window = globalThis;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: local });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: session });
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { search: input.dat ? `?dat=${input.dat}` : "" },
  });
  const spec: string = `./launch.ts?case=${caseN++}`;
  const mod = (await import(spec)) as LaunchModule;
  return { mod, local, session };
}

describe("launch stage", () => {
  it("opens setup on a first visit", () => {
    assert.equal(initialStage({ urlArchive: false, launched: false, launchNow: false }), "setup");
  });

  it("boots straight to the title after a launch, a reload from setup, or a ?dat= link", () => {
    assert.equal(initialStage({ urlArchive: false, launched: true, launchNow: false }), "booting");
    assert.equal(initialStage({ urlArchive: false, launched: false, launchNow: true }), "booting");
    assert.equal(initialStage({ urlArchive: true, launched: false, launchNow: false }), "booting");
  });

  it("reloads a relaunch only when the file order changed", () => {
    assert.equal(relaunchReloads("a|b", "a|b"), false);
    assert.equal(relaunchReloads("a|c", "a|b"), true);
    assert.equal(relaunchReloads("a|c", "url"), false);
    assert.equal(relaunchReloads("a|c", undefined), false);
  });

  it("opens the loading bar for a remembered launch, on the store's first read", async () => {
    const { mod } = await openLaunch({ launched: true });
    assert.equal(mod.clientStage(), "booting");
    assert.equal(mod.useLaunch.getState().stage, "booting");
  });

  it("opens the loading bar for a ?dat= link, on the store's first read", async () => {
    const { mod } = await openLaunch({ dat: "archive.dat" });
    assert.equal(mod.clientStage(), "booting");
    assert.equal(mod.useLaunch.getState().stage, "booting");
  });

  it("takes stl-launch-now once and opens the loading bar on the store's first read", async () => {
    const { mod, session } = await openLaunch({ launchNow: true });
    assert.equal(session.getItem(LAUNCH_NOW_KEY), null);
    assert.equal(mod.useLaunch.getState().stage, "booting");
    assert.equal(mod.clientStage(), "booting");
    session.setItem(LAUNCH_NOW_KEY, "1");
    assert.equal(mod.clientStage(), "booting");
    assert.equal(session.getItem(LAUNCH_NOW_KEY), "1");
  });

  it("stays on setup for a first visit, on the store's first read", async () => {
    const { mod, session } = await openLaunch({});
    assert.equal(session.getItem(LAUNCH_NOW_KEY), null);
    assert.equal(mod.clientStage(), "setup");
    assert.equal(mod.useLaunch.getState().stage, "setup");
  });
});
