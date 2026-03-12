import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["echarts", "echarts-for-react", "antd", "@ant-design/icons"],
  serverExternalPackages: ["@mastra/core"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
