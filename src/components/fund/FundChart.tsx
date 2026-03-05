"use client";

import dynamic from "next/dynamic";
import { Spin } from "antd";
import type { FundHistoryNav } from "@/types/fund";

const ReactEChartsCore = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spin tip="加载图表中..." />
    </div>
  ),
});

interface FundChartProps {
  data: FundHistoryNav[];
  name: string;
}

export default function FundChart({ data, name }: FundChartProps) {
  if (data.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: "#999" }}>暂无净值数据</div>;
  }

  // Reverse for chronological order
  const sorted = [...data].reverse();
  const dates = sorted.map((d) => d.date);
  const navs = sorted.map((d) => d.nav);
  const accNavs = sorted.map((d) => d.accNav);

  const option = {
    tooltip: {
      trigger: "axis" as const,
      textStyle: { fontSize: 14 },
    },
    legend: {
      data: ["单位净值", "累计净值"],
      textStyle: { fontSize: 14 },
    },
    grid: {
      left: "10%",
      right: "5%",
      top: 50,
      bottom: 40,
    },
    xAxis: {
      type: "category" as const,
      data: dates,
      axisLabel: { fontSize: 12, rotate: 30 },
    },
    yAxis: {
      type: "value" as const,
      scale: true,
      axisLabel: { fontSize: 12 },
    },
    series: [
      {
        name: "单位净值",
        type: "line" as const,
        data: navs,
        smooth: true,
        lineStyle: { width: 2 },
        itemStyle: { color: "#1677ff" },
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(22,119,255,0.3)" },
              { offset: 1, color: "rgba(22,119,255,0.02)" },
            ],
          },
        },
      },
      {
        name: "累计净值",
        type: "line" as const,
        data: accNavs,
        smooth: true,
        lineStyle: { width: 2, type: "dashed" as const },
        itemStyle: { color: "#faad14" },
      },
    ],
    dataZoom: [{ type: "inside" as const, start: 0, end: 100 }],
  };

  return <ReactEChartsCore option={option} style={{ height: 340 }} notMerge />;
}
