import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.js"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["js/**/*.js"],
      exclude: ["js/bibdle.js", "js/data/**"],
      reporter: ["text", "html"],
    },
  },
});
