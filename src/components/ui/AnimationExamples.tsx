/**
 * 动画组件使用示例
 * 
 * 本文件展示如何在项目中使用 Animations.tsx 中的动画组件
 */

"use client";

import { Card, Typography } from "antd";
import {
  FadeInUp,
  FadeIn,
  ScaleIn,
  SlideInLeft,
  SlideInRight,
  StaggerContainer,
  StaggerItem,
  HoverScale,
  PriceChange,
} from "@/components/ui/Animations";

const { Title, Text } = Typography;

/**
 * 示例 1: 基础入场动画
 */
export function BasicAnimations() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <FadeInUp>
        <Card>
          <Title level={4}>淡入上移动画</Title>
          <Text>滚动到此处时，卡片会从下方淡入</Text>
        </Card>
      </FadeInUp>

      <FadeIn delay={0.2}>
        <Card>
          <Title level={4}>淡入动画</Title>
          <Text>简单的淡入效果，延迟 0.2 秒</Text>
        </Card>
      </FadeIn>

      <ScaleIn delay={0.3}>
        <Card>
          <Title level={4}>缩放淡入</Title>
          <Text>从 95% 缩放淡入到 100%</Text>
        </Card>
      </ScaleIn>
    </div>
  );
}

/**
 * 示例 2: 滑入动画
 */
export function SlideAnimations() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <SlideInLeft>
        <Card>
          <Title level={4}>从左滑入</Title>
          <Text>从左侧滑入屏幕</Text>
        </Card>
      </SlideInLeft>

      <SlideInRight>
        <Card>
          <Title level={4}>从右滑入</Title>
          <Text>从右侧滑入屏幕</Text>
        </Card>
      </SlideInRight>
    </div>
  );
}

/**
 * 示例 3: 列表错开入场
 */
export function StaggerAnimations() {
  const items = ["项目 1", "项目 2", "项目 3", "项目 4", "项目 5"];

  return (
    <StaggerContainer style={{ display: "grid", gap: 16 }}>
      {items.map((item) => (
        <StaggerItem key={item}>
          <Card>
            <Text>{item} - 每个项目依次入场，间隔 0.1 秒</Text>
          </Card>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

/**
 * 示例 4: Hover 交互
 */
export function HoverAnimations() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      <HoverScale>
        <Card>
          <Text>悬停放大 1.02x</Text>
        </Card>
      </HoverScale>

      <HoverScale scale={1.05}>
        <Card>
          <Text>悬停放大 1.05x</Text>
        </Card>
      </HoverScale>

      <HoverScale scale={0.98}>
        <Card>
          <Text>悬停缩小 0.98x（按压效果）</Text>
        </Card>
      </HoverScale>
    </div>
  );
}

/**
 * 示例 5: 价格变化动画
 */
export function PriceAnimations() {
  const prices = [100.5, 101.2, 99.8, 102.5];

  return (
    <div style={{ display: "flex", gap: 24 }}>
      {prices.map((price, index) => (
        <PriceChange key={index} value={price}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>
            ¥{price.toFixed(2)}
          </span>
        </PriceChange>
      ))}
    </div>
  );
}

/**
 * 示例 6: 实际应用 - 股票卡片动画
 */
export function StockCardAnimation() {
  const stocks = [
    { name: "贵州茅台", code: "600519", price: 1800.00, change: 2.5 },
    { name: "宁德时代", code: "300750", price: 200.50, change: -1.2 },
    { name: "比亚迪", code: "002594", price: 250.80, change: 3.8 },
  ];

  return (
    <StaggerContainer style={{ display: "grid", gap: 16 }}>
      {stocks.map((stock) => (
        <StaggerItem key={stock.code}>
          <HoverScale>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <Title level={5} style={{ margin: 0 }}>{stock.name}</Title>
                  <Text type="secondary">{stock.code}</Text>
                </div>
                <div style={{ textAlign: "right" }}>
                  <PriceChange value={stock.price}>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>
                      ¥{stock.price.toFixed(2)}
                    </span>
                  </PriceChange>
                  <div style={{ color: stock.change >= 0 ? "#cf1322" : "#389e0d" }}>
                    {stock.change >= 0 ? "+" : ""}{stock.change}%
                  </div>
                </div>
              </div>
            </Card>
          </HoverScale>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
