import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const gameRoot = fileURLToPath(new URL("../game", import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 8 * 60 * 1000,
  expect: { timeout: 20_000 },
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8097",
    viewport: { width: 1560, height: 720 },
    video: { mode: "on", size: { width: 1560, height: 720 } },
    launchOptions: { args: ["--disable-dev-shm-usage"] },
  },
  webServer: {
    // 8080 is the shared preview. This server is only for the recording browser.
    command: "node scripts/with-app-env.mjs ./node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 8097 --strictPort",
    cwd: gameRoot,
    url: "http://127.0.0.1:8097",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
