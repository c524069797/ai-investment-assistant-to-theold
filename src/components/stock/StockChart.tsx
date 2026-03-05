"use client";

import dynamic from "next/dynamic";
import { Spin } from "antd";
import type { StockKLinePoint } from "@/types/stock";
import { STOCK_COLORS } from "@/styles/stock-colors";

const ReactEChartsCore = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spin tip="加载图表中..." />
    </div>
  ),
});

interface StockChartProps {
  data: StockKLinePoint[];
  name: string;
}

export default function StockChart({ data, name }: StockChartProps) {
  if (data.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: "#999" }}>暂无K线数据</div>;
  }

  const dates = data.map((d) => d.date);
  const klineData = data.map((d) => [d.open, d.close, d.low, d.high]);
  const volumes = data.map((d) => d.volume);

  const option = {
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "cross" as const },
      textStyle: { fontSize: 14 },
    },
    legend: {
      data: [name, "成交量"],
      textStyle: { fontSize: 14 },
    },
    grid: [
      { left: "10%", right: "5%", top: 60, height: "50%" },
      { left: "10%", right: "5%", top: "72%", height: "18%" },
    ],
    xAxis: [
      {
        type: "category" as const,
        data: dates,
        axisLabel: { fontSize: 12 },
        gridIndex: 0,
      },
      {
        type: "category" as const,
        data: dates,
        gridIndex: 1,
        axisLabel: { show: false },
      },
    ],
    yAxis: [
      {
        type: "value" as const,
        scale: true,
        axisLabel: { fontSize: 12 },
        gridIndex: 0,
      },
      {
        type: "value" as const,
        scale: true,
        gridIndex: 1,
        axisLabel: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name,
        type: "candlestick" as const,
        data: klineData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: STOCK_COLORS.up,
          color0: STOCK_COLORS.down,
          borderColor: STOCK_COLORS.up,
          borderColor0: STOCK_COLORS.down,
        },
      },
      {
        name: "成交量",
        type: "bar" as const,
        data: volumes,
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const d = data[params.dataIndex];
            return d.close >= d.open ? STOCK_COLORS.up : STOCK_COLORS.down;
          },
        },
      },
    ],
    dataZoom: [
      {
        type: "inside" as const,
        xAxisIndex: [0, 1],
        start: 60,
        end: 100,
      },
    ],
  };

  return <ReactEChartsCore option={option} style={{ height: 440 }} notMerge />;
}
