"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { BarChart, CandlestickChart, LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import type { ECharts, EChartsCoreOption, SetOptionOpts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  CandlestickChart,
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

interface EChartClientProps {
  option: EChartsCoreOption;
  className?: string;
  style?: CSSProperties;
  notMerge?: boolean;
  lazyUpdate?: boolean;
}

export default function EChartClient({
  option,
  className,
  style,
  notMerge = false,
  lazyUpdate = true,
}: EChartClientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = echarts.init(container, undefined, { renderer: "canvas" });
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const options: SetOptionOpts = { notMerge, lazyUpdate };
    chart.setOption(option, options);
  }, [lazyUpdate, notMerge, option]);

  return <div ref={containerRef} className={className} style={style} />;
}
