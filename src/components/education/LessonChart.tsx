"use client";

import dynamic from "next/dynamic";
import { Spin, Typography } from "antd";

const EChartClient = dynamic(() => import("@/components/charts/EChartClient"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spin tip="加载图表中..." />
    </div>
  ),
});

interface LessonChartProps {
  title: string;
  option: Record<string, unknown>;
  height?: number;
}

export default function LessonChart({ title, option, height = 350 }: LessonChartProps) {
  return (
    <div style={{ margin: "20px 0", border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
        <Typography.Text strong style={{ fontSize: 14 }}>
          {title}
        </Typography.Text>
      </div>
      <div style={{ padding: "8px 8px 0" }}>
        <EChartClient option={option} style={{ height }} />
      </div>
    </div>
  );
}
