import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);
const pretextRoot = dirname(require.resolve("@chenglou/pretext/package.json"));
const pretextLayout = resolve(pretextRoot, "src/layout.ts");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@chenglou/pretext": pretextLayout,
    },
  },
});
