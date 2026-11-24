import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works from any static root; output goes to ./out.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "out",
    emptyOutDir: true,
    assetsDir: "assets",
  },
});
