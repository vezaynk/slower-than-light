// Refreshes src/game/wiki/dump/pages.jsonl: every main-namespace article on ftl.fandom.com, every redirect title
// ({ title, ns, redirect }), the Template:EventList pages, and the templates a redirect points at.
// Uses curl (it honours the environment's proxy settings, and the wiki rejects some default user agents).
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const API = "https://ftl.fandom.com/api.php";
function api(params) {
  const url = `${API}?${new URLSearchParams({ ...params, format: "json" })}`;
  for (let tries = 0; tries < 4; tries++) {
    try {
      return JSON.parse(execFileSync("curl", ["-sS", "-m", "90", url], { encoding: "utf8", maxBuffer: 64 << 20 }));
    } catch {
      // retry
    }
  }
  throw new Error(`wiki API failed: ${url.slice(0, 200)}`);
}

const titles = [];
let cont = {};
for (;;) {
  const d = api({ action: "query", list: "allpages", apnamespace: "0", apfilterredir: "nonredirects", aplimit: "500", ...cont });
  titles.push(...d.query.allpages.map((p) => p.title));
  if (!d.continue) break;
  cont = d.continue;
}
const rows = [];
for (let i = 0; i < titles.length; i += 50) {
  const d = api({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: titles.slice(i, i + 50).join("|") });
  for (const p of Object.values(d.query.pages)) {
    const rev = p.revisions?.[0];
    if (rev) rows.push({ title: p.title, ns: p.ns, text: rev.slots.main["*"] });
  }
}
// Redirect titles too, so a test can tell a redirect name from a page that does not exist.
const redirects = [];
cont = {};
for (;;) {
  const d = api({ action: "query", list: "allpages", apnamespace: "0", apfilterredir: "redirects", aplimit: "500", ...cont });
  redirects.push(...d.query.allpages.map((p) => p.title));
  if (!d.continue) break;
  cont = d.continue;
}
for (let i = 0; i < redirects.length; i += 50) {
  const d = api({ action: "query", redirects: "1", titles: redirects.slice(i, i + 50).join("|") });
  for (const r of d.query.redirects ?? []) rows.push({ title: r.from, ns: 0, redirect: r.to + (r.tofragment ? `#${r.tofragment}` : "") });
}
// Templates the tests read: every Template:EventList page, and any template a main-namespace redirect points at.
const wanted = new Set(rows.filter((r) => r.redirect?.startsWith("Template:")).map((r) => r.redirect.split("#")[0]));
cont = {};
for (;;) {
  const d = api({ action: "query", list: "allpages", apnamespace: "10", apprefix: "EventList", apfilterredir: "nonredirects", aplimit: "500", ...cont });
  for (const p of d.query.allpages) wanted.add(p.title);
  if (!d.continue) break;
  cont = d.continue;
}
const templates = [...wanted];
for (let i = 0; i < templates.length; i += 50) {
  const d = api({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: templates.slice(i, i + 50).join("|") });
  for (const p of Object.values(d.query.pages)) {
    const rev = p.revisions?.[0];
    if (rev) rows.push({ title: p.title, ns: p.ns, text: rev.slots.main["*"] });
  }
}
rows.sort((a, b) => a.title.localeCompare(b.title));
const out = new URL("../src/game/wiki/dump/pages.jsonl", import.meta.url);
writeFileSync(out, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(`${rows.length} rows (${redirects.length} redirects, ${templates.length} templates) written to ${out.pathname}`);
