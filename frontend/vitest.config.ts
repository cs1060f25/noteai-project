import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "src/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)",
      "src/test/**/*.{test,spec}.?(c|m)[jt]s?(x)",
    ],
    setupFiles: ["./src/test/setup.ts"], // optional if you add jest-dom setup
  },
});