// Temporary: dump every string in the authoring modules, by path, for base and current.
import { readdirSync, writeFileSync } from "node:fs";

const root = process.argv[2];
const out = process.argv[3];
const files = readdirSync(`${root}/wiki`)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
  .map((f) => `${root}/wiki/${f}`);
files.push(`${root}/pack/base.ts`);
const rows: Record<string, string> = {};
function walk(v: unknown, path: string, seen: Set<unknown>) {
  if (typeof v === "string") {
    rows[path] = v;
    return;
  }
  if (!v || typeof v !== "object" || seen.has(v)) return;
  seen.add(v);
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, seen));
  else if (v instanceof Map) for (const [k, x] of v) walk(x, `${path}{${String(k)}}`, seen);
  else for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, seen);
}
for (const f of files) {
  const mod = await import(f);
  const name = f.split("/").slice(-1)[0];
  for (const [k, v] of Object.entries(mod)) walk(v, `${name}:${k}`, new Set());
}
writeFileSync(out, JSON.stringify(rows));
