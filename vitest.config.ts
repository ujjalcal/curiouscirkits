import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";
import type { Plugin } from "vite";

// Load .hbs files as raw strings (matches Next.js raw-loader behavior)
function hbsRawPlugin(): Plugin {
  return {
    name: "hbs-raw",
    transform(_code: string, id: string) {
      if (id.endsWith(".hbs")) {
        const raw = fs.readFileSync(id, "utf-8");
        return { code: `export default ${JSON.stringify(raw)};`, map: null };
      }
    },
  };
}

export default defineConfig({
  plugins: [hbsRawPlugin()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
