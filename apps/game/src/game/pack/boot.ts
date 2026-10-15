import packUrl from "./base.xml?url";
import { fetchPackXml, loadPack, parsePack } from "@stl/pack";

type Listen = (ratio: number) => void;

const listeners = new Set<Listen>();
let latest = 0;
let job: Promise<void> | null = null;

function report(ratio: number) {
  latest = ratio;
  for (const listen of listeners) listen(ratio);
}

async function run(): Promise<void> {
  const xml = await fetchPackXml(packUrl, (ratio) => report(ratio * 0.9));
  report(0.95);
  loadPack(parsePack(xml), "base");
  report(1);
}

/** Fetches the base pack XML and installs it. Later callers share the same load. */
export function loadBasePackXml(onProgress: Listen): Promise<void> {
  listeners.add(onProgress);
  onProgress(latest);
  job ??= run().catch((err: unknown) => {
    job = null;
    throw err;
  });
  return job.finally(() => {
    listeners.delete(onProgress);
  });
}
