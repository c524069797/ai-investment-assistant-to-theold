# Implementation Tasks

## Phase 1: 测试基础设施

- [ ] 1.1 选择并接入测试框架
  - 建议：Vitest + Testing Library + MSW
  - 输出：测试依赖、基础配置、全局 setup

- [ ] 1.2 增加统一测试命令
  - `test`
  - `test:watch`
  - `test:coverage`
  - `test:tools`
  - `test:routes`
  - `test:ui`
  - `test:smoke`

- [ ] 1.3 建立测试目录结构
  - `test/setup.ts`
  - `test/mocks/handlers.ts`
  - `test/fixtures/*`
  - `test/helpers/*`

- [ ] 1.4 建立通用 mock 规范
  - 时间固定
  - 随机数控制
  - `fetch` / 上游接口 mock
  - `@/lib/db`、`@/lib/auth` 模块 mock

## Phase 2: 纯逻辑与工具函数测试

- [ ] 2.1 为 `src/lib/auth.ts` 添加测试
  - `hashPassword`
  - `createSessionToken`
  - `verifySessionToken`
  - 覆盖签名错误、过期 token、非法 token

- [ ] 2.2 为通用工具函数添加测试
  - `src/styles/stock-colors.ts`
  - `src/lib/utils/*`
  - 常量映射与格式化逻辑

- [ ] 2.3 抽离并测试高复杂度指标计算函数
  - RSI
  - MACD
  - Bollinger
  - KDJ
  - MA
  - 年内百分位
  - 信号汇总逻辑

## Phase 3: Mastra Tools 契约测试

- [ ] 3.1 为基础查询工具添加测试
  - `stock-lookup`
  - `fund-lookup`
  - `market-overview`
  - `risk-assessment`

- [ ] 3.2 为策略型工具添加测试
  - `bottom-finder`
  - `hotspot-analyzer`

- [ ] 3.3 为高风险工具添加测试
  - `stock-analyzer`
  - `stock-news`

- [ ] 3.4 统一工具测试断言模板
  - 输入合法
  - 输入非法
  - 未命中数据
  - 上游异常
  - fallback 返回结构稳定

## Phase 4: API Route 契约测试

- [ ] 4.1 为 `stocks` route 添加测试
  - `quote`
  - `search`
  - `topic`
  - `kline`
  - `indices`
  - `ranking`
  - `strategy-scan`
  - `watchlist-summary`
  - `watchlist-insight`

- [ ] 4.2 为 `funds` route 添加测试
  - `estimate`
  - `search`
  - `history`
  - `list`
  - `detail`

- [ ] 4.3 为 `watchlist` / `users` route 添加测试
  - 参数校验
  - 成功返回
  - 数据库异常

- [ ] 4.4 为 `chat` route 添加测试
  - 未登录返回 401
  - `messages` 缺失返回 400
  - `sessionId` 缺失返回 400
  - 流式成功返回
  - stream 中途异常时返回友好 fallback
  - 成功后持久化 assistant 消息

## Phase 5: Hook 与组件测试

- [ ] 5.1 为 `useWatchlist` 添加测试
  - 初始加载
  - 用户切换
  - 添加/删除自选
  - 事件驱动刷新
  - 异常时清空/降级

- [ ] 5.2 为 `useStockData` 添加测试
  - 自动刷新
  - 参数变化
  - 空数据/错误状态

- [ ] 5.3 为关键组件添加测试
  - `ChatWindow`
  - `MessageBubble`
  - `StockCard`
  - `StockChart`
  - `FundCard`
  - `FundChart`
  - `WatchlistInsightCard`

- [ ] 5.4 为页面关键四态建立最小覆盖
  - loading
  - empty
  - error
  - success

## Phase 6: Agent 质量与提示约束验证

- [ ] 6.1 为 `investment-agent` 添加配置级测试
  - 模型初始化
  - 工具注册完整性
  - 指令文本中包含风险提示与禁止确定性建议的约束

- [ ] 6.2 增加 Agent 行为回归检查清单
  - 个股问题必须联动 `stockAnalyzer` + `stockNews`
  - 风险评估类问题必须保留风险提醒
  - 不直接输出“必须买/必须卖”类结论

## Phase 7: Smoke 流程与 CI

- [ ] 7.1 建立本地 smoke 流程
  - 登录用户
  - 首页加载
  - 股票搜索到详情
  - 添加自选
  - AI 对话最小链路

- [ ] 7.2 建立 CI 执行顺序
  - lint
  - typecheck
  - unit/routes/tools/ui tests
  - coverage
  - smoke

- [ ] 7.3 定义门槛
  - 新功能必须带测试
  - Bug 修复必须带回归测试
  - 合并前至少通过 `test` 与 `test:coverage`

## Phase 8: 文档与团队使用方式

- [ ] 8.1 在项目文档中补测试入口说明
- [ ] 8.2 在 OpenSpec 中沉淀“新功能测试模板”
- [ ] 8.3 在 Obsidian 中沉淀测试流程总结，便于后续复用
