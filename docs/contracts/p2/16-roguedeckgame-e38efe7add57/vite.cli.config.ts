import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    target: "node22",
    outDir: "dist-cli",
    emptyOutDir: false,
    ssr: true,
    rollupOptions: {
      input: {
        "game-cli": resolve(__dirname, "src/game-cli/main.ts"),
        "simulate-runs": resolve(__dirname, "src/game-cli/simulate-runs.ts")
      },
      output: {
        entryFileNames: "[name].mjs"
      }
    }
  }
});
