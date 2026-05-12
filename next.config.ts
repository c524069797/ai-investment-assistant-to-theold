import path from "node:path";
import type { NextConfig } from "next";

// `import type` 是 TS 的类型导入语法：只在类型检查阶段存在，不会进入运行时代码。
// `NextConfig` 让配置对象获得完整的 Next.js 类型提示，
// 尤其在升级版本时，哪些字段可用、字段值是否合法，会更清晰。
const nextConfig: NextConfig = {
  // 这些依赖会同时出现在 Server Components / Client Components 边界附近，
  // 显式交给 Next 转译可以减少 ESM / CJS、样式注入、浏览器端兼容问题。
  transpilePackages: ["echarts", "antd", "@ant-design/icons"],

  // Mastra 主要运行在 Node 服务端，保留为 external package，避免被打进浏览器 bundle。
  serverExternalPackages: ["@mastra/core"],

  turbopack: {
    // 明确 Turbopack 的项目根目录，避免 monorepo / 外层目录推断不准。
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
