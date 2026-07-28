import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    // 用 **/ 前缀覆盖嵌套依赖目录（如 .opencode/node_modules、.kilocode/node_modules），
    // 否则第三方库自带的测试会被扫进来
    exclude: ["playwright/**", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/app/**/page.tsx",
        "src/app/layout.tsx",
        "src/app/loading.tsx",
        "src/middleware.ts",
      ],
    },
  },
});
