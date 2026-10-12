import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Per the user: an iOS app through Capacitor. The web game is the static SPA build (`PAGES_BASE=/ npm run build:pages`,
 * the same build GitHub Pages ships), bundled into the app from dist/client. The ios/ project is generated in CI
 * (.github/workflows/ios.yml) and not committed.
 */
const config: CapacitorConfig = {
  appId: "io.knyazev.slowerthanlight",
  appName: "Slower Than Light",
  webDir: "dist/client",
  ios: {
    contentInset: "never",
  },
};

export default config;
