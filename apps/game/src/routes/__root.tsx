import type { ReactNode } from "react";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

const APP_NAME = "LTA: Lighter Than Air";
const DESCRIPTION = "Hold the Lark together and outrun the fleet.";
const BASE = import.meta.env.BASE_URL;
/**
 * The site's public URL (the Pages workflow passes it), so the share-card images get the absolute
 * URLs link previews need. Without it the page has no og:image.
 */
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

function shareCard() {
  const meta: Array<Record<string, string>> = [
    { property: "og:title", content: APP_NAME },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:type", content: "x:game" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
  if (SITE_URL) {
    meta.push(
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: `${SITE_URL}/og.jpg` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "x:game:image", content: `${SITE_URL}/x-banner.jpg` },
      { property: "x:game:image:width", content: "1200" },
      { property: "x:game:image:height", content: "264" },
    );
  }
  return meta;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Lighter Than Air" },
      { title: APP_NAME },
      { name: "description", content: DESCRIPTION },
      { name: "theme-color", content: "#020308" },
      ...shareCard(),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: `${BASE}favicon.svg` },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=VT323&display=swap",
      },
      { rel: "manifest", href: `${BASE}manifest.webmanifest` },
      { rel: "apple-touch-icon", href: `${BASE}icons/icon-180.png` },
    ],
  }),
  // The document shell is always server-rendered, even with SSR off in src/start.ts.
  // Route components (the game) render only in the browser.
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
