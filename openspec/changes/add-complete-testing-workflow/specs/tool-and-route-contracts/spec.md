# tool-and-route-contracts Specification

## Purpose

为工具层和 API route 层建立稳定的输入输出契约、错误语义和 fallback 规则，使“功能方法怎么使用”具备可测试、可复用的统一标准。

## Requirements

### Requirement: Tool 输入输出契约稳定

所有 `src/mastra/tools/*` 工具 MUST 提供稳定、可断言的输入输出结构。

#### Scenario: 查询型工具返回明确命中状态
- **GIVEN** 用户调用 `stock-lookup` 或 `fund-lookup` 这类查询型工具
- **WHEN** 输入存在对应标的
- **THEN** 工具 MUST 返回可识别的命中结果
- **AND** 返回结果 SHOULD 包含代码、名称、关键价格字段或摘要字段

#### Scenario: 未命中数据时返回可恢复结果
- **GIVEN** 工具未找到对应股票、基金或主题数据
- **WHEN** 执行工具
- **THEN** 工具 MUST 返回明确的未命中状态或错误说明
- **AND** Agent MUST 能基于该结果继续向用户解释，而不是直接崩溃

#### Scenario: 上游失败时执行 fallback
- **GIVEN** 工具依赖的第三方接口超时、报错或部分字段缺失
- **WHEN** 执行工具
- **THEN** 工具 MUST 返回统一的 fallback 结果或错误结果
- **AND** 返回结构 MUST 保持可解析
- **AND** 测试 MUST 覆盖这种 fallback 行为

### Requirement: 工具能力必须可说明、可测试

工具的使用方式 MUST 能通过输入、输出、错误和 fallback 场景表达，而不只依赖口头约定。

#### Scenario: 技术分析工具提供可解释结果
- **GIVEN** 用户调用 `stock-analyzer`、`bottom-finder` 或 `hotspot-analyzer`
- **WHEN** 工具完成分析
- **THEN** 输出 MUST 包含可解释的分析结果，而不只是裸数字
- **AND** 输出 SHOULD 包含信号摘要、风险说明或辅助解释字段

#### Scenario: 风险评估工具保留风险语义
- **GIVEN** 用户调用 `risk-assessment`
- **WHEN** 工具返回风险等级
- **THEN** 输出 MUST 保留风险提示或约束性表述
- **AND** 测试 MUST 验证不存在“确定赚钱”或“绝对建议买卖”的表达

### Requirement: API Route 参数校验一致

所有 API route MUST 对必要参数进行显式校验，并在缺失时返回稳定的错误响应。

#### Scenario: 缺少必要参数返回 400
- **GIVEN** 客户端请求 `stocks`、`funds`、`watchlist` 等 route
- **WHEN** 缺少必要参数
- **THEN** route MUST 返回 400
- **AND** 错误体 MUST 明确说明缺失字段

#### Scenario: 非法 action 返回明确错误
- **GIVEN** 客户端请求带有未知 action 的 route
- **WHEN** route 无法识别该 action
- **THEN** route MUST 返回明确错误
- **AND** 响应 MUST 保持一致结构

### Requirement: API Route 错误与降级一致

route 层 MUST 对上游异常和内部异常提供可预测的错误语义。

#### Scenario: 普通数据 route 在异常时返回错误 JSON
- **GIVEN** `stocks`、`funds`、`watchlist`、`users` route 处理请求
- **WHEN** 上游接口或数据库调用失败
- **THEN** route MUST 返回结构化错误 JSON
- **AND** 响应 SHOULD 包含 `success: false` 或等价的明确失败标记

#### Scenario: chat route 在异常时返回友好文本降级
- **GIVEN** `chat` route 处理流式对话
- **WHEN** stream 中途失败、模型不可用、session 异常或上游报错
- **THEN** route MUST 返回用户可理解的友好降级文本
- **AND** 系统 SHOULD 尝试保留本次对话上下文或持久化必要消息

### Requirement: 服务端访问边界清晰

所有外部数据访问 MUST 继续通过服务端边界完成，避免测试与实现绕过既有约束。

#### Scenario: 浏览器不直连第三方行情接口
- **GIVEN** 项目需要获取股票、基金或资讯数据
- **WHEN** 前端页面请求数据
- **THEN** 页面 MUST 通过 `src/app/api/*` 请求服务端数据
- **AND** 测试 SHOULD 验证关键页面或 Hook 的数据来源指向本项目 route，而不是第三方域名
