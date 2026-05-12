# Change: add-complete-testing-workflow

## Why

当前 `ai-investment-assistant` 已经具备较完整的业务能力，但缺少一套系统化、可持续执行的测试流程与测试方案。

现状风险主要集中在以下几个方面：

1. **外部依赖多**：股票、基金、新闻、龙虎榜等能力高度依赖第三方接口，容易受上游超时、限流、字段变更影响。
2. **AI 编排链路长**：`chat route -> investmentAgent -> tools -> upstream APIs` 链路较长，任何一层异常都可能影响用户体验。
3. **业务输出需要可控**：项目面向中老年投资者，必须稳定保持风险提示、避免确定性投资建议、保持中文易懂表达。
4. **当前缺少统一测试入口**：尚未形成覆盖工具层、路由层、Hook/组件层、关键业务链路的统一测试命令、测试分层和验收门槛。
5. **OpenSpec 规则已具备条件**：当前项目的 `openspec/config.yaml` 已明确要求为 proposal/specs/tasks 记录 fallback、loading/error、data freshness、testing/docs 更新，因此适合把完整测试工作流纳入 OpenSpec 管理。

## What Changes

建立一套面向本项目的完整测试流程与测试方案，覆盖以下能力：

### 1. 测试基础设施
- 引入统一的测试分层与测试命令约定
- 明确单元测试、契约测试、组件测试、冒烟测试的边界
- 建立通用 fixture、mock、时间/随机数控制方案

### 2. 工具与方法使用规范
- 为 `src/mastra/tools/*` 建立输入、输出、错误、fallback 的可测试契约
- 为 API route 建立参数校验、错误结构、数据降级策略的统一规范
- 明确“route / service / tool / agent” 的职责分层，避免逻辑散落、难以测试

### 3. Agent 与聊天链路质量保障
- 为 `src/app/api/chat/route.ts` 建立流式返回、登录校验、会话持久化、友好降级的测试要求
- 为 `investment-agent.ts` 建立风险提示、工具调用约束、输出风格约束的验收规则

### 4. UI 与关键用户流程保障
- 为自选股、股票/基金查询、策略页、聊天页建立 loading / empty / error / success 的关键场景测试
- 增加最小可行的 smoke 流程，保证核心用户旅程可回归

### 5. 覆盖率与 CI 门槛
- 定义不同层级的覆盖率目标
- 定义新增功能、Bug 修复必须补测试的规则
- 定义适用于本项目的本地与 CI 执行流程

## Impact

### Affected specs
- **NEW**: `testing-foundation`
- **NEW**: `tool-and-route-contracts`
- **NEW**: `agent-and-ui-quality`

### Affected code / docs (planned)
- `package.json` — 增加测试命令
- `vitest.config.ts` / `test/` — 测试基础设施
- `src/mastra/tools/**` — 工具测试
- `src/app/api/**` — 路由契约测试
- `src/lib/**` — 工具函数、认证、数据层测试
- `src/components/**` / `src/lib/hooks/**` — 组件与 Hook 测试
- CI 配置（GitHub Actions / 其他流水线）— 增加测试阶段
- 项目文档与 OpenSpec 资产 — 记录测试流程、验收门槛、回归流程

## Success Criteria

1. 项目形成统一测试入口，开发者可以使用固定命令执行分层测试。
2. 所有 `src/mastra/tools/*` 至少具备输入输出与 fallback 测试。
3. 所有 API route 至少具备参数校验与错误处理测试。
4. `chat` 主链路具备登录校验、流式响应、异常降级和消息持久化验证。
5. 关键页面具备 loading / empty / error / success 的最小 UI 覆盖。
6. 新功能与 Bug 修复必须附带对应测试，进入可执行流程而非口头约定。
7. OpenSpec 中对“方法怎么使用、如何测试、如何验收”的要求可持续复用到后续功能迭代。
