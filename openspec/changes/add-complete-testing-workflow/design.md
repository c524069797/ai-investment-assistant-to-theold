# Design: add-complete-testing-workflow

## Overview

本变更不直接实现全部测试代码，而是先为项目建立一套可持续落地的测试架构、执行流程与方法使用规范。

目标不是“补几个测试文件”，而是建立：

- 分层清晰的测试体系
- 稳定可复用的 mock / fixture / helper
- 面向 AI Agent + 外部行情数据场景的契约测试方法
- 能进入 CI 的最小回归流程

## Testing Stack

建议测试技术栈如下：

- **Vitest**：统一单元测试 / 组件测试 / route 测试入口
- **@testing-library/react**：组件与 Hook 测试
- **@testing-library/jest-dom**：DOM 断言增强
- **@testing-library/user-event**：交互测试
- **MSW**：模拟东方财富、天天基金等 HTTP 上游
- **vi.mock / module mock**：模拟 `@/lib/db`、`@/lib/auth`、Mastra tool 依赖
- **Coverage**：Vitest 内置 coverage（v8）

> 原则：能用模块 mock 解决的，不接真实上游；能在工具层测试的，不把复杂逻辑堆到页面层验证。

## Layered Test Architecture

### 1. Pure logic / utility tests
目标对象：
- `src/lib/auth.ts`
- `src/styles/stock-colors.ts`
- `src/lib/utils/*`
- `stock-analyzer.ts` 中可抽离的指标计算函数

特点：
- 无网络
- 无数据库
- 无 React 渲染
- 追求高覆盖率和快速执行

### 2. Tool contract tests
目标对象：
- `src/mastra/tools/*`

关注点：
- 输入是否合法
- 找不到标的时的返回结构
- 上游超时时是否降级
- 返回字段是否稳定
- 是否包含风险提示 / 辅助解释字段（适用时）

约束：
- tool 本身负责“Agent 可调用包装 + 统一输出结构”
- 复杂算法优先拆到可单测函数
- 不在 tool 中散落难以 mock 的隐式状态

### 3. Route contract tests
目标对象：
- `src/app/api/stocks/route.ts`
- `src/app/api/funds/route.ts`
- `src/app/api/watchlist/route.ts`
- `src/app/api/users/route.ts`
- `src/app/api/chat/route.ts`

关注点：
- 参数缺失是否返回 400
- 正常请求是否返回统一 JSON / text stream
- 上游失败是否返回 500 或友好降级
- `chat` route 是否正确处理 401、session、stream fallback

约束：
- route 只负责 request/response、参数校验、错误映射
- 第三方接口调用必须继续通过 server route 间接访问
- 面向前端的错误结构尽量保持稳定

### 4. Hook / component tests
目标对象：
- `src/lib/hooks/useWatchlist.ts`
- `src/lib/hooks/useStockData.ts`
- `src/components/chat/*`
- `src/components/stock/*`
- `src/components/fund/*`

关注点：
- loading / empty / error / success 四态
- 关键交互是否正确触发
- 页面不依赖真实 API 即可回归
- 适老化 UI 不被破坏（文案、按钮、反馈可见）

### 5. Smoke tests
目标对象：
- 核心用户旅程，而不是全部页面细节

建议覆盖：
1. 登录后进入首页并看到核心数据卡片
2. 股票搜索 -> 进入详情 -> 加入自选
3. 基金搜索 -> 查看详情
4. 打开聊天页 -> 发送问题 -> 获得响应或友好降级
5. 策略页切换爸爸/妈妈模式并成功加载列表

## Method Usage Conventions

为保证“功能方法怎么使用”可测试、可维护，建议统一以下职责：

### route 层
职责：
- 解析参数
- 调用 service / db / agent
- 转换 HTTP 响应
- 统一错误码与错误消息

不应承担：
- 重算法逻辑
- 大段数据转换
- 与 UI 语义强耦合的拼接逻辑

### tool 层
职责：
- 定义输入 schema
- 组织单个业务能力的统一输出
- 处理可预见 fallback
- 为 Agent 提供可调用接口

不应承担：
- 多页面状态逻辑
- 数据库存取编排
- 与具体 route 的 HTTP 协议细节耦合

### agent 层
职责：
- 指令、角色、工具编排
- 风险提示、输出风格约束
- 决定何时调用哪些工具

不应承担：
- 复杂业务计算实现
- 上游接口细节
- 可测试逻辑散落在 prompt 文字之外却无辅助代码保障

## Proposed Test Directories

```text
src/
  app/
    api/
      chat/route.test.ts
      funds/route.test.ts
      stocks/route.test.ts
      users/route.test.ts
      watchlist/route.test.ts
  lib/
    auth.test.ts
    utils/
      *.test.ts
    hooks/
      useWatchlist.test.tsx
      useStockData.test.tsx
  mastra/
    tools/
      stock-lookup.test.ts
      fund-lookup.test.ts
      market-overview.test.ts
      risk-assessment.test.ts
      bottom-finder.test.ts
      hotspot-analyzer.test.ts
      stock-analyzer.test.ts
      stock-news.test.ts
    agents/
      investment-agent.test.ts
  components/
    chat/*.test.tsx
    stock/*.test.tsx
    fund/*.test.tsx

test/
  setup.ts
  mocks/
    server.ts
    handlers.ts
  fixtures/
    stocks.ts
    funds.ts
    chat.ts
    watchlist.ts
  helpers/
    render.tsx
    next-request.ts
    stream.ts
```

## Suggested Commands

建议后续在 `package.json` 中落地：

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:routes": "vitest run src/app/api",
    "test:tools": "vitest run src/mastra/tools",
    "test:ui": "vitest run src/components src/lib/hooks",
    "test:smoke": "vitest run test/smoke"
  }
}
```

## Coverage Targets

建议目标：

- `src/lib/auth.ts` / 工具函数：**80%+**
- `src/mastra/tools/*`：**75%+**
- `src/app/api/*`：**70%+**
- `src/lib/hooks/*` / `src/components/*`：**60%+**
- `chat` 主链路：必须有关键场景覆盖，不只看覆盖率数字

## Rollout Plan

### Phase 1
先落地测试基础设施和最小命令。

### Phase 2
优先补：
- `auth.ts`
- `watchlist route`
- `stocks route`
- `funds route`
- `stock-lookup tool`
- `fund-lookup tool`

### Phase 3
补高风险链路：
- `stock-analyzer`
- `stock-news`
- `chat route`
- `investment-agent`

### Phase 4
补 UI 与 smoke 场景。

## Acceptance Strategy

每个新增功能或修复至少回答以下问题：

1. 这个能力的输入和输出是什么？
2. 正常情况如何验证？
3. 上游失败时如何降级？
4. loading / empty / error 如何表现？
5. 是否需要风险提示或合规约束？
6. 应该落在哪一层测试，而不是全部堆在 E2E？

这样后续无论是人写代码还是 AI 协作，都能围绕同一套测试语言推进。
