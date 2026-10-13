import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 8090,
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
  plugins: [react()],
});
