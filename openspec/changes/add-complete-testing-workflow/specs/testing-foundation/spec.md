# testing-foundation Specification

## Purpose

为 `ai-investment-assistant` 建立可执行、可扩展、可进入 CI 的基础测试体系。

## Requirements

### Requirement: 分层测试体系

项目 MUST 按不同职责建立分层测试，避免把所有验证都堆到页面点击或人工回归中。

#### Scenario: 纯逻辑优先使用单元测试
- **GIVEN** 代码位于 `src/lib/*`、`src/styles/*` 或可抽离的纯计算函数中
- **WHEN** 为该能力补测试
- **THEN** 系统 MUST 优先使用无网络、无数据库、无 React 渲染的单元测试
- **AND** 测试 SHOULD 覆盖边界值、异常输入和格式化输出

#### Scenario: 工具能力使用契约测试
- **GIVEN** 代码位于 `src/mastra/tools/*`
- **WHEN** 为工具补测试
- **THEN** 测试 MUST 验证输入、输出、错误和 fallback
- **AND** 测试 MUST 不依赖真实第三方接口

#### Scenario: API 路由使用契约测试
- **GIVEN** 代码位于 `src/app/api/*`
- **WHEN** 为 route 补测试
- **THEN** 测试 MUST 验证参数校验、成功返回和异常返回
- **AND** `chat` route MUST 单独验证流式返回与友好降级

#### Scenario: UI 使用关键场景测试
- **GIVEN** 代码位于 `src/components/*`、`src/lib/hooks/*` 或关键页面链路
- **WHEN** 为 UI 补测试
- **THEN** 测试 MUST 至少覆盖 loading、empty、error、success 四态中的适用场景
- **AND** 测试 SHOULD 以关键交互和关键文案为主，而不是追求脆弱的 DOM 细节快照

### Requirement: 统一测试入口

项目 MUST 提供统一测试命令，便于本地执行和 CI 集成。

#### Scenario: 统一脚本命名
- **GIVEN** 项目需要执行测试
- **WHEN** 开发者在本地或 CI 中运行命令
- **THEN** 项目 MUST 提供统一入口，例如 `test`、`test:coverage`、`test:routes`、`test:tools`、`test:ui`、`test:smoke`
- **AND** 命令命名 SHOULD 反映测试层级

#### Scenario: 新增测试时沿用目录约定
- **GIVEN** 开发者新增测试文件
- **WHEN** 放置测试代码
- **THEN** 测试目录 SHOULD 尽量镜像源码目录
- **AND** 通用 fixture、mock、helper MUST 存放到独立 `test/*` 目录

### Requirement: Mock 与 Fixture 可复用

项目 MUST 建立可复用的 mock 与 fixture 规范，避免每个测试自建一套不一致的假数据。

#### Scenario: 第三方行情接口统一 mock
- **GIVEN** 测试需要依赖东方财富、天天基金或其他上游接口
- **WHEN** 运行测试
- **THEN** 系统 MUST 使用统一的 HTTP mock 方案
- **AND** 测试 MUST 不直接访问真实第三方接口

#### Scenario: 数据库与认证模块统一 mock
- **GIVEN** route、Hook 或组件依赖 `@/lib/db`、`@/lib/auth`
- **WHEN** 运行单元测试或契约测试
- **THEN** 测试 SHOULD 优先通过模块 mock 隔离数据库与签名细节
- **AND** 仅在必要时才进入更接近集成的验证

#### Scenario: 时间与随机值可预测
- **GIVEN** 代码依赖 `Date.now()`、随机 sessionId 或随机消息 ID
- **WHEN** 运行测试
- **THEN** 测试 MUST 控制时间与随机行为
- **AND** 断言 MUST 保持确定性

### Requirement: 覆盖率与门槛

项目 MUST 为不同测试层级定义基本覆盖目标和合并门槛。

#### Scenario: 不同层级采用不同覆盖率目标
- **GIVEN** 项目统计代码覆盖率
- **WHEN** 查看覆盖率报告
- **THEN** 纯逻辑与工具函数 SHOULD 达到较高覆盖率
- **AND** route 与 tools SHOULD 具备主要分支覆盖
- **AND** 组件与 Hook SHOULD 以关键用户场景覆盖为主

#### Scenario: 新功能和 Bug 修复需要测试
- **GIVEN** 开发者新增功能或修复 Bug
- **WHEN** 提交变更
- **THEN** 该变更 MUST 附带对应测试或回归测试
- **AND** 如果暂时无法补测试，变更说明 MUST 清楚记录风险与补测计划
