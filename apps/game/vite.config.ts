import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

/**
 * The build is a static site in dist/client. The game is client-only (SSR off in src/start.ts), so the SPA shell
 * prerenders to a plain index.html and no server is needed. GitHub Pages serves it under a subpath:
 * `PAGES_BASE=/slower-than-light/ pnpm build`; the Capacitor shells and a plain host use the default `/`.
 */
const base = process.env.PAGES_BASE || "/";

/**
 * Source maps for Sentry (apps/game/src/game/sentry.ts), so production stack traces show the source. Only when the
 * build has SENTRY_AUTH_TOKEN (the deploy workflows): the maps are uploaded under the commit's release, then deleted
 * from the output, so the site never serves them.
 */
const sentryToken = process.env.SENTRY_AUTH_TOKEN;

// Port 8080 is what scripts/playthrough.mjs expects; all interfaces, so a phone on the LAN can reach it.
export default defineConfig(({ command }) => ({
  base,
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  ...(sentryToken ? { build: { sourcemap: "hidden" as const } } : {}),
  plugins: [
    tailwindcss(),
    tanstackStart({
      // The generated routeTree.gen.ts in the repo's Prettier style, so the dev server does not leave it modified.
      router: { quoteStyle: "double", semicolons: true },
      spa: { enabled: true, prerender: { outputPath: "/index.html", crawlLinks: false } },
    }),
    viteReact(),
    ...(sentryToken && command === "build"
      ? [
          sentryVitePlugin({
            org: "knyz-inc",
            project: "slower-than-light",
            authToken: sentryToken,
            release: process.env.VITE_SENTRY_RELEASE
              ? { name: process.env.VITE_SENTRY_RELEASE }
              : undefined,
            sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
            telemetry: false,
          }),
        ]
      : []),
  ],
}));
