# agent-and-ui-quality Specification

## Purpose

为聊天链路、Agent 编排、Hook 与关键页面建立质量保障标准，确保用户感知层的体验稳定、可回归。

## Requirements

### Requirement: Chat 链路可回归

`src/app/api/chat/route.ts` 与相关 UI MUST 具备最小可回归测试覆盖。

#### Scenario: 未登录用户访问 chat route
- **GIVEN** 请求未携带有效 session cookie
- **WHEN** 客户端调用 `POST /api/chat`
- **THEN** route MUST 返回 401
- **AND** 响应 MUST 明确表示未登录

#### Scenario: 会话参数缺失时拒绝请求
- **GIVEN** 请求 body 缺少 `messages` 或 `sessionId`
- **WHEN** 客户端调用 `POST /api/chat`
- **THEN** route MUST 返回 400
- **AND** 错误信息 MUST 可用于前端识别和提示

#### Scenario: 流式成功时保存对话
- **GIVEN** 用户已登录且 stream 正常完成
- **WHEN** chat route 返回 assistant 内容
- **THEN** 系统 MUST 在结束后持久化 assistant 消息
- **AND** 若当前会话标题仍为默认值，系统 SHOULD 根据首条用户问题更新标题

#### Scenario: 流式失败时提供友好降级
- **GIVEN** 模型通道异常、上游报错、stream 中断或 session 异常
- **WHEN** chat route 处理中发生错误
- **THEN** 系统 MUST 返回面向用户的友好文本
- **AND** 文本 SHOULD 提示稍后重试或转到其他功能页完成基础查询

### Requirement: Agent 输出受控

`investment-agent` MUST 持续遵守风险提示、工具调用和输出风格约束。

#### Scenario: 个股问题联动分析与新闻工具
- **GIVEN** 用户询问具体个股、代码或“某股票怎么样”
- **WHEN** Agent 生成回答
- **THEN** Agent MUST 使用技术分析与新闻信息的组合能力
- **AND** 回答 MUST 基于工具结果，而不是要求用户自行提供 K 线或数据

#### Scenario: 投资建议保留风险提示
- **GIVEN** 用户询问买卖建议、仓位建议或投资判断
- **WHEN** Agent 回答
- **THEN** 输出 MUST 保留风险提醒
- **AND** 输出 MUST 避免“保证盈利”“必须买入”“必须卖出”类确定性表述

#### Scenario: 输出适合中老年用户阅读
- **GIVEN** Agent 生成回答
- **WHEN** 用户阅读结果
- **THEN** 回答 SHOULD 使用中文、通俗解释和重点数字
- **AND** 回答 SHOULD 控制长度，避免过度堆砌术语

### Requirement: Hook 与页面状态完整

关键 Hook、页面和组件 MUST 覆盖 loading / empty / error / success 的实际场景。

#### Scenario: 自选股 Hook 在用户切换和刷新事件下更新
- **GIVEN** `useWatchlist` 依赖当前用户和浏览器事件
- **WHEN** 用户切换账号或触发 `watchlist-update`
- **THEN** Hook MUST 重新拉取数据并更新状态
- **AND** 请求失败时 MUST 进入可恢复状态

#### Scenario: 数据展示页保留四态体验
- **GIVEN** 股票页、基金页、策略页或聊天页加载数据
- **WHEN** 数据成功、为空、失败或加载中
- **THEN** 页面 MUST 提供明确反馈
- **AND** 不得因接口异常直接呈现无解释的空白页面

#### Scenario: 适老化与可访问性不回退
- **GIVEN** 项目已强调大字号、高对比度、易理解文案
- **WHEN** 后续功能或重构引入测试
- **THEN** 关键交互元素 MUST 仍可被用户识别和点击
- **AND** 关键反馈文案 SHOULD 保持清晰

### Requirement: 关键业务链路具备 smoke 流程

项目 MUST 建立最小可执行的 smoke 流程，用于快速回归关键用户旅程。

#### Scenario: 股票主链路 smoke
- **GIVEN** 用户已进入应用
- **WHEN** 用户搜索股票、打开详情并加入自选
- **THEN** 该主链路 MUST 可通过 smoke 测试验证

#### Scenario: AI 对话主链路 smoke
- **GIVEN** 用户已登录
- **WHEN** 用户进入聊天页并发送问题
- **THEN** 系统 MUST 返回响应或友好降级
- **AND** 整条链路 MUST 可在不依赖真实模型成功率的前提下被回归
