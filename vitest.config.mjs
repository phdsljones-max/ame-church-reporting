import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import TestDriver from "testdriverai/vitest";

config();

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{js,ts}"],
    testTimeout: 900000,
    hookTimeout: 900000,
    reporters: ["default", TestDriver()],
    setupFiles: ["testdriverai/vitest/setup"],
  },
});
