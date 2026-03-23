"use client";

import {
  AudioOutlined,
  MehOutlined,
  SolutionOutlined,
  StarFilled,
  StockOutlined,
} from "@ant-design/icons";
import { Button, Card, Empty, Skeleton, Typography } from "antd";
import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import { useMarketIndices } from "@/lib/hooks/useStockData";
import { useUser } from "@/lib/hooks/useUser";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { formatPercent, formatPrice, getPriceColor } from "@/styles/stock-colors";
import type { MarketIndex } from "@/types/stock";

const { Text } = Typography;

const ASK_AI_ACTIONS = [
  {
    title: "大盘怎么走？",
    prompt: "请用通俗方式分析今天A股大盘情绪、强弱方向和需要重点观察的风险点。",
  },
  {
    title: "自选谁更强？",
    prompt: "请结合我当前自选思路，告诉我今天更该先看哪类股票，并给出简短理由。",
  },
  {
    title: "今天看什么板块？",
    prompt: "请用简洁方式告诉我今天A股更值得先关注哪些方向，并说明背后的原因。",
  },
];

interface WatchlistItem {
  code: string;
  name: string;
  market: number;
  type: string;
}

interface WatchlistSummaryItem {
  code: string;
  name: string;
  market: number;
  price: number;
  changePercent: number;
}

interface SentimentData {
  score: number;
  label: string;
  advice: string;
  risingCount: number;
  fallingCount: number;
}

interface AggressiveScanResult {
  code: string;
  name: string;
  market: number;
  price: number;
  changePercent: number;
  turnoverRate: number;
  industry: string;
  pe: number;
  pb: number;
  totalMarketCap: number;
}

const HOTSPOT_TOPICS = [
  { keyword: "人工智能", icon: "🤖", heat: 95 },
  { keyword: "新能源", icon: "⚡", heat: 88 },
  { keyword: "半导体", icon: "💎", heat: 85 },
  { keyword: "机器人", icon: "🦾", heat: 82 },
  { keyword: "数字经济", icon: "🌐", heat: 78 },
  { keyword: "医药", icon: "💊", heat: 72 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fetcher<T>(url: string): Promise<T> {
  return fetch(url)
    .then((res) => res.json())
    .then((json) => {
      if (!json.success) {
        throw new Error(json.error || "请求失败");
      }
      return json.data as T;
    });
}

function buildPromptChatLink(title: string, prompt: string) {
  return `/chat?title=${encodeURIComponent(title)}&prompt=${encodeURIComponent(prompt)}`;
}

function buildIndexPrompt(index: MarketIndex) {
  return `请用简洁方式分析${index.name}（${index.code}）当前状态，重点说明：1）市场情绪；2）短线支撑和压力；3）今天更应该观察什么信号；4）给新手一句提醒。当前价格 ${index.price.toFixed(2)}，涨跌幅 ${index.changePercent.toFixed(2)}%。`;
}

function getIndexComment(index: MarketIndex) {
  if (index.changePercent >= 1.2) {
    return "情绪升温，偏强运行";
  }
  if (index.changePercent >= 0.3) {
    return "红盘整理，市场偏暖";
  }
  if (index.changePercent > 0) {
    return "小幅翻红，观察承接";
  }
  if (index.changePercent <= -1.2) {
    return "跌幅明显，先控风险";
  }
  if (index.changePercent <= -0.3) {
    return "震荡回落，等待企稳";
  }
  return "窄幅震荡，静待方向";
}

function getSentiment(indices?: MarketIndex[]): SentimentData {
  if (!indices?.length) {
    return {
      score: 48,
      label: "中性",
      advice: "市场整体偏中性，先看核心指数方向。",
      risingCount: 0,
      fallingCount: 0,
    };
  }

  const risingCount = indices.filter((item) => item.changePercent > 0).length;
  const fallingCount = indices.filter((item) => item.changePercent < 0).length;
  const avgChange = indices.reduce((sum, item) => sum + item.changePercent, 0) / indices.length;
  const score = clamp(Math.round(50 + avgChange * 18 + (risingCount - fallingCount) * 6), 8, 92);

  if (score <= 35) {
    return {
      score,
      label: "偏弱",
      advice: "情绪偏谨慎，优先控制节奏和仓位。",
      risingCount,
      fallingCount,
    };
  }
  if (score >= 65) {
    return {
      score,
      label: "偏强",
      advice: "情绪偏热，强势机会多，但也别追高。",
      risingCount,
      fallingCount,
    };
  }

  return {
    score,
    label: "中性",
    advice: "市场整体偏中性，先看主线再决定动作。",
    risingCount,
    fallingCount,
  };
}

function buildTodaySummary(sentiment: SentimentData) {
  if (sentiment.score >= 65) {
    return "科技成长偏强，消费防御偏弱，留意主线轮动。";
  }
  if (sentiment.score <= 35) {
    return "红利防守偏强，高位题材偏弱，注意仓位节奏。";
  }
  return "科技红利分化运行，弱消费偏弱，先看轮动确认。";
}

function buildStrategyBullets(sentiment: SentimentData, watchlist: WatchlistSummaryItem[]) {
  const strongest = [...watchlist].sort((a, b) => b.changePercent - a.changePercent)[0];

  return [
    sentiment.score >= 65
      ? "优先关注趋势较强的大盘蓝筹和主线方向。"
      : sentiment.score <= 35
        ? "今天先看防守，避免在弱势里频繁追高。"
        : "先观察方向，等指数给出更明确的信号。",
    strongest
      ? `自选里可先盯 ${strongest.name}，它当前相对更强。`
      : "还没有明显领涨自选，可先从指数和板块入手。",
    sentiment.risingCount >= sentiment.fallingCount
      ? "可以留意科技、新能源等弹性方向是否轮动。"
      : "注意高位回撤和情绪降温带来的分化压力。",
    "无论强弱，仓位和节奏都比一次判断更重要。",
  ];
}

function buildSparkline(changePercent: number) {
  if (changePercent > 0.6) {
    return "6,31 18,22 31,26 43,14 57,18 70,9 84,12 96,4";
  }
  if (changePercent > 0) {
    return "6,28 18,24 31,27 43,20 57,22 70,15 84,16 96,10";
  }
  if (changePercent < -0.6) {
    return "6,10 18,12 31,18 43,14 57,24 70,20 84,28 96,30";
  }
  return "6,20 18,20 31,21 43,20 57,21 70,20 84,21 96,20";
}

function getStrongestItem<T extends { changePercent: number }>(items: T[]) {
  return [...items].sort((a, b) => b.changePercent - a.changePercent)[0] ?? null;
}

function getWeakestItem<T extends { changePercent: number }>(items: T[]) {
  return [...items].sort((a, b) => a.changePercent - b.changePercent)[0] ?? null;
}

function pickIndices(indices: MarketIndex[] | undefined, preferredCodes: string[], limit: number) {
  if (!indices?.length) {
    return [];
  }

  const picked = preferredCodes
    .map((code) => indices.find((item) => item.code === code))
    .filter((item): item is MarketIndex => !!item);

  const rest = indices.filter((item) => !picked.some((pickedItem) => pickedItem.code === item.code));
  return [...picked, ...rest].slice(0, limit);
}

function formatTurnoverMeta(index: MarketIndex) {
  return `量 ${(index.volume / 100000000).toFixed(1)}亿 / 额 ${(index.amount / 100000000).toFixed(1)}亿`;
}

function getHotspotFlowStatus(stock: AggressiveScanResult) {
  if (stock.changePercent >= 3 && stock.turnoverRate >= 10) {
    return {
      label: "资金追涨",
      tone: "strong",
      hint: "量价同步偏强，适合优先盯盘。",
    };
  }
  if (stock.changePercent >= 0 && stock.turnoverRate >= 6) {
    return {
      label: "资金试探",
      tone: "warm",
      hint: "有资金回流，重点看能否持续放量。",
    };
  }
  if (stock.turnoverRate >= 8) {
    return {
      label: "高换手分歧",
      tone: "split",
      hint: "分歧加大，容易出现冲高回落。",
    };
  }
  return {
    label: "等待确认",
    tone: "calm",
    hint: "热度尚可，但还需要进一步确认。",
  };
}

function DashboardTitle({ summary }: { summary: string }) {
  return (
    <div className="modern-dashboard-title modern-dashboard-title--compact">
      <Text className="modern-dashboard-title__summary modern-dashboard-title__summary--single">{summary}</Text>
    </div>
  );
}

function DashboardHero({
  summary,
  sentiment,
  indices,
  watchlistCount,
  strongestWatchlist,
}: {
  summary: string;
  sentiment: SentimentData;
  indices: MarketIndex[];
  watchlistCount: number;
  strongestWatchlist: WatchlistSummaryItem | null;
}) {
  const strongestIndex = getStrongestItem(indices);
  const spotlightName = strongestWatchlist?.name ?? strongestIndex?.name ?? "观察主线";
  const spotlightDesc = strongestWatchlist
    ? `${strongestWatchlist.name} 当前领跑自选，可作为优先跟踪标的。`
    : strongestIndex
      ? `${strongestIndex.name} 当前表现更强，适合作为盘面风向参考。`
      : "先看核心指数和情绪，再决定今天的观察顺序。";
  const spotlightIndices = indices.slice(0, 4);

  return (
    <section className="modern-dashboard-stage">
      <div className="modern-dashboard-stage__backdrop" />
      <div className="modern-dashboard-stage__grid">
        <div className="modern-dashboard-stage__main">
          <div className="modern-dashboard-stage__eyebrow">AI investment copilot</div>
          <h1 className="modern-dashboard-stage__title">投资驾驶舱</h1>
          <div className="modern-dashboard-stage__summary">{summary}</div>
          <Text className="modern-dashboard-stage__advice">{sentiment.advice}</Text>
          <div className="modern-dashboard-stage__actions">
            <Link href="/chat">
              <Button type="primary" icon={<AudioOutlined />}>打开 AI 助手</Button>
            </Link>
            <Link href="/strategy">
              <Button icon={<SolutionOutlined />}>查看今日策略</Button>
            </Link>
          </div>
          <div className="modern-dashboard-stage__quick-links">
            {ASK_AI_ACTIONS.map((item) => (
              <Link key={item.title} href={buildPromptChatLink(item.title, item.prompt)} className="modern-dashboard-stage__quick-link">
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        <div className="modern-dashboard-stage__focus-card">
          <span className="modern-dashboard-stage__focus-label">今日焦点</span>
          <strong className="modern-dashboard-stage__focus-title">{spotlightName}</strong>
          <span className="modern-dashboard-stage__focus-desc">{spotlightDesc}</span>
          <div className="modern-dashboard-stage__stats-grid">
            <div className="modern-dashboard-stage__stat-card">
              <span className="modern-dashboard-stage__stat-label">市场情绪</span>
              <strong className="modern-dashboard-stage__stat-value">{sentiment.label}（{sentiment.score}）</strong>
              <span className="modern-dashboard-stage__stat-hint">当前盘面偏向 {sentiment.label}</span>
            </div>
            <div className="modern-dashboard-stage__stat-card">
              <span className="modern-dashboard-stage__stat-label">指数涨跌</span>
              <strong className="modern-dashboard-stage__stat-value">{sentiment.risingCount} 涨 / {sentiment.fallingCount} 跌</strong>
              <span className="modern-dashboard-stage__stat-hint">先看广度，再看主线</span>
            </div>
            <div className="modern-dashboard-stage__stat-card">
              <span className="modern-dashboard-stage__stat-label">自选股票</span>
              <strong className="modern-dashboard-stage__stat-value">{watchlistCount}</strong>
              <span className="modern-dashboard-stage__stat-hint">重点标的可并排跟踪</span>
            </div>
            <div className="modern-dashboard-stage__stat-card">
              <span className="modern-dashboard-stage__stat-label">优先方向</span>
              <strong className="modern-dashboard-stage__stat-value">{strongestWatchlist ? "自选强势" : strongestIndex ? "指数领涨" : "等待确认"}</strong>
              <span className="modern-dashboard-stage__stat-hint">先看强，再决定仓位节奏</span>
            </div>
          </div>
        </div>

        <div className="modern-dashboard-stage__signal-board">
          <div className="modern-dashboard-stage__signal-head">
            <span>核心风向</span>
            <strong>实时指数板</strong>
          </div>
          <div className="modern-dashboard-stage__signal-list">
            {spotlightIndices.map((item) => {
              const color = getPriceColor(item.changePercent);

              return (
                <Link key={item.code} href={buildPromptChatLink(`${item.name}分析`, buildIndexPrompt(item))} className="modern-dashboard-stage__signal-card">
                  <span className="modern-dashboard-stage__signal-name">{item.name}</span>
                  <strong className="modern-dashboard-stage__signal-price">{formatPrice(item.price)}</strong>
                  <span className="modern-dashboard-stage__signal-change" style={{ color }}>{formatPercent(item.changePercent)}</span>
                  <span className="modern-dashboard-stage__signal-note">{getIndexComment(item)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AskAIPanel() {
  return (
    <Card className="modern-dashboard-panel modern-dashboard-panel--ask" title="问 AI" extra={<AudioOutlined />}>
      <Link href="/chat" className="modern-panel-cover-link">
        <div className="modern-ask-placeholder">让 AI 帮你分析大盘、个股、板块轮动和自选强弱，桌面端可以把它当成你的实时投研入口。</div>
      </Link>
      <div className="modern-ask-actions">
        {ASK_AI_ACTIONS.map((item) => (
          <Link key={item.title} href={buildPromptChatLink(item.title, item.prompt)}>
            <Button type="link">{item.title}</Button>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function SentimentPanel({ sentiment }: { sentiment: SentimentData }) {
  const rotation = -90 + sentiment.score * 1.8;

  return (
    <Link href="/strategy" className="modern-panel-link">
      <Card className="modern-dashboard-panel modern-dashboard-panel--sentiment home-click-card" title="市场情绪" extra={<MehOutlined />}>
        <div className="sentiment-card-body">
          <div className="sentiment-card-body__label">{sentiment.label}</div>
          <div className="sentiment-gauge">
            <div className="sentiment-gauge__arc" />
            <div className="sentiment-gauge__needle" style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }} />
            <div className="sentiment-gauge__center" />
          </div>
          <div className="sentiment-scale-label sentiment-scale-label--left">谨慎</div>
          <div className="sentiment-scale-label sentiment-scale-label--right">贪婪</div>
          <div className="sentiment-card-body__summary">
            <div>市场情绪：</div>
            <strong>{sentiment.label}（{sentiment.score}）</strong>
          </div>
          <Text className="sentiment-card-body__tip">{sentiment.advice}</Text>
        </div>
      </Card>
    </Link>
  );
}

function WatchlistPanel({ items, loading }: { items: WatchlistSummaryItem[]; loading: boolean }) {
  return (
    <Card className="modern-dashboard-panel modern-dashboard-panel--watchlist" title="我的自选" extra={<StarFilled />}>
      {loading ? (
        <div className="modern-watchlist-loading">
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        </div>
      ) : items.length ? (
        <div className="modern-watchlist-list">
          {items.map((item) => {
            const color = getPriceColor(item.changePercent);

            return (
              <Link key={item.code} href={`/stocks/${encodeURIComponent(item.code)}?market=${item.market}`} className="modern-watchlist-row">
                <div className="modern-watchlist-row__main">
                  <div className="modern-watchlist-row__name">{item.name}（{item.code}）</div>
                  <div className="modern-watchlist-row__price-line">
                    <span className="modern-watchlist-row__price">{formatPrice(item.price)}</span>
                    <span className="modern-watchlist-row__change" style={{ color }}>
                      {item.changePercent > 0 ? "▲" : item.changePercent < 0 ? "▼" : "•"} {formatPercent(item.changePercent)}
                    </span>
                  </div>
                </div>
                <svg className="modern-watchlist-row__spark" viewBox="0 0 102 36" fill="none" aria-hidden>
                  <polyline
                    points={buildSparkline(item.changePercent)}
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="modern-panel-empty">
          <Empty description="还没有自选股" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          <Link href="/stocks">
            <Button type="primary" icon={<StockOutlined />}>去添加股票</Button>
          </Link>
        </div>
      )}
    </Card>
  );
}

function StrategyPanel({ sentiment, watchlist }: { sentiment: SentimentData; watchlist: WatchlistSummaryItem[] }) {
  const bullets = buildStrategyBullets(sentiment, watchlist);

  return (
    <Link href="/strategy" className="modern-panel-link">
      <Card className="modern-dashboard-panel modern-dashboard-panel--strategy home-click-card" title="AI 今日策略" extra={<SolutionOutlined />}>
        <ul className="modern-strategy-list">
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </Link>
  );
}

function MarketPulsePanel({
  sentiment,
  indices,
  watchlist,
}: {
  sentiment: SentimentData;
  indices: MarketIndex[];
  watchlist: WatchlistSummaryItem[];
}) {
  const strongestIndex = getStrongestItem(indices);
  const weakestIndex = getWeakestItem(indices);
  const strongestWatchlist = getStrongestItem(watchlist);
  const strategyBullets = buildStrategyBullets(sentiment, watchlist);

  return (
    <Card className="modern-dashboard-panel modern-dashboard-panel--pulse" title="盘面速览" extra={<StockOutlined />}>
      <div className="market-pulse-grid">
        <div className="market-pulse-item">
          <span className="market-pulse-item__label">最强指数</span>
          <strong className="market-pulse-item__value">{strongestIndex ? `${strongestIndex.name} ${formatPercent(strongestIndex.changePercent)}` : "暂无数据"}</strong>
          <span className="market-pulse-item__hint">{strongestIndex ? getIndexComment(strongestIndex) : "等待行情数据返回"}</span>
        </div>
        <div className="market-pulse-item">
          <span className="market-pulse-item__label">风险观察</span>
          <strong className="market-pulse-item__value">{weakestIndex ? `${weakestIndex.name} ${formatPercent(weakestIndex.changePercent)}` : "暂无数据"}</strong>
          <span className="market-pulse-item__hint">{weakestIndex ? "弱势指数更容易带来情绪回落" : "等待行情数据返回"}</span>
        </div>
        <div className="market-pulse-item">
          <span className="market-pulse-item__label">自选风向</span>
          <strong className="market-pulse-item__value">{strongestWatchlist ? `${strongestWatchlist.name} ${formatPercent(strongestWatchlist.changePercent)}` : "先建立自选池"}</strong>
          <span className="market-pulse-item__hint">{strongestWatchlist ? "先看自选中的强势票是否能继续走强" : "把重点标的加入自选，桌面端更方便并排观察"}</span>
        </div>
        <div className="market-pulse-item">
          <span className="market-pulse-item__label">操作提醒</span>
          <strong className="market-pulse-item__value">{strategyBullets[0]}</strong>
          <span className="market-pulse-item__hint">{sentiment.risingCount >= sentiment.fallingCount ? "可以多看主线延续" : "先控制节奏，避免情绪化追涨"}</span>
        </div>
      </div>
    </Card>
  );
}

function IndexTiles({ indices, compact }: { indices: MarketIndex[]; compact?: boolean }) {
  return (
    <div className={compact ? "mobile-reference-grid mobile-reference-grid--indices" : "modern-index-grid modern-index-grid--desktop"}>
      {indices.map((item) => {
        const color = getPriceColor(item.changePercent);

        return (
          <Link key={item.code} href={buildPromptChatLink(`${item.name}分析`, buildIndexPrompt(item))} className="modern-panel-link">
            <Card className="modern-dashboard-panel modern-index-tile home-click-card" title={item.name}>
              <div className="modern-index-tile__value">{formatPrice(item.price)}</div>
              <div className="modern-index-tile__change" style={{ color }}>
                {item.changePercent > 0 ? "▲" : item.changePercent < 0 ? "▼" : "•"}
                {formatPercent(item.changePercent)}
              </div>
              <div className="modern-index-tile__meta">
                <div>{getIndexComment(item)}</div>
                <div>{formatTurnoverMeta(item)}</div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function DesktopIndexSection({ indices, loading }: { indices: MarketIndex[]; loading: boolean }) {
  if (loading) {
    return (
      <Card className="modern-dashboard-panel modern-dashboard-panel--indices">
        <Skeleton active paragraph={{ rows: 3 }} title={false} />
      </Card>
    );
  }

  if (!indices.length) {
    return (
      <Card className="modern-dashboard-panel modern-dashboard-panel--indices">
        <Empty description="暂无指数数据" />
      </Card>
    );
  }

  return (
    <Card className="modern-dashboard-panel modern-dashboard-panel--indices" title="核心指数">
      <IndexTiles indices={indices} />
    </Card>
  );
}

function HotspotFlowPanel({ items, loading }: { items: AggressiveScanResult[]; loading: boolean }) {
  return (
    <Card
      className="modern-dashboard-panel modern-dashboard-panel--hotspot"
      title="热点板块 / 资金风向"
      extra={(
        <Link href="/strategy">
          <Button type="link">查看完整热点策略</Button>
        </Link>
      )}
    >
      <div className="hotspot-flow-panel">
        <div className="hotspot-flow-panel__topics">
          <div className="hotspot-flow-panel__section-head">
            <strong>当前主线热点</strong>
            <span>优先看热度高、易形成联动的方向</span>
          </div>
          <div className="hotspot-topic-grid">
            {HOTSPOT_TOPICS.map((topic) => (
              <Link key={topic.keyword} href={`/stocks?keyword=${encodeURIComponent(topic.keyword)}`} className="hotspot-topic-card">
                <span className="hotspot-topic-card__icon">{topic.icon}</span>
                <span className="hotspot-topic-card__name">{topic.keyword}</span>
                <span className="hotspot-topic-card__heat">热度 {topic.heat}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="hotspot-flow-panel__flows">
          <div className="hotspot-flow-panel__section-head">
            <strong>活跃资金风向</strong>
            <span>基于 5-30 元区间高换手标的快速判断资金偏好</span>
          </div>

          {loading ? (
            <Skeleton active paragraph={{ rows: 5 }} title={false} />
          ) : items.length ? (
            <div className="hotspot-flow-list">
              {items.slice(0, 5).map((item) => {
                const color = getPriceColor(item.changePercent);
                const status = getHotspotFlowStatus(item);

                return (
                  <Link key={item.code} href={`/stocks/${item.code}?market=${item.market}`} className="hotspot-flow-row">
                    <div className="hotspot-flow-row__main">
                      <div className="hotspot-flow-row__title-line">
                        <strong>{item.name}</strong>
                        <span>{item.code}</span>
                        {item.industry ? <em>{item.industry}</em> : null}
                      </div>
                      <div className="hotspot-flow-row__meta">{status.hint}</div>
                    </div>
                    <div className="hotspot-flow-row__stats">
                      <div className="hotspot-flow-row__price" style={{ color }}>{formatPrice(item.price)}</div>
                      <div className="hotspot-flow-row__change" style={{ color }}>{formatPercent(item.changePercent)}</div>
                      <div className="hotspot-flow-row__turnover">换手 {item.turnoverRate.toFixed(2)}%</div>
                      <span className={`hotspot-flow-row__badge hotspot-flow-row__badge--${status.tone}`}>{status.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Empty description="暂无热点资金数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      </div>
    </Card>
  );
}

function useWatchlistSummary(items: WatchlistItem[]) {
  const stockItems = items.filter((item) => item.type === "stock").slice(0, 4);
  const key = stockItems.length
    ? `/api/stocks?action=watchlist-summary&items=${encodeURIComponent(JSON.stringify(stockItems.map((item) => ({ code: item.code, name: item.name, market: item.market }))))}`
    : null;

  const { data, isLoading } = useSWR<Array<{ code: string; name: string; market: number; price: number; changePercent: number }>>(key, fetcher, {
    refreshInterval: 60000,
  });

  return {
    data: data ?? [],
    isLoading,
  };
}

function useHotspotScan() {
  const { data, isLoading } = useSWR<AggressiveScanResult[]>(
    "/api/stocks?action=strategy-scan&mode=aggressive&count=6",
    fetcher,
    { refreshInterval: 60000 },
  );

  return {
    data: data ?? [],
    isLoading,
  };
}

export default function HomePage() {
  const { data: indices, isLoading: indicesLoading } = useMarketIndices();
  const { items: watchlist } = useWatchlist();
  useUser();
  const { data: watchlistSummary, isLoading: watchlistLoading } = useWatchlistSummary(watchlist);
  const { data: hotspotScan, isLoading: hotspotLoading } = useHotspotScan();

  const coreIndices = useMemo(() => pickIndices(indices, ["000001", "399001", "399006"], 3), [indices]);
  const desktopIndices = useMemo(() => pickIndices(indices, ["000001", "399001", "399006", "000300", "000016", "000688"], 6), [indices]);
  const stockWatchlistCount = watchlist.filter((item) => item.type === "stock").length;
  const sentiment = getSentiment(coreIndices);
  const summary = buildTodaySummary(sentiment);
  const strongestWatchlist = getStrongestItem(watchlistSummary);

  return (
    <div className="page-container modern-dashboard-page">
      <section className="modern-dashboard-desktop">
        <DashboardHero
          summary={summary}
          sentiment={sentiment}
          indices={desktopIndices}
          watchlistCount={stockWatchlistCount}
          strongestWatchlist={strongestWatchlist}
        />

        <div className="modern-dashboard-desktop-grid">
          <div className="modern-dashboard-desktop-span-5">
            <AskAIPanel />
          </div>
          <div className="modern-dashboard-desktop-span-3">
            <SentimentPanel sentiment={sentiment} />
          </div>
          <div className="modern-dashboard-desktop-span-4">
            <MarketPulsePanel sentiment={sentiment} indices={desktopIndices} watchlist={watchlistSummary} />
          </div>
          <div className="modern-dashboard-desktop-span-7">
            <WatchlistPanel items={watchlistSummary} loading={watchlistLoading} />
          </div>
          <div className="modern-dashboard-desktop-span-5">
            <StrategyPanel sentiment={sentiment} watchlist={watchlistSummary} />
          </div>
        </div>

        <HotspotFlowPanel items={hotspotScan} loading={hotspotLoading} />
        <DesktopIndexSection indices={desktopIndices} loading={indicesLoading} />
      </section>

      <section className="modern-dashboard-mobile mobile-reference-dashboard">
        <DashboardTitle summary={summary} />

        <div className="mobile-reference-grid mobile-reference-grid--cards" style={{ marginBottom: 12 }}>
          <AskAIPanel />
          <SentimentPanel sentiment={sentiment} />
          <WatchlistPanel items={watchlistSummary} loading={watchlistLoading} />
          <StrategyPanel sentiment={sentiment} watchlist={watchlistSummary} />
        </div>

        {indicesLoading ? (
          <Card className="modern-dashboard-panel" style={{ marginBottom: 8 }}>
            <Skeleton active paragraph={{ rows: 3 }} title={false} />
          </Card>
        ) : coreIndices.length ? (
          <IndexTiles indices={coreIndices} compact />
        ) : (
          <Card className="modern-dashboard-panel" style={{ marginBottom: 8 }}>
            <Empty description="暂无指数数据" />
          </Card>
        )}
      </section>

      <div className="modern-dashboard-footer">
        投资有风险，AI 分析仅供参考。
      </div>
    </div>
  );
}
