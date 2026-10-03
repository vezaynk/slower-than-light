import { createStart } from "@tanstack/react-start";

/**
 * SSR is off for every route. The server still sends the document shell (head, scripts,
 * PWA tags), and the game renders only in the browser. The game reads localStorage, the
 * window size, and timers on first render, so a server pass only produced a throwaway frame.
 */
export const startInstance = createStart(() => ({
  defaultSsr: false,
}));
