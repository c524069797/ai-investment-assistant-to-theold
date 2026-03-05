# AI 智能投资助手 - 项目代码地图

> **Vibe Coding 导航文档** — 快速定位代码，精准修改，节省 Token

## 技术栈

Next.js 16 (App Router) + Mastra AI + Ant Design 6 + ECharts + TypeScript + SWR

## 架构总览

```
用户浏览器
  ↓ SWR hooks (自动刷新)
前端页面 (src/app/*/page.tsx)
  ↓ fetch
API 代理路由 (src/app/api/*)
  ↓
东方财富 API / 天天基金 API / Mastra Agent (OpenAI)
```

---

## 文件索引 (按功能模块)

### 🔧 配置层

| 文件 | 职责 |
|------|------|
| `next.config.ts` | transpilePackages(echarts/antd), serverExternalPackages(@mastra/core) |
| `.env.local` | OPENAI_API_KEY, OPENAI_BASE_URL |
| `src/styles/theme.ts` | AntD 适老化主题 (字号18, 按钮48px, 高对比度) |
| `src/styles/stock-colors.ts` | 红涨绿跌颜色常量 + getPriceColor/formatPercent 工具函数 |

### 📐 布局层

| 文件 | 职责 |
|------|------|
| `src/app/layout.tsx` | 根布局: AntdProvider + AppHeader + BottomNav |
| `src/app/globals.css` | 全局样式: 字体、滚动条、.page-container、.main-content |
| `src/components/layout/AntdProvider.tsx` | ConfigProvider + 字号上下文 (useFontSize hook) |
| `src/components/layout/AppHeader.tsx` | 顶部导航栏: Logo + A-/A+ 字号调节 |
| `src/components/layout/BottomNav.tsx` | 底部5个Tab: 首页/AI助手/策略/股票/学堂 |

### 📊 数据层

| 文件 | 职责 |
|------|------|
| `src/types/stock.ts` | StockQuote, StockKLinePoint, StockSearchResult, MarketIndex 类型 |
| `src/types/fund.ts` | FundBasicInfo, FundEstimate, FundHistoryNav, FundSearchResult 类型 |
| `src/types/education.ts` | Lesson, QuizQuestion 类型 |
| `src/lib/constants/market.ts` | 大盘指数列表, 基金类型, K线周期映射, **策略模式定义** (StrategyMode) |
| `src/lib/constants/education.ts` | 8节课程完整内容 + 测验题 (getLessonById 函数) |

### 🌐 API 客户端 (服务端, 绕 CORS)

| 文件 | 函数 | 数据源 |
|------|------|--------|
| `src/lib/api/eastmoney.ts` | fetchStockQuote, searchStocks, fetchStockKLine, fetchMarketIndices | 东方财富 push2 API |
| `src/lib/api/tiantianfund.ts` | fetchFundEstimate, searchFunds, fetchFundHistoryNav, fetchFundList | 天天基金 API (JSONP解析) |

### 🛤️ API 路由 (服务端代理)

| 文件 | 参数 | 用途 |
|------|------|------|
| `src/app/api/stocks/route.ts` | ?action=quote\|search\|kline\|indices | 股票数据代理 |
| `src/app/api/funds/route.ts` | ?action=estimate\|search\|history\|list | 基金数据代理 |
| `src/app/api/chat/route.ts` | POST {messages, threadId} | AI 聊天流式接口 → Mastra Agent |

### 🪝 客户端 Hooks

| 文件 | Hooks | 说明 |
|------|-------|------|
| `src/lib/hooks/useStockData.ts` | useStockQuote, useStockSearch, useStockKLine, useMarketIndices | SWR 封装, 15-60s 自动刷新 |
| `src/lib/hooks/useWatchlist.ts` | useWatchlist → {items, addItem, removeItem, isInWatchlist} | localStorage + useSyncExternalStore |

### 🤖 AI Agent (Mastra)

| 文件 | 职责 |
|------|------|
| `src/mastra/index.ts` | Mastra 实例, 注册 investmentAgent |
| `src/mastra/agents/investment-agent.ts` | Agent 定义: 指令(中文/适老/风险提醒/双策略), 模型(gpt-4o), 6个工具 |
| `src/mastra/tools/stock-lookup.ts` | 股票查询工具: 代码/名称 → 实时行情 |
| `src/mastra/tools/fund-lookup.ts` | 基金查询工具: 代码/名称 → 净值+历史 |
| `src/mastra/tools/market-overview.ts` | 大盘概览工具: → 5大指数 + 市场摘要 |
| `src/mastra/tools/risk-assessment.ts` | 风险评估工具: 投资类型/金额/期限 → 风险等级 + 策略建议 |
| `src/mastra/tools/bottom-finder.ts` | **爸爸策略工具**: RSI(14)/布林带(20,2)/MA(250)/年内百分位 → 8分制信号 |
| `src/mastra/tools/hotspot-analyzer.ts` | **妈妈策略工具**: 热点追踪 + 5-30元价格过滤 + 换手率排序 |

### 📄 页面

| 文件 | 路由 | 功能 |
|------|------|------|
| `src/app/page.tsx` | `/` | 首页仪表盘: 欢迎语、策略切换(爸爸/妈妈)、大盘指数、自选预览、快捷入口 |
| `src/app/chat/page.tsx` | `/chat` | AI 聊天页 (仅包装 ChatWindow 组件) |
| `src/app/strategy/page.tsx` | `/strategy` | **策略筛选页**: 爸爸模式(技术分析) / 妈妈模式(热点追踪) |
| `src/app/stocks/page.tsx` | `/stocks` | 股票搜索 + 大盘指数概览 |
| `src/app/stocks/[code]/page.tsx` | `/stocks/:code` | 股票详情: 行情+K线图(日/周/月)+加自选 |
| `src/app/funds/page.tsx` | `/funds` | 基金搜索 + 类型筛选 |
| `src/app/funds/[code]/page.tsx` | `/funds/:code` | 基金详情: 估值+净值走势图+历史表 |
| `src/app/education/page.tsx` | `/education` | 课程网格 (8节课) |
| `src/app/education/[lessonId]/page.tsx` | `/education/:id` | 课程正文 + 测验 + "问AI老师" |
| `src/app/watchlist/page.tsx` | `/watchlist` | 自选列表: 实时数据+删除+空状态引导 |

### 🧩 UI 组件

| 文件 | 用于 | 职责 |
|------|------|------|
| `src/components/chat/ChatWindow.tsx` | /chat | useChat + 流式消息 + 快捷提问标签 |
| `src/components/chat/MessageBubble.tsx` | ChatWindow | 用户/AI 消息气泡 (UIMessage.parts 提取文本) |
| `src/components/stock/StockCard.tsx` | 首页/股票/自选 | 股票/指数信息卡 (红涨绿跌) |
| `src/components/stock/StockChart.tsx` | 股票详情 | ECharts K线图+成交量 (dynamic import, ssr:false) |
| `src/components/fund/FundCard.tsx` | 基金列表 | 基金信息卡+类型标签 |
| `src/components/fund/FundChart.tsx` | 基金详情 | ECharts 净值走势线图 (dynamic import, ssr:false) |
| `src/components/education/LessonCard.tsx` | 课程列表 | 课程卡片 (图标+序号+描述) |
| `src/components/education/Quiz.tsx` | 课程详情 | 多选测验: 大按钮+正误反馈+解析+计分 |

---

## 常见修改场景速查

| 想做什么 | 改哪里 |
|----------|--------|
| 修改 AI 人设/指令 | `src/mastra/agents/investment-agent.ts` → instructions |
| 添加新 AI 工具 | `src/mastra/tools/` 新建 + agent 文件注册 |
| 换 AI 模型 | `investment-agent.ts` → model: openai("xxx") |
| 改主题/字号/颜色 | `src/styles/theme.ts` |
| 改涨跌颜色 | `src/styles/stock-colors.ts` |
| 改底部导航 Tab | `src/components/layout/BottomNav.tsx` → NAV_ITEMS |
| 添加新页面 | `src/app/新路由/page.tsx` |
| 改股票数据源 | `src/lib/api/eastmoney.ts` |
| 改基金数据源 | `src/lib/api/tiantianfund.ts` |
| 添加课程内容 | `src/lib/constants/education.ts` → LESSONS 数组 |
| 改爸爸策略参数 | `src/mastra/tools/bottom-finder.ts` (RSI阈值/布林带参数等) |
| 改妈妈策略参数 | `src/mastra/tools/hotspot-analyzer.ts` (价格区间/热点列表等) |
| 改策略页面 UI | `src/app/strategy/page.tsx` |
| 改首页策略描述 | `src/app/page.tsx` + `src/lib/constants/market.ts` → STRATEGY_MODES |
| 改 API 刷新频率 | `src/lib/hooks/useStockData.ts` → refreshInterval |
| 改自选存储方式 | `src/lib/hooks/useWatchlist.ts` (当前 localStorage) |

## 数据流

```
股票页搜索 "茅台"
  → useStockSearch("茅台")           [useStockData.ts]
  → GET /api/stocks?action=search    [api/stocks/route.ts]
  → searchStocks("茅台")             [eastmoney.ts]
  → 东方财富搜索API
  → 返回 StockSearchResult[]
  → 用户点击 → /stocks/600519?market=1
  → useStockQuote(1, "600519")       [useStockData.ts, 30s刷新]
  → useStockKLine(1, "600519")       [useStockData.ts, 60s刷新]
  → StockChart 渲染 K线图            [StockChart.tsx, ECharts]
```

```
AI 聊天 "帮我查茅台"
  → sendMessage()                    [ChatWindow.tsx, @ai-sdk/react]
  → POST /api/chat {messages}        [api/chat/route.ts]
  → mastra.getAgent("investmentAgent").stream()
  → Agent 调用 stockLookup 工具      [stock-lookup.ts]
  → fetchStockQuote → 东方财富API
  → 流式返回文本                      [TextStreamChatTransport]
```
