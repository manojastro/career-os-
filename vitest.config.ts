import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["**/learning/**/*.test.ts", "**/*.test.ts"],
    exclude: ["node_modules/**", "test-artifacts/**", ".output/**", "dist/**"],
    environment: "node",
  },
});
