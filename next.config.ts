import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["echarts", "echarts-for-react", "antd", "@ant-design/icons"],
  serverExternalPackages: ["@mastra/core"],
};

export default nextConfig;
