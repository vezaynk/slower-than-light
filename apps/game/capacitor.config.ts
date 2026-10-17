import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shells through Capacitor. The web game is the static SPA build (`PAGES_BASE=/` build:pages, the same
 * build GitHub Pages ships), bundled from dist/client. ios/ and android/ are generated in CI
 * (.github/workflows/ios.yml and android.yml) and gitignored. appId
 * io.knyazev.lighterthanair is the iOS bundle id and the Android application id.
 * After `cap add android`, scripts/prepare-android.mjs locks sensor landscape and
 * hides the system bars.
 */
const config: CapacitorConfig = {
  appId: "io.knyazev.lighterthanair",
  appName: "Slower Than Light",
  webDir: "dist/client",
  ios: {
    contentInset: "never",
  },
};

export default config;
