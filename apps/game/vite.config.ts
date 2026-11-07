import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";

/**
 * Static GitHub Pages build: `PAGES_BASE=/slower-than-light/ npm run build:pages`. The game
 * is client-only (SSR off in src/start.ts), so the SPA shell prerenders to a
 * plain index.html and no Nitro server is needed.
 */
const pagesBase = process.env.PAGES_BASE;

/**
 * Source maps for Sentry (apps/game/src/game/sentry.ts), so production stack traces show the source. Only when the
 * build has SENTRY_AUTH_TOKEN (the deploy workflows): the maps are uploaded under the commit's release, then deleted
 * from the output, so the site never serves them.
 */
const sentryToken = process.env.SENTRY_AUTH_TOKEN;

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
export default defineConfig(({ command, isPreview }) => ({
  ...(pagesBase ? { base: pagesBase } : {}),
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  ...(sentryToken ? { build: { sourcemap: "hidden" as const } } : {}),
  plugins: [
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart({
      // The generated routeTree.gen.ts in the repo's Prettier style, so the dev server does not leave it modified.
      router: { quoteStyle: "double", semicolons: true },
      ...(pagesBase
        ? { spa: { enabled: true, prerender: { outputPath: "/index.html", crawlLinks: false } } }
        : {}),
    }),
    ...(!pagesBase && (command === "build" || isPreview)
      ? [
          nitro({
            preset: "vercel",
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
          }),
        ]
      : []),
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
            sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map", "./.output/**/*.map"] },
            telemetry: false,
          }),
        ]
      : []),
  ],
}));
