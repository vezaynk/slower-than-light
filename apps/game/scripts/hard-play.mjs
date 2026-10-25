#!/usr/bin/env node
/**
 * Hard session through the served UI.
 * Playwright clicks and keys only. The page snapshot is read from window.__stl.game().
 * This file does not call the in-page act mutator or any simulation function.
 */
import { pathToFileURL } from "node:url";

if (!process.argv.includes("--profile")) {
  process.argv.push("--profile", "hard");
}

const { main } = await import("./playthrough.mjs");

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry === import.meta.url) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(String(err?.stack || err));
      process.exit(1);
    });
}
