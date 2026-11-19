import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "python3 -m http.server 4173 --directory _site",
    port: 4173,
    reuseExistingServer: false,
    timeout: 20000,
  },
});
